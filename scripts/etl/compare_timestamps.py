import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("Error: Supabase credentials missing.")
    exit(1)

supabase = create_client(url, key)

def compare_timestamps():
    # Target Question
    target_id = "c886f278-255b-4376-aebb-4f2dc59bbde9"
    
    # Known Questions
    # We need to find their IDs first based on text
    box_q = supabase.table("questions").select("id, created_at, question_text").ilike("question_text", "%box that has the shape of a cube%").execute()
    rect_q = supabase.table("questions").select("id, created_at, question_text").ilike("question_text", "%PQRT is a rectangle%").execute()
    target_q = supabase.table("questions").select("id, created_at, question_text").eq("id", target_id).execute()
    
    questions = []
    if box_q.data:
        questions.append({"label": "Box (372)", "data": box_q.data[0]})
    if rect_q.data:
        questions.append({"label": "Rect (374)", "data": rect_q.data[0]})
    if target_q.data:
        questions.append({"label": "Target (Trapezoid)", "data": target_q.data[0]})
        
    # Sort by created_at
    questions.sort(key=lambda x: x["data"]["created_at"])
    
    print("\n--- Question Order ---")
    for q in questions:
        print(f"{q['label']}: {q['data']['created_at']}")

if __name__ == "__main__":
    compare_timestamps()
