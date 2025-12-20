import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const { examDate, subjectStats } = await req.json();
        const apiKey = Deno.env.get("STUDY_PLANNER_API_KEY");

        if (!apiKey) {
            return new Response(
                JSON.stringify({ error: "API key not configured" }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const today = new Date();
        const exam = new Date(examDate);
        const daysUntilExam = Math.ceil((exam.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        const totalRemaining = subjectStats.reduce((sum, s) => sum + s.totalRemaining, 0);
        const totalAnswered = subjectStats.reduce((sum, s) => sum + s.totalAnswered, 0);
        const overallProgress = Math.round((totalAnswered / (totalAnswered + totalRemaining)) * 100);

        const subjectSummary = subjectStats.map((s) => {
            const topicList = s.topics.map((t) =>
                `${t.topic}(${t.remaining}q:E${t.breakdown.easy.remaining}/M${t.breakdown.medium.remaining}/H${t.breakdown.hard.remaining})`
            ).join(', ');
            return `${s.subject}[${s.totalRemaining}]: ${topicList}`;
        }).join('\n');

        const todayStr = today.toISOString().split('T')[0];
        const day30Str = new Date(today.getTime() + 29 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const prompt = `Create 30-day IBA study plan starting TODAY (${todayStr}).

CRITICAL: Generate ALL 30 days from ${todayStr} to ${day30Str}.

Status: Exam ${daysUntilExam} days away | ${overallProgress}% done | ${totalRemaining} remaining

Topics:
${subjectSummary}

Requirements:
- Prioritize high-volume, hard topics
- 35-50 questions/day
- Easy→Medium→Hard progression
- Rotate subjects daily

DATES: Start day 1 on ${todayStr}, day 2 on next day, etc. through day 30 on ${day30Str}.

Format (JSON only):
{
  "monthlyGoal": 1200,
  "dailyAverage": 40,
  "strategy": "2 sentences",
  "dailySchedule": [
    {"dayNumber": 1, "date": "${todayStr}", "subjects": [{"subject": "Math", "topic": "Averages", "easy": 8, "medium": 5, "hard": 2, "totalQuestions": 15}], "totalQuestions": 40, "focusArea": "Foundation"}
  ]
}

Generate COMPLETE plan with all 30 days starting ${todayStr}. Do not stop early.`;

        console.log("Calling Gemini for 30-day plan...");

        const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.7,
                    topP: 0.95,
                    maxOutputTokens: 32000
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Gemini error:", errorText);
            return new Response(
                JSON.stringify({ error: "Gemini API error", details: errorText }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            return new Response(
                JSON.stringify({ error: "No response from Gemini" }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        console.log("Response length:", text.length, "chars");

        let cleanText = text.replace(/```json\n?|```\n?/g, '').trim();

        if (!cleanText.endsWith('}')) {
            console.log("Repairing incomplete JSON...");
            const matches = [...cleanText.matchAll(/"focusArea"\s*:\s*"([^"\\]*(\\.[^"\\]*)*)"/g)];
            if (matches.length > 0) {
                const lastMatch = matches[matches.length - 1];
                const endPos = lastMatch.index + lastMatch[0].length;
                cleanText = cleanText.substring(0, endPos) + '\n    }\n  ]\n}';
            }
        }

        let plan;
        try {
            plan = JSON.parse(cleanText);
        } catch (e) {
            console.error("Parse error:", e.message);
            console.error("Text sample:", cleanText.substring(0, 1000));
            return new Response(
                JSON.stringify({
                    error: "Failed to parse AI response",
                    suggestion: "Try again - the AI is generating a new plan"
                }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        plan.examDate = examDate;
        plan.daysUntilExam = daysUntilExam;
        plan.totalRemaining = totalRemaining;

        console.log("Success! Generated", plan.dailySchedule?.length, "days");

        return new Response(
            JSON.stringify(plan),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error) {
        console.error("Error:", error.message || error);
        return new Response(
            JSON.stringify({ error: "Internal error", details: error.toString() }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
