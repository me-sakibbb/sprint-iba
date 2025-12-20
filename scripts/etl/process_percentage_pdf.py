import os
import json
import time
import google.generativeai as genai
from supabase import create_client
from dotenv import load_dotenv

# Load environment variables
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))

# Setup Supabase
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(url, key)

# Setup Gemini
genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))
model = genai.GenerativeModel('gemini-flash-latest')

PDF_PATH = r"C:\Users\DCL\Downloads\Top 27 CAT Percentages Questions With Video Solutions.pdf"

def upload_to_gemini(path, mime_type="application/pdf"):
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

def process_pdf_batch(pdf_file, start, end):
    prompt = f"""
    You are an expert math content creator. Your task is to extract, paraphrase, and classify math questions from the provided PDF file.
    
    **TARGET:** Process ONLY questions numbered {start} to {end} (inclusive). If there are fewer questions than {end}, stop at the last one.
    
    **INSTRUCTIONS:**
    1.  **Extract**: Identify the questions in the specified range.
    2.  **Paraphrase**: You MUST rewrite the question text and options to change names, characters, and scenarios to avoid copyright issues. Keep the mathematical logic and numbers identical.
    3.  **Classify**: Determine the difficulty level: 'Easy' (Basic), 'Medium' (Intermediate), or 'Hard' (Advanced).
    4.  **Format**: Return a JSON array of objects. Each object must have:
        - `question_text`: The paraphrased question. Use PLAIN TEXT for math (e.g., "x^2", "sqrt(4)", "pi"). DO NOT use LaTeX (no backslashes like \frac).
        - `options`: An array of strings.
        - `correct_answer`: The correct option text.
        - `explanation`: A clear, step-by-step explanation. Use PLAIN TEXT.
        - `difficulty`: 'Easy', 'Medium', or 'Hard'.
        - `subtopic`: 'Percentage'.
    
    **IMPORTANT:**
    - Return ONLY valid JSON.
    - Do not include markdown formatting.
    - NO LaTeX or backslashes.
    """
    
    try:
        response = model.generate_content([pdf_file, prompt])
        return response.text
    except Exception as e:
        print(f"Error calling Gemini: {e}")
        return "[]"

def upload_questions(questions):
    print(f"Uploading {len(questions)} questions to Supabase...")
    for q in questions:
        try:
            data = {
                "topic": "Math",
                "subtopic": "Percentage", # Matches Unit 12 filter
                "question_text": q.get("question_text"),
                "options": q.get("options"),
                "correct_answer": q.get("correct_answer"),
                "explanation": q.get("explanation"),
                "difficulty": q.get("difficulty")
            }
            supabase.table('questions').insert(data).execute()
        except Exception as e:
            print(f"Error uploading question: {e}")

def main():
    print(f"Checking file: {PDF_PATH}", flush=True)
    if not os.path.exists(PDF_PATH):
        print(f"File not found: {PDF_PATH}", flush=True)
        return

    print("Uploading PDF to Gemini...", flush=True)
    pdf_file = upload_to_gemini(PDF_PATH)
    wait_for_files_active([pdf_file])
    
    all_questions = []
    batch_size = 5
    total_estimated = 30 # User said "Top 27", so 30 is safe
    
    for start in range(1, total_estimated + 1, batch_size):
        end = start + batch_size - 1
        print(f"Processing questions {start} to {end}...", flush=True)
        
        json_response = process_pdf_batch(pdf_file, start, end)
        cleaned_json = json_response.replace("```json", "").replace("```", "").strip()
        
        try:
            questions = json.loads(cleaned_json)
            print(f"Batch {start}-{end}: Parsed {len(questions)} questions.", flush=True)
            if questions:
                upload_questions(questions)
                all_questions.extend(questions)
            else:
                print(f"Batch {start}-{end}: No questions found.", flush=True)
        except json.JSONDecodeError as e:
            print(f"Batch {start}-{end}: Failed to parse JSON: {e}", flush=True)
            print(f"Raw response preview: {cleaned_json[:500]}", flush=True)
        
        time.sleep(2)

    print(f"Total questions uploaded: {len(all_questions)}")
    print("Done!")

if __name__ == "__main__":
    main()
