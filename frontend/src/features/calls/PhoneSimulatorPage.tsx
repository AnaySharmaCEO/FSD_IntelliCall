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
  Bot,
  User,
  ShieldCheck,
  Radio,
  ArrowLeft,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui';

type CallState = 'standby' | 'ringing' | 'connected' | 'ended';

interface IncomingCallPayload {
  callerName?: string;
  callerId?: string;
  leadName?: string;
  leadId?: string;
}

export const PhoneSimulatorPage: React.FC = () => {
  const [callState, setCallState] = useState<CallState>('standby');
  const [callData, setCallData] = useState<IncomingCallPayload>({
    callerName: 'IntelliCall AI',
    callerId: '+91 98765 43210',
    leadName: 'Executive Prospect',
  });

  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(true);
  const [showKeypad, setShowKeypad] = useState(false);
  const [micAudioLevel, setMicAudioLevel] = useState<number[]>([15, 25, 40, 20, 60, 35, 50, 25]);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const ringtoneTimerRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const wakeLockRef = useRef<any>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

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

        // Dual Tone Multi-Frequency (DTMF 440Hz + 480Hz ring cadence)
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

      // Trigger mobile vibration if supported
      if ('vibrate' in navigator) {
        navigator.vibrate([500, 250, 500, 250, 1000]);
      }
    } catch {
      // AudioContext autoplay restriction fallback
    }
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

  // 2. Request Screen Wake Lock when call starts
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

  // 3. Setup Mic Stream & Audio Visualizer
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
    } catch {
      // Mic permission declined or unavailable; simulated waveform continues
    }
  };

  const stopMicStream = () => {
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
  };

  // 4. Supabase Realtime Channel for Remote Dispatch
  useEffect(() => {
    const channel = supabase.channel('phone-simulator', {
      config: { broadcast: { self: true } },
    });

    channel
      .on('broadcast', { event: 'incoming_call' }, ({ payload }) => {
        setCallData({
          callerName: payload?.callerName || 'IntelliCall AI',
          callerId: payload?.callerId || '+91 98765 43210',
          leadName: payload?.leadName || 'Executive Lead',
          leadId: payload?.leadId,
        });
        setCallState('ringing');
        playRingtone();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      stopRingtone();
      releaseWakeLock();
      stopMicStream();
    };
  }, []);

  // 5. Active Call Timer
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
  };

  const handleDeclineCall = () => {
    stopRingtone();
    setCallState('standby');
  };

  const handleEndCall = () => {
    stopRingtone();
    releaseWakeLock();
    stopMicStream();
    setCallState('ended');
    setTimeout(() => {
      setCallState('standby');
      setCallDuration(0);
    }, 4000);
  };

  const triggerTestCall = () => {
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
      <div className="w-full max-w-[390px] h-[800px] max-h-[92vh] bg-zinc-950 border-4 border-zinc-800/80 rounded-[48px] shadow-2xl relative overflow-hidden flex flex-col justify-between p-6">
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
                Phone Client Ready
              </h2>
              <p className="text-xs text-zinc-400 max-w-[240px] mx-auto leading-relaxed">
                Waiting for autonomous AI call dispatch from your laptop dashboard...
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-900/70 border border-zinc-800/80 text-[11px] text-zinc-400 space-y-1.5 w-full text-left font-mono">
              <div className="flex items-center justify-between text-zinc-300">
                <span>Channel:</span>
                <span className="text-emerald-400">phone-simulator</span>
              </div>
              <div className="flex items-center justify-between text-zinc-300">
                <span>Audio Engine:</span>
                <span>24kHz WebRTC</span>
              </div>
              <div className="flex items-center justify-between text-zinc-300">
                <span>Tactical Mind:</span>
                <span className="text-blue-400">System 1 &bull; Chameleon</span>
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
                Tap above to test locally, or click "Dispatch AI Call" on your laptop dashboard.
              </p>
            </div>
          </div>
        )}

        {/* ----------------- STATE 2: RINGING ----------------- */}
        {callState === 'ringing' && (
          <div className="flex-1 flex flex-col justify-between py-10 items-center text-center animate-fade-in">
            {/* Top caller info */}
            <div className="space-y-3 pt-6">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500/20 to-blue-500/20 border-2 border-emerald-500/40 mx-auto flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/10">
                <Bot size={44} className="animate-bounce" />
              </div>

              <div>
                <span className="text-xs uppercase tracking-widest text-emerald-400 font-mono font-semibold">
                  Incoming Voice AI Call
                </span>
                <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
                  {callData.callerName}
                </h1>
                <p className="text-xs font-mono text-zinc-400 mt-0.5">
                  {callData.callerId}
                </p>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300 font-mono">
                <Sparkles size={12} className="text-emerald-400" />
                <span>Conversational Chameleon Active</span>
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
          <div className="flex-1 flex flex-col justify-between py-6 items-center text-center animate-fade-in">
            {/* Top caller banner */}
            <div className="space-y-2 pt-4">
              <h2 className="text-xl font-bold tracking-tight text-white">
                {callData.callerName}
              </h2>
              <div className="font-mono text-sm text-emerald-400 font-semibold tracking-wider">
                {formatTimer(callDuration)}
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400 font-mono">
                <ShieldCheck size={11} />
                <span>WebRTC 24kHz HD &bull; Sub-300ms</span>
              </div>
            </div>

            {/* Center Live Waveform */}
            <div className="w-full px-6 py-8 flex flex-col items-center justify-center space-y-4">
              <div className="w-28 h-28 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center relative shadow-inner">
                <Bot size={48} className="text-emerald-400" />
                <span className="absolute inset-0 rounded-full border-2 border-emerald-500/30 animate-ping opacity-40 pointer-events-none" />
              </div>

              {/* Dynamic Waveform Bars */}
              <div className="flex items-center gap-1.5 h-12 justify-center w-full">
                {micAudioLevel.map((lvl, idx) => (
                  <div
                    key={idx}
                    className="w-1.5 rounded-full bg-emerald-400 transition-all duration-75"
                    style={{ height: `${lvl}px` }}
                  />
                ))}
              </div>

              <p className="text-[11px] text-zinc-400 font-medium">
                {isMuted ? 'Microphone Muted' : 'Speaking &bull; Listening with Tactical Empathy'}
              </p>
            </div>

            {/* In-Call Action Grid */}
            <div className="w-full space-y-6 pb-2">
              <div className="grid grid-cols-3 gap-4 px-4">
                {/* Mute */}
                <button
                  type="button"
                  onClick={() => setIsMuted(!isMuted)}
                  className={`p-3.5 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    isMuted
                      ? 'bg-red-500/20 border-red-500 text-red-400'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                  }`}
                >
                  {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                  <span className="text-[10px] font-medium">Mute</span>
                </button>

                {/* Keypad */}
                <button
                  type="button"
                  onClick={() => setShowKeypad(!showKeypad)}
                  className={`p-3.5 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    showKeypad
                      ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                  }`}
                >
                  <Grid size={20} />
                  <span className="text-[10px] font-medium">Keypad</span>
                </button>

                {/* Speaker */}
                <button
                  type="button"
                  onClick={() => setIsSpeaker(!isSpeaker)}
                  className={`p-3.5 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    isSpeaker
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                  }`}
                >
                  {isSpeaker ? <Volume2 size={20} /> : <VolumeX size={20} />}
                  <span className="text-[10px] font-medium">Speaker</span>
                </button>
              </div>

              {/* End Call Button */}
              <button
                type="button"
                onClick={handleEndCall}
                className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center text-white shadow-xl shadow-red-600/40 mx-auto transition-transform active:scale-90 cursor-pointer"
                title="End Call"
              >
                <PhoneOff size={28} />
              </button>
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

            <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 space-y-1 text-left w-full font-mono">
              <div className="flex justify-between">
                <span>Disposition:</span>
                <span className="text-emerald-400 font-bold">Appointment Locked</span>
              </div>
              <div className="flex justify-between">
                <span>Telemetry Sync:</span>
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
