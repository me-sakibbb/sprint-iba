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
        const { mistakes, feedbackType, scopeValue } = await req.json();
        const apiKey = Deno.env.get("STUDY_PLANNER_API_KEY") || Deno.env.get("GEMINI_API_KEY");

        if (!apiKey) {
            return new Response(
                JSON.stringify({ error: "API key not configured" }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Prepare mistake summary for the prompt
        const mistakeSummary = mistakes.map((m: any) =>
            `- Topic: ${m.topic || 'General'} | Question: ${m.question?.question_text?.substring(0, 100)}... | Your Answer: ${m.user_answer} | Correct: ${m.correct_answer} | Severity: ${m.mistake_stats?.severity_level || 'Unknown'}`
        ).join('\n');

        const prompt = `Analyze these student mistakes and provide actionable feedback.
        
Context: ${feedbackType} analysis ${scopeValue ? `for ${scopeValue}` : ''}
Mistake Count: ${mistakes.length}

Mistakes:
${mistakeSummary}

Requirements:
1. Identify patterns in the mistakes (e.g., conceptual gaps, calculation errors, rushing).
2. Determine root causes.
3. Suggest specific learning gaps to address.
4. Create a mini action plan.
5. Recommend what to focus on in practice.

Format (JSON only):
{
  "feedback_text": "2-3 sentences encouraging summary of performance and main issue.",
  "pattern_analysis": "Bullet points of observed patterns.",
  "root_causes": "Likely reasons for these mistakes.",
  "learning_gaps": "Specific concepts to review.",
  "action_plan": "Step-by-step plan to improve.",
  "practice_focus": "Specific topics or question types to practice."
}

Keep the tone encouraging but direct. Focus on improvement.`;

        console.log("Calling Gemini for mistake analysis...");

        const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.7,
                    topP: 0.95,
                    maxOutputTokens: 2048
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

        let cleanText = text.replace(/```json\n?|```\n?/g, '').trim();
        let analysis: any;

        try {
            analysis = JSON.parse(cleanText);
        } catch (e: any) {
            console.error("Parse error:", e.message);
            return new Response(
                JSON.stringify({
                    error: "Failed to parse AI response",
                    suggestion: "Try again"
                }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Add metadata
        analysis.feedback_type = feedbackType;
        analysis.scope_value = scopeValue;
        analysis.mistake_count = mistakes.length;

        return new Response(
            JSON.stringify(analysis),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error: any) {
        console.error("Error:", error.message || error);
        return new Response(
            JSON.stringify({ error: "Internal error", details: error.toString() }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
