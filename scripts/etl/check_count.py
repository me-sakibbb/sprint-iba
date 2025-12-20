import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(url, key)

response = supabase.table("questions").select("count", count="exact").eq("subtopic", "Sentence Correction").execute()
print(f"Sentence Correction Count: {response.count}")
