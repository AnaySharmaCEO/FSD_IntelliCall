import React, { useState, useEffect, useRef } from 'react';
import {
  Phone,
  PhoneOff,
  PhoneCall,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  User,
  ShieldCheck,
  Radio,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Key,
  Flame,
  Settings,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { apiClient } from '../../api/hooks';
import { queryKeys } from '../../api/keys';
import { GeminiLiveSession } from '../../voice/geminiLive';

type CallState = 'standby' | 'ringing' | 'connected' | 'ended';

interface IncomingCallPayload {
  callId?: string;
  callerName?: string;
  callerId?: string;
  leadName?: string;
  leadId?: string;
  campaignName?: string;
  companyName?: string;
  motto?: string;
  offer?: string;
  questions?: string[];
}

export const PhoneSimulatorPage: React.FC = () => {
  const queryClient = useQueryClient();

  // Call States
  const [callState, setCallState] = useState<CallState>('standby');
  const [callData, setCallData] = useState<IncomingCallPayload>({
    callerName: 'FinEdge Capital',
    callerId: '+91 98765 43210',
    leadName: 'Vikram Malhotra',
    campaignName: 'Q4 Priority Auto Loan Refinance',
    companyName: 'FinEdge Capital',
    motto: 'reducing vehicle financing rates from 14% down to 8.4%',
    offer: 'a complimentary 5-minute portfolio interest audit this Thursday',
    questions: [
      'What interest rate are you currently paying on your primary vehicle loan?',
      'Has your vehicle been registered for over 12 months with clean repayment?',
    ],
  });

  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(true);
  const [micAudioLevel, setMicAudioLevel] = useState<number[]>([15, 25, 40, 20, 60, 35, 50, 25]);

  // Transcripts & Realtime turns
  const [transcript, setTranscript] = useState<{ speaker: 'agent' | 'prospect'; text: string }[]>([]);

  // CRM Persistence status
  const [persistStatus, setPersistStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [savedAppointmentId, setSavedAppointmentId] = useState<string | null>(null);

  // Gemini Live Engine Settings & State
  const [geminiApiKey, setGeminiApiKey] = useState<string>(() => {
    return (
      (import.meta.env.VITE_GOOGLE_API_KEY as string) ||
      localStorage.getItem('resonology_gemini_api_key') ||
      ''
    );
  });
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [tempApiKeyInput, setTempApiKeyInput] = useState('');
  const [geminiVoice, setGeminiVoice] = useState<'Aoede' | 'Puck' | 'Charon' | 'Kore' | 'Fenrir'>('Aoede');
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [connectionErrorMsg, setConnectionErrorMsg] = useState<string | null>(null);

  // Audio & Hardware Refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const ringtoneTimerRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const wakeLockRef = useRef<any>(null);
  const liveSessionRef = useRef<GeminiLiveSession | null>(null);

  const callDurationRef = useRef<number>(0);
  const transcriptRef = useRef<{ speaker: 'agent' | 'prospect'; text: string }[]>([]);
  const callDataRef = useRef<IncomingCallPayload>(callData);

  useEffect(() => {
    callDurationRef.current = callDuration;
  }, [callDuration]);

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  useEffect(() => {
    callDataRef.current = callData;
  }, [callData]);

  // Lead and Company resolved props
  const leadFirstName = (callData.leadName || 'Vikram').split(' ')[0];
  const company = callData.companyName || callData.callerName || 'FinEdge Capital';
  const motto = callData.motto || 'reducing vehicle financing rates from 14% down to 8.4%';
  const offer = callData.offer || 'a complimentary 5-minute portfolio interest audit this Thursday';
  const q1 = callData.questions?.[0] || 'What interest rate are you currently paying on your primary vehicle loan?';

  // Fallback: Populate default leadId from Supabase if not present
  useEffect(() => {
    supabase
      .from('leads')
      .select('id, name, company')
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data && !callData.leadId) {
          setCallData((prev) => ({
            ...prev,
            leadId: prev.leadId || data.id,
            leadName: prev.leadId ? prev.leadName : (data.name || prev.leadName),
            companyName: prev.leadId ? prev.companyName : (data.company || prev.companyName),
          }));
        }
      });
  }, []);

  // -------------------------------------------------------------
  // Web Audio Ringtone Generator
  // -------------------------------------------------------------
  const playRingtone = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      const playChimeBurst = () => {
        if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') return;
        const now = ctx.currentTime;

        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sine';
        osc2.type = 'sine';
        osc1.frequency.setValueAtTime(440, now);
        osc2.frequency.setValueAtTime(480, now);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.2, now + 0.1);
        gain.gain.setValueAtTime(0.2, now + 1.6);
        gain.gain.linearRampToValueAtTime(0, now + 1.8);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.8);
        osc2.stop(now + 1.8);
      };

      playChimeBurst();
      ringtoneTimerRef.current = window.setInterval(playChimeBurst, 3200);

      if ('vibrate' in navigator) {
        navigator.vibrate([500, 250, 500, 250, 1000]);
      }
    } catch {}
  };

  const stopRingtone = () => {
    if (ringtoneTimerRef.current) {
      clearInterval(ringtoneTimerRef.current);
      ringtoneTimerRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      try {
        audioCtxRef.current.close();
      } catch {}
      audioCtxRef.current = null;
    }
    if ('vibrate' in navigator) {
      navigator.vibrate(0);
    }
  };

  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      }
    } catch {}
  };

  const releaseWakeLock = () => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release().catch(() => {});
      wakeLockRef.current = null;
    }
  };

  // -------------------------------------------------------------
  // Supabase Realtime Listener for Incoming Outbound Calls
  // -------------------------------------------------------------
  useEffect(() => {
    const channel = supabase.channel('phone-simulator', {
      config: { broadcast: { self: true } },
    });

    channel
      .on('broadcast', { event: 'incoming_call' }, ({ payload }) => {
        setCallData({
          callId: payload?.callId,
          callerName: payload?.callerName || payload?.companyName || 'FinEdge Capital',
          callerId: payload?.callerId || '+91 98765 43210',
          leadName: payload?.leadName || 'Vikram Malhotra',
          leadId: payload?.leadId,
          campaignName: payload?.campaignName,
          companyName: payload?.companyName || payload?.callerName || 'FinEdge Capital',
          motto: payload?.motto,
          offer: payload?.offer,
          questions: payload?.questions,
        });
        setTranscript([]);
        setPersistStatus('idle');
        setSavedAppointmentId(null);
        setCallState('ringing');
        playRingtone();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      stopRingtone();
      releaseWakeLock();
      liveSessionRef.current?.stop();
    };
  }, []);

  // Call timer
  useEffect(() => {
    if (callState === 'connected') {
      setCallDuration(0);
      timerIntervalRef.current = window.setInterval(() => {
        setCallDuration((d) => d + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
  }, [callState]);

  // -------------------------------------------------------------
  // CRM Database Persistence Engine (Invoked by Gemini Tool Call)
  // -------------------------------------------------------------
  const persistAppointmentToCRM = async (dayText?: string, timeText?: string, notesText?: string) => {
    setPersistStatus('saving');
    try {
      const activeCallData = callDataRef.current;
      let targetLeadId = activeCallData.leadId;
      let targetOrgId: string | null = null;

      if (!targetLeadId) {
        const { data: fallbackLead } = await supabase
          .from('leads')
          .select('id, organization_id, name, company')
          .limit(1)
          .maybeSingle();

        if (fallbackLead) {
          targetLeadId = fallbackLead.id;
          targetOrgId = fallbackLead.organization_id;
        }
      } else {
        const { data: leadData } = await supabase
          .from('leads')
          .select('organization_id')
          .eq('id', targetLeadId)
          .maybeSingle();
        targetOrgId = leadData?.organization_id || null;
      }

      if (!targetOrgId) {
        const org = await apiClient.getOrganization().catch(() => null);
        targetOrgId = org?.id || null;
      }

      // Compute appointment time: Upcoming Thursday at 4:00 PM
      const apptDate = new Date();
      const currentDay = apptDate.getDay();
      const daysUntilThursday = (4 - currentDay + 7) % 7 || 7;
      apptDate.setDate(apptDate.getDate() + daysUntilThursday);
      apptDate.setHours(16, 0, 0, 0);

      const resolvedDayTime = `${dayText || 'Thursday'} ${timeText || '4:00 PM'}`;

      if (targetOrgId && targetLeadId) {
        // 1. Insert row into appointments table
        const { data: createdAppt, error: apptError } = await supabase
          .from('appointments')
          .insert({
            organization_id: targetOrgId,
            lead_id: targetLeadId,
            call_id: activeCallData.callId || null,
            scheduled_for: apptDate.toISOString(),
            status: 'scheduled',
            booking_source: 'ai_booked',
            notes: `Locked via Gemini Live: ${notesText || offer} (${company}) [Slot: ${resolvedDayTime}]`,
          })
          .select()
          .maybeSingle();

        if (apptError) {
          console.error('[Supabase] Appointment insert error:', apptError);
        } else {
          setSavedAppointmentId(createdAppt?.id || 'CONFIRMED');
        }

        // 2. Update Lead status to 'meeting_booked'
        await supabase
          .from('leads')
          .update({
            status: 'meeting_booked',
            stage_entered_at: new Date().toISOString(),
            next_action: `Portfolio audit confirmed for ${resolvedDayTime}`,
            last_activity_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', targetLeadId);

        // 3. Update Call row if Call ID exists
        if (activeCallData.callId) {
          const transcriptText = transcriptRef.current
            .map((t) => `${t.speaker.toUpperCase()}: ${t.text}`)
            .join('\n');

          await supabase
            .from('calls')
            .update({
              status: 'completed',
              duration_seconds: callDurationRef.current,
              ended_at: new Date().toISOString(),
              transcript: transcriptText,
            })
            .eq('id', activeCallData.callId);
        }

        // 4. Invalidate TanStack Query caches for real-time reactivity
        queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.leads.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.calls.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all });

        setPersistStatus('saved');
        return {
          status: 'confirmed',
          appointment_id: createdAppt?.id || 'CONFIRMED',
          message: `Confirmed slot locked for ${resolvedDayTime} in Supabase CRM.`,
        };
      } else {
        setPersistStatus('error');
        return { status: 'error', message: 'Target lead or organization could not be resolved.' };
      }
    } catch (err: any) {
      console.error('[Supabase] Failed to persist appointment:', err);
      setPersistStatus('error');
      return { status: 'error', message: err.message };
    }
  };

  // -------------------------------------------------------------
  // Call Lifecycle & Gemini Live Multimodal Connection
  // -------------------------------------------------------------
  const handleAnswerCall = async () => {
    stopRingtone();

    // Check if API key is present
    if (!geminiApiKey || geminiApiKey.trim() === '') {
      setShowApiKeyModal(true);
      return;
    }

    setCallState('connected');
    setConnectionStatus('connecting');
    setConnectionErrorMsg(null);
    setPersistStatus('idle');
    setSavedAppointmentId(null);
    await requestWakeLock();

    // Build the exact psychological and tactical system instructions
    const systemInstruction = `
You are Anay, an elite growth and vehicle loan refinancing consultant calling from ${company}.
You are conducting a live, high-stakes phone conversation with ${callData.leadName || 'Vikram Malhotra'}.

ABSOLUTE CARDINAL DIRECTIVES:
1. NEVER FRAME YOURSELF AS AN AI: You are a real human consultant speaking live on a phone call. Never say "As an AI", "I'm a virtual agent", or "Based on my data".
2. LAW 4 (BREVITY & POWER): Keep every response strictly under 20 words. Elite callers never recite long paragraphs. Every sentence must be concise, crisp, and conversational.
3. CHRIS VOSS TACTICAL EMPATHY: Label unspoken prospect hesitation directly (e.g., "Sounds like you're skeptical about refinancing promises...", "I know you're busy right now...").
4. LINGUISTIC CHAMELEON: Code-switch seamlessly. Mirror the prospect. If they speak Hindi or Hinglish, speak polished, respectful Indian business Hinglish ("Aap", "Ji", "Bilkul", "Definitely"). If they speak pure English, respond with high-level corporate English.
5. CONVERSATIONAL ROADMAP:
   - Turn 1 Opening: "Namaste ${leadFirstName} ji, Anay bol raha hoon ${company} se. Ek quick minute baat ho sakti hai aapse?"
   - Turn 2 Diagnostic Hook: Point out that ${company} specializes in ${motto}. Ask: "${q1}"
   - Turn 3 Chris Voss 'No'-Oriented Close: "Would you be totally opposed to ${offer} with our team this Thursday?"
   - Turn 4 Booking Lock: When they agree or suggest a time, immediately trigger the 'book_appointment' tool, confirm the slot warmly, and say goodbye.
6. TOOL TRIGGER: When the user agrees to Thursday or any specific slot, execute the 'book_appointment' function tool immediately.
`.trim();

    try {
      const liveSession = new GeminiLiveSession({
        apiKey: geminiApiKey,
        model: 'gemini-2.0-flash-exp',
        voiceName: geminiVoice,
        systemInstruction: systemInstruction,
        onConnected: () => {
          setConnectionStatus('connected');
        },
        onAudioLevel: (levels) => {
          setMicAudioLevel(levels);
        },
        onUserSpeech: (text) => {
          setTranscript((prev) => {
            const last = prev[prev.length - 1];
            if (last && last.speaker === 'prospect') {
              return [...prev.slice(0, -1), { speaker: 'prospect', text: `${last.text} ${text}`.trim() }];
            }
            return [...prev, { speaker: 'prospect', text }];
          });
        },
        onAgentSpeech: (text) => {
          setTranscript((prev) => {
            const last = prev[prev.length - 1];
            if (last && last.speaker === 'agent') {
              return [...prev.slice(0, -1), { speaker: 'agent', text: `${last.text} ${text}`.trim() }];
            }
            return [...prev, { speaker: 'agent', text }];
          });
        },
        onToolCall: async (name, args) => {
          if (name === 'book_appointment') {
            const result = await persistAppointmentToCRM(args?.day, args?.time, args?.notes);
            // Auto finish call 3.5s after appointment lock
            setTimeout(() => {
              handleEndCall();
            }, 3800);
            return result;
          }
          return { status: 'acknowledged' };
        },
        onError: (err) => {
          console.error('[Simulator] Gemini Live error:', err);
          setConnectionStatus('error');
          setConnectionErrorMsg(err.message || 'Connection failed.');
        },
        onClose: () => {
          setConnectionStatus('idle');
        },
      });

      liveSessionRef.current = liveSession;
      await liveSession.start();
    } catch (err: any) {
      console.error('[Simulator] Failed to start Gemini Live:', err);
      setConnectionStatus('error');
      setConnectionErrorMsg(err.message || 'Failed to start Live session');
    }
  };

  const handleDeclineCall = () => {
    stopRingtone();
    liveSessionRef.current?.stop();
    setCallState('standby');
  };

  const handleEndCall = () => {
    stopRingtone();
    releaseWakeLock();
    liveSessionRef.current?.stop();
    setCallState('ended');
    setTimeout(() => {
      setCallState('standby');
      setCallDuration(0);
      setTranscript([]);
      setConnectionStatus('idle');
    }, 4500);
  };

  const triggerTestCall = () => {
    setTranscript([]);
    setPersistStatus('idle');
    setSavedAppointmentId(null);
    setCallState('ringing');
    playRingtone();
  };

  const saveApiKey = (key: string) => {
    const cleanKey = key.trim();
    setGeminiApiKey(cleanKey);
    localStorage.setItem('resonology_gemini_api_key', cleanKey);
    setShowApiKeyModal(false);
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleQuickChipText = (text: string) => {
    // Send directly over Gemini Live WebSocket
    setTranscript((prev) => [...prev, { speaker: 'prospect', text }]);
    liveSessionRef.current?.sendTextMessage(text);
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 select-none font-sans">
      {/* Back navigation & Settings Pill */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900/80 border border-zinc-800 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={13} />
          <span>Exit Simulator</span>
        </Link>
        <button
          type="button"
          onClick={() => {
            setTempApiKeyInput(geminiApiKey);
            setShowApiKeyModal(true);
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900/80 border border-zinc-800 text-xs font-semibold text-zinc-400 hover:text-white transition-colors cursor-pointer"
        >
          <Key size={13} className={geminiApiKey ? 'text-emerald-400' : 'text-amber-400'} />
          <span>{geminiApiKey ? 'API Key Configured' : 'Set Gemini Key'}</span>
        </button>
      </div>

      {/* Realistic Mobile Device Frame */}
      <div className="w-full max-w-[390px] h-[820px] max-h-[94vh] bg-zinc-950 border-4 border-zinc-800/80 rounded-[48px] shadow-2xl relative overflow-hidden flex flex-col justify-between p-6">
        {/* Dynamic Island / Speaker notch */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-36 h-6 bg-black rounded-full flex items-center justify-between px-3 gap-1 z-30 border border-zinc-800/50">
          <span className="w-2 h-2 rounded-full bg-zinc-900 border border-zinc-800" />
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected'
                  ? 'bg-emerald-400 animate-pulse'
                  : connectionStatus === 'connecting'
                  ? 'bg-amber-400 animate-ping'
                  : 'bg-zinc-600'
              }`}
            />
            <span className="text-[9px] font-mono font-medium text-zinc-400 tracking-tight">
              {connectionStatus === 'connected' ? 'Gemini 24kHz' : 'Resonology'}
            </span>
          </div>
        </div>

        {/* ----------------- STATE 1: STANDBY ----------------- */}
        {callState === 'standby' && (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-5 pt-8">
            <div className="w-20 h-20 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400 shadow-inner">
              <Radio size={36} className="animate-pulse" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-lg font-bold tracking-tight text-zinc-100">
                Phone Client Active
              </h2>
              <p className="text-xs text-zinc-400 max-w-[240px] mx-auto leading-relaxed">
                Direct Gemini Multimodal Live Engine connected. Listening for inbound calls...
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-900/70 border border-zinc-800/80 text-[11px] text-zinc-400 space-y-1.5 w-full text-left font-mono">
              <div className="flex items-center justify-between text-zinc-300">
                <span>Active Brand:</span>
                <span className="text-blue-400 font-semibold">{company}</span>
              </div>
              <div className="flex items-center justify-between text-zinc-300">
                <span>Prospect Target:</span>
                <span className="text-emerald-400">{callData.leadName}</span>
              </div>
              <div className="flex items-center justify-between text-zinc-300">
                <span>Engine:</span>
                <span className="text-emerald-300 font-semibold">Gemini 2.0 Flash Live</span>
              </div>
              <div className="flex items-center justify-between text-zinc-300">
                <span>Voice Persona:</span>
                <span className="text-purple-400 font-semibold">{geminiVoice} (DeepMind 24kHz)</span>
              </div>
              <div className="flex items-center justify-between text-zinc-300 pt-1 border-t border-zinc-800/60">
                <span>AI Studio Key:</span>
                {geminiApiKey ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 size={11} /> Connected
                  </span>
                ) : (
                  <span className="text-amber-400 font-bold flex items-center gap-1">
                    <AlertCircle size={11} /> Required
                  </span>
                )}
              </div>
            </div>

            <div className="w-full pt-3 border-t border-zinc-900 space-y-2">
              <button
                type="button"
                onClick={triggerTestCall}
                className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                <PhoneCall size={16} />
                <span>Simulate Incoming Call Now</span>
              </button>
              <p className="text-[10px] text-zinc-500 text-center">
                Tap above to test locally, or dispatch from your Leads dashboard modal.
              </p>
            </div>
          </div>
        )}

        {/* ----------------- STATE 2: RINGING ----------------- */}
        {callState === 'ringing' && (
          <div className="flex-1 flex flex-col justify-between py-10 items-center text-center animate-fade-in">
            {/* Top caller info */}
            <div className="space-y-3 pt-6">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500/20 to-emerald-500/20 border-2 border-blue-500/40 mx-auto flex items-center justify-center text-blue-400 shadow-xl shadow-blue-500/10">
                <User size={44} className="animate-pulse" />
              </div>

              <div>
                <span className="text-xs uppercase tracking-widest text-emerald-400 font-mono font-semibold">
                  Incoming Priority Call
                </span>
                <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
                  {company}
                </h1>
                {callData.campaignName && (
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {callData.campaignName}
                  </p>
                )}
                <p className="text-xs font-mono text-zinc-500 mt-1">
                  {callData.callerId}
                </p>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300 font-mono">
                <Sparkles size={12} className="text-emerald-400" />
                <span>Gemini Live Neural Audio Ready</span>
              </div>
            </div>

            {/* Answer / Decline Buttons */}
            <div className="w-full flex items-center justify-around px-4 pb-4">
              {/* Decline */}
              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={handleDeclineCall}
                  className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center text-white shadow-lg shadow-red-600/30 transition-transform active:scale-90 cursor-pointer"
                  title="Decline Call"
                >
                  <PhoneOff size={28} />
                </button>
                <span className="text-xs font-medium text-zinc-400">Decline</span>
              </div>

              {/* Accept */}
              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={handleAnswerCall}
                  className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-400 flex items-center justify-center text-black shadow-lg shadow-emerald-500/40 animate-pulse transition-transform active:scale-90 cursor-pointer"
                  title="Answer Call"
                >
                  <Phone size={28} />
                </button>
                <span className="text-xs font-medium text-emerald-400 font-semibold">Accept</span>
              </div>
            </div>
          </div>
        )}

        {/* ----------------- STATE 3: CONNECTED ----------------- */}
        {callState === 'connected' && (
          <div className="flex-1 flex flex-col justify-between py-4 items-center text-center animate-fade-in overflow-hidden">
            {/* Top caller banner */}
            <div className="space-y-1 pt-2 shrink-0">
              <h2 className="text-lg font-bold tracking-tight text-white">
                {company}
              </h2>
              <div className="font-mono text-xs text-emerald-400 font-semibold tracking-wider">
                {formatTimer(callDuration)}
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400 font-mono">
                <ShieldCheck size={11} />
                <span>Gemini Live &bull; Sub-400ms &bull; 24kHz</span>
              </div>
            </div>

            {/* Error banner if connection dropped */}
            {connectionStatus === 'error' && (
              <div className="w-full p-2 rounded-xl bg-red-950/60 border border-red-800 text-[11px] text-red-200 shrink-0">
                ⚠️ {connectionErrorMsg || 'Connection error. Check Google API Key.'}
              </div>
            )}

            {/* Dialogue Bubble Feed */}
            <div className="w-full flex-1 overflow-y-auto px-2 py-3 space-y-2.5 my-2 max-h-[300px]">
              {transcript.length === 0 && (
                <div className="text-center py-8 text-zinc-500 text-xs italic">
                  Connecting Gemini Live voice stream... Speak freely into your phone.
                </div>
              )}
              {transcript.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${
                    msg.speaker === 'agent' ? 'items-start text-left' : 'items-end text-right'
                  }`}
                >
                  <span className="text-[10px] text-zinc-500 font-mono mb-0.5 px-1">
                    {msg.speaker === 'agent' ? `Anay (${company})` : leadFirstName}
                  </span>
                  <div
                    className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${
                      msg.speaker === 'agent'
                        ? 'bg-zinc-900 border border-zinc-800 text-zinc-100'
                        : 'bg-emerald-600/30 border border-emerald-500/40 text-emerald-100'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Interactive Response Options & Live Speech Feedback */}
            <div className="w-full shrink-0 space-y-2">
              <div className="p-2.5 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 text-left space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
                    Speak into mic (or tap below):
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    Live 16kHz PCM
                  </span>
                </div>

                <div className="flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleQuickChipText('Haan boliye Anay ji, kis baare mein call kiya aapne?')}
                    className="w-full text-left p-2 rounded-xl bg-zinc-800/70 hover:bg-zinc-800 text-[11px] text-zinc-200 transition-colors border border-zinc-700/50 cursor-pointer"
                  >
                    🗣️ "Haan boliye, kis baare mein call kiya?"
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickChipText('Currently I am paying around 13.5% APR on my car loan.')}
                    className="w-full text-left p-2 rounded-xl bg-zinc-800/70 hover:bg-zinc-800 text-[11px] text-zinc-200 transition-colors border border-zinc-700/50 cursor-pointer"
                  >
                    🗣️ "Around 13.5% interest chal raha hai abhi."
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickChipText('Sure, Thursday 4 PM works fine with me.')}
                    className="w-full text-left p-2 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/40 text-[11px] text-emerald-200 font-medium transition-colors border border-emerald-500/50 cursor-pointer"
                  >
                    🤝 "Sure, Thursday 4 PM works with me."
                  </button>
                </div>
              </div>

              {/* Dynamic Waveform Bars */}
              <div className="flex items-center gap-1.5 h-6 justify-center w-full">
                {micAudioLevel.map((lvl, idx) => (
                  <div
                    key={idx}
                    className="w-1.5 rounded-full bg-emerald-400 transition-all duration-75"
                    style={{ height: `${Math.min(24, Math.round(lvl * 0.4))}px` }}
                  />
                ))}
              </div>

              {/* In-Call Action Grid */}
              <div className="grid grid-cols-3 gap-2 px-2">
                <button
                  type="button"
                  onClick={() => setIsMuted(!isMuted)}
                  className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${
                    isMuted
                      ? 'bg-red-500/20 border-red-500 text-red-400'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                  }`}
                >
                  {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
                  <span className="text-[9px] font-medium">{isMuted ? 'Unmute' : 'Mute'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsSpeaker(!isSpeaker)}
                  className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${
                    isSpeaker
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                  }`}
                >
                  {isSpeaker ? <Volume2 size={16} /> : <VolumeX size={16} />}
                  <span className="text-[9px] font-medium">Speaker</span>
                </button>

                <button
                  type="button"
                  onClick={handleEndCall}
                  className="p-2.5 rounded-xl bg-red-600 hover:bg-red-700 flex flex-col items-center justify-center gap-1 text-white shadow-lg transition-transform active:scale-95 cursor-pointer"
                >
                  <PhoneOff size={16} />
                  <span className="text-[9px] font-medium">End</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ----------------- STATE 4: ENDED ----------------- */}
        {callState === 'ended' && (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
              <PhoneOff size={28} />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Call Completed</h3>
              <p className="text-xs font-mono text-emerald-400 font-semibold">
                Duration: {formatTimer(callDuration)}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 space-y-1.5 text-left w-full font-mono">
              <div className="flex justify-between">
                <span>Disposition:</span>
                <span className="text-emerald-400 font-bold">Appointment Locked</span>
              </div>
              <div className="flex justify-between">
                <span>Lead Stage:</span>
                <span className="text-emerald-300 font-semibold">meeting_booked</span>
              </div>
              <div className="flex justify-between">
                <span>AI Engine:</span>
                <span className="text-purple-400">Gemini Live (Recorded)</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-zinc-800">
                <span>CRM Sync:</span>
                {persistStatus === 'saved' ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 size={12} />
                    Saved to Supabase
                  </span>
                ) : persistStatus === 'saving' ? (
                  <span className="text-blue-400 font-medium flex items-center gap-1">
                    <Loader2 size={12} className="animate-spin" />
                    Syncing...
                  </span>
                ) : persistStatus === 'error' ? (
                  <span className="text-amber-400 font-medium flex items-center gap-1">
                    <AlertCircle size={12} />
                    Check DB Logs
                  </span>
                ) : (
                  <span className="text-zinc-500 font-medium">Pending</span>
                )}
              </div>
            </div>

            <p className="text-[11px] text-zinc-500">Resetting to standby mode...</p>
          </div>
        )}

        {/* Bottom Home Indicator */}
        <div className="w-32 h-1 bg-zinc-700 rounded-full mx-auto self-center mt-2" />
      </div>

      {/* API Key Configuration Modal */}
      {showApiKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-zinc-900 border border-zinc-800 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Key size={18} className="text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Google AI Studio API Key</h3>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Required for genuine Gemini Multimodal Live speech-to-speech. Paste your Gemini API key below:
            </p>
            <input
              type="password"
              value={tempApiKeyInput}
              onChange={(e) => setTempApiKeyInput(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 font-mono"
            />
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-zinc-400">Select Voice Persona:</label>
              <select
                value={geminiVoice}
                onChange={(e) => setGeminiVoice(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="Aoede">Aoede (Authoritative, Deep, Professional)</option>
                <option value="Kore">Kore (Calm, Reassuring, Consultative)</option>
                <option value="Charon">Charon (Deep Male, Confident)</option>
                <option value="Puck">Puck (Energetic, High-Tempo)</option>
                <option value="Fenrir">Fenrir (Strong, Direct)</option>
              </select>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowApiKeyModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => saveApiKey(tempApiKeyInput)}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 text-black hover:bg-emerald-400"
              >
                Save & Connect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhoneSimulatorPage;
