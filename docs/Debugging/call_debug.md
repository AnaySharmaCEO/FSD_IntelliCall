# Voice Calling & Phone Simulator Comprehensive Debugging Report
**File:** `docs/Debugging/call_debug.md`  
**Author:** Anay Sharma  
**Date:** 2026-10-22  
**Status:** In-Depth Analysis & Solution Blueprint  

---

## 1. Executive Summary

During live testing of the voice calling pipeline on the mobile client (`/phone-simulator`), three critical flaws were identified:

1. **Appointment Failure to Persist:** Although the call screen indicated "Appointment Locked", no appointment was inserted into the Supabase `appointments` table, the lead status in the CRM was not updated to `meeting_booked`, and the appointment never appeared on the platform dashboard.
2. **Robotic Voice Quality:** The agent's speech synthesis utilized the browser's legacy offline text-to-speech (TTS) engine, producing a mechanical, uninflected robotic voice instead of an authoritative, high-status human growth consultant.
3. **No Voice Input Recognition:** The microphone stream was routed exclusively to an audio visualization analyzer (`AnalyserNode`). No Speech-to-Text (STT) or intent recognition engine was active, forcing the user to tap on-screen text buttons instead of conversing naturally.

This document details the root cause of each failure, maps out additional latent issues, and outlines the complete architectural fix.

---

## 2. Issue Analysis & Root Cause Identification

### ISSUE 1: CRM Disconnect — Appointment Not Persisted in Supabase
* **Symptom:**
  At the end of the dialogue in `/phone-simulator`, the screen displayed:
  `Disposition: Appointment Locked`
  However, querying the Supabase `appointments` table returned 0 new rows, and navigating to `/dashboard` or `/leads` showed no new appointments or status transitions.
