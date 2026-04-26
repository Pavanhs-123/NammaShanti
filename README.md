# 🛡️ NammaShanti 2.0

> **AI-powered civic threat intelligence and rumour triage platform for Bengaluru Police & BBMP**

NammaShanti is a real-time multimodal command-and-control system that ingests citizen reports from Telegram — including text, video reels, and news article links — and uses Gemini AI to triage threats, compute a **Panic Index**, and dispatch official responses through a live police dashboard.

---

## 🔵 Built on Google Technologies

NammaShanti 2.0 is deeply integrated with the Google ecosystem across every layer of its stack:

| Google Product | How It's Used |
|---|---|
| **Gemini 2.5 Flash** | Core AI engine — reads text, watches video reels, and analyzes scraped article content to compute threat assessments and draft official police responses |
| **Gemini File API** | Uploads citizen-submitted video reels to Google's cloud for multimodal visual + audio analysis before triage |
| **Google Maps Platform** | Powers the real-time commander dashboard — renders live incident markers, police patrol unit overlays, and interactive InfoWindows across Bengaluru |
| **Firebase Firestore** | Real-time NoSQL database that syncs incidents between the Python backend and React frontend with zero-latency push listeners |
| **Firebase Hosting** *(ready)* | Frontend deployment target for production release of the React dashboard |
| **Google AI Studio** | API key management and usage monitoring for Gemini |

> NammaShanti 2.0 demonstrates how **Gemini's multimodal capabilities** (text + video + web content) combined with **Google Maps spatial intelligence** and **Firebase real-time infrastructure** can be unified into a single life-safety platform.

---

## 🌟 Key Features

| Feature | Description |
|---|---|
| 🤖 **Telegram Bot Ingestion** | Citizens forward suspicious messages, videos, and links directly to the bot |
| 🎥 **Video Analysis** | Gemini 2.5 Flash watches uploaded video reels to detect riots, mob violence, or fake news |
| 🌐 **Web Article Scraping** | Detects URLs in messages, scrapes article text, and feeds it to the AI engine |
| 🧠 **Panic Index Engine** | Weighted formula combining Static triggers, Velocity tracking, and Gemini AI scoring |
| 🗺️ **Live React Dashboard** | Real-time Google Maps command center with incident markers and police unit overlays |
| 📢 **Mass Broadcast** | One-click truth broadcast to all registered citizens simultaneously |
| 🔄 **Auto-Approval Loop** | Low-threat incidents auto-approved; high-threat ones wait for commander review |

---

## 🏗️ Architecture

```
Citizen (Telegram)
       │
       ▼
  NammaShantiBot  ──►  engine.py (Panic Index)
       │                    │
       │              ┌─────┴──────────────────┐
       │              │  Static Scan (30%)      │
       │              │  Velocity Score (40%)   │
       │              │  Gemini AI Score (30%)  │
       │              └─────────────────────────┘
       │
       ▼
   Firestore DB  ──►  React Dashboard (Live)
       │
       ▼
  Auto-Reply / Mass Broadcast → Citizen's Telegram
```

---

## 📐 Panic Index Formula

```
Panic Index = (Static Score × 0.3) + (Velocity Score × 0.4) + (Semantic Score × 0.3)
```

**Clamped to 1–10. Auto-escalates to minimum 8 if ≥ 3 static triggers are detected.**

| Signal | Weight | Source |
|---|---|---|
| Static Score | 30% | Hardcoded Bengaluru keyword triggers |
| Velocity Score | 40% | Number of similar reports in last 15 minutes |
| Semantic Score | 30% | Gemini 2.5 Flash AI analysis |

---

## 🚀 Setup & Installation

