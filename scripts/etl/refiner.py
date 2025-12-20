import os
import json
import time
import google.generativeai as genai
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

# Configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

genai.configure(api_key=GEMINI_API_KEY)
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def get_gemini_response(prompt, retries=3):
    for attempt in range(retries):
        try:
            model = genai.GenerativeModel('gemini-pro-latest')
            response = model.generate_content(prompt)
            text = response.text.strip()
            if text.startswith("```json"):
                text = text[7:]
            if text.endswith("```"):
                text = text[:-3]
            return json.loads(text)
        except Exception as e:
            if "429" in str(e):
                wait_time = (2 ** attempt) * 2 # 2, 4, 8 seconds
                print(f"Gemini Rate Limit (429). Retrying in {wait_time}s...")
                time.sleep(wait_time)
            else:
                print(f"Gemini Error: {e}")
                return None
    return None

def normalize_subtopics():
    print("\n--- Starting Subtopic Normalization ---")
    
    # 1. Fetch all unique subtopics
    response = supabase.table("questions").select("subtopic").execute()
    if not response.data:
        print("No data found.")
        return

    all_subtopics = list(set([item['subtopic'] for item in response.data if item['subtopic']]))
    print(f"Found {len(all_subtopics)} unique subtopics: {all_subtopics}")
    
    if not all_subtopics:
        return

    # 2. Ask Gemini to normalize
    prompt = f"""
    You are a Data Architect. I have a list of inconsistent subtopics from a question bank.
    Your task is to generalize and merge them into a clean, unified list of high-level subtopics.
    
    Example:
    Input: ["Arithmetic > Averages", "Averages", "Math - Averages", "Geometry > Circles"]
    Output: {{ "Arithmetic > Averages": "Averages", "Averages": "Averages", "Math - Averages": "Averages", "Geometry > Circles": "Circles" }}
    
    Current List:
    {json.dumps(all_subtopics)}
    
    Return strictly a JSON object mapping 'Old Name' -> 'New Name'.
    """
    
    mapping = get_gemini_response(prompt)
    if not mapping:
        print("Failed to get mapping from AI.")
        return

    print("Normalization Mapping:", json.dumps(mapping, indent=2))
    
    # 3. Update Supabase
    for old_name, new_name in mapping.items():
        if old_name != new_name:
            print(f"Updating '{old_name}' -> '{new_name}'...")
            supabase.table("questions").update({"subtopic": new_name}).eq("subtopic", old_name).execute()
            
    print("Subtopic Normalization Complete.")

def remove_redundant_questions():
    print("\n--- Starting Redundancy Removal ---")
    
    # 1. Fetch all questions
    response = supabase.table("questions").select("id, question_text, subtopic, difficulty").execute()
    questions = response.data
    
    # 2. Group by Subtopic
    grouped = {}
    for q in questions:
        sub = q.get('subtopic', 'Uncategorized')
        if sub not in grouped:
            grouped[sub] = []
        grouped[sub].append(q)
        
    # 3. Analyze each group
    for subtopic, q_list in grouped.items():
        if len(q_list) < 2:
            continue
            
        print(f"Analyzing {len(q_list)} questions in '{subtopic}'...")
        
        # Prepare simplified list for AI
        simplified_list = [{"id": q['id'], "text": q['question_text'][:200]} for q in q_list]
        
        prompt = f"""
        You are a Content Editor. I have a list of questions for the subtopic '{subtopic}'.
        Identify questions that are REDUNDANT (i.e., they test the exact same concept with very similar logic/numbers).
        
        Keep the best version of each unique concept. Mark the others for deletion.
        
        Questions:
        {json.dumps(simplified_list)}
        
        Return strictly a JSON object with a list of IDs to DELETE:
        {{ "delete_ids": ["id1", "id2"] }}
        """
        
        result = get_gemini_response(prompt)
        if result and "delete_ids" in result:
            ids_to_delete = result["delete_ids"]
            if ids_to_delete:
                print(f"Found {len(ids_to_delete)} redundant questions to delete.")
                for q_id in ids_to_delete:
                    print(f"Deleting {q_id}...")
                    supabase.table("questions").delete().eq("id", q_id).execute()
            else:
                print("No redundancies found.")
        
        time.sleep(1) # Rate limit

if __name__ == "__main__":
    normalize_subtopics()
    remove_redundant_questions()
