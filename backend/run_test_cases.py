"""
NammaShanti 2.0 — Direct Engine Test Suite
Bypasses Telegram and calls process_message() directly, pushing real analyzed
incidents straight into Firestore. Responses appear live on the React dashboard.

Usage: cd backend && venv/bin/python run_test_cases.py
"""

import os
import json
import time
import datetime
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, firestore

from engine import process_message

load_dotenv()

# Initialize Firebase Admin
try:
    cred = credentials.Certificate("firebase-service-account.json")
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    print("✅ Firebase connected.\n")
except Exception as e:
    print(f"❌ Firebase init failed: {e}")
    db = None

# Your Telegram chat_id (for the auto-reply listener to know who to reply to)
TEST_CHAT_ID = 1273446893

TEST_CASES = [
    {
        "id": 1,
        "name": "Water Mafia + Protest (Multi-Trigger High Threat)",
        "description": "Multiple hardcoded triggers. Should auto-escalate to Panic Index 8+.",
        "message": (
            "Emergency! The water mafia has deliberately cut off supply to the entire "
            "HSR Layout (560102). People are gathering on the streets to protest! "
            "Avoid the area completely!"
        ),
    },
    {
        "id": 2,
        "name": "Migrant Worker Clash (Violence + Mob)",
        "description": "Violent mob scenario near Electronic City. Should score HIGH.",
        "message": (
            "Major clashes breaking out between migrant workers and locals near "
            "Electronic City phase 1, pin 560100. Mobs are attacking vehicles and "
            "shops are shutting down. Police not visible."
        ),
    },
    {
        "id": 3,
        "name": "Silk Board Protest (Kannada Message)",
        "description": "Authentic Bengaluru Kannada message. Tests language understanding.",
        "message": (
            "Silk Board signal hatra dhodda protest start agide, "
            "traffic block agide. Koramangala kade hogi."
        ),
    },
    {
        "id": 4,
        "name": "Fake News Article (Web Scraping Test)",
        "description": "Contains a URL. Engine scrapes the page and passes content to Gemini.",
        "message": (
            "Alert! BBMP is shutting down water supply for 30 days across Whitefield! "
            "Check this official report: https://en.wikipedia.org/wiki/Bangalore_water_supply_and_sanitation"
        ),
    },
    {
        "id": 5,
        "name": "Bandh Rumor (Moderate Threat)",
        "description": "Unverified bandh claim. Should trigger moderate panic index.",
        "message": (
            "Tomorrow full Bengaluru bandh declared! "
            "All buses and metro will be shut. Majestic area police deployed. "
            "Please inform everyone!"
        ),
    },
    {
        "id": 6,
        "name": "Innocent Query (Low/No Threat)",
        "description": "Normal question. Should score Panic Index 1-2. Auto-approved instantly.",
        "message": (
            "Hi, is the Majestic metro station open today? "
            "Heard there was some construction near KSRTC bus stand. Wanted to plan my commute."
        ),
    },
]


def run_all():
    print("=" * 60)
    print("  NammaShanti 2.0 — Direct Engine Test Suite")
    print("  Bypasses Telegram — writes straight to Firestore.")
    print("  Open your React Dashboard at http://localhost:5173")
    print("=" * 60)
    print()

    for tc in TEST_CASES:
        print(f"━━━ [Test {tc['id']}/6] {tc['name']}")
        print(f"     {tc['description']}")
        print(f"     Message: \"{tc['message'][:80]}...\"")
        print()

        try:
            result = process_message(tc["message"], db=db)

            # Inject required metadata
            result["timestamp"] = datetime.datetime.utcnow().isoformat() + "Z"
            result["chat_id"] = TEST_CHAT_ID
            panic = result.get("panic_index", 0)
            result["status"] = "approved" if panic < 5 else "pending"

            if db:
                db.collection("incidents").add(result)
                print(f"     ✅ Pushed to Firestore. Panic Index: {panic}/10  Status: {result['status'].upper()}")
            else:
                print(f"     ⚠️  No Firestore. Result: {json.dumps(result, indent=2)}")

        except Exception as e:
            print(f"     ❌ Engine error: {e}")

        print()

        if tc["id"] < len(TEST_CASES):
            wait = 45
            print(f"     ⏳ Waiting {wait}s for Gemini rate limit window before next case...")
            for remaining in range(wait, 0, -5):
                print(f"        {remaining}s remaining...", end="\r")
                time.sleep(5)
            print()

    print("=" * 60)
    print("  All 6 test cases processed!")
    print("  → Check your React Dashboard for live incident cards.")
    print("  → High-threat incidents (Panic ≥ 5) will need manual approval.")
    print("=" * 60)


if __name__ == "__main__":
    run_all()
