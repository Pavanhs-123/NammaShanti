import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=GEMINI_API_KEY)

os.system("touch dummy.mp4")
f = genai.upload_file("dummy.mp4")
print(dir(f))
genai.delete_file(f.name)
