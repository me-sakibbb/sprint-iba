import os
import json
import time
import google.generativeai as genai
from pypdf import PdfReader
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))

# Configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") # Using the key from env, hoping it works or user updated it

# Initialize clients
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-flash-latest')


supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

PDF_PATH = r"C:\Users\DCL\Downloads\GRE 200 Puzzles.pdf"

def extract_text_from_pdf(pdf_path):
    reader = PdfReader(pdf_path)
    text = ""
    # Skip preface, start from page 5 where puzzles seem to start (index 4)
    # Limit to first 50 pages for now to avoid overwhelming or huge costs/time
    for i in range(4, min(54, len(reader.pages))): 
        text += reader.pages[i].extract_text() + "\n"
    return text

def parse_puzzles_with_gemini(text_chunk):
    prompt = """
    You are an expert data extractor. Extract analytical reasoning puzzles from the following text.
    Each puzzle has a main body (scenario) and a set of questions associated with it.
    
    Return a JSON array of objects with this structure:
    [
        {
            "body": "The full text of the scenario/puzzle description",
            "category": "One of: 'Ordering', 'Grouping', 'Scheduling', 'Selection', 'Mixed'",
            "difficulty": "One of: 'Easy', 'Medium', 'Hard'",
            "questions": [
                {
                    "question_text": "The question text",
                    "options": ["Option A", "Option B", "Option C", "Option D", "Option E"],
                    "correct_answer": "The correct option (e.g., 'Option A' or just 'A')",
                    "explanation": "Brief explanation if available, else empty string"
                }
            ]
        }
    ]
    
    If the text contains no complete puzzles, return an empty array [].
    Clean up the text (remove page numbers, headers).
    Ensure options are a list of strings.
    Infer the category based on the puzzle logic.
    Infer the difficulty based on the complexity of the rules and the number of variables.
    - Easy: Straightforward ordering or grouping with few constraints.
    - Medium: Standard logic games with multiple constraints.
    - Hard: Complex scenarios, conditional rules, or "if/then" chains.
    
    Text to process:
    """ + text_chunk
    
    retries = 10
    for attempt in range(retries):
        try:
            response = model.generate_content(prompt)
            # Extract JSON from response
            content = response.text
            start = content.find('[')
            end = content.rfind(']') + 1
            if start != -1 and end != -1:
                json_str = content[start:end]
                return json.loads(json_str)
            return []
        except Exception as e:
            if "429" in str(e):
                print(f"Rate limit hit (attempt {attempt+1}/{retries}). Waiting 60s...")
                time.sleep(60)
            else:
                print(f"Error parsing with Gemini: {e}")
                return []
    return []

def upload_to_supabase(puzzles):
    for puzzle in puzzles:
        try:
            # 1. Insert Puzzle
            puzzle_data = {"body": puzzle['body']}
            res = supabase.table('puzzles').insert(puzzle_data).execute()
            if not res.data:
                print("Failed to insert puzzle")
                continue
                
            puzzle_id = res.data[0]['id']
            print(f"Inserted puzzle: {puzzle_id}")
            
            # 2. Insert Questions
            questions_to_insert = []
            for q in puzzle['questions']:
                # Format options as JSON array of objects for consistency with existing frontend
                # Existing frontend expects options as: [{id: 'A', text: '...'}, ...] or just strings?
                # Let's check the frontend code. PracticeSession.tsx maps options.
                # It handles `q.options` which comes from DB.
                # If DB options is JSONB, we should store it as a list of strings or objects.
                # The scraper stored it as `options` column.
                
                # Let's store as simple list of strings for now, or formatted objects if needed.
                # Based on previous logs, options is JSONB.
                
                formatted_options = []
                letters = ['A', 'B', 'C', 'D', 'E']
                for idx, opt in enumerate(q['options']):
                    if idx < 5:
                        formatted_options.append({
                            "id": letters[idx],
                            "text": opt
                        })
                
                # Normalize subtopic
                subtopic = puzzle.get('category', 'Puzzles')
                if subtopic == 'Ordering/Structure':
                    subtopic = 'Ordering'

                questions_to_insert.append({
                    "topic": "Analytical",
                    "subtopic": subtopic,
                    "difficulty": puzzle.get('difficulty', 'Hard'), # Use extracted difficulty or default
                    "question_text": q['question_text'],
                    "options": formatted_options,
                    "correct_answer": q['correct_answer'],
                    "explanation": q.get('explanation', ''),
                    "puzzle_id": puzzle_id
                })
            
            if questions_to_insert:
                supabase.table('questions').insert(questions_to_insert).execute()
                print(f"Inserted {len(questions_to_insert)} questions for puzzle {puzzle_id}")
                
        except Exception as e:
            print(f"Error uploading puzzle: {e}")

def main():
    print("Reading PDF...")
    full_text = extract_text_from_pdf(PDF_PATH)
    print(f"Extracted {len(full_text)} characters.")
    
    # Chunk text to avoid token limits (approx 10k chars per chunk)
    chunk_size = 15000 
    chunks = [full_text[i:i+chunk_size] for i in range(0, len(full_text), chunk_size)]
    
    print(f"Processing {len(chunks)} chunks...")
    
    for i, chunk in enumerate(chunks):
        print(f"Processing chunk {i+1}/{len(chunks)}...")
        puzzles = parse_puzzles_with_gemini(chunk)
        if puzzles:
            print(f"Found {len(puzzles)} puzzles in chunk {i+1}. Uploading...")
            upload_to_supabase(puzzles)
            time.sleep(20) # Rate limiting
        else:
            print(f"No puzzles found in chunk {i+1}")

if __name__ == "__main__":
    main()
