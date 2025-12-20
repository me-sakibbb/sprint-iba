import os
from supabase import create_client
from dotenv import load_dotenv

# Load environment variables
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

supabase = create_client(url, key)

def clear_puzzles():
    print("Clearing existing puzzles and puzzle questions...")
    
    try:
        # 0. Delete related user_progress
        print("Deleting related user_progress...")
        # Fetch IDs of Analytical questions
        q_res = supabase.table("questions").select("id").eq("topic", "Analytical").execute()
        q_ids = [q['id'] for q in q_res.data]
        
        if q_ids:
            # Delete progress for these questions
            # Supabase-py doesn't support 'in' delete easily without raw sql or loop if list is huge
            # But we can try .in_()
            res = supabase.table("user_progress").delete().in_("question_id", q_ids).execute()
            print(f"Deleted {len(res.data)} user_progress records.")
        
        # 1. Delete all Analytical questions
        print("Deleting all Analytical questions...")
        res = supabase.table("questions").delete().eq("topic", "Analytical").execute()
        print(f"Deleted {len(res.data)} Analytical questions.")
        
        # 2. Delete all puzzles
        print("Deleting all puzzles...")
        res = supabase.table('puzzles').delete().neq('id', '00000000-0000-0000-0000-000000000000').execute() # Delete all
        print(f"Deleted {len(res.data)} puzzles.")
        
    except Exception as e:
        print(f"Error clearing data: {e}")

if __name__ == "__main__":
    clear_puzzles()
