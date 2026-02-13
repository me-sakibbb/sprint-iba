import { useState, useRef, useCallback } from 'react';
import { PDFDocument } from 'pdf-lib';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { extractChunkImages, ensureStorageBucket, extractPdfRegion, extractRegionFromDoc, loadPdfJs } from '@/services/pdfImageService';
import { logAiUsage } from '@/services/aiUsageService';

// --- Types ---
export interface ExtractedQuestion {
    question_text: string;
    question_text_formatted?: string; // Markdown with LaTeX
    options: string[]; // Changed from {A,B,C,D} to array to support 2-5 options
    options_formatted?: string[]; // Markdown array
    correct_answer: string;
    topic: string;
    subtopic: string;
    difficulty: string;
    explanation: string;
    explanation_formatted?: string; // Markdown with LaTeX
    has_image: boolean;
    image_description?: string;
    image_url?: string;
    image_bbox?: number[]; // [ymin, xmin, ymax, xmax]
    image_page_number?: number;
    subject_id?: string | null; // UUID from taxonomy
    topic_id?: string | null; // UUID from taxonomy
    subtopic_id?: string | null; // UUID from taxonomy
    passage_ref_id?: string | null; // Temporary ID to link to a passage in the same result set
    images?: Array<{
        url: string;
        description?: string;
        bbox?: number[];
        page_number?: number;
        order: number
    }>;
}

export interface ExtractedPassage {
    id: string; // Temporary ID (e.g., "passage_1")
    content: string;
    has_image: boolean;
    image_bbox?: number[];
    image_page_number?: number;
}

export interface ExtractionProgress {
    step: 'idle' | 'preparing' | 'uploading' | 'processing' | 'extracting' | 'saving' | 'complete' | 'error';
    detail: string;
    currentChunk?: number;
    totalChunks?: number;
    tokens?: { total: number; prompt: number; completion: number };
    questionsExtracted?: number;
}

export interface ExtractionConfig {
    pagesPerChunk: number;
    startPage?: number;
    endPage?: number;
    parallelChunks: number;
}

interface PdfChunk {
    blob: Blob;
    startPage: number;
    endPage: number;
    index: number;
    pageImages: Map<number, string>; // page number -> base64 image
}

const DEFAULT_CONFIG: ExtractionConfig = {
    pagesPerChunk: 3, // Reduced from 5 to ensure exhaustive extraction
    parallelChunks: 1, // Sequential by default for cost efficiency
};

