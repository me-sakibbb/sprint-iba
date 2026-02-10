
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zlojoepzhomxyawtmpwu.supabase.co'
const supabaseKey = 'sb_publishable_ZjaI5lEMxqQnOAYkSDWlgg_CkJJ_sQ2'
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
