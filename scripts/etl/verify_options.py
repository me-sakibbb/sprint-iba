import os
import json
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(url, key)

print("Verifying option format...")
try:
    data = supabase.table("questions").select("*").eq("subtopic", "Sentence Correction").limit(1).execute()
    if data.data:
        q = data.data[0]
        print(f"ID: {q['id']}")
        print(f"Options Type: {type(q['options'])}")
        print(f"Options Content: {q['options']}")
        
        if isinstance(q['options'], list):
            print("SUCCESS: Options are stored as a List/Array.")
        else:
            print("WARNING: Options are NOT a list.")
    else:
        print("No questions found yet.")
except Exception as e:
    print(f"Error fetching sample: {e}")