// --- Hook ---
export function useQuestionExtraction() {
    const [progress, setProgress] = useState<ExtractionProgress>({ step: 'idle', detail: '' });
    const [isProcessing, setIsProcessing] = useState(false);
    const abortRef = useRef(false);

    const reset = useCallback(() => {
        setProgress({ step: 'idle', detail: '' });
        setIsProcessing(false);
        abortRef.current = false;
    }, []);

    const stop = useCallback(() => {
        abortRef.current = true;
        toast.info('Stopping extraction after current chunk...');
    }, []);

    // Split PDF into chunks with optional page range
    const splitPdfIntoChunks = async (
        file: File,
        config: ExtractionConfig
    ): Promise<PdfChunk[]> => {
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const totalPages = pdfDoc.getPageCount();

        const startPage = Math.max(1, config.startPage || 1);
        const endPage = Math.min(totalPages, config.endPage || totalPages);

        const chunks: PdfChunk[] = [];

        for (let i = startPage - 1; i < endPage; i += config.pagesPerChunk) {
            const chunkEnd = Math.min(i + config.pagesPerChunk, endPage);
            const newPdf = await PDFDocument.create();
            const pageIndices = Array.from({ length: chunkEnd - i }, (_, k) => i + k);

            const copiedPages = await newPdf.copyPages(pdfDoc, pageIndices);
            copiedPages.forEach(page => newPdf.addPage(page));

            const pdfBytes = await newPdf.save();
            const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });

            chunks.push({
                blob,
                startPage: i + 1,
                endPage: chunkEnd,
                index: chunks.length,
                pageImages: new Map(), // Will be populated if images are detected
            });
        }

        return chunks;
    };

    // Upload file to Gemini API
    const uploadToGemini = async (blob: Blob, displayName: string, apiKey: string): Promise<string> => {
        // Sanitize display name (only alphanumeric, underscores, hyphens, periods)
        // Gemini API might be strict about this, or length limits
        const safeDisplayName = displayName.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 100);

        // Get upload URL
        const uploadUrlResponse = await fetch(
            `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`,
            {
                method: 'POST',
                headers: {
                    'X-Goog-Upload-Protocol': 'resumable',
                    'X-Goog-Upload-Command': 'start',
                    'X-Goog-Upload-Header-Content-Length': blob.size.toString(),
                    'X-Goog-Upload-Header-Content-Type': 'application/pdf',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ file: { display_name: safeDisplayName } })
            }
        );

        if (!uploadUrlResponse.ok) {
            const errorText = await uploadUrlResponse.text();
            console.error('Gemini Upload URL Error:', errorText);
            throw new Error(`Failed to get upload URL: ${errorText}`);
        }
        const uploadUrl = uploadUrlResponse.headers.get('X-Goog-Upload-URL');
        if (!uploadUrl) throw new Error('No upload URL returned');

        // Upload file
        const uploadFileResponse = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
                'Content-Length': blob.size.toString(),
                'X-Goog-Upload-Offset': '0',
                'X-Goog-Upload-Command': 'upload, finalize',
            },
            body: blob
        });

        if (!uploadFileResponse.ok) throw new Error('File upload failed');
        const fileInfo = await uploadFileResponse.json();
        const fileName = fileInfo.file.name;

        // Wait for processing
        let fileState = fileInfo.file.state;
        while (fileState === 'PROCESSING') {
            await new Promise(resolve => setTimeout(resolve, 2000));
            const stateResponse = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${apiKey}`
            );
            const stateData = await stateResponse.json();
            fileState = stateData.state;
            if (fileState === 'FAILED') throw new Error('File processing failed');
        }

        return fileInfo.file.uri;
    };

    // Extract questions from a chunk
    const extractFromChunk = async (
        chunk: PdfChunk,
        apiKey: string,
        fileName: string,
        model: string,
        taxonomyContext?: string,
        taxonomyOverrides?: {
            subject?: { id: string, title: string },
            topic?: { id: string, title: string },
            subtopic?: { id: string, title: string }
        }
    ): Promise<{ questions: ExtractedQuestion[]; passages: ExtractedPassage[]; tokens: { total: number; prompt: number; completion: number } }> => {
        const fileUri = await uploadToGemini(chunk.blob, `${fileName}_chunk_${chunk.index}`, apiKey);
        const pageCount = chunk.endPage - chunk.startPage + 1;

        let overrideInstructions = "";
        if (taxonomyOverrides) {
            overrideInstructions = `
CRITICAL TAXONOMY INSTRUCTIONS (USER OVERRIDES):
The user has explicitely selected the following taxonomy for these questions. You MUST use these values/IDs for ALL extracted questions unless significantly contradictory (unlikely).
`;
            if (taxonomyOverrides.subject) {
                overrideInstructions += `- STRICTLY ASSIGN "subject_id": "${taxonomyOverrides.subject.id}" and "topic": "${taxonomyOverrides.subject.title}" (as base)\n`;
            }
            if (taxonomyOverrides.topic) {
                overrideInstructions += `- STRICTLY ASSIGN "topic_id": "${taxonomyOverrides.topic.id}" and "topic": "${taxonomyOverrides.topic.title}"\n`;
            }
            if (taxonomyOverrides.subtopic) {
                overrideInstructions += `- STRICTLY ASSIGN "subtopic_id": "${taxonomyOverrides.subtopic.id}" and "subtopic": "${taxonomyOverrides.subtopic.title}"\n`;
            }
            overrideInstructions += `
If a specific subtopic is NOT selected, please infer the most appropriate subtopic WITHIN the selected Subject/Topic.
If a Subject is selected but Topic is NOT, infer the Topic within that Subject.
`;
        }

        const prompt = `You are an expert educational content extractor specializing in preserving formatting and mathematical expressions.

CONTEXT:
- This PDF chunk contains ${pageCount} pages (Pages ${chunk.startPage} to ${chunk.endPage} of the original document).
- PDFs may contain BOTH questions AND answer explanations/solutions.
- **READING COMPREHENSION**: passages followed by multiple questions are common.

${overrideInstructions}

TAXONOMY MAPPING (CRITICAL):
${taxonomyContext || 'No predefined taxonomy provided. Please identify topic and subtopic as strings.'}

If a taxonomy is provided above, you MUST:
1. Map each question to the most relevant Subject, Topic, and Subtopic.
2. Return the corresponding "subject_id", "topic_id", and "subtopic_id" (UUIDs) in the JSON.
3. If no clear match, use the "Others" category if available, or leave as null.
4. Still provide the "topic" and "subtopic" as human-readable strings.

CRITICAL RULES:
1. EXTRACT EVERY SINGLE Multiple Choice Question (MCQ) found in ALL ${pageCount} PAGES of this chunk.
2. DO NOT STOP until you have processed ALL content on ALL ${pageCount} pages.
3. START EXTRACTING FROM THE VERY FIRST PAGE OF THIS CHUNK (Page ${chunk.startPage}). Do not skip the beginning.
4. SEPARATE questions from their answer explanations.
5. DO NOT extract pure answer keys or solution walkthroughs as questions.
6. A valid MCQ has: a question stem + labeled options (can be 2, 3, 4, or 5 options).

READING COMPREHENSION (NEW):
- If you find a reading passage, case study, or scenario that applies to MULTIPLE questions:
  1. Extract the passage content into the "passages" array.
  2. Assign it a unique "id" (e.g., "passage_1").
  3. For each question belonging to this passage, set "passage_ref_id" to match the passage's "id".
- If a question is standalone, "passage_ref_id" should be null.

TEXT FORMATTING - PRESERVE ALL FORMATTING AS MARKDOWN:
- **Bold text**: Use **text** for bold
- *Italic text*: Use *text* for italic
- Underlined text: Use <u>text</u> for underline
- Headings: Use # for headings if needed
- Lists: Use - or 1. for lists if they appear in questions
- Combine formats: ***bold italic*** or **_bold italic_**

MATHEMATICAL EXPRESSIONS - ALWAYS USE LATEX:
- Inline math: Use $expression$ for inline formulas
- Block math: Use $$expression$$ for display formulas
- Examples:
  * Equations: $x^2 + 2x + 1 = 0$ or $E = mc^2$
  * Fractions: $\\frac{a}{b}$ or $\\frac{numerator}{denominator}$
  * Subscripts/Superscripts: $x_1$, $y^2$, $x_i^2$
  * Greek letters: $\\alpha$, $\\beta$, $\\pi$, $\\theta$
  * Square roots: $\\sqrt{x}$ or $\\sqrt[n]{x}$
  * Summations: $\\sum_{i=1}^{n} x_i$
  * Integrals: $\\int_a^b f(x)dx$
  * Matrices: $\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}$

