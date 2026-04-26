import os
import json
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler
import requests
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, firestore
from telegram import Update
from telegram.ext import ApplicationBuilder, CommandHandler, MessageHandler, filters, ContextTypes

from engine import process_message

load_dotenv()

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")

# Initialize Firebase
# Supports two modes:
#   1. Local development: reads firebase-service-account.json from disk
#   2. Render / Cloud Run: reads the JSON from FIREBASE_SERVICE_ACCOUNT_JSON env var
try:
    _sa_file = "firebase-service-account.json"
    if os.path.exists(_sa_file):
        cred = credentials.Certificate(_sa_file)
    else:
        _sa_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
        if not _sa_json:
            raise EnvironmentError(
                "Neither firebase-service-account.json nor FIREBASE_SERVICE_ACCOUNT_JSON env var found."
            )
        cred = credentials.Certificate(json.loads(_sa_json))
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    print("Firebase Admin initialized successfully.")
except Exception as e:
    print(f"Warning: Firebase not initialized. Error: {e}")
    db = None

async def handle_message(update, context):
    """
    Listens to citizen messages or video reels on Telegram, passes them to Jalaj's engine, 
    and writes the JSON to Firestore.
    """
    message_text = update.message.text or update.message.caption or "Attached Video Reel"
    print(f"Received message/caption: {message_text}")
    
    video_path = None
    if update.message.video:
        print("Video detected. Downloading locally to feed to Gemini...")
        file = await update.message.video.get_file()
        video_path = f"temp_video_{update.effective_chat.id}.mp4"
        await file.download_to_drive(video_path)
    
    # 1. Pass to Engine
    analyzed_data = process_message(message_text, db=db, video_path=video_path)
    
    # Clean up local video file
    if video_path and os.path.exists(video_path):
        os.remove(video_path)
    
    # 2. Add metadata for Response Workflow
    import datetime
    analyzed_data['timestamp'] = datetime.datetime.utcnow().isoformat() + "Z"
    analyzed_data['chat_id'] = update.effective_chat.id
    
    # Auto-approve low panic incidents
    panic_idx = analyzed_data.get('panic_index', 0)
    if panic_idx < 5:
        analyzed_data['status'] = 'approved'
        print(f"Auto-approved incident because panic_index ({panic_idx}) < 5")
    else:
        analyzed_data['status'] = 'pending'
    if db:
        db.collection("incidents").add(analyzed_data)
        print("Pushed to Firestore:", json.dumps(analyzed_data, indent=2))
    else:
        print("Skipped Firestore push (not configured):", json.dumps(analyzed_data, indent=2))
    
    # 3. Acknowledge user
    await update.message.reply_text("Thank you for reporting. NammaShanti Engine is analyzing this.")

def listen_for_approvals():
    """Listens to Firestore for approved incidents and replies via Telegram API."""
    if not db: return
    
    def on_snapshot(col_snapshot, changes, read_time):
        print(f"[DEBUG] Firestore snapshot received. Changes count: {len(changes)}")
        for change in changes:
            doc = change.document.to_dict()
            status = doc.get('status')
            chat_id = doc.get('chat_id')
            broadcasted = doc.get('broadcasted')
            print(f"[DEBUG] Document changed: {change.document.id} | Type: {change.type.name} | Status: {status} | Chat: {chat_id} | Broadcasted: {broadcasted}")
            
            if change.type.name in ['ADDED', 'MODIFIED']:
                # If an officer clicks mass broadcast
                if doc.get('status') == 'approved' and doc.get('mass_broadcast') and not doc.get('mass_broadcasted'):
                    print("[DEBUG] Mass broadcast triggered!")
                    all_incidents = db.collection('incidents').get()
                    unique_chats = set([d.to_dict().get('chat_id') for d in all_incidents if d.to_dict().get('chat_id')])
                    
                    text = f"🚨 NAMMASHANTI MASS ALERT 🚨\n\n{doc.get('draft_response')}\n\n[This is a verified update from Bengaluru Police]"
                    for cid in unique_chats:
                        try:
                            requests.post(
                                f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                                json={"chat_id": cid, "text": text}
                            )
                        except Exception as e:
                            print(f"Failed to mass-broadcast to {cid}: {e}")
                    
                    change.document.reference.update({"mass_broadcasted": True})
                    print(f"Successfully mass-broadcasted to {len(unique_chats)} citizens.")
                
                # Normal auto-reply logic
                elif doc.get('status') == 'approved' and doc.get('chat_id') and not doc.get('broadcasted'):
                    chat_id = doc.get('chat_id')
                    text = f"🚨 NammaShanti Official Update 🚨\n\n{doc.get('draft_response')}"
                    
                    try:
                        print(f"[DEBUG] Attempting to send message to chat_id: {chat_id}")
                        resp = requests.post(
                            f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                            json={"chat_id": chat_id, "text": text}
                        )
                        print(f"[DEBUG] Telegram API Response: {resp.status_code} - {resp.text}")
                        change.document.reference.update({"broadcasted": True})
                        print(f"Successfully auto-replied to chat {chat_id}")
                    except Exception as e:
                        print(f"Failed to auto-reply: {e}")

    # Start the listener in the background
    db.collection('incidents').on_snapshot(on_snapshot)

def start_health_server():
    """Minimal HTTP server for Cloud Run health checks on $PORT."""
    port = int(os.environ.get("PORT", 8080))

    class HealthHandler(BaseHTTPRequestHandler):
        def do_GET(self):
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b'NammaShanti Bot is alive.')
        def log_message(self, format, *args):
            pass  # suppress access logs

    server = HTTPServer(('0.0.0.0', port), HealthHandler)
    print(f"Health check server running on port {port}")
    server.serve_forever()

def main():
    if not TELEGRAM_BOT_TOKEN or TELEGRAM_BOT_TOKEN == "your_telegram_bot_token_here":
        print("WARNING: TELEGRAM_BOT_TOKEN not set. Exiting bot.")
        return

    print("Starting NammaShanti Telegram Bot...")

    # Start health check server in background thread (required for Cloud Run)
    health_thread = threading.Thread(target=start_health_server, daemon=True)
    health_thread.start()

    listen_for_approvals()

    app = ApplicationBuilder().token(TELEGRAM_BOT_TOKEN).build()
    app.add_handler(MessageHandler((filters.TEXT | filters.VIDEO) & ~filters.COMMAND, handle_message))
    app.run_polling()

if __name__ == "__main__":
    main()
