import os
import re
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(url, key)

def normalize(text):
    # Remove non-alphanumeric, lowercase
    return re.sub(r'[^a-z0-9]', '', text.lower())

def run():
    print("Fetching 'Sentence Correction' questions...")
    response = supabase.table("questions").select("id, question_text").eq("subtopic", "Sentence Correction").execute()
    questions = response.data
    
    print(f"Total: {len(questions)}")
    
    seen_normalized = set()
    ids_to_delete = []
    
    for q in questions:
        norm = normalize(q["question_text"])
        if norm in seen_normalized:
            ids_to_delete.append(q["id"])
        else:
            seen_normalized.add(norm)
            
    print(f"Found {len(ids_to_delete)} fuzzy duplicates.")
    print(f"Expected unique: {len(questions) - len(ids_to_delete)}")

    if len(ids_to_delete) > 0:
        batch_size = 100
        for i in range(0, len(ids_to_delete), batch_size):
            batch = ids_to_delete[i:i+batch_size]
            print(f"Deleting batch {i//batch_size + 1}...")
            supabase.table("questions").delete().in_("id", batch).execute()

if __name__ == "__main__":
    run()