OPTION HANDLING:
- Questions may have 2, 3, 4, or 5 options (not always 4).
- Extract ALL options provided, in order.
- Options may be labeled A/B/C/D/E or 1/2/3/4/5 or other formats.
- Store options as an array of strings.
- Preserve formatting in each option using Markdown + LaTeX.

IMAGE DETECTION & REGIONAL EXTRACTION:
- If a question has an associated image/diagram/figure, set "has_image": true.
- Provide "image_description" explaining what the image shows.
- Provide "image_bbox": [ymin, xmin, ymax, xmax] as normalized coordinates (0-1000) of the image region on the page.
- Provide "image_page_number": number, the 1-indexed page number within the provided text where the image is located.
- If multiple images exist, list them in the "images" array with their respective "bbox" and "page_number".
- **For Passages**: If a passage has an image, set "has_image": true in the passage object and provide bbox details.

WHAT TO IGNORE (Invalid Questions):
- "Ans: volatile" (Just an answer)
- "Solution: The correct answer is B because..." (Just a solution)
- Bullet points explaining terms (e.g., "• Volatile: This means...")

DIFFICULTY ASSESSMENT (CRITICAL):
Assess the difficulty of each question as "Easy", "Medium", or "Hard" based on the following criteria:
- **Easy**: Direct recall of facts, basic definitions, simple one-step calculations, or identifying simple patterns.
- **Medium**: Application of concepts to standard problems, two-step reasoning, comparing two concepts, or standard textbook exercises.
- **Hard**: Complex application, multi-step analysis or calculations, edge cases, synthesis of multiple concepts, trick questions, or requiring deep understanding.
*Aim for a realistic distribution if possible, do not default everything to Medium.*