* **Root Cause:**
  In [`PhoneSimulatorPage.tsx`](file:///c:/Users/beast/OneDrive/Documents/Anay%20Sharma/Projects/3RD%20Year%20Project/resonology-ai-public/frontend/src/features/calls/PhoneSimulatorPage.tsx):
  ```typescript
  // Lines 230-245
  const turn4Text = `Perfect, main invite bhej raha hoon calendar par. Thank you ${leadFirstName} ji, talk to you Thursday.`;
  setTimeout(() => {
    setTranscript((prev) => [...prev, { speaker: 'agent', text: turn4Text }]);
    setDialogueTurn(4);
    speakVoice(turn4Text);
    setTimeout(() => {
      handleEndCall(); // Only resets local state
    }, 3500);
  }, 500);
  ```
  `handleEndCall()` merely sets local component state `callState = 'ended'`. There was **zero code invoking Supabase REST or SDK** to:
  1. Insert a confirmed row into `appointments` (`scheduled_for`, `lead_id`, `status: 'confirmed'`).
  2. Update `leads.status = 'meeting_booked'`.
  3. Update `calls.status = 'completed'` with call duration and full transcript.

* **Proposed Solution:**
  In `handleProspectReply` (when agreement is reached) and `handleEndCall`:
  1. Query active organization context via `supabase.auth.getUser()`.
  2. Compute the appointment date (e.g. next Thursday 4:00 PM).
  3. Execute direct atomic Supabase writes:
     ```typescript
     // 1. Insert into appointments
     await supabase.from('appointments').insert({
       lead_id: callData.leadId,
       organization_id: orgId,
       scheduled_for: confirmedDate.toISOString(),
       status: 'confirmed',
       notes: `Automated lock: ${callData.offer} (${callData.companyName})`,
     });

     // 2. Update lead status in CRM
     await supabase.from('leads').update({
       status: 'meeting_booked',
       updated_at: new Date().toISOString(),
     }).eq('id', callData.leadId);

     // 3. Update call record with transcript and duration
     if (callData.callId) {
       await supabase.from('calls').update({
         status: 'completed',
         duration_seconds: callDuration,
         transcript: transcript.map(t => `${t.speaker}: ${t.text}`).join('\n'),
         ended_at: new Date().toISOString(),
       }).eq('id', callData.callId);
     }
     ```
  4. Invalidate TanStack query cache keys (`queryKeys.appointments.all`, `queryKeys.leads.all`) so the dashboard updates instantaneously.

---

### ISSUE 2: Robotic Speech Output (Legacy Offline SAPI / Browser Synthesis)
* **Symptom:**
  The agent's voice sounded like a robotic 1990s desktop screen-reader with no prosody, tone modulation, or natural Hinglish rhythm.
* **Root Cause:**
  In [`PhoneSimulatorPage.tsx`](file:///c:/Users/beast/OneDrive/Documents/Anay%20Sharma/Projects/3RD%20Year%20Project/resonology-ai-public/frontend/src/features/calls/PhoneSimulatorPage.tsx), the speech playback logic was:
  ```typescript
  const speakVoice = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => v.lang.includes('in') || v.lang.includes('hi'));
    if (preferred) utterance.voice = preferred;
    window.speechSynthesis.speak(utterance);
  };
  ```
  * Browser `SpeechSynthesis` on Windows defaults to legacy local offline voices (`Microsoft David Desktop` or uninflected SAPI5).
  * These desktop voices lack neural inflection, syllable stress, pitch variation, and conversational pacing.
  * In contrast, Google Gemini Live and Neural TTS use deep neural vocoders trained on real human prosody.
* **Proposed Solution:**
  1. **Neural Voice Filtering & Dynamic Modulation:**
     - Query available system voices and prioritize high-quality online neural voices:
       * `Google हिन्दी` / `Google UK English Male` / `Microsoft Neerja Online (Natural)` / `Microsoft Prabhat Online (Natural)`.
     - Modulate `utterance.pitch` and `utterance.rate` per conversational turn:
       * Turn 1 (Greeting): Pitch `0.98`, Rate `1.02` (Calm, grounded, respectful).
       * Turn 2 (Diagnostic Hook): Pitch `1.04` (Curious, inquisitive).
       * Turn 3 (Takeaway / Voss Close): Pitch `0.95`, Rate `0.98` (Deliberate, authoritative).
  2. **LiveKit WebRTC Audio Stream Bridge:**
     - When running `agent.py`, connect the phone simulator to the LiveKit Room so it streams Gemini's actual real-time 24kHz neural audio directly into the browser speaker.

---

### ISSUE 3: Unresponsive Microphone (No Speech Recognition Hooked Up)
* **Symptom:**
  Speaking into the microphone did not trigger any response from the agent. The user was forced to tap the on-screen suggestion pills.
* **Root Cause:**
  In [`PhoneSimulatorPage.tsx`](file:///c:/Users/beast/OneDrive/Documents/Anay%20Sharma/Projects/3RD%20Year%20Project/resonology-ai-public/frontend/src/features/calls/PhoneSimulatorPage.tsx):
  ```typescript
  const setupMicStream = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const ctx = new AudioCtx();
    const src = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    src.connect(analyser); // ONLY used for calculating green bar height!
  };
  ```
  The microphone stream was piped **only into a Web Audio `AnalyserNode` to calculate green bar heights**.
  * No `SpeechRecognition` or `webkitSpeechRecognition` engine was listening to the incoming audio.
  * No audio packets were sent to a speech-to-text pipeline.
  * As a result, the browser literally threw away the user's spoken audio frames.
* **Proposed Solution:**
  1. Initialize Web Speech API `webkitSpeechRecognition` / `SpeechRecognition` in `PhoneSimulatorPage.tsx`:
     ```typescript
     const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
     const recognizer = new SpeechRecognition();
     recognizer.continuous = true;
     recognizer.interimResults = true;
     recognizer.lang = 'en-IN'; // Supports Hinglish recognition
     ```
  2. On Speech Results (`recognizer.onresult`):
     - Display interim spoken words in real time in the prospect's dialogue bubble on screen.
     - When the prospect pauses ($>600\text{ms}$ silence via speech endpointing), pass the finalized text to `handleProspectReply(finalTranscript)`.
  3. Semantic Conversational Matcher:
     - Automatically parses spoken answers (e.g. "haan boliye", "13.5% interest", "thursday 4pm", "send me email") and transitions the agent through the tactical sales turns without touching the screen.

---

### ISSUE 4: Missing Call Record Linkage & Telemetry Sync
* **Symptom:**
  When dispatching a call from `ScheduleAICallModal.tsx`, a record is inserted into `calls` with `status: 'queued'`. However, `PhoneSimulatorPage.tsx` did not receive or store the generated `call_id` in its payload.
* **Root Cause:**
  In `ScheduleAICallModal.tsx`:
  ```typescript
  const res = await createCall.mutateAsync(...);
  // Broadcast payload sent callerName and leadName, but OMITTED res.id!
  ```
  Because `callId` was omitted from the broadcast payload, the simulator could not update the specific call row in Supabase when the call started or ended.
* **Proposed Solution:**
  1. Include `callId: res.id` in `ScheduleAICallModal.tsx` broadcast payload.
  2. In `PhoneSimulatorPage.tsx`, save `callId` into `callData`.
  3. When call starts: update `calls` row with `status = 'in_progress'`, `started_at = now()`.
  4. When call ends: update `calls` row with `status = 'completed'`, `duration_seconds = callDuration`, `ended_at = now()`.

---

## 3. Systematic Action Plan & Fix Checklist

| Component | Target File | Action Required |
|---|---|---|
| **1. Speech-to-Text** | `frontend/src/features/calls/PhoneSimulatorPage.tsx` | Wire `webkitSpeechRecognition` to transcribe microphone audio in real time and automatically advance conversational turns. |
| **2. CRM Persistence** | `frontend/src/features/calls/PhoneSimulatorPage.tsx` | Insert row into `appointments`, update `leads.status = 'meeting_booked'`, update `calls` record in Supabase upon agreement. |
| **3. Voice Humanization** | `frontend/src/features/calls/PhoneSimulatorPage.tsx` | Prioritize online neural voices, implement dynamic turn-based pitch/rate modulation, and add natural breathing pauses. |
| **4. Call ID Propagation** | `frontend/src/features/leads/components/ScheduleAICallModal.tsx` | Pass `callId: res.id` in the broadcast payload so the simulator can update the database row. |
| **5. Live Telemetry Bridge**| `frontend/src/features/calls/LiveCallMonitorPage.tsx` | Listen for `appointment_locked` broadcast events and display interactive real-time confirmation banners. |

---

## 4. Verification & Testing Protocol

1. **Voice Input Test:** Speak directly into mobile/laptop microphone without touching screen $\rightarrow$ verify speech transcript renders live in bubble $\rightarrow$ agent answers automatically.
2. **Appointment Persistence Test:** Complete the call $\rightarrow$ open `/dashboard` and `/leads` $\rightarrow$ verify lead status is `Meeting Booked` $\rightarrow$ verify appointment is logged with correct date and time.
3. **Database Verification:** Execute direct Supabase check:
   ```sql
   SELECT * FROM appointments ORDER BY created_at DESC LIMIT 1;
   SELECT status, transcript FROM calls ORDER BY created_at DESC LIMIT 1;
   ```
4. **Vocal Pacing Test:** Verify voice inflection varies naturally across turns and does not sound like a flat monotone robot.
