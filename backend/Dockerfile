# ─── Stage 1: Base image ───────────────────────────────────────────────────────
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install dependencies first (for layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY bot.py .
COPY engine.py .
COPY contract.json .

# Cloud Run requires a process that responds to the PORT env variable.
# bot.py runs a health check HTTP server on PORT alongside the Telegram polling loop.
ENV PORT=8080

# Run the bot
CMD ["python", "bot.py"]
