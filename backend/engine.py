import os
import json
import re
import datetime
import requests
from bs4 import BeautifulSoup
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure Gemini
# If the key is not set, we will fall back to just the static engine for testing
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# Load the JSON Schema Contract
try:
    with open("contract.json", "r") as f:
        CONTRACT_SCHEMA = json.load(f)
except FileNotFoundError:
    # Fallback to current directory logic
    import pathlib
    curr_dir = pathlib.Path(__file__).parent.resolve()
    with open(curr_dir / "contract.json", "r") as f:
        CONTRACT_SCHEMA = json.load(f)

# Hardcoded Bengaluru trigger words
BENGALURU_TRIGGERS = [
    "water mafia",
    "migrant clashes",
    "electronic city",
    "majestic",
    "koramangala",
    "whitefield",
    "riot",
    "mob",
    "water cut",
    "bandh",
    "protest",
    "police",
    "attack"
]

def static_scan(text: str) -> list:
    """
    Task 2: Static Engine
    Scans incoming text against a hardcoded list of Bengaluru trigger words.
    """
    found_triggers = []
    text_lower = text.lower()
    for trigger in BENGALURU_TRIGGERS:
        if trigger in text_lower:
            found_triggers.append(trigger)
            
    # Simple pin code extraction
    pin_codes = re.findall(r'\b560\d{3}\b', text)
    return found_triggers, pin_codes

def extract_article_text(url: str) -> str:
    """Scrape and extract paragraph text from a web article URL."""
    try:
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
        resp = requests.get(url, headers=headers, timeout=5)
        soup = BeautifulSoup(resp.content, 'html.parser')
        paragraphs = soup.find_all('p')
        text = ' '.join([p.get_text(strip=True) for p in paragraphs])
        # Return first 4000 characters to keep prompt lean
        return text[:4000]
    except Exception as e:
        print(f"Failed to scrape {url}: {e}")
        return ""

