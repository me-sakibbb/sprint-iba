import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import PDFParser from "https://esm.sh/pdf-parse@1.1.1"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { filePath, bucketName = 'pdfs' } = await req.json()

        if (!filePath) {
            throw new Error('No file path provided')
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        const geminiKey = Deno.env.get('GEMINI_API_KEY')

        if (!geminiKey) {
            throw new Error('GEMINI_API_KEY not set')
        }

        const supabase = createClient(supabaseUrl, supabaseKey)

        // 1. Download PDF from storage
        const { data: fileData, error: downloadError } = await supabase.storage
            .from(bucketName)
            .download(filePath)

        if (downloadError) throw downloadError

        // 2. Parse PDF text
        const arrayBuffer = await fileData.arrayBuffer()
        const pdfData = await PDFParser(new Uint8Array(arrayBuffer))
        const pdfText = pdfData.text

        // 3. Process with Gemini
        const chunks = []
        const CHUNK_SIZE = 7000
        for (let i = 0; i < pdfText.length; i += CHUNK_SIZE) {
            chunks.push(pdfText.substring(i, i + CHUNK_SIZE))
        }

        const allQuestions = []

        for (const chunk of chunks) {
            const prompt = `
        Task: Extract MCQs from text.
        Format: Strict JSON array of objects.
        Fields: question_text, options (object with A,B,C,D keys), correct_answer (A/B/C/D), topic, subtopic, difficulty (Easy/Medium/Hard), explanation.
        Language: Use LaTeX for math ($...$).
        Input: ${chunk}
      `

            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${geminiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: { responseMimeType: "application/json", temperature: 0.1 }
                    })
                }
            )

            if (!response.ok) {
                console.error(`Gemini API error: ${response.statusText}`)
                continue
            }

            const data = await response.json()
            const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text
            if (rawText) {
                try {
                    const questions = JSON.parse(rawText)
                    if (Array.isArray(questions)) {
                        allQuestions.push(...questions)
                    }
                } catch (e) {
                    console.error('Failed to parse Gemini response', e)
                }
            }
        }

        // 4. Insert into database
        if (allQuestions.length > 0) {
            const questionsToInsert = allQuestions.map(q => ({
                question_text: q.question_text,
                options: [q.options.A, q.options.B, q.options.C, q.options.D],
                correct_answer: q.correct_answer,
                topic: q.topic,
                subtopic: q.subtopic,
                difficulty: q.difficulty?.toLowerCase() || 'medium',
                explanation: q.explanation,
                subject: q.topic,
                is_verified: false // Assuming this column exists or will be added
            }))

            const { error: insertError } = await supabase
                .from('questions')
                .insert(questionsToInsert)

            if (insertError) throw insertError
        }

        return new Response(
            JSON.stringify({ success: true, count: allQuestions.length }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
