import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Play, Pause, Send, Volume2, Loader2 } from "lucide-react";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Badge } from "./components/ui/badge";
import { cn } from "./lib/utils";

export default function AudioSocketPlayer({ webSocketConnection, userName, onAssistantText, onUserText }) {
    const audioRef = useRef(null);
    const [pendingPlay, setPendingPlay] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Voice input related
    const [input, setInput] = useState("");
    const [isRecording, setIsRecording] = useState(false);
    const recognitionRef = useRef(null);

    // VAD (Voice Activity Detection) related
    const vadSilenceTimerRef = useRef(null);
    const lastSpeechTimeRef = useRef(0);
    const isSpeakingRef = useRef(false);
    const interimTranscriptRef = useRef("");
    const [vadStatus, setVadStatus] = useState(""); // "listening", "speaking", "silence"
    const recordingStartTimeRef = useRef(0);
    const noiseCycleCountRef = useRef(0); // Count speech start/stop cycles (for noisy environments)

    // Destructure state and methods from webSocketConnection
    const {
        isConnected,
        hasUserInteracted,
        audioUrl,
        latestReply,
        autoListeningEnabled,
        needsManualActivation,
        handleUserInteraction,
        sendMessage,
        sendUserMeta,
        audioRef: wsAudioRef
    } = webSocketConnection;

    // Sync local audioRef to WebSocket manager
    useEffect(() => {
        if (wsAudioRef && audioRef.current) {
            wsAudioRef.current = audioRef.current;
        }
    }, [wsAudioRef, audioUrl]);

    // When new audio URL arrives, immediately attempt to play
    useEffect(() => {
        if (audioUrl && audioRef.current) {
            // Ensure audio plays immediately after loading
            const audio = audioRef.current;

            const handleCanPlay = () => {
                audio.play().catch(error => {
                    console.log('[AutoPlay] Autoplay blocked, this is normal browser behavior:', error.name);
                });
            };

            // If audio is ready to play, play immediately
            if (audio.readyState >= audio.HAVE_ENOUGH_DATA) {
                handleCanPlay();
            } else {
                // Otherwise wait for audio to load
                audio.addEventListener('canplaythrough', handleCanPlay, { once: true });
                audio.addEventListener('loadeddata', handleCanPlay, { once: true });
            }

            return () => {
                audio.removeEventListener('canplaythrough', handleCanPlay);
                audio.removeEventListener('loadeddata', handleCanPlay);
            };
        }
    }, [audioUrl]);

    // Custom player: waveform, progress, level
    const canvasRef = useRef(null);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [waveform, setWaveform] = useState(null);
    const [isSeeking, setIsSeeking] = useState(false);
    const audioCtxRef = useRef(null);
    const micStreamRef = useRef(null);
    const analyserRef = useRef(null);
    const meterRafRef = useRef(null);
    const [level, setLevel] = useState(0);

    // Track processed messages to avoid duplicate additions
    const processedRepliesRef = useRef(new Set());
    const processedUserMessagesRef = useRef(new Set());

    // Listen for latestReply changes, notify parent component (deduplication handling)
    useEffect(() => {
        if (onAssistantText && latestReply.trim()) {
            const replyText = latestReply.trim();

            // Check if this reply has already been processed
            if (!processedRepliesRef.current.has(replyText)) {
                processedRepliesRef.current.add(replyText);
                onAssistantText(replyText);

                // Clean up old reply records (keep latest 20)
                if (processedRepliesRef.current.size > 20) {
                    const replies = Array.from(processedRepliesRef.current);
                    processedRepliesRef.current = new Set(replies.slice(-20));
                }
            }
        }
    }, [latestReply, onAssistantText]);

    // Send user name (if available)
    useEffect(() => {
        if (userName && isConnected) {
            sendUserMeta(userName);
        }
    }, [userName, isConnected, sendUserMeta]);

    // Use WebSocket manager's handleUserInteraction

    useEffect(() => {
        if (pendingPlay && audioRef.current) {
            audioRef.current.play().catch(() => { });
            setPendingPlay(false);
        }
    }, [pendingPlay]);

    // Parse audio → waveform
    useEffect(() => {
        if (!audioUrl) { setWaveform(null); setDuration(0); return; }
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(audioUrl);
                const buf = await res.arrayBuffer();
                const ctx = audioCtxRef.current || (audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)());
                const audioBuffer = await ctx.decodeAudioData(buf.slice(0));
                if (cancelled) return;
                setDuration(audioBuffer.duration || 0);
                const peaks = extractPeaks(audioBuffer.getChannelData(0), 800);
                setWaveform(peaks);
                requestAnimationFrame(() => drawWaveform(peaks, 0));
            } catch {
                // ignore
            }
        })();
        return () => { cancelled = true; };
    }, [audioUrl]);

    function extractPeaks(data, width) {
        const blockSize = Math.floor(data.length / width) || 1;
        const peaks = new Array(width);
        for (let i = 0; i < width; i++) {
            let start = i * blockSize;
            let end = Math.min(start + blockSize, data.length);
            let min = 1.0;
            let max = -1.0;
            for (let j = start; j < end; j++) {
                const v = data[j];
                if (v < min) min = v;
                if (v > max) max = v;
            }
            peaks[i] = [min, max];
        }
        return peaks;
    }

    function drawWaveform(peaks, progressRatio) {
        const canvas = canvasRef.current;
        if (!canvas || !peaks) return;
        const dpr = window.devicePixelRatio || 1;
        const cssWidth = canvas.clientWidth || 600;
        const cssHeight = canvas.clientHeight || 64;
        canvas.width = Math.floor(cssWidth * dpr);
        canvas.height = Math.floor(cssHeight * dpr);
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, cssWidth, cssHeight);

        const mid = cssHeight / 2;
        ctx.strokeStyle = 'rgba(100, 116, 139, 0.5)';
        ctx.lineWidth = 1;
        for (let x = 0; x < peaks.length; x++) {
            const [min, max] = peaks[x];
            const y1 = mid + min * mid;
            const y2 = mid + max * mid;
            ctx.beginPath();
            ctx.moveTo(x * cssWidth / peaks.length, y1);
            ctx.lineTo(x * cssWidth / peaks.length, y2);
            ctx.stroke();
        }

        if (progressRatio > 0) {
            const cutoff = Math.floor(peaks.length * progressRatio);
            ctx.strokeStyle = '#2563eb';
            for (let x = 0; x < cutoff; x++) {
                const [min, max] = peaks[x];
                const y1 = mid + min * mid;
                const y2 = mid + max * mid;
                ctx.beginPath();
                ctx.moveTo(x * cssWidth / peaks.length, y1);
                ctx.lineTo(x * cssWidth / peaks.length, y2);
                ctx.stroke();
            }
        }
    }

    // Removed unused formatTime function
    useEffect(() => {
        if (audioRef.current) {
            const audio = audioRef.current;
            audio.oncanplaythrough = () => setIsLoading(false);
            audio.onplaying = () => setIsLoading(false);
            audio.onwaiting = () => setIsLoading(true);
            const onTime = () => {
                setCurrentTime(audio.currentTime || 0);
                if (waveform && duration) drawWaveform(waveform, (audio.currentTime || 0) / duration);
            };
            const onMeta = () => setDuration(audio.duration || duration);
            audio.addEventListener('timeupdate', onTime);
            audio.addEventListener('loadedmetadata', onMeta);
            return () => {
                audio.removeEventListener('timeupdate', onTime);
                audio.removeEventListener('loadedmetadata', onMeta);
            };
        }
    }, [audioUrl, waveform, duration]);

    // Send user message (with deduplication logic)
    const sendUserMessage = () => {
        if (input.trim()) {
            const text = input.trim();

            // Check if same message has already been sent (avoid duplicate clicks)
            if (!processedUserMessagesRef.current.has(text)) {
                processedUserMessagesRef.current.add(text);
                setIsLoading(true);
                sendMessage(text);

                if (onUserText) {
                    onUserText(text);
                }

                // Clean up old user message records (keep latest 10)
                if (processedUserMessagesRef.current.size > 10) {
                    const messages = Array.from(processedUserMessagesRef.current);
                    processedUserMessagesRef.current = new Set(messages.slice(-10));
                }
            }

            setInput("");
        }
    };

    // Voice input control with VAD
    const startRecognition = async () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Your browser doesn't support speech recognition (requires Chrome/Edge)");
            return;
        }
        const recognition = new SpeechRecognition();
        recognition.lang = "en-US"; // Can be adjusted to other languages
        recognition.interimResults = true; // Enable interim results for better VAD
        recognition.continuous = true; // Keep listening continuously
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            setIsRecording(true);
            setVadStatus("listening");
            interimTranscriptRef.current = "";
            lastSpeechTimeRef.current = Date.now();
            recordingStartTimeRef.current = Date.now(); // Track when recording started
            noiseCycleCountRef.current = 0; // Reset noise cycle counter
        };

        recognition.onend = () => {
            setIsRecording(false);
            setVadStatus("");
            // Clear any pending timers
            if (vadSilenceTimerRef.current) {
                clearTimeout(vadSilenceTimerRef.current);
                vadSilenceTimerRef.current = null;
            }
        };

        recognition.onerror = (event) => {
            console.error("Speech recognition error:", event.error);
            setIsRecording(false);
            setVadStatus("");
        };

        recognition.onresult = (event) => {
            let interimTranscript = "";
            let finalTranscript = "";

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }

            // Update the input with all transcripts
            if (finalTranscript) {
                const newText = (interimTranscriptRef.current + " " + finalTranscript).trim();
                setInput(newText);
                interimTranscriptRef.current = newText;
                setVadStatus("speaking");
                lastSpeechTimeRef.current = Date.now();
                isSpeakingRef.current = true;
            } else if (interimTranscript) {
                setInput((interimTranscriptRef.current + " " + interimTranscript).trim());
                setVadStatus("speaking");
                lastSpeechTimeRef.current = Date.now();
                isSpeakingRef.current = true;
            }
        };

        recognitionRef.current = recognition;
        recognition.start();

        // Start microphone level monitoring with VAD
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            micStreamRef.current = stream;
            const ctx = audioCtxRef.current || (audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)());
            const source = ctx.createMediaStreamSource(stream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 256;
            analyser.smoothingTimeConstant = 0.8;
            source.connect(analyser);
            analyserRef.current = analyser;

            const data = new Uint8Array(analyser.frequencyBinCount);
            const SILENCE_THRESHOLD = 0.02; // Threshold for considering it silence
            const SILENCE_DURATION = 800; // 0.8 seconds of silence before auto-send (faster response)
            const MAX_RECORDING_TIME = 15000; // 15 seconds max recording time
            const MAX_NOISE_CYCLES = 5; // Max speech start/stop cycles before auto-send

            const loop = () => {
                if (!analyserRef.current) return;

                analyser.getByteTimeDomainData(data);
                let sum = 0;
                for (let i = 0; i < data.length; i++) {
                    const v = (data[i] - 128) / 128;
                    sum += v * v;
                }
                const rms = Math.sqrt(sum / data.length);
                setLevel(Math.min(1, rms * 2));

                // Check if recording has gone on too long (noisy environment protection)
                const recordingDuration = Date.now() - recordingStartTimeRef.current;
                if (recordingDuration > MAX_RECORDING_TIME && interimTranscriptRef.current.trim()) {
                    console.log("[VAD] Max recording time reached, auto-sending...");
                    setVadStatus("max-time");
                    if (recognitionRef.current) {
                        recognitionRef.current.stop();
                    }
                    setTimeout(() => {
                        sendUserMessage();
                        stopRecognition();
                    }, 100);
                    return;
                }

                // Check if too many noise cycles (start/stop repeatedly)
                if (noiseCycleCountRef.current >= MAX_NOISE_CYCLES && interimTranscriptRef.current.trim()) {
                    console.log("[VAD] Too many noise cycles detected, auto-sending...");
                    setVadStatus("noisy");
                    if (recognitionRef.current) {
                        recognitionRef.current.stop();
                    }
                    setTimeout(() => {
                        sendUserMessage();
                        stopRecognition();
                    }, 100);
                    return;
                }

                // VAD logic: detect silence after speaking
                const timeSinceLastSpeech = Date.now() - lastSpeechTimeRef.current;

                if (rms > SILENCE_THRESHOLD) {
                    // User is speaking
                    if (!isSpeakingRef.current) {
                        // Transitioned from silence to speaking - increment noise cycle counter
                        noiseCycleCountRef.current += 1;
                        console.log("[VAD] Speech cycle #" + noiseCycleCountRef.current);
                    }
                    lastSpeechTimeRef.current = Date.now();
                    isSpeakingRef.current = true;
                    setVadStatus("speaking");

                    // Clear any existing silence timer
                    if (vadSilenceTimerRef.current) {
                        clearTimeout(vadSilenceTimerRef.current);
                        vadSilenceTimerRef.current = null;
                    }
                } else if (isSpeakingRef.current && timeSinceLastSpeech > 300) {
                    // User has stopped speaking (300ms threshold), set silence status
                    setVadStatus("silence");

                    // Set timer to auto-send after silence duration
                    if (!vadSilenceTimerRef.current && interimTranscriptRef.current.trim()) {
                        vadSilenceTimerRef.current = setTimeout(() => {
                            // Auto-send the message after silence
                            if (recognitionRef.current) {
                                recognitionRef.current.stop();
                            }
                            if (interimTranscriptRef.current.trim()) {
                                setTimeout(() => {
                                    sendUserMessage();
                                }, 100);
                            }
                            stopRecognition();
                        }, SILENCE_DURATION);
                    }
                }

                meterRafRef.current = requestAnimationFrame(loop);
            };
            loop();
        } catch (error) {
            console.error("Microphone access error:", error);
            alert("Could not access microphone. Please ensure microphone permissions are granted.");
        }
    };

    const stopRecognition = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
        if (micStreamRef.current) {
            micStreamRef.current.getTracks().forEach(t => t.stop());
            micStreamRef.current = null;
        }
        if (meterRafRef.current) {
            cancelAnimationFrame(meterRafRef.current);
            meterRafRef.current = null;
        }
        if (vadSilenceTimerRef.current) {
            clearTimeout(vadSilenceTimerRef.current);
            vadSilenceTimerRef.current = null;
        }
        setLevel(0);
        setVadStatus("");
        isSpeakingRef.current = false;
        interimTranscriptRef.current = "";
        recordingStartTimeRef.current = 0; // Reset recording timer
        noiseCycleCountRef.current = 0; // Reset noise cycle counter
    };

    return (
        <div className="space-y-6">
            {/* Main Control Area */}
            <div className="space-y-4">
                {!hasUserInteracted ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-3"
                    >
                        {/* Auto Listening Status Prompt */}
                        {autoListeningEnabled ? (
                            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/50">
                                <div className="flex items-center gap-3">
                                    <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse"></div>
                                    <div>
                                        <p className="typo-content-primary font-medium text-emerald-800 dark:text-emerald-200">
                                            🎵 Auto-play enabled!
                                        </p>
                                        <p className="typo-content-tertiary text-emerald-600 dark:text-emerald-400">
                                            AI responses will play automatically, no need to click play button
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : needsManualActivation ? (
                            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/50">
                                <div className="flex items-center gap-3">
                                    <div className="h-3 w-3 rounded-full bg-amber-500"></div>
                                    <div>
                                        <p className="typo-content-primary font-medium text-amber-800 dark:text-amber-200">
                                            Browser requires user interaction
                                        </p>
                                        <p className="typo-content-tertiary text-amber-600 dark:text-amber-400">
                                            Please click the button below to enable audio playback
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : null}

                        <Button
                            onClick={handleUserInteraction}
                            disabled={!isConnected}
                            size="lg"
                            className="w-full"
                        >
                            <Volume2 className="mr-2 h-5 w-5" />
                            {autoListeningEnabled ? 'Enable Auto-play' : 'Start Listening (Enable Auto-play)'}
                        </Button>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="rounded-xl border bg-card p-4"
                    >
                        {/* Hide native audio, use custom UI */}
                        <audio ref={audioRef} src={audioUrl || ""} className="hidden" />

                        {/* Auto-play status indicator */}
                        <div className="mb-3 flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                            <span className="typo-content-tertiary text-emerald-600 dark:text-emerald-400">
                                🎵 Auto-play enabled - AI responses play immediately
                            </span>
                        </div>

                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => {
                                    const a = audioRef.current;
                                    if (!a) return;
                                    if (a.paused) a.play(); else a.pause();
                                }}
                                title={audioRef.current && !audioRef.current.paused ? "Pause" : "Resume"}
                                className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white shadow transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 ring-offset-2 ring-brand"
                            >
                                {audioRef.current && !audioRef.current.paused ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                            </button>

                            <div className="flex-1">
                                <div
                                    className="relative select-none"
                                    onMouseDown={(e) => {
                                        setIsSeeking(true);
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        const x = e.clientX - rect.left;
                                        const ratio = Math.max(0, Math.min(1, x / rect.width));
                                        if (audioRef.current && duration) {
                                            audioRef.current.currentTime = ratio * duration;
                                        }
                                    }}
                                    onMouseMove={(e) => {
                                        if (!isSeeking) return;
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        const x = e.clientX - rect.left;
                                        const ratio = Math.max(0, Math.min(1, x / rect.width));
                                        if (audioRef.current && duration) {
                                            audioRef.current.currentTime = ratio * duration;
                                        }
                                    }}
                                    onMouseUp={() => setIsSeeking(false)}
                                >
                                    <canvas ref={canvasRef} className="h-16 w-full cursor-pointer rounded-md bg-white/40 dark:bg-gray-800/40" />

                                    {/* Accessibility slider */}
                                    <div
                                        role="slider"
                                        aria-label="Playback progress"
                                        aria-valuemin={0}
                                        aria-valuemax={Math.max(0, Math.floor(duration))}
                                        aria-valuenow={Math.floor(currentTime)}
                                        aria-valuetext={`${Math.floor(currentTime)} / ${Math.floor(duration)}`}
                                        tabIndex={0}
                                        className="absolute inset-0 outline-none"
                                        onKeyDown={(e) => {
                                            if (!duration) return;
                                            const a = audioRef.current;
                                            if (!a) return;
                                            let delta = 0;
                                            if (e.key === 'ArrowRight') delta = 5;
                                            if (e.key === 'ArrowLeft') delta = -5;
                                            if (delta !== 0) {
                                                a.currentTime = Math.max(0, Math.min(duration, a.currentTime + delta));
                                                setCurrentTime(a.currentTime);
                                            }
                                        }}
                                    />
                                </div>
                                <div className="mt-2 flex items-center justify-between typo-content-tertiary text-muted-foreground">
                                    <span>{Math.floor(currentTime)}s</span>
                                    <span>{Math.floor(duration)}s</span>
                                </div>
                            </div>

                            {/* Recording level bar */}
                            <div className="relative flex h-9 w-24 items-center overflow-hidden rounded-md border bg-white/50 px-2 dark:bg-gray-900/50" aria-hidden={!isRecording}>
                                <div className="h-3 w-full rounded-sm bg-gray-200 dark:bg-gray-800">
                                    <div
                                        className="h-3 rounded-sm bg-rose-500 transition-[width] duration-75"
                                        style={{ width: `${Math.round(level * 100)}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Status indicators */}
                <div className="flex items-center justify-center gap-4">
                    <AnimatePresence>
                        {isLoading && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                className="flex items-center gap-2"
                            >
                                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                                <span className="typo-ai-status text-muted-foreground">Processing...</span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <AnimatePresence>
                        {audioUrl && !hasUserInteracted && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                            >
                                <Badge variant="warning" className="gap-1.5">
                                    <Play className="h-3 w-3" />
                                    New voice message
                                </Badge>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Chat input area */}
            <motion.div
                className="space-y-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
            >
                <div className="space-y-2">
                    {/* VAD Status Indicator */}
                    {isRecording && vadStatus && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center justify-center gap-2 text-sm"
                        >
                            {vadStatus === "listening" && (
                                <>
                                    <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></div>
                                    <span className="text-blue-600 dark:text-blue-400">Listening... Start speaking</span>
                                </>
                            )}
                            {vadStatus === "speaking" && (
                                <>
                                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                                    <span className="text-green-600 dark:text-green-400">Speaking detected...</span>
                                </>
                            )}
                            {vadStatus === "silence" && (
                                <>
                                    <div className="h-2 w-2 rounded-full bg-amber-500"></div>
                                    <span className="text-amber-600 dark:text-amber-400">Silence detected, auto-sending soon...</span>
                                </>
                            )}
                            {vadStatus === "max-time" && (
                                <>
                                    <div className="h-2 w-2 rounded-full bg-purple-500 animate-pulse"></div>
                                    <span className="text-purple-600 dark:text-purple-400">Max recording time reached, sending...</span>
                                </>
                            )}
                            {vadStatus === "noisy" && (
                                <>
                                    <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse"></div>
                                    <span className="text-orange-600 dark:text-orange-400">Too much noise detected, sending what we have...</span>
                                </>
                            )}
                        </motion.div>
                    )}

                    <div className="flex items-center gap-2">
                        <Input
                            type="text"
                            placeholder="Enter your question or click microphone..."
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendUserMessage(); } }}
                            disabled={!isConnected}
                            className="flex-1 h-10"
                        />
                        <Button
                            variant={isRecording ? "destructive" : "outline"}
                            size="icon"
                            onClick={() => {
                                if (isRecording) {
                                    stopRecognition();
                                } else {
                                    startRecognition();
                                }
                            }}
                            disabled={!isConnected}
                            title={!isConnected ? "Not connected, please configure MQTT and start backend first" : (isRecording ? "Click to stop recording" : "Click to start voice input (auto-send enabled)")}
                            className={cn(
                                "transition-all duration-200 h-10 w-10",
                                isRecording && "animate-pulse-soft"
                            )}
                        >
                            {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                        </Button>
                        <Button
                            onClick={sendUserMessage}
                            disabled={!isConnected || !input.trim()}
                            title={!isConnected ? "Not connected, please configure MQTT and start backend first" : undefined}
                            className="h-10"
                        >
                            <Send className="mr-2 h-4 w-4" />
                            Send
                        </Button>
                    </div>
                </div>
            </motion.div>

            {/* Connection status indicator */}
            {(hasUserInteracted || autoListeningEnabled) && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 space-y-2"
                >
                    <div className="flex items-center justify-center gap-2 typo-content-tertiary text-emerald-600 dark:text-emerald-400">
                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                        Persistent connection enabled - Free to switch tabs
                    </div>

                    {autoListeningEnabled && (
                        <div className="flex items-center justify-center gap-2 typo-content-tertiary text-blue-600 dark:text-blue-400">
                            <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></div>
                            🎵 Auto-play enabled - Messages play immediately when received, no need to click
                        </div>
                    )}
                </motion.div>
            )}
        </div>
    );
}
