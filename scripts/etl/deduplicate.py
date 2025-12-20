import os
import json
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(url, key)

def run():
    print("Fetching all 'Sentence Correction' questions...")
    # Fetch all fields to check structure quality too
    response = supabase.table("questions").select("id, question_text, options, created_at").eq("subtopic", "Sentence Correction").execute()
    questions = response.data
    
    print(f"Total fetched: {len(questions)}")
    
    seen_text = {}
    ids_to_delete = []
    
    for q in questions:
        text = q["question_text"].strip()
        
        # Check option quality (prefer List over Dict)
        is_list = isinstance(q["options"], list)
        
        if text in seen_text:
            existing = seen_text[text]
            existing_is_list = isinstance(existing["options"], list)
            
            if is_list and not existing_is_list:
                # New one is better, replace existing in map and mark existing for delete
                ids_to_delete.append(existing["id"])
                seen_text[text] = q
            else:
                # Existing is better or equal, delete new one
                ids_to_delete.append(q["id"])
        else:
            seen_text[text] = q

    print(f"Found {len(ids_to_delete)} duplicates to delete.")
    print(f"Unique questions remaining: {len(seen_text)}")
    
    if len(ids_to_delete) > 0:
        # Delete in batches
        batch_size = 100
        for i in range(0, len(ids_to_delete), batch_size):
            batch = ids_to_delete[i:i+batch_size]
            print(f"Deleting batch {i//batch_size + 1}/{len(ids_to_delete)//batch_size + 1}...")
            supabase.table("questions").delete().in_("id", batch).execute()
            
    print("Deduplication complete.")

if __name__ == "__main__":
    run()
