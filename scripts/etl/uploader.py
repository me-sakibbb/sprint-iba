import os
from supabase import create_client, Client
from dotenv import load_dotenv

class SupabaseUploader:
    def __init__(self):
        load_dotenv()
        self.url = os.getenv("SUPABASE_URL")
        self.key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        
        if not self.url or not self.key:
            raise ValueError("Supabase credentials missing in .env")
            
        self.client: Client = create_client(self.url, self.key)

    def upload_questions(self, questions: list):
        """
        Uploads a list of questions to Supabase.
        """
        if not questions:
            return 0
            
        success_count = 0
        for q in questions:
            if self.upload_single_question(q):
                success_count += 1
        return success_count

    def upload_single_question(self, data):
        try:
            # Normalize data structure if needed
            payload = {
                "question_text": data.get("question_text"),
                "options": data.get("options"),
                "correct_answer": data.get("correct_answer"),
                "explanation": data.get("explanation"),
                "difficulty": data.get("difficulty"),
                "topic": data.get("topic"),
                "subtopic": data.get("subtopic"),
            }
            
            # Check for duplicates
            existing = self.client.table("questions") \
                .select("id") \
                .eq("question_text", data.get("question_text")) \
                .eq("subtopic", data.get("subtopic")) \
                .execute()
                
            if existing.data and len(existing.data) > 0:
                print(f"Found duplicate: {data.get('subtopic')} - {data.get('difficulty')}. Updating difficulty...")
                # Update difficulty if different
                self.client.table("questions") \
                    .update({"difficulty": data.get("difficulty")}) \
                    .eq("id", existing.data[0]['id']) \
                    .execute()
                return True

            response = self.client.table("questions").insert(payload).execute()
            if response.data:
                print(f"Uploaded: {data.get('subtopic')} - {data.get('difficulty')}")
                return True
            return False
        except Exception as e:
            print(f"Upload Error: {e}")
            return False

if __name__ == "__main__":
    uploader = SupabaseUploader()
    # Test
    # uploader.upload_single_question({...})
