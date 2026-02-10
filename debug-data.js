import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables.')
    console.error('Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.')
    console.error('Example: NEXT_PUBLIC_SUPABASE_URL=xxx NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=yyy node debug-data.js')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function debugData() {
    const { data, error } = await supabase
        .from('questions')
        .select('topic')
        .not('topic', 'is', null)
        .limit(1000)

    if (error) {
        console.log('Error:', JSON.stringify(error))
        return
    }

    const topics = [...new Set(data.map(d => d.topic))].sort()
    console.log('DISTINCT_TOPICS:', JSON.stringify(topics))
}

debugData()
