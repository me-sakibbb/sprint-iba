import os
import json
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(url, key)

# 1. Fix Difficulties
print("Normalizing difficulties...")
updates = {
    "Basic": "Easy",
    "Intermediate": "Medium",
    "Advanced": "Hard"
}

for old, new in updates.items():
    try:
        # Supabase update doesn't return count easily without select, but we can just run it.
        # We need to fetch IDs first to know count, or just run update.
        # Let's run update and assume it works.
        supabase.table("questions").update({"difficulty": new}).eq("difficulty", old).eq("subtopic", "Sentence Correction").execute()
        print(f"Updated {old} -> {new}")
    except Exception as e:
        print(f"Error updating {old}: {e}")

# 2. Verify Count
print("\nVerifying count...")
response = supabase.table("questions").select("count", count="exact").eq("subtopic", "Sentence Correction").execute()
count = response.count
print(f"Total questions in 'Sentence Correction': {count}")

# 3. Sample check
print("\nSample Question:")
try:
    data = supabase.table("questions").select("*").eq("subtopic", "Sentence Correction").limit(1).execute()
    if data.data:
        q = data.data[0]
        print(f"ID: {q['id']}")
        print(f"Text: {q['question_text']}")
        print(f"Difficulty: {q['difficulty']}")
        print(f"Options: {q['options']}")
        print(f"Correct: {q['correct_answer']}")
    else:
        print("No questions found.")
except Exception as e:
    print(f"Error fetching sample: {e}")
