import requests
from bs4 import BeautifulSoup
import time
import random
import cloudscraper

# Hardcoded user agents to avoid startup delays/errors with fake_useragent
USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/120.0.0.0'
]

def get_headers():
    return {
        'User-Agent': random.choice(USER_AGENTS),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://www.google.com/'
    }

def scrape_examveda(url):
    """
    Scrapes questions from an Examveda topic page, including pagination sections.
    """
    print(f"Scraping Examveda: {url}")
    all_questions = []
    
    # Helper to scrape a single page
    def scrape_page(page_url):
        print(f"  Fetching page: {page_url}")
        try:
            response = requests.get(page_url, headers=get_headers(), timeout=15)
            response.raise_for_status()
            soup = BeautifulSoup(response.content, 'html.parser')
            
            page_questions = []
            h2s = soup.find_all('h2')
            
            for h2 in h2s:
                q_main = h2.find('div', class_='question-main')
                if q_main:
                    question_text = q_main.get_text(strip=True)
                    content_parts = [question_text]
                    curr = h2.next_sibling
                    while curr and (curr.name != 'h2'):
                        if hasattr(curr, 'get_text'):
                            text = curr.get_text(strip=True)
                            if text and "Answer & Solution" not in text and "Discuss in Board" not in text:
                                content_parts.append(text)
                        curr = curr.next_sibling
                    
                    full_raw_text = "\n".join(content_parts)
                    page_questions.append({"url": page_url, "raw_text": full_raw_text, "source": "examveda"})
            
            return page_questions, soup
        except Exception as e:
            print(f"  Error scraping page {page_url}: {e}")
            return [], None

    # Scrape first page
    questions, soup = scrape_page(url)
    all_questions.extend(questions)
    
    # Find pagination sections
    if soup:
        # Find links with "Section" in text
        section_links = soup.find_all('a', string=lambda text: text and "Section" in text)
        visited_urls = {url}
        
        # Limit to first 3 sections for now to avoid overwhelming, or scrape all unique ones
        # Let's scrape up to 5 sections if available
        unique_section_urls = []
        for link in section_links:
            href = link.get('href')
            if href and href not in visited_urls:
                if not href.startswith("http"):
                    # Handle relative URLs if any (Examveda seems absolute but good to be safe)
                    pass 
                if href not in unique_section_urls:
                     unique_section_urls.append(href)
        
        print(f"  Found {len(unique_section_urls)} additional sections. Scraping...")
        
        for section_url in unique_section_urls[:5]: # Cap at 5 sections for this run
            time.sleep(random.uniform(1, 3))
            qs, _ = scrape_page(section_url)
            all_questions.extend(qs)
            visited_urls.add(section_url)

    return all_questions

def scrape_gmat_club(url):
    """
    Scrapes questions from GMAT Club using Cloudscraper.
    """
    print(f"Scraping GMAT Club Index: {url}")
    questions = []
    try:
        scraper = cloudscraper.create_scraper()
        response = scraper.get(url)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Find thread links. 
        links = soup.find_all('a', class_='topictitle')
        
        thread_urls = []
        for link in links:
            href = link.get('href')
            if href:
                if href.startswith("./"):
                    href = href[2:]
                if not href.startswith("http"):
                    href = "https://gmatclub.com/forum/" + href
                thread_urls.append(href)
        
        print(f"Found {len(thread_urls)} threads. Processing first 3...")
        for thread_url in thread_urls[:3]:
            print(f"  Fetching thread: {thread_url}")
            try:
                time.sleep(random.uniform(2, 5)) 
                t_response = scraper.get(thread_url)
                t_soup = BeautifulSoup(t_response.content, 'html.parser')
                
                post = t_soup.find('div', class_='content') or t_soup.find('div', class_='postbody')
                if post:
                    questions.append({
                        "url": thread_url, 
                        "raw_text": post.get_text(separator='\n', strip=True),
                        "source": "gmatclub"
                    })
            except Exception as e:
                print(f"  Failed to fetch thread {thread_url}: {e}")
                
        return questions

    except Exception as e:
        print(f"Error scraping GMAT Club: {e}")
        return []

def extract_content(url):
    """
    Router function to choose the correct scraper.
    """
    if "examveda.com" in url:
        return scrape_examveda(url)
    elif "gmatclub.com" in url:
        return scrape_gmat_club(url)
    else:
        # Default generic scraper (returns a list with one item for consistency)
        try:
            response = requests.get(url, headers=get_headers())
            soup = BeautifulSoup(response.content, 'html.parser')
            text = soup.get_text(separator='\n', strip=True)
            return [{"url": url, "raw_text": text, "source": "generic"}]
        except Exception as e:
            return [{"error": str(e), "url": url}]
