import os
import json
import time
import google.generativeai as genai
from pypdf import PdfReader
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

# Configuration
PDF_PATH = r"C:\Users\DCL\Downloads\501-Sentence-Completion-Questions-1 (1).pdf"
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") # using service role key for deletion
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Initialize Clients
genai.configure(api_key=GEMINI_API_KEY)
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Model setup
generation_config = {
  "temperature": 0.1,
  "top_p": 0.95,
  "top_k": 40,
  "max_output_tokens": 8192,
  "response_mime_type": "application/json",
}

model = genai.GenerativeModel(
  model_name="gemini-2.5-pro", 
  generation_config=generation_config,
)

def extract_text_from_pdf(pdf_path):
    print(f"Extracting text from {pdf_path}...")
    reader = PdfReader(pdf_path)
    text = ""
    for page in reader.pages:
        text += page.extract_text() + "\n"
    return text


def delete_existing_unit(topic, subtopic):
    print(f"Deleting existing questions for {topic} - {subtopic}...")
    try:
        # Step 1: Fetch IDs to delete (optional, but good for logging)
        response = supabase.table("questions").select("id").eq("topic", topic).eq("subtopic", subtopic).execute()
        count = len(response.data)
        
        if count > 0:
            # Step 2: Delete
            supabase.table("questions").delete().eq("topic", topic).eq("subtopic", subtopic).execute()
            print(f"Deleted {count} questions.")
        else:
            print("No existing questions found to delete.")
            
    except Exception as e:
        print(f"Error deleting unit: {e}")

def upload_questions(questions, topic, subtopic):
    print(f"Uploading {len(questions)} questions to {topic} - {subtopic}...")
    formatted_questions = []
    
    for q in questions:
        # Validate required fields
        if not q.get("question_text") or not q.get("options") or not q.get("correct_answer"):
            continue
            
        formatted_questions.append({
            "question_text": q.get("question_text"),
            "options": q.get("options"),
            "correct_answer": q.get("correct_answer"),
            "explanation": q.get("explanation", "Correct answer."),
            "difficulty": q.get("difficulty", "Intermediate"),
            "topic": topic,
            "subtopic": subtopic
        })
    
    # Batch upload to avoid timeouts
    batch_size = 50
    for i in range(0, len(formatted_questions), batch_size):
        batch = formatted_questions[i:i+batch_size]
        try:
            supabase.table("questions").insert(batch).execute()
            print(f"Uploaded batch {i//batch_size + 1}")
        except Exception as e:
            print(f"Error uploading batch {i//batch_size + 1}: {e}")

def main():
    # 1. Cleanup
    delete_existing_unit("English", "Question bank")
    
    # 2. Extract PDF
    full_text = extract_text_from_pdf(PDF_PATH)
    
    # 3. Chunk and Process
    # Slice for smaller chunks to avoid overload
    chunk_size = 5000 
    chunks = [full_text[i:i+chunk_size] for i in range(0, len(full_text), chunk_size)]
    
    all_questions = []
    
    print(f"Processing {len(chunks)} chunks...")
    for i, chunk in enumerate(chunks):
        print(f"Processing chunk {i+1}/{len(chunks)}...")
        questions = parse_questions_with_gemini(chunk)
        all_questions.extend(questions)
        time.sleep(1) # Faster rate limit

def parse_questions_with_gemini(text_chunk):
    prompt = """
    Extract multiple-choice sentence completion questions from the following text.
    Return a valid JSON array of objects.
    Each object must have:
    - "question_text": The sentence with a blank (use _____ for the blank).
    - "options": A dictionary where keys are "A", "B", "C", "D", "E" (if available) and values are the answer choices.
    - "correct_answer": The key of the correct option (e.g., "A").
    - "explanation": A brief explanation of why the answer is correct (infer it if not explicitly provided).
    - "difficulty": "Basic", "Intermediate", or "Advanced". Estimate based on vocabulary complexity.
    
    The input text may contain question numbers, instructions, or garbage text. Ignore them.
    Output ONLY the JSON array.
    """
    
    try:
        response = model.generate_content([prompt, text_chunk])
        return json.loads(response.text)
    except Exception as e:
        print(f"Error parsing chunk with Gemini: {e}")
        try:
             print(f"Feedback: {response.prompt_feedback}")
        except:
             pass
        try:
             print(f"Candidates: {response.candidates}")
        except:
             pass
        return []
        
    print(f"Extracted {len(all_questions)} total questions.")
    
    # 4. Filter/Sort (User asked for sorting, but database storage order doesn't matter much if we query by difficulty)
    #However, we can just ensure they are tagged correctly.
    
    # 5. Upload
    if all_questions:
        upload_questions(all_questions, "English", "Sentence Correction")
    else:
        print("No questions extracted.")

    # 6. Verify count (Optional log)
    print("ETL Process Completed.")

if __name__ == "__main__":
    main()
