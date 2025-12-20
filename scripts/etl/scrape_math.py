import os
import json
import time
import requests
from bs4 import BeautifulSoup
import google.generativeai as genai
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))

# Configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# Initialize clients
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-flash-latest')
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

BASE_URL = "https://iim-cat-questions-answers.2iim.com"
START_URL = "https://iim-cat-questions-answers.2iim.com/quant/arithmetic/set-theory/"

def get_soup(url):
    try:
        response = requests.get(url)
        response.raise_for_status()
        return BeautifulSoup(response.text, 'html.parser')
    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return None

def get_topic_links():
    print(f"Fetching topics from {START_URL}...")
    soup = get_soup(START_URL)
    if not soup:
        return []
    
    topics = []
    # Look for the "CAT Quantitative Aptitude" section
    # Based on user description, it's likely a list of links.
    # I'll look for links that seem to be topics.
    # A good heuristic might be links under a specific header or div.
    # Let's try to find a header "CAT Quantitative Aptitude" and get links after it.
    
    # Since I don't have the exact DOM selector, I'll use a broader search and filter.
    # Or I can use the text "CAT Quantitative Aptitude" to find the section.
    
    # Let's look for links containing "/quant/" which seems to be the pattern.
    links = soup.find_all('a', href=True)
    print(f"Found {len(links)} total links on page.")
    
    for a in links:
        href = a['href']
        text = a.get_text(strip=True)
        
        # Filter for relevant quant links
        if '/quant/' in href and text and len(text) > 3:
            # Normalize URL
            if not href.startswith('http'):
                full_url = BASE_URL + href if href.startswith('/') else BASE_URL + '/' + href
            else:
                full_url = href
            
            print(f"Found potential topic: {text} -> {full_url}")
            
            # Avoid the start URL itself if it's just a generic page, but here it's "set-theory" so maybe keep it.
            # Also avoid duplicates
            if full_url not in [t['url'] for t in topics]:
                topics.append({'url': full_url, 'name': text})
                
    print(f"Found {len(topics)} potential topic links.")
    return topics

def parse_questions_with_gemini(html_content, topic_name):
    # Clean HTML to save tokens (remove scripts, styles)
    soup = BeautifulSoup(html_content, 'html.parser')
    for script in soup(["script", "style", "header", "footer", "nav"]):
        script.decompose()
    
    text_content = soup.get_text(separator='\n')
    
    # Truncate if too long (Gemini Flash has 1M context but let's be safe/fast)
    # text_content = text_content[:30000] 
    
    prompt = f"""
    You are an expert data extractor. Extract CAT Quantitative Aptitude questions from the following text.
    The text is from a webpage about "{topic_name}".
    
    **CRITICAL INSTRUCTIONS**:
    1.  **Completeness**: Only extract questions that have **complete text** and **all options** (usually 4-5). Skip incomplete ones.
    2.  **Diversity**: Select questions that cover different concepts within the topic. **Do NOT** extract more than 2-3 questions that use the exact same solving method or logic.
    3.  **Quality**: Prefer questions with clear explanations available.
    
    Return a JSON array of objects with this structure:
    [
        {{
            "question_text": "The full question text",
            "options": ["Option A", "Option B", ...],
            "correct_answer": "The correct option or value",
            "explanation": "The explanation if available",
            "difficulty": "One of: 'Easy', 'Medium', 'Hard'"
        }}
    ]
    
    If the text contains no valid questions, return an empty array [].
    
    Text to process:
    {text_content[:50000]} 
    """
    
    retries = 3
    for attempt in range(retries):
        try:
            response = model.generate_content(prompt)
            content = response.text
            start = content.find('[')
            end = content.rfind(']') + 1
            if start != -1 and end != -1:
                json_str = content[start:end]
                data = json.loads(json_str)
                # Client-side validation
                valid_data = []
                for q in data:
                    if q.get('question_text') and len(q.get('options', [])) >= 2:
                        valid_data.append(q)
                return valid_data
            return []
        except Exception as e:
            print(f"Error parsing with Gemini (attempt {attempt+1}): {e}")
            time.sleep(5)
    return []

def clean_topic_name(name):
    # User wants to keep the latter part.
    # "CAT Questions | Percentage" -> "Percentage"
    if "|" in name:
        return name.split("|")[-1].strip()
    return name.replace("CAT Questions", "").strip()

def upload_questions(questions, topic_name):
    if not questions:
        return
        
    # User removed the hard limit, but we still want to avoid flooding if Gemini returns 100 duplicates.
    # The prompt handles diversity, so we trust Gemini but maybe cap at 30 reasonable unique ones per page.
    questions = questions[:30]
        
    questions_to_insert = []
    letters = ['A', 'B', 'C', 'D', 'E']
    
    clean_topic = clean_topic_name(topic_name)
    
    for q in questions:
        # Double check validation
        if not q.get('question_text') or len(q.get('options', [])) < 2:
            continue

        # Format options
        formatted_options = []
        if q.get('options'):
            for idx, opt in enumerate(q['options']):
                if idx < 5:
                    formatted_options.append({
                        "id": letters[idx],
                        "text": opt
                    })
        
        questions_to_insert.append({
            "topic": "Math",
            "subtopic": clean_topic, 
            "difficulty": q.get('difficulty', 'Medium'),
            "question_text": q['question_text'],
            "options": formatted_options,
            "correct_answer": q.get('correct_answer', ''),
            "explanation": q.get('explanation', '')
        })
        
    if questions_to_insert:
        try:
            res = supabase.table('questions').insert(questions_to_insert).execute()
            print(f"Uploaded {len(res.data)} questions for topic '{clean_topic}' (Original: {topic_name}).")
        except Exception as e:
            print(f"Error uploading to Supabase: {e}")

def main():
    topics = get_topic_links()
    
    print(f"Processing {len(topics)} topics...")
    
    # Limit to first 10 topics for testing if needed, or run all but with question limits
    # topics = topics[:10] 
    
    for i, topic in enumerate(topics):
        print(f"[{i+1}/{len(topics)}] Scraping {topic['name']} ({topic['url']})...")
        
        html = requests.get(topic['url']).text
        questions = parse_questions_with_gemini(html, topic['name'])
        
        if questions:
            print(f"Found {len(questions)} questions. Uploading...")
            upload_questions(questions, topic['name'])
        else:
            print("No questions found.")
            
        time.sleep(5) # Be nice to the server

if __name__ == "__main__":
    main()
