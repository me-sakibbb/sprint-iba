import os
import json
import time
import google.generativeai as genai
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

# Configuration
PDF_PATH = r"C:\Users\DCL\Downloads\501-Sentence-Completion-Questions-1 (1).pdf"
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

genai.configure(api_key=GEMINI_API_KEY)
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Use 1.5 Pro as it definitely supports PDF and has large context. 
# 2.5 Pro likely does too, but let's stick to 1.5 Pro to be safe with File API unless confirmed.
# Actually, let's try 1.5 Pro first.
MODEL_NAME = "gemini-2.5-flash"

generation_config = {
  "temperature": 0.1,
  "top_p": 0.95,
  "top_k": 40,
  "max_output_tokens": 8192,
  "response_mime_type": "application/json",
}

model = genai.GenerativeModel(
  model_name=MODEL_NAME,
  generation_config=generation_config,
)

def upload_pdf(path):
    print(f"Uploading {path} to Gemini...")
    file_ref = genai.upload_file(path, mime_type="application/pdf")
    print(f"Uploaded file '{file_ref.display_name}' as: {file_ref.uri}")
    
    # Wait for processing
    while file_ref.state.name == "PROCESSING":
        print('.', end='', flush=True)
        time.sleep(2)
        file_ref = genai.get_file(file_ref.name)
        
    if file_ref.state.name == "FAILED":
        raise ValueError("File processing failed")
        
    print(f"\nFile processing complete: {file_ref.state.name}")
    return file_ref

def delete_existing_unit(topic, subtopic):
    print(f"Deleting existing questions for {topic} - {subtopic}...")
    try:
        response = supabase.table("questions").select("id").eq("topic", topic).eq("subtopic", subtopic).execute()
        count = len(response.data)
        if count > 0:
            supabase.table("questions").delete().eq("topic", topic).eq("subtopic", subtopic).execute()
            print(f"Deleted {count} questions.")
    except Exception as e:
        print(f"Error deleting unit: {e}")

def upload_to_supabase(questions, topic, subtopic):
    if not questions:
        return
    print(f"Uploading {len(questions)} questions...")
    formatted = []
    for q in questions:
        # Validate required fields
        if not q.get("question_text") or not q.get("options") or not q.get("correct_answer"):
            continue
            
        # Convert options dict to array if needed
        options_data = q.get("options")
        final_options = []
        if isinstance(options_data, dict):
            for key, value in options_data.items():
                final_options.append({"id": key, "text": value})
            # Sort by ID to be nice
            final_options.sort(key=lambda x: x["id"])
        elif isinstance(options_data, list):
             final_options = options_data
        
        formatted.append({
            "question_text": q.get("question_text"),
            "options": final_options,
            "correct_answer": q.get("correct_answer"),
            "explanation": q.get("explanation", "Correct answer."),
            "difficulty": q.get("difficulty", "Intermediate"),
            "topic": topic,
            "subtopic": subtopic
        })
    
    batch_size = 50
    for i in range(0, len(formatted), batch_size):
        batch = formatted[i:i+batch_size]
        try:
            supabase.table("questions").insert(batch).execute()
            print(f"  Batch {i//batch_size + 1} done.")
        except Exception as e:
            print(f"  Error uploading batch: {e}")

def main():
    # 1. Cleanup - Clear specific unit to avoid duplicates
    delete_existing_unit("English", "Sentence Correction")
    
    try:
        pdf_file = upload_pdf(PDF_PATH)
    except Exception as e:
        print(f"Failed to upload PDF: {e}")
        return

def main():
    # 1. Cleanup - Clear specific unit to avoid duplicates
    delete_existing_unit("English", "Sentence Correction")
    
    try:
        pdf_file = upload_pdf(PDF_PATH)
    except Exception as e:
        print(f"Failed to upload PDF: {e}")
        return

    # Extract in batches of 25 (safer for JSON limits)
    total_batches = 21 # 501 / 25 ~= 20.04
    
    for i in range(total_batches):
        start = i * 25 + 1
        end = (i + 1) * 25
        if start > 501: break
        
        print(f"Extracting questions {start} to {end}...")
        
        prompt = f"""
        Extract questions numbered {start} through {end} from the PDF file.
        Return a valid JSON array of objects.
        Each object must have:
        - "question_text": The sentence with a blank.
        - "options": A dictionary where keys are "A", "B", "C", "D", "E" (if available) and values.
        - "correct_answer": The key of the correct option.
        - "explanation": Brief explanation.
        - "difficulty": "Basic", "Intermediate", or "Advanced".
        
        If you cannot find questions in this specific range, find the NEXT available questions up to 50 items.
        Output ONLY the JSON array.
        """
        
        retries = 3
        while retries > 0:
            try:
                response = model.generate_content([pdf_file, prompt])
                batch_questions = json.loads(response.text)
                if batch_questions:
                    upload_to_supabase(batch_questions, "English", "Sentence Correction")
                    print(f"Extracted {len(batch_questions)} questions.")
                    break
                else:
                    print("Empty response.")
            except Exception as e:
                print(f"Error extracting batch {start}-{end}: {e}")
                time.sleep(5)
                retries -= 1
        
        if retries == 0:
             print(f"Skipping batch {start}-{end} due to errors.")
             
        time.sleep(10) # Increased delay to avoid 429

    print("ETL V2 Completed.")

if __name__ == "__main__":
    main()
