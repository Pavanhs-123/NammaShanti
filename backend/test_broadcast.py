import os
import requests
import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv

load_dotenv()
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")

cred = credentials.Certificate("firebase-service-account.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

all_incidents = db.collection('incidents').get()
unique_chats = set([d.to_dict().get('chat_id') for d in all_incidents if d.to_dict().get('chat_id')])

print(f"Unique chats: {unique_chats}")

text = "🚨 TEST NAMMASHANTI MASS ALERT 🚨\n\nTesting the broadcast loop."

for cid in unique_chats:
    resp = requests.post(
        f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
        json={"chat_id": cid, "text": text}
    )
    print(f"Sent to {cid}, response: {resp.status_code} - {resp.text}")
