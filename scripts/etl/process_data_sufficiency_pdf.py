import os
import time
import json
import re
import google.generativeai as genai
from supabase import create_client
from dotenv import load_dotenv

# Load environment variables
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))

# Configuration
PDF_PATH = r"C:\Users\DCL\Downloads\Data-Sufficiency-GMAT-OG.pdf"
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

# Initialize clients
genai.configure(api_key=GEMINI_API_KEY)
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def upload_to_gemini(path, mime_type=None):
    """Uploads the given file to Gemini."""
    file = genai.upload_file(path, mime_type=mime_type)
    print(f"Uploaded file '{file.display_name}' as: {file.uri}")
    return file

def wait_for_files_active(files):
    """Waits for the given files to be active."""
    print("Waiting for file processing...")
    for name in (file.name for file in files):
        file = genai.get_file(name)
        while file.state.name == "PROCESSING":
            print(".", end="", flush=True)
            time.sleep(2)
            file = genai.get_file(name)
        if file.state.name != "ACTIVE":
            raise Exception(f"File {file.name} failed to process")
    print("...all files ready")

def process_pdf_batch(pdf_file, start_q, end_q):
    """
    Extracts questions from the PDF using Gemini.
    """
    model = genai.GenerativeModel(
        model_name="gemini-flash-latest",
        generation_config={
            "temperature": 0.1,
            "response_mime_type": "application/json",
        }
    )

    prompt = f"""
    You are an expert GMAT/Analytical teacher. I will provide a PDF containing Data Sufficiency questions.
    
    Your task is to extract questions numbered from {start_q} to {end_q} (inclusive).
    
    For each question, extract:
    1. The full question text (including the two statements).
    2. The options (usually standard A-E for Data Sufficiency, but extract them if present or provide standard GMAT DS options).
       - Standard GMAT DS Options:
         A) Statement (1) ALONE is sufficient, but statement (2) alone is not sufficient.
         B) Statement (2) ALONE is sufficient, but statement (1) alone is not sufficient.
         C) BOTH statements TOGETHER are sufficient, but NEITHER statement ALONE is sufficient.
         D) EACH statement ALONE is sufficient.
         E) Statements (1) and (2) TOGETHER are NOT sufficient.
    3. The correct answer.
    4. The explanation/solution.
    5. Classify the difficulty as 'Easy', 'Medium', or 'Hard'.
       - Easy: Basic concept application.
       - Medium: Requires multiple steps or combining concepts.
       - Hard: Complex logic, subtle traps, or advanced concepts.
    
    Output a JSON array of objects with this schema:
    [
        {{
            "question_text": "string",
            "options": ["string", "string", "string", "string", "string"],
            "correct_answer": "string (e.g., 'Option A')",
            "explanation": "string",
            "difficulty": "Easy" | "Medium" | "Hard"
        }}
    ]
    
    IMPORTANT:
    - Do NOT use LaTeX formatting. Use plain text.
    - Do NOT include backslashes in the JSON string.
    - Ensure the JSON is valid.
    """

    print(f"Requesting batch {start_q}-{end_q} from Gemini...")
    response = model.generate_content([pdf_file, prompt])
    return response.text

def upload_questions(questions):
    """Uploads questions to Supabase."""
    count = 0
    for q in questions:
        try:
            # Prepare payload
            payload = {
                "topic": "Analytical", # Data Sufficiency is under Analytical
                "subtopic": "Data Sufficiency", # Hardcoded for this unit
                "difficulty": q.get("difficulty", "Medium"),
                "question_text": q["question_text"],
                "options": q.get("options", []),
                "correct_answer": q.get("correct_answer", ""),
                "explanation": q.get("explanation", "")
            }
            
            # Insert into Supabase
            res = supabase.table("questions").insert(payload).execute()
            print(f"Uploaded: {q['question_text'][:30]}...")
            count += 1
            time.sleep(0.1) # Rate limit
            
        except Exception as e:
            print(f"Error uploading question: {e}")
            
    return count

def main():
    if not os.path.exists(PDF_PATH):
        print(f"Error: PDF file not found at {PDF_PATH}")
        return

    print("Uploading PDF to Gemini...")
    pdf_file = upload_to_gemini(PDF_PATH, mime_type="application/pdf")
    wait_for_files_active([pdf_file])

    total_uploaded = 0
    batch_size = 5
    # I don't know the exact number of questions in the GMAT PDF, let's assume a safe number or try to detect?
    # User didn't specify count. "Data-Sufficiency-GMAT-OG.pdf" likely has many.
    # Let's process a reasonable batch, say 50, or try to run until failure/empty?
    # I'll set it to 50 for now to be safe and efficient, or I can ask the user.
    # Actually, usually these PDFs have numbered questions. I'll try to process 1-50.
    total_questions = 50 

    for i in range(1, total_questions + 1, batch_size):
        start_q = i
        end_q = min(i + batch_size - 1, total_questions)
        
        print(f"\nProcessing questions {start_q} to {end_q}...")
        
        retries = 3
        for attempt in range(retries):
            try:
                json_text = process_pdf_batch(pdf_file, start_q, end_q)
                
                # Clean up JSON text if needed
                json_text = json_text.strip()
                if json_text.startswith("```json"):
                    json_text = json_text[7:]
                if json_text.endswith("```"):
                    json_text = json_text[:-3]
                
                questions = json.loads(json_text)
                
                if not questions:
                    print("No questions found in response.")
                    # If we find no questions in a batch, it might mean we reached the end.
                    # But sometimes Gemini just fails. Let's count consecutive failures?
                    # For now, if empty, maybe break?
                    # Let's just continue and see if next batch has data (unlikely if sequential).
                    # I'll break if it's the first attempt and empty, assuming end of file.
                    break 
                    
                print(f"Extracted {len(questions)} questions.")
                uploaded = upload_questions(questions)
                total_uploaded += uploaded
                break # Success
                
            except Exception as e:
                print(f"Error in batch {start_q}-{end_q} (Attempt {attempt+1}/{retries}): {e}")
                time.sleep(5)
        
        time.sleep(2) # Be nice to API

    print(f"\nTotal questions uploaded: {total_uploaded}")

if __name__ == "__main__":
    main()