### Prerequisites
- Python 3.10+
- Node.js 18+
- A Telegram Bot Token (from [@BotFather](https://t.me/BotFather))
- A Google AI API Key (from [aistudio.google.com](https://aistudio.google.com))
- A Firebase project with Firestore enabled

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/NammaShanti.git
cd NammaShanti
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create `backend/.env`:
```env
GEMINI_API_KEY="your_gemini_api_key_here"
TELEGRAM_BOT_TOKEN="your_telegram_bot_token_here"
```

Download your Firebase service account key and save it as:
```
backend/firebase-service-account.json
```

### 3. Frontend Setup
```bash
cd frontend
npm install
```

Create `frontend/.env`:
```env
VITE_GOOGLE_MAPS_API_KEY="your_google_maps_api_key"
VITE_FIREBASE_API_KEY="your_firebase_api_key"
VITE_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="your-project-id"
VITE_FIREBASE_STORAGE_BUCKET="your-project.appspot.com"
VITE_FIREBASE_MESSAGING_SENDER_ID="your_sender_id"
VITE_FIREBASE_APP_ID="your_app_id"
```

---

## ▶️ Running the Application

### Start the Backend Bot
```bash
cd backend
source venv/bin/activate
python bot.py
```

### Start the Frontend Dashboard
```bash
cd frontend
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## 🧪 Running the Test Suite

The test suite directly injects 6 real-world Bengaluru scenarios into the AI engine and pushes results to Firestore — no Telegram interaction required.

```bash
cd backend
source venv/bin/activate
venv/bin/python run_test_cases.py
```

| # | Test Case | Expected Panic Index |
|---|---|---|
| 1 | Water Mafia + Protest (HSR Layout) | 🔴 8+ (Auto-escalated) |
| 2 | Migrant Worker Clash (Electronic City) | 🔴 7-8 HIGH |
| 3 | Silk Board Protest (Kannada message) | 🟡 4-5 MED |
| 4 | Fake News Article (URL scraping) | 🟡 3-5 MED |
| 5 | Bengaluru Bandh Rumour | 🟡 5-7 MED |
| 6 | Innocent Metro Query | 🟢 1-2 LOW |

---

## 📁 Project Structure

```
NammaShanti/
├── backend/
│   ├── bot.py                    # Telegram bot + Firestore listener
│   ├── engine.py                 # Panic Index engine (AI + Static + Velocity)
│   ├── contract.json             # Enforced JSON output schema for Gemini
│   ├── run_test_cases.py         # Full test suite (6 scenarios)
│   ├── firebase-service-account.json  # (not committed) Firebase admin key
│   └── .env                     # (not committed) API keys
├── frontend/
│   ├── src/
│   │   ├── App.jsx               # Main dashboard layout
│   │   ├── components/
│   │   │   └── MapWidget.jsx     # Google Maps + police unit overlays
│   │   ├── services/
│   │   │   └── firebase.js       # Firestore real-time listener
│   │   └── data/
│   │       └── mockData.js       # Fallback data when Firebase is offline
│   └── .env                     # (not committed) Frontend API keys
├── firestore.rules               # Firebase security rules
├── firebase.json                 # Firebase deployment config
└── README.md
```

---

## 🔮 Roadmap

- [ ] **Voice Note Processing** — Transcribe Telegram voice messages via Gemini
- [ ] **Kannada-First Translation** — Auto-translate responses back to Kannada for local citizens
- [ ] **Automated FIR Drafting** — Generate Karnataka Police FIR format for high-threat incidents
- [ ] **Real-time GPS Fleet** — Replace mock police unit markers with live KSRP vehicle tracking
- [ ] **Webhook Mode** — Replace `run_polling()` with official Telegram Webhooks for production
- [ ] **Firebase Auth** — Restrict dashboard access to authenticated police officers

---

## ⚠️ Important Notes

- The `firebase-service-account.json` and `.env` files are **gitignored** and must never be committed.
- The Gemini free tier allows **20 requests/day** for `gemini-2.5-flash`. Add billing to your Google AI account for production use.
- The "Nearby Police Units" on the map are **generated with coordinate offsets** for demonstration purposes.

---

## 🏆 Built For

**NammaShanti 2.0** was built as a hackathon prototype demonstrating how AI can empower civic safety infrastructure for the city of Bengaluru.

> *"Shanti" means peace in Kannada. NammaShanti means "Our Peace."*
