import os
import json
import time
import google.generativeai as genai
from dotenv import load_dotenv

class GeminiProcessor:
    def __init__(self):
        print("Processor: Loading dotenv...")
        load_dotenv(override=True)
        self.api_key = os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY not found in environment variables")
            
        print(f"Processor: Configuring Gemini with key: {self.api_key[:10]}...")
        genai.configure(api_key=self.api_key)
        self.model_name = 'gemini-1.5-flash' # Default model
        self.model = genai.GenerativeModel(self.model_name)
        print("Processor: Configured Gemini")

    def upload_file(self, path, mime_type="application/pdf"):
        """Uploads a file to Gemini for processing."""
        print(f"Uploading file: {path}")
        file = genai.upload_file(path, mime_type=mime_type)
        print(f"Uploaded file '{file.display_name}' as: {file.uri}")
        
        # Wait for processing
        while file.state.name == "PROCESSING":
            print(".", end="", flush=True)
            time.sleep(2)
            file = genai.get_file(file.name)
            
        if file.state.name != "ACTIVE":
            raise Exception(f"File {file.name} failed to process")
        print("...file ready")
        return file

    def process_content(self, content, prompt_template, is_file=False):
        """
        Generic processor for both text and file content.
        """
        models_to_try = [
            'gemini-flash-latest',
            'gemini-1.5-flash-latest',
            'gemini-1.5-flash',
            'gemini-2.0-flash-exp',
        ]

        for model_name in models_to_try:
            try:
                self.model = genai.GenerativeModel(model_name)
                
                if is_file:
                    # content is a file object from upload_file
                    response = self.model.generate_content([content, prompt_template])
                else:
                    # content is text string
                    full_prompt = f"{prompt_template}\n\nCONTENT TO PROCESS:\n{content}"
                    response = self.model.generate_content(full_prompt)

                return self._clean_json(response.text)

            except Exception as e:
                print(f"Error processing with Gemini ({model_name}): {e}")
                if "429" in str(e) or "Quota" in str(e) or "404" in str(e) or "400" in str(e):
                    print(f"Model {model_name} quota/error, retrying in 20s...")
                    time.sleep(20) # Wait a bit before next model
                    continue
                else:
                    return None
        
        print("All models failed.")
        return None

    def _clean_json(self, text):
        # Try to find JSON list structure
        start = text.find('[')
        end = text.rfind(']')
        
        if start != -1 and end != -1 and end > start:
            text = text[start:end+1]
        
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            print(f"Failed to parse JSON response. Raw text length: {len(text)}")
            # print(f"Raw text snippet: {text[:100]}...") # Debug
            return None

    def get_question_prompt(self):
        return """
        You are an Expert Exam Creator. Your task is to EXTRACT EVERY SINGLE QUESTION from the provided document pages.
        
        CRITICAL INSTRUCTIONS:
        1. EXTRACT ALL: Do not skip ANY questions. If there are 8 questions on the page, you must return 8 objects.
        2. NO SUMMARIES: Do not summarize or group questions. Each question must be a separate object.
        3. EXACT TEXT: Keep the question text as close to the original as possible, but ensure it is readable.
        4. OPTIONS: If options are present (A, B, C, D, E), include them. If not, infer standard Data Sufficiency options if it's a DS question.
        5. FORMAT: Return a valid JSON LIST of objects.
        
        JSON SCHEMA:
        [
            {
                "question_text": "...",
                "options": [{"id": "A", "text": "..."}],
                "correct_answer": "A", // If not found, default to "A"
                "explanation": "...", // If not found, default to "See solution."
                "difficulty": "Medium", // Will be overridden by config
                "topic": "Math",
                "subtopic": "Algebra"
            }
        ]
        """

if __name__ == "__main__":
    # Test
    proc = GeminiProcessor()
    dummy_text = "If x + 2 = 4, what is x? A. 1 B. 2 OA is B"
    print(proc.process_content(dummy_text, proc.get_question_prompt()))
