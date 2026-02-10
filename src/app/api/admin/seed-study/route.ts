
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role key to bypass RLS and ensures admin access
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials!');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

function generateSlug(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

export async function POST(request: Request) {
    try {
        console.log('🌱 Starting study taxonomy seed...');

        // 1. Fetch existing taxonomy
        const { data: subjects, error: subjError } = await supabase.from('subjects').select('*').order('name');
        if (subjError) throw subjError;

        const { data: topics, error: topicError } = await supabase.from('topics').select('*').order('name');
        if (topicError) throw topicError;

        // Create topic map for faster lookup
        const topicMap = new Map();
        topics.forEach((t: any) => {
            if (!topicMap.has(t.subject_id)) topicMap.set(t.subject_id, []);
            topicMap.get(t.subject_id).push(t);
        });

        const { data: subtopics, error: subError } = await supabase.from('subtopics').select('*').order('name');
        if (subError) throw subError;

        // Create subtopic map
        const subtopicMap = new Map();
        subtopics.forEach((s: any) => {
            if (!subtopicMap.has(s.topic_id)) subtopicMap.set(s.topic_id, []);
            subtopicMap.get(s.topic_id).push(s);
        });

        let count = 0;
        const results = [];

        // 2. Insert Hierarchy
        for (const subject of subjects) {
            // Level 1: Subject
            const subjectSlug = generateSlug(subject.name);

            const { data: subjectNode, error: sErr } = await supabase
                .from('study_topics')
                .upsert({
                    title: subject.name,
                    slug: subjectSlug,
                    description: `Study materials for ${subject.name}`,
                    is_published: true,
                    parent_id: null,
                    sort_order: count++,
                    icon_name: 'BookOpen',
                    color: '#6366f1'
                }, { onConflict: 'slug' })
                .select()
                .single();

            if (sErr) {
                console.error(`Error inserting subject ${subject.name}:`, sErr);
                continue;
            }
            results.push({ type: 'subject', name: subject.name, status: 'created' });

            const subjectTopics = topicMap.get(subject.id) || [];
            let topicSort = 0;

            for (const topic of subjectTopics) {
                // Level 2: Topic
                const topicSlug = `${subjectSlug}-${generateSlug(topic.name)}`;

                const { data: topicNode, error: tErr } = await supabase
                    .from('study_topics')
                    .upsert({
                        title: topic.name,
                        slug: topicSlug,
                        is_published: true,
                        parent_id: subjectNode.id,
                        topic_name: topic.name, // Map for practice
                        sort_order: topicSort++,
                        icon_name: 'Layers',
                        color: '#6366f1'
                    }, { onConflict: 'slug' })
                    .select()
                    .single();

                if (tErr) {
                    console.error(`Error inserting topic ${topic.name}:`, tErr);
                    continue;
                }
                results.push({ type: 'topic', name: topic.name, parent: subject.name });

                const topicSubtopics = subtopicMap.get(topic.id) || [];
                let subSort = 0;

                for (const subtopic of topicSubtopics) {
                    // Level 3: Subtopic
                    const subSlug = `${topicSlug}-${generateSlug(subtopic.name)}`;

                    const { error: stErr } = await supabase
                        .from('study_topics')
                        .upsert({
                            title: subtopic.name,
                            slug: subSlug,
                            is_published: true,
                            parent_id: topicNode.id,
                            topic_name: topic.name,     // Inherit topic mapping
                            subtopic_name: subtopic.name, // Map subtopic
                            sort_order: subSort++,
                            icon_name: 'FileText'
                        }, { onConflict: 'slug' });

                    if (stErr) {
                        console.error(`Error inserting subtopic ${subtopic.name}:`, stErr);
                    } else {
                        results.push({ type: 'subtopic', name: subtopic.name, parent: topic.name });
                    }
                }
            }
        }

        return NextResponse.json({
            success: true,
            message: "Seeding completed successfully",
            counts: {
                subjects: subjects.length,
                topics: topics.length,
                subtopics: subtopics.length,
                processed: results.length
            }
        });

    } catch (error: any) {
        console.error("Seeding failed:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
