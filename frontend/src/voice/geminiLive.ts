/**
 * Gemini Live API Web Audio & WebSocket Client
 * Real-time Full-Duplex Speech-to-Speech Engine
 * Author: Anay Sharma
 */

export interface GeminiLiveConfig {
  apiKey: string;
  model?: string;
  voiceName?: 'Aoede' | 'Puck' | 'Charon' | 'Kore' | 'Fenrir';
  systemInstruction: string;
  onAudioLevel?: (level: number[]) => void;
  onAgentSpeech?: (text: string) => void;
  onUserSpeech?: (text: string) => void;
  onToolCall?: (name: string, args: any) => Promise<any>;
  onError?: (err: Error) => void;
  onClose?: () => void;
  onConnected?: () => void;
}

export class GeminiLiveSession {
  private ws: WebSocket | null = null;
  private inputAudioCtx: AudioContext | null = null;
  private outputAudioCtx: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private nextPlayTime: number = 0;
  private isConnected: boolean = false;
  private activeSources: AudioBufferSourceNode[] = [];
  private config: GeminiLiveConfig;

  constructor(config: GeminiLiveConfig) {
    this.config = config;
  }

  public async start(): Promise<void> {
    const { apiKey, model = 'gemini-2.0-flash-exp', voiceName = 'Aoede', systemInstruction } = this.config;

    if (!apiKey || apiKey.trim() === '') {
      throw new Error('Google AI Studio API Key is required for Gemini Live connection.');
    }

    // 1. Initialize 24kHz Output AudioContext for Gemini Neural Audio Playback
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.outputAudioCtx = new AudioContextClass({ sampleRate: 24000 });
    this.nextPlayTime = this.outputAudioCtx.currentTime;

    // 2. Connect to Google Gemini Multimodal Live API WebSocket
    const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = async () => {
      this.isConnected = true;
      this.config.onConnected?.();

      // 3. Send Initial Configuration & System Instruction Frame
      const setupFrame = {
        setup: {
          model: `models/${model}`,
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: voiceName,
                },
              },
            },
          },
          systemInstruction: {
            parts: [{ text: systemInstruction }],
          },
          tools: [
            {
              functionDeclarations: [
                {
                  name: 'book_appointment',
                  description: 'Book a confirmed audit session or calendar meeting in Supabase CRM when prospect agrees.',
                  parameters: {
                    type: 'OBJECT',
                    properties: {
                      day: {
                        type: 'STRING',
                        description: 'Day of the week (e.g., Thursday, Friday).',
                      },
                      time: {
                        type: 'STRING',
                        description: 'Time of day (e.g., 4:00 PM, 11:30 AM).',
                      },
                      notes: {
                        type: 'STRING',
                        description: 'Summary of agreed audit topic and financing details.',
                      },
                    },
                    required: ['day', 'time'],
                  },
                },
              ],
            },
          ],
        },
      };

      this.ws?.send(JSON.stringify(setupFrame));

      // 4. Start Microphone Streaming (16kHz Linear PCM)
      await this.startMicrophoneCapture();
    };

    this.ws.onmessage = async (event: MessageEvent) => {
      try {
        let data: any;
        if (event.data instanceof Blob) {
          const text = await event.data.text();
          data = JSON.parse(text);
        } else {
          data = JSON.parse(event.data);
        }

        this.handleServerMessage(data);
      } catch (err: any) {
        console.warn('[GeminiLive] Parse error:', err);
      }
    };

    this.ws.onerror = (err) => {
      console.error('[GeminiLive] WebSocket error:', err);
      this.config.onError?.(new Error('WebSocket connection error to Gemini Live API.'));
    };

    this.ws.onclose = () => {
      this.isConnected = false;
      this.config.onClose?.();
      this.stop();
    };
  }

  private async startMicrophoneCapture(): Promise<void> {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.inputAudioCtx = new AudioContextClass({ sampleRate: 16000 });

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const sourceNode = this.inputAudioCtx.createMediaStreamSource(this.mediaStream);
      this.scriptProcessor = this.inputAudioCtx.createScriptProcessor(2048, 1, 1);

      sourceNode.connect(this.scriptProcessor);
      this.scriptProcessor.connect(this.inputAudioCtx.destination);

      this.scriptProcessor.onaudioprocess = (e: AudioProcessingEvent) => {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

        const inputData = e.inputBuffer.getChannelData(0);

        // Calculate visualizer levels (RMS across 8 frequency bands)
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);
        const baseLevel = Math.min(80, Math.max(12, Math.round(rms * 400)));
        const levels = [
          baseLevel,
          Math.min(80, Math.max(12, Math.round(baseLevel * 1.2))),
          Math.min(80, Math.max(12, Math.round(baseLevel * 0.9))),
          Math.min(80, Math.max(12, Math.round(baseLevel * 1.5))),
          Math.min(80, Math.max(12, Math.round(baseLevel * 1.1))),
          Math.min(80, Math.max(12, Math.round(baseLevel * 1.4))),
          Math.min(80, Math.max(12, Math.round(baseLevel * 0.8))),
          baseLevel,
        ];
        this.config.onAudioLevel?.(levels);

        // Convert Float32 to 16-bit Linear PCM Little-Endian
        const pcmBuffer = this.floatTo16BitPCM(inputData);
        const base64Data = this.arrayBufferToBase64(pcmBuffer);

        const audioChunk = {
          realtimeInput: {
            mediaChunks: [
              {
                mimeType: 'audio/pcm;rate=16000',
                data: base64Data,
              },
            ],
          },
        };

        this.ws.send(JSON.stringify(audioChunk));
      };
    } catch (err: any) {
      console.error('[GeminiLive] Microphone access denied or failed:', err);
      this.config.onError?.(err);
    }
  }

  private async handleServerMessage(data: any): Promise<void> {
    const serverContent = data.serverContent;

    if (serverContent) {
      // 1. User Speech Transcription
      if (serverContent.inputTranscription?.text) {
        this.config.onUserSpeech?.(serverContent.inputTranscription.text);
      }

      // 2. Interruption Detection (Barge-in: Prospect spoke, cancel remaining agent audio)
      if (serverContent.interrupted) {
        this.stopActivePlayback();
      }

      // 3. Agent Audio and Text Output
      if (serverContent.modelTurn?.parts) {
        for (const part of serverContent.modelTurn.parts) {
          // Play raw 24kHz neural audio chunk
          if (part.inlineData?.data) {
            this.playAudioChunk(part.inlineData.data);
          }
          // Transcribe agent text in dialogue bubble
          if (part.text) {
            this.config.onAgentSpeech?.(part.text);
          }
        }
      }

      if (serverContent.outputTranscription?.text) {
        this.config.onAgentSpeech?.(serverContent.outputTranscription.text);
      }
    }

    // 4. Autonomous Function Calling (Tools)
    if (data.toolCall?.functionCalls) {
      for (const call of data.toolCall.functionCalls) {
        let result = { status: 'confirmed' };
        if (this.config.onToolCall) {
          try {
            result = await this.config.onToolCall(call.name, call.args);
          } catch (err: any) {
            result = { status: 'error', error: err.message };
          }
        }

        // Send toolResponse back to Gemini
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          const toolResponseFrame = {
            toolResponse: {
              functionResponses: [
                {
                  id: call.id,
                  response: {
                    output: result,
                  },
                },
              ],
            },
          };
          this.ws.send(JSON.stringify(toolResponseFrame));
        }
      }
    }
  }

  private playAudioChunk(base64Data: string): void {
    if (!this.outputAudioCtx) return;

    try {
      const pcmBuffer = this.base64ToArrayBuffer(base64Data);
      const float32 = this.pcm16ToFloat32(pcmBuffer);

      const audioBuffer = this.outputAudioCtx.createBuffer(1, float32.length, 24000);
      audioBuffer.copyToChannel(float32, 0);

      const sourceNode = this.outputAudioCtx.createBufferSource();
      sourceNode.buffer = audioBuffer;
      sourceNode.connect(this.outputAudioCtx.destination);

      const now = this.outputAudioCtx.currentTime;
      const startTime = Math.max(now, this.nextPlayTime);
      sourceNode.start(startTime);
      this.nextPlayTime = startTime + audioBuffer.duration;

      this.activeSources.push(sourceNode);
      sourceNode.onended = () => {
        const idx = this.activeSources.indexOf(sourceNode);
        if (idx !== -1) this.activeSources.splice(idx, 1);
      };
    } catch (err) {
      console.warn('[GeminiLive] Playback error:', err);
    }
  }

  private stopActivePlayback(): void {
    for (const src of this.activeSources) {
      try {
        src.stop();
      } catch {}
    }
    this.activeSources = [];
    if (this.outputAudioCtx) {
      this.nextPlayTime = this.outputAudioCtx.currentTime;
    }
  }

  public sendTextMessage(text: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const msg = {
      realtimeInput: {
        text: text,
      },
    };
    this.ws.send(JSON.stringify(msg));
  }

  public stop(): void {
    this.stopActivePlayback();

    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.inputAudioCtx && this.inputAudioCtx.state !== 'closed') {
      try {
        this.inputAudioCtx.close();
      } catch {}
      this.inputAudioCtx = null;
    }

    if (this.outputAudioCtx && this.outputAudioCtx.state !== 'closed') {
      try {
        this.outputAudioCtx.close();
      } catch {}
      this.outputAudioCtx = null;
    }

    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }

    this.isConnected = false;
  }

  // --- Audio Format Conversion Utilities ---
  private floatTo16BitPCM(input: Float32Array): ArrayBuffer {
    const output = new DataView(new ArrayBuffer(input.length * 2));
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return output.buffer;
  }

  private pcm16ToFloat32(buffer: ArrayBuffer): Float32Array {
    const dataView = new DataView(buffer);
    const length = buffer.byteLength / 2;
    const float32 = new Float32Array(length);
    for (let i = 0; i < length; i++) {
      const int16 = dataView.getInt16(i * 2, true);
      float32[i] = int16 < 0 ? int16 / 0x8000 : int16 / 0x7fff;
    }
    return float32;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = window.atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }
}
