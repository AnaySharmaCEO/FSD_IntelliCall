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
  CalendarCheck,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { apiClient } from '../../api/hooks';
import { queryKeys } from '../../api/keys';

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

const SpeechRecognitionAPI =
  typeof window !== 'undefined'
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null;

export const PhoneSimulatorPage: React.FC = () => {
  const queryClient = useQueryClient();

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

  // Conversational Turns & Transcripts
  const [dialogueTurn, setDialogueTurn] = useState<number>(1);
  const [transcript, setTranscript] = useState<{ speaker: 'agent' | 'prospect'; text: string }[]>([]);
  const [interimSpokenText, setInterimSpokenText] = useState<string>('');
  const [isListening, setIsListening] = useState<boolean>(false);

  // CRM Persistence status
  const [persistStatus, setPersistStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [savedAppointmentId, setSavedAppointmentId] = useState<string | null>(null);

  // Speech Synthesis state
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [activeVoiceName, setActiveVoiceName] = useState<string>('');

  // Refs for audio, timers, and STT
  const audioCtxRef = useRef<AudioContext | null>(null);
  const ringtoneTimerRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const wakeLockRef = useRef<any>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<number | null>(null);
  const isAgentSpeakingRef = useRef<boolean>(false);
  const callStateRef = useRef<CallState>('standby');
  const dialogueTurnRef = useRef<number>(1);
  const isMutedRef = useRef<boolean>(false);
  const callDurationRef = useRef<number>(0);
  const transcriptRef = useRef<{ speaker: 'agent' | 'prospect'; text: string }[]>([]);

  // Keep refs in sync with state for callbacks
  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  useEffect(() => {
    dialogueTurnRef.current = dialogueTurn;
  }, [dialogueTurn]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    callDurationRef.current = callDuration;
  }, [callDuration]);

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

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
  // Voice Selection & Humanization Engine (Speech Synthesis)
  // -------------------------------------------------------------
  const pickBestVoice = (availableVoices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null => {
    if (!availableVoices || availableVoices.length === 0) return null;

    // 1. Natural / Online Indian English & Hindi Neural Voices
    const neuralIndian = availableVoices.find(
      (v) =>
        (v.name.includes('Neerja') ||
          v.name.includes('Swara') ||
          v.name.includes('Prabhat') ||
          v.name.includes('हिन्दी') ||
          v.name.includes('Hindi') ||
          (v.lang.toLowerCase().includes('in') && v.name.includes('Natural')) ||
          (v.lang.toLowerCase().includes('in') && v.name.includes('Online')))
    );
    if (neuralIndian) return neuralIndian;

    // 2. Any Indian English/Hindi voice
    const anyIndian = availableVoices.find(
      (v) =>
        v.lang.toLowerCase().includes('en-in') ||
        v.lang.toLowerCase().includes('hi-in') ||
        v.name.toLowerCase().includes('india')
    );
    if (anyIndian) return anyIndian;

    // 3. Natural / Online English Neural voices (e.g. Edge Natural Jenny / Guy / Aria)
    const naturalEnglish = availableVoices.find(
      (v) =>
        (v.name.includes('Natural') || v.name.includes('Online')) &&
        v.lang.toLowerCase().startsWith('en')
    );
    if (naturalEnglish) return naturalEnglish;

    // 4. Clean standard Google / Apple / Microsoft English voices
    const goodEnglish = availableVoices.find(
      (v) =>
        (v.name.includes('Google') ||
          v.name.includes('Samantha') ||
          v.name.includes('Daniel') ||
          v.name.includes('Jenny')) &&
        v.lang.toLowerCase().startsWith('en')
    );
    if (goodEnglish) return goodEnglish;

    return (
      availableVoices.find((v) => v.lang.toLowerCase().startsWith('en')) ||
      availableVoices[0] ||
      null
    );
  };

  useEffect(() => {
    if (!('speechSynthesis' in window)) return;

    const updateVoices = () => {
      const available = window.speechSynthesis.getVoices();
      if (available && available.length > 0) {
        setVoices(available);
        const best = pickBestVoice(available);
        if (best) {
          setActiveVoiceName(best.name);
        }
      }
    };

    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;

    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  const speakVoice = (text: string, turn: number = 1) => {
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      isAgentSpeakingRef.current = true;

      const utterance = new SpeechSynthesisUtterance(text);

      // Psychological voice modulation per conversational turn:
      if (turn === 1) {
        // High-energy, warm, polite opening
        utterance.rate = 1.02;
        utterance.pitch = 1.05;
      } else if (turn === 2) {
        // Analytical diagnostic inquiry
        utterance.rate = 1.04;
        utterance.pitch = 1.02;
      } else if (turn === 3) {
        // Chris Voss "No"-oriented close (calm, authoritative downward inflection)
        utterance.rate = 0.96;
        utterance.pitch = 0.94;
      } else {
        // Confident, decisive CRM confirmation
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
      }

      const currentVoices = window.speechSynthesis.getVoices();
      const best = pickBestVoice(currentVoices.length > 0 ? currentVoices : voices);
      if (best) {
        utterance.voice = best;
        setActiveVoiceName(best.name);
      }

      utterance.onend = () => {
        isAgentSpeakingRef.current = false;
      };

      utterance.onerror = () => {
        isAgentSpeakingRef.current = false;
      };

      window.speechSynthesis.speak(utterance);
    } catch {
      isAgentSpeakingRef.current = false;
    }
  };

  // -------------------------------------------------------------
  // Speech-to-Text (STT) Microphone Recognition Pipeline
  // -------------------------------------------------------------
  const startSTT = () => {
    if (!SpeechRecognitionAPI) {
      console.warn('SpeechRecognition API is not supported in this browser environment.');
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }

    try {
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-IN'; // Indian English / Hinglish
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        // Discard microphone audio if agent is currently speaking over device speakers
        if (isAgentSpeakingRef.current) {
          return;
        }

        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            final += item[0].transcript;
          } else {
            interim += item[0].transcript;
          }
        }

        if (interim) {
          setInterimSpokenText(interim);

          // Reset silence timer on interim speech
          if (silenceTimerRef.current) {
            window.clearTimeout(silenceTimerRef.current);
          }
          silenceTimerRef.current = window.setTimeout(() => {
            if (interim.trim().length > 1 && !isAgentSpeakingRef.current) {
              setInterimSpokenText('');
              handleProspectReply(interim.trim());
            }
          }, 1100);
        }

        if (final.trim()) {
          if (silenceTimerRef.current) {
            window.clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
          setInterimSpokenText('');
          handleProspectReply(final.trim());
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'no-speech') return;
        console.warn('Speech recognition notice:', event.error);
      };

      recognition.onend = () => {
        setIsListening(false);
        // Automatically restart if call is still live and not muted
        if (callStateRef.current === 'connected' && !isMutedRef.current) {
          try {
            recognition.start();
          } catch {}
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn('Could not initialize SpeechRecognition:', err);
    }
  };

  const stopSTT = () => {
    if (silenceTimerRef.current) {
      window.clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    setIsListening(false);
    setInterimSpokenText('');
  };

  // -------------------------------------------------------------
  // Web Audio Ringtone Generator & Mic Stream Analyser
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

  const setupMicStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      micStreamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const src = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 32;
        src.connect(analyser);
        analyserRef.current = analyser;

        const updateLevels = () => {
          if (!analyserRef.current) return;
          const data = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(data);
          const sliced = Array.from(data.slice(0, 8)).map((v) =>
            Math.max(12, Math.round((v / 255) * 80))
          );
          setMicAudioLevel(sliced);
          requestAnimationFrame(updateLevels);
        };
        updateLevels();
      }
    } catch {}
  };

  const stopMicStream = () => {
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
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
        setDialogueTurn(1);
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
      stopMicStream();
      stopSTT();
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
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
  // CRM Database Persistence Engine
  // -------------------------------------------------------------
  const persistAppointmentToCRM = async () => {
    setPersistStatus('saving');
    try {
      let targetLeadId = callData.leadId;
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

      if (targetOrgId && targetLeadId) {
        // 1. Insert row into appointments table
        const { data: createdAppt, error: apptError } = await supabase
          .from('appointments')
          .insert({
            organization_id: targetOrgId,
            lead_id: targetLeadId,
            call_id: callData.callId || null,
            scheduled_for: apptDate.toISOString(),
            status: 'scheduled',
            booking_source: 'ai_booked',
            notes: `Locked via Resonology AI Voice: ${offer} (${company})`,
          })
          .select()
          .maybeSingle();

        if (apptError) {
          console.error('Supabase appointment insertion error:', apptError);
        } else {
          setSavedAppointmentId(createdAppt?.id || 'CONFIRMED');
        }

        // 2. Update Lead status to 'meeting_booked'
        await supabase
          .from('leads')
          .update({
            status: 'meeting_booked',
            stage_entered_at: new Date().toISOString(),
            next_action: `Portfolio audit confirmed for Thursday 4:00 PM`,
            last_activity_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', targetLeadId);

        // 3. Update Call row if Call ID exists
        if (callData.callId) {
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
            .eq('id', callData.callId);
        }

        // 4. Invalidate TanStack Query caches so all dashboard/leads/appointments views update instantly
        queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.leads.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.calls.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all });

        setPersistStatus('saved');
      } else {
        setPersistStatus('error');
      }
    } catch (err) {
      console.error('Failed to persist appointment to Supabase:', err);
      setPersistStatus('error');
    }
  };

  // -------------------------------------------------------------
  // Call Lifecycle & Conversational Turn Transitions
  // -------------------------------------------------------------
  const handleAnswerCall = async () => {
    stopRingtone();
    setCallState('connected');
    setPersistStatus('idle');
    setSavedAppointmentId(null);
    await requestWakeLock();
    await setupMicStream();
    startSTT();

    // Turn 1: Professional Non-Slimeball Opening (Respectful Permission)
    const turn1Text = `Namaste ${leadFirstName} ji, Anay bol raha hoon ${company} se. Ek quick minute baat ho sakti hai aapse?`;
    setTranscript([{ speaker: 'agent', text: turn1Text }]);
    setDialogueTurn(1);
    setTimeout(() => {
      speakVoice(turn1Text, 1);
    }, 600);
  };

  const handleProspectReply = (prospectText: string) => {
    if (!prospectText || !prospectText.trim()) return;

    const currentTurn = dialogueTurnRef.current;
    const newTranscript = [...transcriptRef.current, { speaker: 'prospect' as const, text: prospectText }];
    setTranscript(newTranscript);

    if (currentTurn === 1) {
      // Turn 2: Strategic Value Hook & Diagnostic Discovery Question
      const turn2Text = `Actually ${company} mein hum ${motto} par focus karte hain. Wanted to ask—${q1}?`;
      setTimeout(() => {
        setTranscript((prev) => [...prev, { speaker: 'agent', text: turn2Text }]);
        setDialogueTurn(2);
        speakVoice(turn2Text, 2);
      }, 500);
    } else if (currentTurn === 2) {
      // Turn 3: Chris Voss "No"-Oriented Close
      const turn3Text = `Right. Would you be totally opposed to ${offer} with our team this Thursday?`;
      setTimeout(() => {
        setTranscript((prev) => [...prev, { speaker: 'agent', text: turn3Text }]);
        setDialogueTurn(3);
        speakVoice(turn3Text, 3);
      }, 500);
    } else if (currentTurn === 3) {
      // Turn 4: Locked CRM Appointment & Authoritative Close
      const turn4Text = `Perfect, Thursday 4 PM lock kar diya hai aapke calendar par. Thank you ${leadFirstName} ji, talk to you Thursday.`;
      setTimeout(() => {
        setTranscript((prev) => [...prev, { speaker: 'agent', text: turn4Text }]);
        setDialogueTurn(4);
        speakVoice(turn4Text, 4);

        // Commit immediately to Supabase
        persistAppointmentToCRM();

        setTimeout(() => {
          handleEndCall();
        }, 4000);
      }, 500);
    }
  };

  const handleDeclineCall = () => {
    stopRingtone();
    stopSTT();
    setCallState('standby');
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  };

  const handleEndCall = () => {
    stopRingtone();
    releaseWakeLock();
    stopMicStream();
    stopSTT();
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setCallState('ended');
    setTimeout(() => {
      setCallState('standby');
      setCallDuration(0);
      setTranscript([]);
    }, 4500);
  };

  const triggerTestCall = () => {
    setTranscript([]);
    setDialogueTurn(1);
    setPersistStatus('idle');
    setSavedAppointmentId(null);
    setCallState('ringing');
    playRingtone();
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (nextMuted) {
      stopSTT();
    } else {
      startSTT();
    }
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 select-none font-sans">
      {/* Back navigation pill */}
      <div className="absolute top-4 left-4 z-20">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900/80 border border-zinc-800 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={13} />
          <span>Exit Simulator</span>
        </Link>
      </div>

      {/* Realistic Mobile Device Frame */}
      <div className="w-full max-w-[390px] h-[820px] max-h-[94vh] bg-zinc-950 border-4 border-zinc-800/80 rounded-[48px] shadow-2xl relative overflow-hidden flex flex-col justify-between p-6">
        {/* Dynamic Island / Speaker notch */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-32 h-6 bg-black rounded-full flex items-center justify-end px-3 gap-1.5 z-30 border border-zinc-800/50">
          <span className="w-2.5 h-2.5 rounded-full bg-zinc-900 border border-zinc-800" />
          <span
            className={`w-2 h-2 rounded-full ${
              isListening ? 'bg-emerald-400 animate-pulse' : 'bg-emerald-500/60'
            }`}
          />
        </div>

        {/* ----------------- STATE 1: STANDBY ----------------- */}
        {callState === 'standby' && (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 pt-8">
            <div className="w-20 h-20 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400 shadow-inner">
              <Radio size={36} className="animate-pulse" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-lg font-bold tracking-tight text-zinc-100">
                Phone Client Active
              </h2>
              <p className="text-xs text-zinc-400 max-w-[240px] mx-auto leading-relaxed">
                Listening for outbound call dispatch from your laptop or leads dashboard...
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
                <span>Speech Pipeline:</span>
                <span className="text-zinc-200">Continuous Mic STT + Neural TTS</span>
              </div>
              {activeVoiceName && (
                <div className="flex items-center justify-between text-zinc-300 pt-1 border-t border-zinc-800/50">
                  <span>Active Voice:</span>
                  <span className="text-zinc-400 truncate max-w-[170px]" title={activeVoiceName}>
                    {activeVoiceName.replace(/(Microsoft|Google|Desktop|Online|Natural)/gi, '').trim() || activeVoiceName}
                  </span>
                </div>
              )}
            </div>

            <div className="w-full pt-4 border-t border-zinc-900 space-y-2">
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

        {/* ----------------- STATE 2: RINGING (Authentic incoming call screen) ----------------- */}
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
                <span>HD Audio Stream Connected</span>
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

        {/* ----------------- STATE 3: CONNECTED (Live Conversational Dialogue) ----------------- */}
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
                <span>WebRTC Dual-Audio &bull; Sub-300ms</span>
              </div>
            </div>

            {/* Dialogue Bubble Feed */}
            <div className="w-full flex-1 overflow-y-auto px-2 py-3 space-y-2.5 my-2 max-h-[290px]">
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

              {/* Real-Time Live Microphone STT Speech Bubble */}
              {interimSpokenText && (
                <div className="flex flex-col items-end text-right animate-pulse">
                  <span className="text-[10px] text-emerald-400 font-mono mb-0.5 px-1 flex items-center gap-1">
                    <Mic size={10} className="animate-spin" />
                    <span>Speaking...</span>
                  </span>
                  <div className="max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 italic">
                    "{interimSpokenText}"
                  </div>
                </div>
              )}
            </div>

            {/* Quick Interactive Response Options & STT Status */}
            <div className="w-full shrink-0 space-y-2">
              <div className="p-2.5 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 text-left space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
                    Speak into mic (or tap below):
                  </span>
                  {isListening ? (
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      Mic Live
                    </span>
                  ) : (
                    <span className="text-[10px] text-zinc-500 font-mono">Mic Paused</span>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  {dialogueTurn === 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleProspectReply('Haan boliye Anay ji, kis baare mein call kiya aapne?')}
                        className="w-full text-left p-2 rounded-xl bg-zinc-800/70 hover:bg-zinc-800 text-[11px] text-zinc-200 transition-colors border border-zinc-700/50 cursor-pointer"
                      >
                        🗣️ "Haan boliye, kis baare mein call kiya?"
                      </button>
                      <button
                        type="button"
                        onClick={() => handleProspectReply('Thoda busy hoon abhi, quick batayein kya offer hai.')}
                        className="w-full text-left p-2 rounded-xl bg-zinc-800/70 hover:bg-zinc-800 text-[11px] text-zinc-200 transition-colors border border-zinc-700/50 cursor-pointer"
                      >
                        🗣️ "Thoda busy hoon, jaldi bataiye."
                      </button>
                    </>
                  )}

                  {dialogueTurn === 2 && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleProspectReply('Currently I am paying around 13.5% APR on my primary loan.')}
                        className="w-full text-left p-2 rounded-xl bg-zinc-800/70 hover:bg-zinc-800 text-[11px] text-zinc-200 transition-colors border border-zinc-700/50 cursor-pointer"
                      >
                        🗣️ "Around 13.5% interest chal raha hai abhi."
                      </button>
                      <button
                        type="button"
                        onClick={() => handleProspectReply('Details mujhe email kar dijiye, will review later.')}
                        className="w-full text-left p-2 rounded-xl bg-zinc-800/70 hover:bg-zinc-800 text-[11px] text-zinc-200 transition-colors border border-zinc-700/50 cursor-pointer"
                      >
                        🗣️ "Details email kar dijiye."
                      </button>
                    </>
                  )}

                  {dialogueTurn === 3 && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleProspectReply('Sure, Thursday 4 PM works fine with me.')}
                        className="w-full text-left p-2 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/40 text-[11px] text-emerald-200 font-medium transition-colors border border-emerald-500/50 cursor-pointer"
                      >
                        🤝 "Sure, Thursday 4 PM works with me."
                      </button>
                      <button
                        type="button"
                        onClick={() => handleProspectReply('Friday morning would be better for me.')}
                        className="w-full text-left p-2 rounded-xl bg-zinc-800/70 hover:bg-zinc-800 text-[11px] text-zinc-200 transition-colors border border-zinc-700/50 cursor-pointer"
                      >
                        🤝 "Friday morning suits better."
                      </button>
                    </>
                  )}

                  {dialogueTurn >= 4 && (
                    <div className="text-center py-1.5 text-emerald-400 text-xs font-semibold flex items-center justify-center gap-1.5">
                      {persistStatus === 'saving' ? (
                        <>
                          <Loader2 size={14} className="animate-spin text-emerald-400" />
                          <span>Syncing with Supabase CRM...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={14} />
                          <span>Appointment Confirmed on CRM</span>
                        </>
                      )}
                    </div>
                  )}
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
                  onClick={toggleMute}
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

        {/* ----------------- STATE 4: ENDED (CRM Sync Confirmation) ----------------- */}
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
                <span>Value Prop Delivered:</span>
                <span className="text-zinc-400 truncate max-w-[160px]">{company}</span>
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
    </div>
  );
};

export default PhoneSimulatorPage;
