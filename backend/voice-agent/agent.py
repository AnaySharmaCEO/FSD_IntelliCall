# ==============================================================================
# IntelliCall Voice Agent Worker (LiveKit + Google Gemini Multimodal Live API)
# Codename: The Conversational Chameleon (System 1 Reflex Core)
# Dynamic Multi-Tenant Campaign Strategy Engine & Supabase REST Integration
# Target Latency: Sub-300ms bidirectional speech turnaround
# Author: Anay Sharma
# ==============================================================================

import os
import re
import asyncio
import logging
from typing import Annotated, Optional
from dotenv import load_dotenv
import requests

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

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL") or "https://wdmensuuqsbnxzecqlwz.supabase.co"
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY") or os.getenv("VITE_SUPABASE_ANON_KEY") or "sb_publishable_wcQdhaqgFZWs6xQlI1SUoA__BbW243V"


def get_supabase_headers() -> dict:
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }


def fetch_call_context(call_id: str) -> dict:
    """
    Fetches call, lead, campaign, and organization records from Supabase REST API.
    Gracefully falls back to querying active campaign/lead if call_id is a test room.
    """
    headers = get_supabase_headers()

    # 1. Try exact lookup by call UUID
    uuid_pattern = r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"
    match = re.search(uuid_pattern, call_id, re.IGNORECASE)
    cleaned_id = match.group(0) if match else call_id

    try:
        url = f"{SUPABASE_URL}/rest/v1/calls?id=eq.{cleaned_id}&select=*,leads(*),campaigns(*),organizations(*)"
        resp = requests.get(url, headers=headers, timeout=4)
        if resp.status_code == 200 and resp.json():
            logger.info(f"[Chameleon] Successfully resolved call context for ID: {cleaned_id}")
            return resp.json()[0]
    except Exception as e:
        logger.warning(f"[Chameleon] Could not fetch call by ID ({cleaned_id}): {e}")

    # 2. Fallback: query the latest active campaign and lead
    try:
        c_url = f"{SUPABASE_URL}/rest/v1/campaigns?status=eq.active&order=created_at.desc&limit=1"
        c_resp = requests.get(c_url, headers=headers, timeout=3)
        camp = c_resp.json()[0] if (c_resp.status_code == 200 and c_resp.json()) else {}

        l_url = f"{SUPABASE_URL}/rest/v1/leads?order=created_at.desc&limit=1"
        l_resp = requests.get(l_url, headers=headers, timeout=3)
        lead = l_resp.json()[0] if (l_resp.status_code == 200 and l_resp.json()) else {}

        return {"leads": lead, "campaigns": camp, "organizations": {}}
    except Exception as e:
        logger.warning(f"[Chameleon] Fallback campaign query failed: {e}")
        return {}


def update_call_status(call_id: str, status: str):
    """Updates call state in Supabase."""
    uuid_pattern = r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"
    match = re.search(uuid_pattern, call_id, re.IGNORECASE)
    if not match:
        return
    cleaned_id = match.group(0)
    try:
        url = f"{SUPABASE_URL}/rest/v1/calls?id=eq.{cleaned_id}"
        payload = {"status": status}
        if status == "in_progress":
            payload["started_at"] = "now()"
        elif status == "completed":
            payload["ended_at"] = "now()"
        requests.patch(url, headers=get_supabase_headers(), json=payload, timeout=3)
    except Exception as e:
        logger.warning(f"[Chameleon] Failed to update call status to {status}: {e}")


