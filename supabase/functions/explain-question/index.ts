import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders })
    }

    try {
        const { questionText, options, correctAnswer, userAnswer } = await req.json()
        const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')

        if (!GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY is not set')
        }

        const prompt = `
    You are an expert tutor for the IBA Admission Test.
    Please explain the following question clearly and concisely.
    
    Question: ${questionText}
    Options: ${JSON.stringify(options)}
    Correct Answer: ${correctAnswer}
            console.error('Gemini API Error:', data)
            throw new Error(data.error?.message || 'Failed to generate explanation')
        }

        const explanation = data.candidates?.[0]?.content?.parts?.[0]?.text || "Could not generate explanation."

        return new Response(
            JSON.stringify({ explanation }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        )
    }
})