OUTPUT FORMAT (JSON Object):
{
  "passages": [
    {
      "id": "measure_1",
      "content": "Full text of the reading passage...",
      "has_image": false, // or true
      "image_bbox": [100, 100, 500, 500],
      "image_page_number": 1
    }
  ],
  "questions": [
    {
      "question_text_formatted": "What is the value of $x$ in **this quadratic equation**: $x^2 + 5x + 6 = 0$?",
      "options_formatted": [
        "$x = -2$ or $x = -3$",
        "$x = 2$ or $x = 3$",
        "$x = -1$ or $x = -6$",
        "$x = 1$ or $x = 6$"
      ],
      "correct_answer": "0",
      "topic": "Mathematics",
      "subtopic": "Quadratic Equations",
      "subject_id": "uuid-of-mathematics",
      "topic_id": "uuid-of-algebra",
      "subtopic_id": "uuid-of-quadratic-equations",
      "explanation_formatted": "Detailed explanation...",
      "difficulty": "Easy",
      "has_image": true,
      "image_description": "A graph of a parabola opening upwards.",
      "image_bbox": [100, 200, 400, 800],
      "image_page_number": 1,
      "passage_ref_id": null // or "measure_1" if linked to a passage
    }
  ]
}

IMPORTANT REQUIREMENTS:
- Return a JSON Object with "passages" and "questions" arrays.
- Use "question_text_formatted", "options_formatted", and "explanation_formatted" fields
- "options_formatted" is an ARRAY of Markdown strings
- "correct_answer" is the INDEX (0, 1, 2, 3, or 4) as a STRING
- "explanation_formatted" is MANDATORY and must be detailed (minimum 20 words) with Markdown/LaTeX
- Include ALL options found (2-5 options)
- Preserve ALL text formatting from the PDF using Markdown
- Use LaTeX for ALL mathematical expressions, symbols, and formulas
- Return ONLY the JSON object, no additional text`;

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        role: 'user',
                        parts: [
                            { file_data: { mime_type: 'application/pdf', file_uri: fileUri } },
                            { text: prompt }
                        ]
                    }],
                    generationConfig: {
                        responseMimeType: 'application/json',
                        temperature: 0.1,
                        maxOutputTokens: 16000
                    }
                })
            }
        );

        if (!response.ok) throw new Error(`Gemini API error: ${response.statusText}`);
        const data = await response.json();

        const tokens = {
            total: data.usageMetadata?.totalTokenCount || 0,
            prompt: data.usageMetadata?.promptTokenCount || 0,
            completion: data.usageMetadata?.candidatesTokenCount || 0,
        };

        // Log usage
        await logAiUsage(
            model,
            tokens.prompt,
            tokens.completion,
            'question_extraction',
            { fileName, chunkIndex: chunk.index }
        );

        // Parse response
        let rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) return { questions: [], passages: [], tokens };

        rawText = rawText.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/\s*```$/, '');

        let parsedData: { questions: ExtractedQuestion[], passages: ExtractedPassage[] } = { questions: [], passages: [] };
        try {
            parsedData = JSON.parse(rawText);

            // Backward compatibility helper if AI returns just array of questions
            if (Array.isArray(parsedData)) {
                parsedData = { questions: parsedData, passages: [] };
            }
        } catch {
            // Recovery attempt
            if (rawText.trim().startsWith('[')) {
                try {
                    const questions = JSON.parse(rawText.trim().replace(/,?\s*$/, '') + ']');
                    parsedData = { questions, passages: [] };
                } catch { }
            } else if (rawText.trim().startsWith('{')) {
                try {
                    // Try to fix common JSON errors if needed, but basic parse might work
                    parsedData = JSON.parse(rawText);
                } catch { }
            }
        }

        return {
            questions: Array.isArray(parsedData.questions) ? parsedData.questions : [],
            passages: Array.isArray(parsedData.passages) ? parsedData.passages : [],
            tokens
        };
    };

    // Main extraction function
    const extract = useCallback(async (
        file: File,
        config: Partial<ExtractionConfig> = {},
        model: string = 'gemini-1.5-flash',
        onQuestionsExtracted?: () => void,  // Callback for real-time UI updates
        taxonomyOverrides?: {
            subject?: { id: string, title: string },
            topic?: { id: string, title: string },
            subtopic?: { id: string, title: string }
        }
    ): Promise<number> => {
        const geminiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
        if (!geminiKey) {
            toast.error('Gemini API key not configured');
            return 0;
        }

        const finalConfig = { ...DEFAULT_CONFIG, ...config };
        setIsProcessing(true);
        abortRef.current = false;

        // Fetch taxonomy from study_topics for context
        setProgress({ step: 'preparing', detail: 'Fetching taxonomy data...' });
        const { data: allStudyTopics } = await supabase
            .from('study_topics')
            .select('id, title, parent_id')
            .order('sort_order', { ascending: true })
            .order('title', { ascending: true });

        const subjects = (allStudyTopics || []).filter((t: any) => !t.parent_id);
        const topics = (allStudyTopics || []).filter((t: any) => subjects.some((s: any) => s.id === t.parent_id));
        const subtopics = (allStudyTopics || []).filter((t: any) => topics.some((top: any) => top.id === t.parent_id));

        let taxonomyContext = "Available Taxonomy:\n";
        subjects.forEach((s: any) => {
            taxonomyContext += `- Subject: ${s.title} (ID: ${s.id})\n`;
            topics.filter((t: any) => t.parent_id === s.id).forEach((t: any) => {
                taxonomyContext += `  * Topic: ${t.title} (ID: ${t.id})\n`;
                subtopics.filter((st: any) => st.parent_id === t.id).forEach((st: any) => {
                    taxonomyContext += `    - Subtopic: ${st.title} (ID: ${st.id})\n`;
                });
            });
        });

        let totalQuestions = 0;
        let totalTokens = { total: 0, prompt: 0, completion: 0 };

        try {
            // Split PDF
            setProgress({ step: 'preparing', detail: 'Splitting PDF into chunks...' });
            const chunks = await splitPdfIntoChunks(file, finalConfig);

            // Process chunks
            for (let i = 0; i < chunks.length; i++) {
                if (abortRef.current) {
                    toast.info('Extraction stopped by user');
                    break;
                }

                const chunk = chunks[i];
                setProgress({
                    step: 'extracting',
                    detail: `Processing pages ${chunk.startPage}-${chunk.endPage}...`,
                    currentChunk: i + 1,
                    totalChunks: chunks.length,
                    tokens: totalTokens,
                    questionsExtracted: totalQuestions,
                });

                try {
                    const { questions, passages, tokens } = await extractFromChunk(chunk, geminiKey, file.name, model, taxonomyContext, taxonomyOverrides);

                    totalTokens.total += tokens.total;
                    totalTokens.prompt += tokens.prompt;
                    totalTokens.completion += tokens.completion;

                    if (questions.length > 0 || passages.length > 0) {
                        // Ensure storage bucket exists
                        await ensureStorageBucket();

                        const arrayBuffer = await chunk.blob.arrayBuffer();

                        // Load PDF document once for this chunk to avoid "detached ArrayBuffer" errors
                        await loadPdfJs();
                        const pdfDoc = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;

                        // Save to database
                        setProgress({
                            step: 'saving',
                            detail: `Saving ${questions.length} questions & ${passages.length} passages...`,
                            currentChunk: i + 1,
                            totalChunks: chunks.length,
                            tokens: totalTokens,
                            questionsExtracted: totalQuestions,
                        });

                        try {
                            const passageIdMap = new Map<string, string>(); // tempRefId -> realUuid

                            // 1. Process and Insert Passages
                            for (const p of passages) {
                                let imageUrl: string | null = null;

                                // Extract passage image if needed
                                if (p.has_image && p.image_bbox && p.image_page_number) {
                                    try {
                                        imageUrl = await extractRegionFromDoc(
                                            pdfDoc,
                                            p.image_page_number,
                                            p.image_bbox,
                                            `passage_${Date.now()}`
                                        );
                                    } catch (err) {
                                        console.error('Failed to extract passage image:', err);
                                    }
                                }

                                const { data: passageData, error: passageError } = await supabase
                                    .from('reading_passages')
                                    .insert({
                                        content: p.content,
                                        image_url: imageUrl
                                    })
                                    .select()
                                    .single();

                                if (!passageError && passageData) {
                                    passageIdMap.set(p.id, passageData.id);
                                } else {
                                    console.error('Passage insert error:', passageError);
                                }
                            }

                            // 2. Process and Insert Questions
                            for (const q of questions) {
                                // Perform regional image extraction if needed
                                if (q.has_image && q.image_bbox && q.image_page_number) {
                                    try {
                                        const imageUrl = await extractRegionFromDoc(
                                            pdfDoc,
                                            q.image_page_number,
                                            q.image_bbox,
                                            `q_${Date.now()}`
                                        );
                                        if (imageUrl) {
                                            q.image_url = imageUrl;
                                        }
                                    } catch (err) {
                                        console.error('Failed to extract regional image:', err);
                                    }
                                }

                                // Handle multiple images if present
                                if (q.images && q.images.length > 0) {
                                    for (const img of q.images) {
                                        if (img.bbox && img.page_number) {
                                            try {
                                                const imageUrl = await extractRegionFromDoc(
                                                    pdfDoc,
                                                    img.page_number,
                                                    img.bbox,
                                                    `q_img_${Date.now()}`
                                                );
                                                if (imageUrl) {
                                                    img.url = imageUrl;
                                                }
                                            } catch (err) {
                                                console.error('Failed to extract extra regional image:', err);
                                            }
                                        }
                                    }
                                }

                                // Resolve passage ID
                                const finalPassageId = (q.passage_ref_id && passageIdMap.has(q.passage_ref_id))
                                    ? passageIdMap.get(q.passage_ref_id)
                                    : null;

                                const questionToInsert = {
                                    // Plain text fields (backwards compatibility)
                                    question_text: q.question_text_formatted || q.question_text,
                                    options: q.options_formatted ||
                                        (Array.isArray(q.options)
                                            ? q.options
                                            : [(q.options as any)?.A || '', (q.options as any)?.B || '', (q.options as any)?.C || '', (q.options as any)?.D || ''].filter(Boolean)),
                                    explanation: q.explanation_formatted || q.explanation,

                                    // Formatted text fields (Markdown + LaTeX)
                                    question_text_formatted: q.question_text_formatted || q.question_text,
                                    options_formatted: q.options_formatted ||
                                        (Array.isArray(q.options)
                                            ? q.options
                                            : [(q.options as any)?.A || '', (q.options as any)?.B || '', (q.options as any)?.C || '', (q.options as any)?.D || ''].filter(Boolean)),
                                    explanation_formatted: q.explanation_formatted || q.explanation,

                                    // Metadata
                                    correct_answer: q.correct_answer,
                                    topic: q.topic,
                                    subtopic: q.subtopic,
                                    difficulty: q.difficulty?.toLowerCase() || 'medium',
                                    has_image: q.has_image || false,
                                    image_description: q.image_description || null,
                                    image_url: q.image_url || null,
                                    is_verified: false,
                                    passage_id: finalPassageId,

                                    // Taxonomy
                                    subject_id: q.subject_id || null,
                                    topic_id: q.topic_id || null,
                                    subtopic_id: q.subtopic_id || null,
                                };

                                const { data: questionData, error: questionError } = await supabase
                                    .from('questions')
                                    .insert(questionToInsert)
                                    .select()
                                    .single();

                                if (!questionError && questionData) {
                                    totalQuestions++;

                                    // Insert extra images into question_images table if present
                                    if (q.images && q.images.length > 0) {
                                        const extraImages = q.images
                                            .filter(img => img.url)
                                            .map(img => ({
                                                question_id: questionData.id,
                                                image_url: img.url,
                                                description: img.description || null,
                                                image_order: img.order || 0
                                            }));

                                        if (extraImages.length > 0) {
                                            await supabase.from('question_images').insert(extraImages);
                                        }
                                    }
                                } else {
                                    console.error('Insert error:', questionError);
                                }
                            }
                        } finally {
                            // Free up memory
                            await pdfDoc.destroy();
                        }

                        // Notify UI to refresh immediately after each chunk
                        onQuestionsExtracted?.();
                    }
                } catch (chunkError: any) {
                    console.warn(`Chunk ${i + 1} failed:`, chunkError);
                    toast.error(`Chunk ${i + 1} failed: ${chunkError.message}`);
                }
            }

            setProgress({
                step: 'complete',
                detail: `Extracted ${totalQuestions} questions!`,
                tokens: totalTokens,
                questionsExtracted: totalQuestions,
            });

            toast.success(`Extracted ${totalQuestions} questions! Tokens: ${totalTokens.total.toLocaleString()}`);
            return totalQuestions;

        } catch (error: any) {
            console.error('Extraction error:', error);
            setProgress({ step: 'error', detail: error.message });
            toast.error(`Extraction failed: ${error.message}`);
            return 0;
        } finally {
            setIsProcessing(false);
        }
    }, []);

    /**
     * Create a manual question (for ManualQuestionEntry component)
     */
    const createManualQuestion = useCallback(async (questionData: {
        question_text: string;
        options: string[];
        correct_answer: string;
        explanation: string;
        topic: string;
        subtopic: string;
        difficulty: string;
        subject_id?: string | null;
        topic_id?: string | null;
        subtopic_id?: string | null;
        passage_id?: string | null;
    }): Promise<{ success: boolean; error?: any }> => {
        try {
            const { error } = await (supabase as any).from('questions').insert({
                question_text: questionData.question_text,
                question_text_formatted: questionData.question_text,
                options: questionData.options,
                options_formatted: questionData.options,
                correct_answer: questionData.correct_answer,
                explanation: questionData.explanation,
                explanation_formatted: questionData.explanation,
                topic: questionData.topic,
                subtopic: questionData.subtopic,
                difficulty: questionData.difficulty.toLowerCase(),
                is_verified: true, // Manual entry implies verification
                subject_id: questionData.subject_id || null,
                topic_id: questionData.topic_id || null,
                subtopic_id: questionData.subtopic_id || null,
                passage_id: questionData.passage_id || null,
            });

            if (error) throw error;
            return { success: true };
        } catch (error: any) {
            console.error('Error creating manual question:', error);
            return { success: false, error };
        }
    }, []);

    /**
     * Create a passage (for ManualQuestionEntry component)
     */
    const createPassage = useCallback(async (content: string): Promise<{ success: boolean; passageId?: string; error?: any }> => {
        try {
            const { data, error } = await supabase
                .from('reading_passages')
                .insert({ content })
                .select()
                .single();

            if (error) throw error;
            return { success: true, passageId: data.id };
        } catch (error: any) {
            console.error('Error creating passage:', error);
            return { success: false, error };
        }
    }, []);

    return {
        extract,
        stop,
        reset,
        progress,
        isProcessing,
        createManualQuestion,
        createPassage,
    };
}
