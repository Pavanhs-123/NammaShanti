# NammaShanti Bot — Google Cloud Run Deployment

## Prerequisites
- [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) installed (`gcloud` CLI)
- Docker installed and running
- A GCP project with billing enabled (free tier works for hackathon)

---

## Step 1: Authenticate with Google Cloud

```bash
gcloud auth login
gcloud config set project YOUR_GCP_PROJECT_ID
```

Replace `YOUR_GCP_PROJECT_ID` with your actual project ID (e.g. `nammashanti-20b1e`).

---

## Step 2: Enable Required APIs

```bash
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable secretmanager.googleapis.com
```

---

## Step 3: Store Secrets in Google Secret Manager

Never put secrets in the Docker image. Store them securely:

```bash
# Store Telegram bot token
echo -n "YOUR_TELEGRAM_BOT_TOKEN" | \
  gcloud secrets create TELEGRAM_BOT_TOKEN --data-file=-

# Store Gemini API key
echo -n "YOUR_GEMINI_API_KEY" | \
  gcloud secrets create GEMINI_API_KEY --data-file=-

# Store Firebase service account JSON
gcloud secrets create FIREBASE_SERVICE_ACCOUNT \
  --data-file=firebase-service-account.json
```

---

## Step 4: Build and Push Docker Image

```bash
cd backend

# Build and push directly using Cloud Build (no local Docker needed)
gcloud builds submit --tag gcr.io/YOUR_GCP_PROJECT_ID/nammashanti-bot .
```

---

## Step 5: Deploy to Cloud Run

```bash
gcloud run deploy nammashanti-bot \
  --image gcr.io/YOUR_GCP_PROJECT_ID/nammashanti-bot \
  --platform managed \
  --region asia-south1 \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 1 \
  --max-instances 1 \
  --set-secrets="TELEGRAM_BOT_TOKEN=TELEGRAM_BOT_TOKEN:latest,GEMINI_API_KEY=GEMINI_API_KEY:latest" \
  --no-allow-unauthenticated
```

> **Note:** `--min-instances 1` keeps the bot always running so it never misses a Telegram message.
> `--max-instances 1` prevents duplicate polling conflicts.

---

## Step 6: Mount Firebase Service Account

Because `firebase-service-account.json` can't be passed as an env variable, mount it via Secret Manager:

```bash
gcloud run services update nammashanti-bot \
  --region asia-south1 \
  --update-secrets=/app/firebase-service-account.json=FIREBASE_SERVICE_ACCOUNT:latest
```

---

## Step 7: Verify Deployment

```bash
# Check service status
gcloud run services describe nammashanti-bot --region asia-south1

# View live logs
gcloud run services logs tail nammashanti-bot --region asia-south1
```

You should see:
```
Firebase Admin initialized successfully.
Health check server running on port 8080
Starting NammaShanti Telegram Bot...
```

---

## Estimated Cost

For hackathon usage (always-on single instance):
- Cloud Run min instance: ~$0.00 for first 2M requests/month (free tier)
- Memory (512Mi × 1 instance): ~$3–5/month if running 24/7

---

## Quick Redeploy After Code Changes

```bash
cd backend
gcloud builds submit --tag gcr.io/YOUR_GCP_PROJECT_ID/nammashanti-bot .
gcloud run deploy nammashanti-bot \
  --image gcr.io/YOUR_GCP_PROJECT_ID/nammashanti-bot \
  --region asia-south1
```
