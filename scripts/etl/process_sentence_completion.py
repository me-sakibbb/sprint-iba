import os
import re
import json
import pdfplumber
import google.generativeai as genai
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

# Configuration
PDF_PATH = r"C:\Users\DCL\Downloads\501-Sentence-Completion-Questions-1 (1).pdf"
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") # Use service role for admin inserts
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

# Initialize Clients
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
genai.configure(api_key=GEMINI_API_KEY)

# Use the requested model
MODEL_NAME = 'gemini-2.0-pro-exp-02-05' # Best available match for "2.5 pro" request from list
# User asked for 2.5 pro, let's try to match it if it was in the list.
# List had: models/gemini-2.5-pro
MODEL_NAME = 'details-pending' 

def get_model():
    # Helper to find the best model
    try:
        models = genai.list_models()
        for m in models:
            if 'gemini-2.5-pro' in m.name:
                return m.name
        # Fallback
        return 'models/gemini-1.5-pro'
    except:
        return 'models/gemini-1.5-pro'

def extract_text_from_pdf(path):
    print(f"Extracting text from {path}...")
    full_text = ""
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            full_text += page.extract_text() + "\n"
    return full_text

import time
from google.api_core import exceptions

def parse_with_gemini(text_chunk, model_name):
    model = genai.GenerativeModel(model_name)
    
    prompt = """
    You are an expert data extraction assistant.
    I have a text chunk from a "Sentence Completion" practice book.
    It contains numbered questions (e.g., "1. The...") with options (a, b, c, d, e).
    OR it contains numbered answers with explanations (e.g., "1. a. Explanation...").
    
    Your task is to extract this data into a structured JSON format.
    
    If the text contains QUESTIONS, return a list of objects:
    {
        "number": 1,
        "text": "Question text here...",
        "options": ["a. Option 1", "b. Option 2", ...]
    }
    
    If the text contains ANSWERS, return a list of objects:
    {
        "number": 1,
        "correct_option": "a",
        "explanation": "Full explanation text..."
    }
    
    Only return valid JSON. Do not include markdown formatting like ```json.
    """
    
    retries = 5
    for attempt in range(retries):
        try:
            response = model.generate_content([prompt, text_chunk])
            clean_json = response.text.replace("```json", "").replace("```", "").strip()
            return json.loads(clean_json)
        except exceptions.ResourceExhausted:
            print(f"Rate limit hit. Sleeping for 40 seconds... (Attempt {attempt+1}/{retries})")
            time.sleep(40)
        except Exception as e:
            print(f"Error parsing JSON: {e}")
            if "429" in str(e):
                 print(f"Rate limit hit (generic). Sleeping for 40 seconds... (Attempt {attempt+1}/{retries})")
                 time.sleep(40)
            else:
                return []
    print("Max retries reached.")
    return []

def process_and_upload():
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Error: Supabase credentials missing.")
        return

    # 1. Get Text - SKIP (we use pdfplumber directly)
    # raw_text = extract_text_from_pdf(PDF_PATH)
    
    # 2. Split into Questions Section and Answers Section
    
    all_questions = {}
    all_answers = {}
    
    model_name = get_model()
    print(f"Using model: {model_name}")

    with pdfplumber.open(PDF_PATH) as pdf:
        total_pages = len(pdf.pages)
        
        # INCREASED BATCH SIZE TO 20 to reduce API calls
        batch_size = 20
        for i in range(0, total_pages, batch_size):
            chunk = ""
            for j in range(i, min(i + batch_size, total_pages)):
                chunk += pdf.pages[j].extract_text() + "\n"
            
            print(f"Processing pages {i+1} to {min(i+batch_size, total_pages)}...")
            data = parse_with_gemini(chunk, model_name)
            
            for item in data:
                num = item.get("number")
                if not num: continue
                
                if "text" in item: # It's a question
                    all_questions[num] = item
                elif "correct_option" in item: # It's an answer
                    all_answers[num] = item
            
            # Sleep to be nice to the API even if successful
            time.sleep(5) 

                    
    # 3. Merge and Upload
    print("Merging data...")
    questions_to_insert = []
    
    for num, q_data in all_questions.items():
        ans_data = all_answers.get(num)
        
        # Map options to standard format
        options = []
        if "options" in q_data:
            for opt in q_data["options"]:
                # Remove "a. " prefix etc if clear
                clean_opt = re.sub(r'^[a-e]\.\s*', '', opt)
                options.append(clean_opt)
        
        correct = None
        explanation = None
        
        if ans_data:
            correct_char = ans_data.get("correct_option", "").lower()
            # Map 'a' -> 0, 'b' -> 1... -> actually we store "A", "B" etc or the text?
            # Existing system uses "A", "B"...
            correct = correct_char.upper()
            explanation = ans_data.get("explanation")
            
        questions_to_insert.append({
            "question_text": q_data["text"],
            "options": options,
            "correct_answer": correct,
            "explanation": explanation,
            "topic": "English",
            "subtopic": "Sentence Completion",
            "subject": "English",
            "difficulty": "Intermediate" # Default
        })
        
    print(f"Found {len(questions_to_insert)} questions.")
    
    # Upload in batches
    batch_size = 50
    for i in range(0, len(questions_to_insert), batch_size):
        batch = questions_to_insert[i:i+batch_size]
        result = supabase.table("questions").insert(batch).execute()
        print(f"Inserted batch {i//batch_size + 1}")

if __name__ == "__main__":
    process_and_upload()