def process_message(message_text: str, db=None, video_path: str = None) -> dict:
    """
    Task 3: Connect Gemini
    Pass the filtered text and optional video to the model and aggressively enforce the JSON output format.
    """
    print(f"--- Processing Incoming Message ---")
    print(f"Raw Text: {message_text}")
    
    # 1. Run the static scan (The Filter)
    static_triggers, pin_codes = static_scan(message_text)
    static_score = len(static_triggers)
    # If 3 or more triggers, auto-escalate (e.g. 3 triggers gives a base score of 9)
    static_priority = min(10, static_score * 3) if static_score > 0 else 1
    
    print(f"Static Triggers Found: {static_triggers}")
    print(f"Pin Codes Found: {pin_codes}")
    print(f"Static Priority: {static_priority}/10")
    
    # Optional Web Article Scraping
    urls = re.findall(r'(https?://[^\s]+)', message_text)
    article_content = ""
    if urls:
        print(f"Found {len(urls)} URL(s) in message. Attempting to scrape...")
        for url in urls:
            scraped_text = extract_article_text(url)
            if scraped_text:
                article_content += f"\n\n--- Scraped Content from {url} ---\n{scraped_text}\n"
    
    # 2. Velocity Tracking (The Math)
    velocity_score = 1
    if db:
        try:
            fifteen_mins_ago = (datetime.datetime.utcnow() - datetime.timedelta(minutes=15)).isoformat() + "Z"
            # In a real app we might filter by similar keywords, here we just count recent panic messages
            # For simplicity in prototype, we just count all recent incidents
            docs = db.collection("incidents").where("timestamp", ">=", fifteen_mins_ago).get()
            count = len(docs)
            velocity_score = min(10, max(1, count)) # 1 msg = 1, 10 msgs = 10
            print(f"Velocity Tracking: Found {count} recent messages. Score: {velocity_score}/10")
        except Exception as e:
            print(f"Error checking velocity: {e}")
    else:
        # Mock velocity for testing
        velocity_score = 5
        print(f"Velocity Tracking: (Mocked) Score: {velocity_score}/10")
    
    # 3. Call Gemini (The LLM Node)
    if not GEMINI_API_KEY or GEMINI_API_KEY == "your_gemini_api_key_here":
        print("WARNING: GEMINI_API_KEY not found. Returning mock JSON structure.")
        result_json = mock_gemini_response(message_text, static_triggers, pin_codes)
        semantic_score = result_json.get("threat_score", 1)
    else:
        try:
            # We use gemini-2.5-flash as the primary fast reasoning model with video support
            model = genai.GenerativeModel("gemini-2.5-flash")
            
            prompt = f"""
            You are NammaShanti 2.0, a threat intelligence engine for Bengaluru Police and BBMP.
            Analyze the following forwarded message from a citizen.
            
            Message: "{message_text}"
            {f'Extracted Web Article Content: {article_content}' if article_content else ''}
            
            Static Triggers Pre-identified: {static_triggers}
            Pin Codes Pre-identified: {pin_codes}
            
            Extract the information and strictly return it in the following JSON schema:
            {json.dumps(CONTRACT_SCHEMA, indent=2)}
            
            Ensure you only return valid JSON. Do not return markdown blocks like ```json.
            """
            
            contents = [prompt]
            video_file = None
            
            if video_path:
                import time
                print(f"Uploading video {video_path} to Gemini...")
                video_file = genai.upload_file(path=video_path)
                
                # The installed SDK version doesn't support .state property. 
                # Small videos process quickly, so we just wait a few seconds.
                print("Waiting for video processing...")
                time.sleep(5)
                print(" Video Ready!")
                
                contents.insert(0, video_file)
                contents.insert(1, "Please deeply analyze the visuals and audio of this attached video reel to determine if it shows a riot, mob, violence, or fake news. Include findings in the panic index and draft response.")

            from google.generativeai.types import HarmCategory, HarmBlockThreshold
            safety_settings = {
                HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
                HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
                HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
                HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
            }

            # Retry loop for 429 rate limit errors (up to 2 retries)
            max_retries = 2
            for attempt in range(max_retries + 1):
                try:
                    response = model.generate_content(
                        contents,
                        safety_settings=safety_settings,
                        generation_config=genai.GenerationConfig(
                            response_mime_type="application/json",
                        )
                    )
                    result_json = json.loads(response.text)
                    print("Gemini Output Successfully Parsed.")
                    semantic_score = result_json.get("threat_score", 1)
                    break  # success, exit retry loop
                except Exception as retry_err:
                    err_str = str(retry_err)
                    # Extract the retry_delay from the 429 error message
                    import re as _re
                    delay_match = _re.search(r'retry_delay\s*\{\s*seconds:\s*(\d+)', err_str)
                    wait_secs = int(delay_match.group(1)) + 2 if delay_match else 30
                    
                    if attempt < max_retries and '429' in err_str:
                        print(f"Rate limited. Waiting {wait_secs}s before retry {attempt + 1}/{max_retries}...")
                        import time as _time
                        _time.sleep(wait_secs)
                    else:
                        print(f"Error calling Gemini: {retry_err}")
                        result_json = mock_gemini_response(message_text, static_triggers, pin_codes, error="Gemini rate limit hit. Using static analysis.")
                        semantic_score = result_json.get("threat_score", 1)
                        break
            
            if video_file:
                try:
                    genai.delete_file(video_file.name)
                except Exception as e:
                    print("Failed to delete remote video file:", e)
            
        except Exception as e:
            print(f"Error calling Gemini: {e}")
            result_json = mock_gemini_response(message_text, static_triggers, pin_codes, error="Gemini rate limit hit. Using static analysis.")
            semantic_score = result_json.get("threat_score", 1)
        
    # 4. Final Output: Combine into Panic Index
    # For example: 30% static, 40% velocity, 30% semantic
    panic_index = int((static_priority * 0.3) + (velocity_score * 0.4) + (semantic_score * 0.3))
    panic_index = min(10, max(1, panic_index))
    
    # Auto-escalate rule
    if static_score >= 3:
        panic_index = max(panic_index, 8)
        
    print(f"Final Panic Index: {panic_index}/10 (Static: {static_priority}, Velocity: {velocity_score}, Semantic: {semantic_score})")
    
    # Inject our computed scores back into the contract
    result_json["static_score"] = static_score
    result_json["velocity_score"] = velocity_score
    result_json["panic_index"] = panic_index
    
    return result_json

def mock_gemini_response(text: str, triggers: list, pin_codes: list, error: str = "") -> dict:
    """Fallback if Gemini is not configured or fails"""
    return {
        "original_text": text,
        "translated_text": text,
        "location": {
            "pin_code": pin_codes[0] if pin_codes else "Unknown",
            "area_name": "Unknown",
            "lat": 12.9716,
            "lng": 77.5946
        },
        "threat_score": 7 if triggers else 2,
        "triggers": triggers,
        "is_actionable": len(triggers) > 0,
        "draft_response": f"AI Engine Fallback. Reason: {error}. The Bengaluru Police are verifying this claim. Please do not panic or forward unverified information." if error else "The Bengaluru Police are verifying this claim. Please do not panic or forward unverified information."
    }

if __name__ == "__main__":
    # Test the engine directly
    test_message = "Urgent! Big migrant clashes happening near Electronic City phase 1, pin 560100. Water mafia involved. Avoid the area!!"
    # Passing None for db, which will use the mock velocity score
    result = process_message(test_message, db=None)
    print("\n--- Final JSON Output ---")
    print(json.dumps(result, indent=2))
