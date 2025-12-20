import os
from supabase import create_client
from dotenv import load_dotenv

# Load environment variables
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
    exit(1)

supabase = create_client(url, key)

def count_all():
    print(f"Using key starting with: {key[:5]}...")
    try:
        res = supabase.table('questions').select('id', count='exact').execute()
        print(f"Total questions in DB: {res.count}")
        
        # Check for duplicates (same question text)
        # This is expensive, so let's just check a sample or group by
        # Supabase doesn't support group by easily via client, so just fetch all IDs and texts if small enough
        # But 160 is small.
        
        res = supabase.table('questions').select('question_text, subtopic').execute()
        questions = res.data
        print(f"Fetched {len(questions)} rows.")
        
        seen = set()
        duplicates = 0
        for q in questions:
            if q['question_text'] in seen:
                duplicates += 1
            seen.add(q['question_text'])
            
        print(f"Found {duplicates} duplicate question texts.")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    count_all()
