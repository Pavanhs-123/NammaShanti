# NammaShanti 2.0: Citizen-Sourced Triage
**Problem Statement**: Peacebuilding & Conflict Prevention

## Slide 1: The Problem
In hyper-connected cities like Bengaluru, a single panicked WhatsApp forward can spark a riot before police even know it's happening. 
- Misinformation spreads faster than truth.
- Authorities lack real-time visibility into local panic.
- Reactive policing is too slow for digital-age mobs.

**The Result**: Avoidable violence, community distrust, and severe resource drain.

## Slide 2: The Solution - NammaShanti 2.0
We are transforming citizens into an early-warning network. Instead of passively scraping social media (which is slow and often encrypted), we provide a verified tipping bot.

When citizens see a dangerous rumor, they forward it to NammaShanti. Our engine instantly analyzes the threat, plots it on a live heatmap, and allows police to blast a multilingual clarification back to the community *before* violence erupts.

## Slide 3: The Architecture (Powered by Google)
This entire pipeline is made possible by a deeply integrated stack of Google technologies, ensuring enterprise-grade speed, accuracy, and scale.

1. **Google Gemini API (The Brain)**
   - **Why**: Traditional NLP fails with Hinglish/Kanglish slang. 
   - **How**: We use `gemini-2.5-flash` to instantly translate regional dialects, verify claims, and autonomously draft a "Myth vs. Fact" de-escalation response.

2. **Google Cloud Firestore (The Veins)**
   - **Why**: We need real-time data synchronization.
   - **How**: As the Telegram bot ingests thousands of messages, Firestore acts as our NoSQL bridge, instantly pushing updates to the police dashboard with zero latency.

3. **Google Maps Platform (The Eyes)**
   - **Why**: Spatial awareness is critical for deployment.
   - **How**: We use the Maps API with custom dark-mode styling to plot incident zip codes. High-threat clusters generate expanding heat radiuses, allowing commanders to visually triage the city in seconds.

4. **The Panic Index Algorithm (The Filter & Math)**
   - We calculate a definitive 1-10 **Panic Index** by combining:
     1. **Static Rules**: Immediate auto-escalation if specific keywords (e.g., "Cauvery") are detected.
     2. **Velocity Tracking**: Firestore actively measures the frequency of similar rumors in the last 15 minutes.
     3. **Semantic Scoring**: Gemini assesses the linguistic urgency.

5. **Telegram Bot API (The Response)**
   - When an officer clicks 'Approve', the backend instantly pushes the verified clarification directly back to the citizen's Telegram chat, closing the loop.

## Slide 4: Impact on Peacebuilding
NammaShanti 2.0 doesn't just react to conflict; it **prevents** it.

- **De-escalation at Scale**: By catching a rumor when 50 people have forwarded it—rather than 50,000—we cut the fuse before the explosion.
- **Restoring Trust**: Citizens receive an official, verified "Myth vs. Fact" clarification instantly, restoring trust in local authorities.
- **Resource Optimization**: Police deploy units based on AI-verified threat heatmaps, not just random panic calls.

## Slide 5: Future Roadmap
- Integration with official BBMP/Police WhatsApp Business accounts.
- Automated multi-lingual audio synthesis via Google Cloud TTS.
- Predictive modeling: Using historical cluster data to predict where misinformation will strike next.

**NammaShanti 2.0: Stopping the fire before it starts.**
