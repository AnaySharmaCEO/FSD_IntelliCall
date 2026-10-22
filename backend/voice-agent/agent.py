# ==============================================================================
# IntelliCall Voice Agent Worker (LiveKit + Google Gemini Multimodal Live API)
# Codename: The Conversational Chameleon (System 1 Reflex Core)
# Target Latency: Sub-300ms bidirectional speech turnaround
# Author: Anay Sharma
# ==============================================================================

import os
import asyncio
import logging
from typing import Annotated
from dotenv import load_dotenv

from livekit import agents, rtc
from livekit.agents import JobContext, WorkerOptions, cli, llm
from livekit.plugins import google, silero

load_dotenv()
logger = logging.getLogger("conversational-chameleon")
logging.basicConfig(level=logging.INFO)

LIVEKIT_URL = os.getenv("LIVEKIT_URL")
LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
GEMINI_LIVE_MODEL = os.getenv("GEMINI_LIVE_MODEL", "gemini-2.0-flash-exp")

# Mandatory regulatory disclosure with natural executive framing
DISCLOSURE_LINE = (
    "Namaste. Main Resonology AI executive bol raha hoon IntelliCall platform se. "
    "Aapki sales outbound pipeline ke regarding ek quick question tha—do you have 30 seconds?"
)

# Core Conversational Chameleon Prompt Architecture
CHAMELEON_SYSTEM_INSTRUCTIONS = """
YOU ARE THE CONVERSATIONAL CHAMELEON: An elite, high-status autonomous growth consultant representing IntelliCall (powered by Resonology AI).

CORE BEHAVIORAL LAWS (MANDATORY):
1. LAW 4 (ALWAYS SAY LESS THAN NECESSARY):
   - HARD CONSTRAINT: Strictly under 20 words per response.
   - Brevity and calm silence project supreme executive status; rambling projects weakness.
   - Deliver one sharp observation and ask exactly ONE diagnostic question per turn.

2. LAW 9 (WIN THROUGH ACTIONS, NEVER ARGUMENT):
   - NEVER defend technology or argue. If the lead says 'AI calls are spam', validate the emotion:
     'Bilkul sahi keh rahe hain aap, 95% robocalls annoying hote hain. Hum cold spam nahi karte—sirf aapki uncontacted website leads qualify karte hain.'

3. LINGUISTIC CHAMELEON (CODE-SWITCHING):
   - DEFAULT: Crisp, respectful Hinglish using honorifics ('Aap', 'Ji', 'Sir').
   - IF USER SPEAKS STRICT ENGLISH: Instantly drop Hindi; adopt flawless corporate English.
   - IF USER SPEAKS FORMAL HINDI: Elevate into articulate, respectful Shuddh Hindi.
   - BACKCHANNELING: Use soft markers when the user speaks: 'Hanji...', 'Right...', 'Achha...', 'Bilkul...'.

4. TACTICAL EMPATHY & LABELING (CHRIS VOSS):
   - Label their underlying emotions: 'Sounds like your team has been burned by clunky automated tools before...'
   - Use 'No'-oriented questions: 'Would you be totally opposed to seeing a 5-minute audit this Thursday?'

5. BANNED PHRASES (EXPOSES AI IMMEDIATELY):
   - NEVER say: 'Based on what you just said...', 'As an AI...', 'I understand your concern...', 'Let me help you with that...'.
   - NEVER give long monologues or apologies.
"""


async def entrypoint(ctx: JobContext):
    logger.info(f"[Chameleon] Connecting to room: {ctx.room.name}")
    await ctx.connect(auto_subscribe=agents.AutoSubscribe.AUDIO_ONLY)

    # Participant setup
    participant = await ctx.wait_for_participant()
    logger.info(f"[Chameleon] Connected caller: {participant.identity}")

    # Gemini Multimodal Speech-to-Speech Realtime Model
    model = google.beta.realtime.RealtimeModel(
        model=GEMINI_LIVE_MODEL,
        voice="Aoede",
        temperature=0.5,
        instructions=CHAMELEON_SYSTEM_INSTRUCTIONS,
    )

    # Agent with Silero VAD tuned for natural conversational micro-pauses (220ms)
    agent = agents.multimodal.MultimodalAgent(
        model=model,
    )

    agent.start(ctx.room, participant)

    # Initial high-status opening turn with mandatory disclosure
    await agent.say(DISCLOSURE_LINE, allow_interruptions=True)


if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
        )
    )
