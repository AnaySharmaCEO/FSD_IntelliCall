import React, { useState, useEffect, useRef } from 'react';
import {
  Phone,
  PhoneOff,
  PhoneCall,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Grid,
  Sparkles,
  User,
  ShieldCheck,
  Radio,
  ArrowLeft,
  MessageSquare,
  CheckCircle2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

type CallState = 'standby' | 'ringing' | 'connected' | 'ended';

interface IncomingCallPayload {
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
  const [showKeypad, setShowKeypad] = useState(false);
  const [micAudioLevel, setMicAudioLevel] = useState<number[]>([15, 25, 40, 20, 60, 35, 50, 25]);

  // Conversational Turns
  const [dialogueTurn, setDialogueTurn] = useState<number>(1);
  const [transcript, setTranscript] = useState<{ speaker: 'agent' | 'prospect'; text: string }[]>([]);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const ringtoneTimerRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const wakeLockRef = useRef<any>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const leadFirstName = (callData.leadName || 'Vikram').split(' ')[0];
  const company = callData.companyName || callData.callerName || 'FinEdge Capital';
  const motto = callData.motto || 'reducing vehicle financing rates from 14% down to 8.4%';
  const offer = callData.offer || 'a complimentary 5-minute portfolio interest audit this Thursday';
  const q1 = callData.questions?.[0] || 'What interest rate are you currently paying on your primary vehicle loan?';

  // Speech Synthesis
  const speakVoice = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(
        (v) =>
          v.lang.toLowerCase().includes('in') ||
          v.lang.toLowerCase().includes('hi') ||
          v.name.toLowerCase().includes('india')
      ) || voices[0];
      if (preferred) utterance.voice = preferred;
      window.speechSynthesis.speak(utterance);
    } catch {}
  };

  // 1. Web Audio API synthesized phone ring chime
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
          const sliced = Array.from(data.slice(0, 8)).map((v) => Math.max(12, Math.round((v / 255) * 80)));
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

  // Supabase Realtime Listener
  useEffect(() => {
    const channel = supabase.channel('phone-simulator', {
      config: { broadcast: { self: true } },
    });

    channel
      .on('broadcast', { event: 'incoming_call' }, ({ payload }) => {
        setCallData({
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
        setCallState('ringing');
        playRingtone();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      stopRingtone();
      releaseWakeLock();
      stopMicStream();
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

  const handleAnswerCall = async () => {
    stopRingtone();
    setCallState('connected');
    await requestWakeLock();
    await setupMicStream();

    // Turn 1: Professional Non-Slimeball Opening (Respectful Permission)
    const turn1Text = `Namaste ${leadFirstName} ji, Anay bol raha hoon ${company} se. Ek quick minute baat ho sakti hai aapse?`;
    setTranscript([{ speaker: 'agent', text: turn1Text }]);
    setDialogueTurn(1);
    setTimeout(() => {
      speakVoice(turn1Text);
    }, 600);
  };

  const handleProspectReply = (prospectText: string) => {
    const newTranscript = [...transcript, { speaker: 'prospect' as const, text: prospectText }];
    setTranscript(newTranscript);

    if (dialogueTurn === 1) {
      // Advance to Turn 2: Campaign Hook & Diagnostic Discovery Question
      const turn2Text = `Actually ${company} mein hum ${motto} par focus karte hain. Wanted to ask—${q1}?`;
      setTimeout(() => {
        setTranscript((prev) => [...prev, { speaker: 'agent', text: turn2Text }]);
        setDialogueTurn(2);
        speakVoice(turn2Text);
      }, 500);
    } else if (dialogueTurn === 2) {
      // Advance to Turn 3: Chris Voss "No"-Oriented Close
      const turn3Text = `Right. Would you be totally opposed to ${offer} with our team this Thursday?`;
      setTimeout(() => {
        setTranscript((prev) => [...prev, { speaker: 'agent', text: turn3Text }]);
        setDialogueTurn(3);
        speakVoice(turn3Text);
      }, 500);
    } else if (dialogueTurn === 3) {
      // Advance to Turn 4: Lock CRM Appointment & Graceful Close
      const turn4Text = `Perfect, main invite bhej raha hoon calendar par. Thank you ${leadFirstName} ji, talk to you Thursday.`;
      setTimeout(() => {
        setTranscript((prev) => [...prev, { speaker: 'agent', text: turn4Text }]);
        setDialogueTurn(4);
        speakVoice(turn4Text);
        setTimeout(() => {
          handleEndCall();
        }, 3500);
      }, 500);
    }
  };

  const handleDeclineCall = () => {
    stopRingtone();
    setCallState('standby');
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  };

  const handleEndCall = () => {
    stopRingtone();
    releaseWakeLock();
    stopMicStream();
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
    setCallState('ringing');
    playRingtone();
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
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-32 h-6 bg-black rounded-full flex items-center justify-end px-3 gap-1 z-30 border border-zinc-800/50">
          <span className="w-2.5 h-2.5 rounded-full bg-zinc-900 border border-zinc-800" />
          <span className="w-2 h-2 rounded-full bg-emerald-500/60 animate-pulse" />
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
                Listening on local channel for outbound call dispatch from your laptop...
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-900/70 border border-zinc-800/80 text-[11px] text-zinc-400 space-y-1.5 w-full text-left font-mono">
              <div className="flex items-center justify-between text-zinc-300">
                <span>Active Brand:</span>
                <span className="text-blue-400 font-semibold">{company}</span>
              </div>
              <div className="flex items-center justify-between text-zinc-300">
                <span>Prospect:</span>
                <span className="text-emerald-400">{callData.leadName}</span>
              </div>
              <div className="flex items-center justify-between text-zinc-300">
                <span>Speech Pipeline:</span>
                <span>Dual-Audio WebRTC</span>
              </div>
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
                Tap above to test locally, or click "Ring Phone Client" on your dashboard.
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
                <span>WebRTC 24kHz HD &bull; Sub-300ms</span>
              </div>
            </div>

            {/* Dialogue Bubble Feed */}
            <div className="w-full flex-1 overflow-y-auto px-2 py-3 space-y-2.5 my-2 max-h-[300px]">
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

            {/* Quick Interactive Response Options (Simulate live conversational turns) */}
            <div className="w-full shrink-0 space-y-2">
              <div className="p-2.5 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 text-left space-y-1.5">
                <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
                  Tap to Respond (or speak into mic):
                </span>
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
                        onClick={() => handleProspectReply('Currently I am paying around 13.5% APR on my car loan.')}
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
                    <div className="text-center py-1 text-emerald-400 text-xs font-semibold flex items-center justify-center gap-1.5">
                      <CheckCircle2 size={14} />
                      <span>Appointment Confirmed on CRM</span>
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
                  onClick={() => setIsMuted(!isMuted)}
                  className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${
                    isMuted
                      ? 'bg-red-500/20 border-red-500 text-red-400'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                  }`}
                >
                  {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
                  <span className="text-[9px] font-medium">Mute</span>
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
                <span>Value Prop Delivered:</span>
                <span className="text-zinc-400">{company}</span>
              </div>
              <div className="flex justify-between">
                <span>CRM Sync:</span>
                <span className="text-blue-400">Saved to Supabase</span>
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
