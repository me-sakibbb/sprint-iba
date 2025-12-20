import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(url, key)

updates = {
    "Basic": "Easy",
    "Intermediate": "Medium",
    "Advanced": "Hard"
}

for old, new in updates.items():
    print(f"Updating {old} -> {new}...")
    try:
        response = supabase.table("questions").update({"difficulty": new}).eq("difficulty", old).execute()
        # response.data might be empty depending on Supabase version return preference, but logic runs.
        print(f"Updated.")
    except Exception as e:
        print(f"Error: {e}")
