import time
import scraper
from processor import GeminiProcessor
from uploader import SupabaseUploader
from etl_config import get_config

def run_pipeline():
    print("Starting Unified ETL Pipeline...")
    
    config = get_config()
    if not config.jobs:
        print("No jobs defined in etl_config.py. Exiting.")
        return

    processor = GeminiProcessor()
    uploader = SupabaseUploader()
    
    uploaded_files_cache = {}

    for job in config.jobs:
        print(f"\nProcessing Job: {job.type} -> {job.source}")
        
        try:
            questions_to_upload = []
            
            # --- EXTRACT ---
            if job.type == "url":
                print("-> Extracting from URL...")
                raw_data_list = scraper.extract_content(job.source)
                
                # --- TRANSFORM ---
                for raw_item in raw_data_list:
                    if "error" in raw_item:
                        print(f"  Error extracting: {raw_item['error']}")
                        continue
                        
                    print("  -> Transforming content with Gemini...")
                    # Inject topic/subtopic into the prompt context if needed, 
                    # or just rely on the processor's default prompt
                    prompt = processor.get_question_prompt()
                    structured_data = processor.process_content(
                        raw_item["raw_text"], 
                        prompt, 
                        is_file=False
                    )
                    
                    if structured_data:
                        # Ensure it's a list
                        if isinstance(structured_data, dict):
                            structured_data = [structured_data]
                            
                        for q in structured_data:
                            # Enrich with config metadata
                            q["topic"] = job.topic
                            q["subtopic"] = job.subtopic
                            if job.difficulty:
                                q["difficulty"] = job.difficulty
                            questions_to_upload.append(q)
                            
            elif job.type == "pdf":
                print("-> Processing PDF...")
                
                # Check cache
                if job.source in uploaded_files_cache:
                    print("  -> Using cached file upload...")
                    pdf_file = uploaded_files_cache[job.source]
                else:
                    # Upload file to Gemini
                    pdf_file = processor.upload_file(job.source)
                    uploaded_files_cache[job.source] = pdf_file
                
                # Construct prompt with page range if specified
                prompt = processor.get_question_prompt()
                if job.page_range:
                    start, end = job.page_range
                    # Convert 0-indexed tuple to 1-indexed page numbers for the prompt
                    prompt = f"ONLY process pages {start+1} to {end+1}.\n{prompt}"
                
                print("  -> Transforming PDF content with Gemini...")
                structured_data = processor.process_content(
                    pdf_file, 
                    prompt, 
                    is_file=True
                )
                
                if structured_data:
                    if isinstance(structured_data, dict):
                        structured_data = [structured_data]
                    for q in structured_data:
                        q["topic"] = job.topic
                        q["subtopic"] = job.subtopic
                        if job.difficulty:
                            q["difficulty"] = job.difficulty
                        questions_to_upload.append(q)

            # --- LOAD ---
            if questions_to_upload:
                print(f"-> Uploading {len(questions_to_upload)} questions to Supabase...")
                count = uploader.upload_questions(questions_to_upload)
                print(f"  -> Uploaded {count} questions successfully.")
            else:
                print("-> No questions found/generated.")

        except Exception as e:
            print(f"Job Failed: {e}")
        
        # Rate limit between jobs
        print("Sleeping for 60s to respect rate limits...")
        time.sleep(60)

if __name__ == "__main__":
    run_pipeline()
