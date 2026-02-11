
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const geminiApiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY!;

if (!supabaseUrl || !supabaseKey || !geminiApiKey) {
    console.error('Missing environment variables. Please check .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const genAI = new GoogleGenerativeAI(geminiApiKey);

async function main() {
    console.log('Fetching taxonomy...');
    // Fetch Study Topics (Taxonomy)
    const { data: topicsData, error: topicsError } = await supabase
        .from('study_topics')
        .select('id, title, parent_id, slug');

    if (topicsError) {
        console.error('Error fetching taxonomy:', topicsError);
        return;
    }

    // Build Hierarchy
    const subjects = topicsData.filter(t => !t.parent_id);
    const topicsMap = new Map();
    const subtopicsMap = new Map();

    topicsData.forEach(t => {
        if (t.parent_id) {
            // Check if parent is a subject (root)
            const parentIsSubject = subjects.find(s => s.id === t.parent_id);
            if (parentIsSubject) {
                if (!topicsMap.has(t.parent_id)) topicsMap.set(t.parent_id, []);
                topicsMap.get(t.parent_id).push(t);
            } else {
                // Must be subtopic (parent is a topic)
                if (!subtopicsMap.has(t.parent_id)) subtopicsMap.set(t.parent_id, []);
                subtopicsMap.get(t.parent_id).push(t);
            }
        }
    });

    // Construct readable taxonomy string for prompt
    let taxonomyString = '';
    subjects.forEach(subject => {
        taxonomyString += `- Subject: ${subject.title} (ID: ${subject.id})\n`;
        const subjectTopics = topicsMap.get(subject.id) || [];
        subjectTopics.forEach((topic: any) => {
            taxonomyString += `  - Topic: ${topic.title} (ID: ${topic.id})\n`;
            const topicSubtopics = subtopicsMap.get(topic.id) || [];
            topicSubtopics.forEach((subtopic: any) => {
                taxonomyString += `    - Subtopic: ${subtopic.title} (ID: ${subtopic.id})\n`;
            });
        });
    });


    console.log('Fetching questions via RPC...');

    let allQuestions: any[] = [];
    let page = 0;
    const PAGE_SIZE = 50;

    while (true) {
        const { data: batch, error: batchError } = await supabase.rpc('get_all_questions_for_mapping', {
            limit_count: PAGE_SIZE,
            offset_count: page * PAGE_SIZE
        });

        if (batchError) {
            console.error('Error fetching questions batch:', batchError);
            break;
        }

        if (!batch || batch.length === 0) {
            break;
        }

        allQuestions = [...allQuestions, ...batch];
        console.log(`Fetched ${batch.length} questions (Total: ${allQuestions.length})`);
        page++;

        // Safety break to prevent infinite loops if something is wrong
        if (page > 100) break;
    }

    console.log(`Found ${allQuestions.length} total questions to process.`);

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    let updateSql = '';
    let updatedCount = 0;

    const BATCH_SIZE = 10;
    for (let i = 0; i < allQuestions.length; i += BATCH_SIZE) {
        const batch = allQuestions.slice(i, i + BATCH_SIZE);

        // Use smaller prompt context to save tokens/cost if needed, 
        // but taxonomy structure is constant.
        const questionsText = batch.map((q, idx) => `Q${idx + 1} (ID: ${q.id}): ${q.question_text}\nOptions: ${JSON.stringify(q.options)}`).join('\n\n');

        const prompt = `
You are an expert academic classifier. I have a list of questions and a specific taxonomy structure.
Your task is to classify each question into the most appropriate Subject, Topic, and Subtopic from the provided taxonomy.
If a question fits a Subject but no specific Topic, use null for Topic/Subtopic.
If it fits a Topic but no Subtopic, use null for Subtopic.

Taxonomy Structure:
${taxonomyString}

Questions to Classify:
${questionsText}

Return a JSON array of objects, strictly following this format:
[
  {
    "question_id": "UUID",
    "subject_id": "UUID",
    "topic_id": "UUID_OR_NULL",
    "subtopic_id": "UUID_OR_NULL"
  }
]
Do not include any explanation, only the JSON array.
    `;

        try {
            const result = await model.generateContent(prompt);
            const response = result.response;
            let text = response.text();

            // Clean up markdown code blocks if present
            text = text.replace(/```json\n?|\n?```/g, '').trim();

            let updates;
            try {
                updates = JSON.parse(text);
            } catch (e) {
                console.error('Error parsing JSON for batch:', text);
                continue;
            }

            for (const update of updates) {
                if (update.question_id && update.subject_id) {
                    // Add to SQL file (as backup/record)
                    updateSql += `UPDATE questions SET subject_id = '${update.subject_id}', topic_id = ${update.topic_id ? `'${update.topic_id}'` : 'NULL'}, subtopic_id = ${update.subtopic_id ? `'${update.subtopic_id}'` : 'NULL'} WHERE id = '${update.question_id}';\n`;

                    // Perform live update via RPC
                    const { error: updateError } = await supabase.rpc('update_question_taxonomy', {
                        p_question_id: update.question_id,
                        p_subject_id: update.subject_id,
                        p_topic_id: update.topic_id || null, // Ensure null is passed correctly
                        p_subtopic_id: update.subtopic_id || null
                    });

                    if (updateError) {
                        console.error(`Error updating question ${update.question_id}:`, updateError);
                    } else {
                        updatedCount++;
                    }
                }
            }

            console.log(`Processed batch ${i / BATCH_SIZE + 1} / ${Math.ceil(allQuestions.length / BATCH_SIZE)}`);
            // Add delay to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (e) {
            console.error('Error processing batch:', e);
        }
    }

    console.log(`Updated ${updatedCount} questions via RPC.`);

    // Write SQL to file
    const timestamp = new Date().toISOString().replace(/[-:.]/g, '').substring(0, 15);
    // Just use a simpler name to avoid weird characters
    const filename = `backfill_questions_taxonomy_${timestamp}.sql`;
    const sqlFilePath = path.join(process.cwd(), 'supabase', 'migrations', filename);

    fs.writeFileSync(sqlFilePath, updateSql);
    console.log(`SQL migration file created at ${sqlFilePath}`);
}

main().catch(console.error);
