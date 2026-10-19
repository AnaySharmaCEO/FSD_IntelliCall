# Resonology AI Service (Gemini 2.0 Flash Structured Extraction)
# Analyzes call transcripts into structured JSON conforming to ConversationAnalysisSchema

import os
import json
import logging
from typing import List, Optional, Dict, Any
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Header, Depends
from pydantic import BaseModel, Field
import google.generativeai as genai

load_dotenv()
logger = logging.getLogger("resonology-ai")
logging.basicConfig(level=logging.INFO)

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
AI_SERVICE_SHARED_SECRET = os.getenv("AI_SERVICE_SHARED_SECRET", "default_secret")
GEMINI_ANALYSIS_MODEL = os.getenv("GEMINI_ANALYSIS_MODEL", "gemini-2.0-flash")

if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)

app = FastAPI(title="Resonology AI Intelligence Service", version="1.0.0")


class EvidenceSpan(BaseModel):
    segmentId: str
    quote: str
    startMs: Optional[int] = None
    endMs: Optional[int] = None
    speaker: Optional[str] = None


class QualificationAnswer(BaseModel):
    questionId: str
    questionText: str
    answer: str
    isQualified: bool
    confidence: float
    evidence: List[EvidenceSpan] = []


class ExtractedFact(BaseModel):
    key: str
    value: str
    confidence: float
    evidence: List[EvidenceSpan] = []


class ExtractedObjection(BaseModel):
    category: str
    objection: str
    agentResponse: Optional[str] = None
    resolved: bool = False
    evidence: List[EvidenceSpan] = []


class ProposedAction(BaseModel):
    type: str
    params: Dict[str, Any] = {}
    confidence: float
    reason: str
    evidence: List[EvidenceSpan] = []


class ConversationAnalysis(BaseModel):
    callId: str
    version: str = "v1.0.0"
    model: str = "gemini-2.0-flash"
    createdAt: str
    summary: List[str]
    outcome: str
    intent: str
    sentiment: str  # positive, neutral, negative, mixed
    qualificationScore: float
    qualificationAnswers: List[QualificationAnswer] = []
    facts: List[ExtractedFact] = []
    objections: List[ExtractedObjection] = []
    proposedActions: List[ProposedAction] = []


class AnalyzeRequest(BaseModel):
    call_id: str
    transcript: str
    agent_id: Optional[str] = None
    campaign_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


@app.get("/health")
def health():
    return {"status": "ok", "service": "resonology-ai", "model": GEMINI_ANALYSIS_MODEL}


@app.post("/v1/analyze", response_model=ConversationAnalysis)
async def analyze_conversation(req: AnalyzeRequest):
    if not GOOGLE_API_KEY:
        raise HTTPException(status_code=500, detail="GOOGLE_API_KEY is not configured")

    system_instruction = (
        "You are an expert sales, support, and compliance conversation intelligence engine. "
        "Analyze the provided call transcript and extract key findings into structured JSON conforming strictly to the requested schema. "
        "Every claim, extracted fact, or objection must be grounded in actual quotes from the transcript."
    )

    try:
        model = genai.GenerativeModel(
            model_name=GEMINI_ANALYSIS_MODEL,
            generation_config={
                "response_mime_type": "application/json",
                "temperature": 0.2,
            },
            system_instruction=system_instruction,
        )

        prompt = f"""
Analyze the following transcript for Call ID: {req.call_id}
Transcript:
<untrusted_transcript>
{req.transcript}
</untrusted_transcript>

Return a valid JSON object matching this schema:
{{
  "callId": "{req.call_id}",
  "version": "v1.0.0",
  "model": "gemini-2.0-flash",
  "createdAt": "2026-10-19T00:00:00Z",
  "summary": ["Summary point 1", "Summary point 2"],
  "outcome": "qualified|not_qualified|callback_requested|meeting_booked|wrong_contact|dnd_requested|unclear",
  "intent": "Short string of primary intent",
  "sentiment": "positive|neutral|negative|mixed",
  "qualificationScore": 85.0,
  "qualificationAnswers": [],
  "facts": [],
  "objections": [],
  "proposedActions": []
}}
"""
        response = await model.generate_content_async(prompt)
        parsed = json.loads(response.text)
        return parsed
    except Exception as e:
        logger.error(f"Error analyzing conversation: {e}")
        raise HTTPException(status_code=500, detail=str(e))