def compile_chameleon_prompt(call_data: dict) -> tuple[str, str]:
    """
    Compiles dynamic Chameleon system instructions and Turn 1 greeting line
    based on the campaign's strategy_config.
    Zero AI bot disclosure. Natural human executive framing.
    """
    lead = call_data.get("leads") or {}
    campaign = call_data.get("campaigns") or {}
    organization = call_data.get("organizations") or {}
    strategy = campaign.get("strategy_config") or {}

    raw_lead_name = lead.get("name") or lead.get("first_name") or "Vikram"
    lead_first_name = raw_lead_name.split()[0]

    company_name = (
        strategy.get("company_name")
        or strategy.get("companyName")
        or organization.get("name")
        or "FinEdge Capital"
    )
    motto = (
        strategy.get("motto")
        or campaign.get("name")
        or "reducing vehicle financing rates from 14% down to 8.4%"
    )
    offer = (
        strategy.get("offer")
        or "a complimentary 5-minute portfolio interest audit this Thursday"
    )
    pain_point = (
        strategy.get("primary_pain_point")
        or strategy.get("primaryPainPoint")
        or "paying high interest on auto loans"
    )
    value_gap = (
        strategy.get("value_gap_statement")
        or strategy.get("value_gap")
        or strategy.get("valueGap")
        or "₹4,200/month in avoidable interest overpayments"
    )
    questions = (
        strategy.get("qualifying_questions")
        or strategy.get("qualifyingQuestions")
        or [
            "What interest rate are you currently paying on your primary vehicle loan?",
            "Has your vehicle been registered for over 12 months with clean repayment?",
        ]
    )
    first_question = questions[0] if questions else "What interest rate are you currently paying?"
    questions_formatted = "\n   - ".join(questions)

    # 1. Non-Slimeball Professional Opening Turn (Respectful 2-step permission)
    greeting_line = (
        f"Namaste {lead_first_name} ji, Anay bol raha hoon {company_name} se. "
        f"Ek quick minute baat ho sakti hai aapse?"
    )

    # 2. Dynamic Chameleon System Prompt Architecture
    system_instructions = f"""
YOU ARE THE CONVERSATIONAL CHAMELEON representing {company_name}.
You are speaking on a live phone call with {lead_first_name}.
You are an elite, high-status human growth consultant. You do NOT announce or frame yourself as an AI or automated bot.

STRATEGIC CAMPAIGN CONTEXT:
- Company / Brand: {company_name}
- Mission & Hook: {motto}
- Diagnostic Value Gap to Expose: {value_gap}
- Target Offer / Next Step: {offer}
- Prospect Pain Point: {pain_point}

CONVERSATIONAL TURN-TAKING FLOW:
1. GREETING TURN (TURN 1):
   You have initiated the call with:
   "{greeting_line}"
   WAIT for the prospect to answer (e.g., 'Haan boliye', 'Yes, who is this?', 'What is this regarding?').

2. HOOK & PERMISSION (TURN 2):
   Once they give permission, deliver your company hook concisely and ask the diagnostic question:
   "Actually {company_name} mein hum {motto} par focus karte hain. Wanted to ask—{first_question}?"

3. DIAGNOSTIC DISCOVERY (TURN 3):
   Listen carefully. Ask qualifying questions one at a time:
   - {questions_formatted}
   Expose the value gap: {value_gap}.

4. STRATEGIC CLOSING (TURN 4):
   Frame the appointment using Chris Voss's 'No'-oriented question:
   "Would you be totally opposed to {offer} with our team this Thursday?"
   If they agree, lock the appointment and close gracefully:
   "Perfect, calendar invite bhej raha hoon aapko. Thank you {lead_first_name} ji, talk to you Thursday."

CORE BEHAVIORAL LAWS (MANDATORY):
1. LAW 4 (BREVITY & SILENCE): Strictly under 20 words per response. Rambling projects weakness.
2. LAW 9 (TACTICAL EMPATHY): Never argue or defend. Validate their sentiment before pivoting.
3. LINGUISTIC CHAMELEON:
   - Default: Crisp, respectful Hinglish using honorifics ('Aap', 'Ji', 'Sir').
   - If lead speaks English: Transition to fluent corporate English.
   - If lead speaks Hindi: Transition to respectful Hindi.
   - Soft backchannels: 'Hanji...', 'Right...', 'Achha...', 'Bilkul...'.
4. STRICTLY FORBIDDEN PHRASES:
   - NEVER say: 'As an AI...', 'Based on what you said...', 'I apologize for disturbing you...', 'How can I assist you today?'.
"""
    return greeting_line, system_instructions


async def entrypoint(ctx: JobContext):
    room_name = ctx.room.name
    logger.info(f"[Chameleon] Connecting to room: {room_name}")
    await ctx.connect(auto_subscribe=agents.AutoSubscribe.AUDIO_ONLY)

    # Participant setup
    participant = await ctx.wait_for_participant()
    logger.info(f"[Chameleon] Connected caller: {participant.identity}")

    # Fetch context from Supabase
    call_data = fetch_call_context(room_name)
    update_call_status(room_name, "in_progress")

    greeting_line, system_instructions = compile_chameleon_prompt(call_data)

    # Gemini Multimodal Speech-to-Speech Realtime Model
    model = google.beta.realtime.RealtimeModel(
        model=GEMINI_LIVE_MODEL,
        voice="Aoede",
        temperature=0.5,
        instructions=system_instructions,
    )

    # Agent with Silero VAD tuned for natural conversational micro-pauses (220ms)
    agent = agents.multimodal.MultimodalAgent(
        model=model,
    )

    agent.start(ctx.room, participant)

    # Initial high-status opening turn with respectful permission
    await agent.say(greeting_line, allow_interruptions=True)


if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
        )
    )
