import os
from supabase import create_client
from dotenv import load_dotenv

# Load environment variables
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

supabase = create_client(url, key)

def clear_scraped_math():
    print("Clearing scraped math questions...")
    try:
        # Delete questions where subtopic starts with "CAT Questions |"
        # Supabase doesn't have a 'like' delete easily, so fetch IDs first
        res = supabase.table('questions').select('id, subtopic').ilike('subtopic', 'CAT Questions%').execute()
        
        ids_to_delete = [q['id'] for q in res.data]
        print(f"Found {len(ids_to_delete)} questions to delete.")
        
        if ids_to_delete:
            # Delete in batches of 50
            batch_size = 50
            for i in range(0, len(ids_to_delete), batch_size):
                batch = ids_to_delete[i:i+batch_size]
                print(f"Deleting batch {i//batch_size + 1}...")
                
                # Delete related user_progress first
                supabase.table('user_progress').delete().in_('question_id', batch).execute()
                
                # Delete questions
                res = supabase.table('questions').delete().in_('id', batch).execute()
                print(f"Deleted {len(res.data)} questions in batch.")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    clear_scraped_math()
