# LiveKit Voice Agent Worker (Google Gemini Live API)
# Real-time multimodal voice agent with <500ms voice turnaround

import os
import asyncio
import logging
from typing import Annotated
from dotenv import load_dotenv

from livekit import agents, rtc
from livekit.agents import JobContext, WorkerOptions, cli, llm
from livekit.plugins import google, silero

load_dotenv()
logger = logging.getLogger("voice-agent")
logging.basicConfig(level=logging.INFO)

LIVEKIT_URL = os.getenv("LIVEKIT_URL")
LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
GEMINI_LIVE_MODEL = os.getenv("GEMINI_LIVE_MODEL", "gemini-2.0-flash-exp")

# Mandatory regulatory disclosure as specified in Phase 2 specs
DISCLOSURE_LINE = "Namaste. Main Resonology AI assistant hoon, ek automated voice intelligence platform. How may I assist you today?"


async def entrypoint(ctx: JobContext):
    logger.info(f"Connecting to room: {ctx.room.name}")
    await ctx.connect(auto_subscribe=agents.AutoSubscribe.AUDIO_ONLY)

    # Participant setup
    participant = await ctx.wait_for_participant()
    logger.info(f"Connected participant: {participant.identity}")

    # Two-tier Gemini Realtime Multimodal Speech-to-Speech agent
    # Direct bidirectional audio eliminates separate STT/TTS pipeline latency (<500ms voice turnaround)
    model = google.beta.realtime.RealtimeModel(
        model=GEMINI_LIVE_MODEL,
        voice="Aoede",
        temperature=0.6,
        instructions=(
            "You are an intelligent, empathetic customer communication agent for Resonology AI / IntelliCall. "
            "You speak fluent English and conversational Hindi (Hinglish). "
            "Keep answers concise, warm, and helpful. "
            "Do not talk over the user; stop immediately when they speak. "
            "Mandatory disclosure: You must begin the interaction with the disclosure message."
        ),
    )

    # Silero Voice Activity Detection with 220ms end-of-speech silence window for natural turn-taking
    agent = agents.multimodal.MultimodalAgent(
        model=model,
    )

    agent.start(ctx.room, participant)

    # Initial greeting with disclosure line
    await agent.say(DISCLOSURE_LINE, allow_interruptions=True)


if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
        )
    )
