import os
import json
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(url, key)

print("--- Debugging Availability ---")
subtopic = "Sentence Correction"

# Check All
all_q = supabase.table("questions").select("count", count="exact").eq("subtopic", subtopic).execute()
print(f"Total in '{subtopic}': {all_q.count}")

# Check Difficulties
for diff in ["Easy", "Medium", "Hard", "Basic", "Intermediate", "Advanced"]:
    res = supabase.table("questions").select("count", count="exact").eq("subtopic", subtopic).eq("difficulty", diff).execute()
    print(f"Difficulty '{diff}': {res.count}")

# Check Sample
print("\nSample (Medium):")
sample = supabase.table("questions").select("id, difficulty, subtopic").eq("subtopic", subtopic).eq("difficulty", "Medium").limit(1).execute()
print(sample.data)
