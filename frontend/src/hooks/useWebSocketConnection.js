/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * PERSISTENT WEBSOCKET CONNECTION HOOK
 * 維持跨分頁的持久化WebSocket連線和狀態管理
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

import { useState, useEffect, useRef, useCallback } from 'react';

// WebSocket連線配置（SSR安全）
function getWsUrl() {
    const envHost = process.env.REACT_APP_WS_HOST;
    if (typeof window !== "undefined") {
        const scheme = window.location.protocol === "https:" ? "wss" : "ws";
        const defaultHost = window.location.hostname === "localhost" ? "localhost:8000" : window.location.host;
        const host = envHost || defaultHost;
        return `${scheme}://${host}/ws`;
    }
    // SSR fallback (won't be used until client)
    const host = envHost || "localhost:8000";
    return `ws://${host}/ws`;
}

// 全域狀態管理
let globalConnectionState = {
    isConnected: false,
    hasUserInteracted: false,
    isListening: false,
    audioUrl: null,
    latestReply: '',
    pendingAudio: null
};

let globalListeners = new Set();

/**
 * 全域WebSocket管理器
 */
class WebSocketManager {
    constructor() {
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.connectionState = { ...globalConnectionState };
        this.listeners = new Set();
    }

    connect() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            return; // 已經連線
        }

        try {
            this.ws = new WebSocket(getWsUrl());
            this.ws.binaryType = "arraybuffer";

            this.ws.onopen = () => {
                console.log('[WebSocket] Connected');
                this.connectionState.isConnected = true;
                this.reconnectAttempts = 0;
                this.notifyListeners('connectionChange', true);

                // 如果用戶已經互動過，恢復之前的狀態
                if (this.connectionState.hasUserInteracted) {
                    this.notifyListeners('restoreState', this.connectionState);
                }
            };

            this.ws.onclose = (event) => {
                console.log('[WebSocket] Disconnected', event);
                this.connectionState.isConnected = false;
                this.notifyListeners('connectionChange', false);

                // 自動重連（除非是正常關閉）
                if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
                    setTimeout(() => {
                        this.reconnectAttempts++;
                        console.log(`[WebSocket] Reconnecting attempt ${this.reconnectAttempts}`);
                        this.connect();
                    }, this.reconnectDelay * this.reconnectAttempts);
                }
            };

            this.ws.onerror = (error) => {
                console.error('[WebSocket] Error:', error);
                this.connectionState.isConnected = false;
                this.notifyListeners('connectionChange', false);
            };

            this.ws.onmessage = (event) => {
                if (typeof event.data !== "string") {
                    // 音頻數據
                    const blob = new Blob([event.data], { type: "audio/mp3" });
                    const url = URL.createObjectURL(blob);
                    this.connectionState.audioUrl = url;
                    this.connectionState.pendingAudio = url;
                    this.notifyListeners('audioReceived', url);
                } else {
                    // 文字回覆
                    this.connectionState.latestReply = event.data;
                    this.notifyListeners('textReceived', event.data);
                }
            };

        } catch (error) {
            console.error('[WebSocket] Connection failed:', error);
            this.connectionState.isConnected = false;
            this.notifyListeners('connectionChange', false);
        }
    }

    disconnect() {
        if (this.ws) {
            this.ws.close(1000); // 正常關閉
            this.ws = null;
        }
        this.connectionState.isConnected = false;
        this.notifyListeners('connectionChange', false);
    }

    sendMessage(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(message);
            return true;
        }
        console.warn('[WebSocket] Cannot send message: not connected');
        return false;
    }

    sendUserMeta(userName) {
        if (userName && this.ws && this.ws.readyState === WebSocket.OPEN) {
            try {
                this.ws.send(JSON.stringify({ type: "user_meta", name: userName }));
                this.ws.send(`我的名字是${userName}`);
            } catch (error) {
                console.error('[WebSocket] Failed to send user meta:', error);
            }
        }
    }

    setUserInteracted(hasInteracted) {
        this.connectionState.hasUserInteracted = hasInteracted;
        this.notifyListeners('userInteractionChange', hasInteracted);

        // 儲存到localStorage
        localStorage.setItem('wro2025_user_interacted', hasInteracted.toString());
    }

    setListening(isListening) {
        this.connectionState.isListening = isListening;
        this.notifyListeners('listeningChange', isListening);

        // 儲存到localStorage
        localStorage.setItem('wro2025_is_listening', isListening.toString());
    }

    getConnectionState() {
        return { ...this.connectionState };
    }

    addListener(callback) {
        this.listeners.add(callback);
        globalListeners.add(callback);

        // 立即通知當前狀態
        callback('connectionChange', this.connectionState.isConnected);

        return () => {
            this.listeners.delete(callback);
            globalListeners.delete(callback);
        };
    }

    notifyListeners(type, data) {
        this.listeners.forEach(callback => {
            try {
                callback(type, data);
            } catch (error) {
                console.error('[WebSocket] Listener error:', error);
            }
        });
    }

    // 檢測瀏覽器自動播放能力
    async detectAutoPlayCapability() {
        try {
            const audio = new Audio();
            audio.muted = false;
            audio.volume = 0.1;

            // 創建一個很短的無聲音頻
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const destination = audioContext.createMediaStreamDestination();
            oscillator.connect(destination);
            oscillator.frequency.value = 0;
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.01);

            audio.srcObject = destination.stream;
            await audio.play();

            return true;
        } catch (error) {
            console.log('[AutoPlay] Browser blocks autoplay:', error.name);
            return false;
        }
    }

    // 嘗試啟用自動聆聽模式
    async tryEnableAutoListening() {
        const canAutoPlay = await this.detectAutoPlayCapability();

        if (canAutoPlay) {
            console.log('[AutoPlay] Auto-listening enabled');
            this.connectionState.hasUserInteracted = true;
            this.connectionState.isListening = true;
            this.connectionState.autoListeningEnabled = true;

            // 儲存狀態
            localStorage.setItem('wro2025_user_interacted', 'true');
            localStorage.setItem('wro2025_is_listening', 'true');
            localStorage.setItem('wro2025_auto_listening', 'true');

            this.notifyListeners('userInteractionChange', true);
            this.notifyListeners('listeningChange', true);
            this.notifyListeners('autoListeningEnabled', true);

            return true;
        } else {
            console.log('[AutoPlay] Manual interaction required');
            this.connectionState.autoListeningEnabled = false;
            localStorage.setItem('wro2025_auto_listening', 'false');
            this.notifyListeners('autoListeningEnabled', false);

            return false;
        }
    }

    // 初始化時恢復之前的狀態
    restoreState() {
        const savedUserInteracted = localStorage.getItem('wro2025_user_interacted') === 'true';
        const savedIsListening = localStorage.getItem('wro2025_is_listening') === 'true';
        const savedAutoListening = localStorage.getItem('wro2025_auto_listening') === 'true';

        this.connectionState.hasUserInteracted = savedUserInteracted;
        this.connectionState.isListening = savedIsListening;
        this.connectionState.autoListeningEnabled = savedAutoListening;

        return {
            hasUserInteracted: savedUserInteracted,
            isListening: savedIsListening,
            autoListeningEnabled: savedAutoListening
        };
    }
}

// 全域WebSocket管理器實例
const wsManager = new WebSocketManager();

/**
 * 持久化WebSocket連線Hook
 */
export function useWebSocketConnection() {
    const [isConnected, setIsConnected] = useState(false);
    const [hasUserInteracted, setHasUserInteracted] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [audioUrl, setAudioUrl] = useState(null);
    const [latestReply, setLatestReply] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [autoListeningEnabled, setAutoListeningEnabled] = useState(false);
    const [needsManualActivation, setNeedsManualActivation] = useState(false);

    const audioRef = useRef(null);
    const pendingPlayRef = useRef(false);
    const autoListeningAttempted = useRef(false);

    // 處理WebSocket事件
    const handleWebSocketEvent = useCallback((type, data) => {
        switch (type) {
            case 'connectionChange':
                setIsConnected(data);
                break;

            case 'audioReceived':
                setAudioUrl(data);
                setIsLoading(false);

                // 自動播放所有收到的音頻（無需手動點擊播放按鈕）
                if (audioRef.current) {
                    pendingPlayRef.current = true;

                    // 如果用戶還未互動，立即設為已互動狀態以啟用音頻
                    if (!hasUserInteracted) {
                        wsManager.setUserInteracted(true);
                        wsManager.setListening(true);
                    }
                }
                break;

            case 'textReceived':
                setLatestReply(data);
                setIsLoading(false);
                break;

            case 'userInteractionChange':
                setHasUserInteracted(data);
                break;

            case 'listeningChange':
                setIsListening(data);
                break;

            case 'autoListeningEnabled':
                setAutoListeningEnabled(data);
                if (!data) {
                    setNeedsManualActivation(true);
                }
                break;

            case 'restoreState':
                setHasUserInteracted(data.hasUserInteracted);
                setIsListening(data.isListening);
                setAudioUrl(data.audioUrl);
                setLatestReply(data.latestReply);
                setAutoListeningEnabled(data.autoListeningEnabled);
                break;

            default:
                break;
        }
    }, [hasUserInteracted]);

    // 初始化連線和狀態恢復
    useEffect(() => {
        // 恢復之前的狀態
        const restored = wsManager.restoreState();
        setHasUserInteracted(restored.hasUserInteracted);
        setIsListening(restored.isListening);
        setAutoListeningEnabled(restored.autoListeningEnabled);

        // 建立連線
        wsManager.connect();

        // 註冊事件監聽器
        const removeListener = wsManager.addListener(handleWebSocketEvent);

        return () => {
            removeListener();
        };
    }, [handleWebSocketEvent]);

    // 嘗試啟用自動聆聽（僅在連線建立後執行一次）
    useEffect(() => {
        if (isConnected && !autoListeningAttempted.current && !hasUserInteracted) {
            autoListeningAttempted.current = true;

            // 延遲一下確保連線穩定
            setTimeout(async () => {
                const success = await wsManager.tryEnableAutoListening();
                if (!success) {
                    setNeedsManualActivation(true);
                }
            }, 500);
        }
    }, [isConnected, hasUserInteracted]);

    // 處理待播放音頻
    useEffect(() => {
        if (pendingPlayRef.current && audioRef.current && audioUrl) {
            audioRef.current.play().catch(() => { });
            pendingPlayRef.current = false;
        }
    }, [audioUrl]);

    // 用戶互動處理
    const handleUserInteraction = useCallback(() => {
        wsManager.setUserInteracted(true);
        wsManager.setListening(true);

        if (audioRef.current && audioUrl) {
            audioRef.current.play().catch(() => { });
        }
    }, [audioUrl]);

    // 發送訊息
    const sendMessage = useCallback((message) => {
        setIsLoading(true);
        return wsManager.sendMessage(message);
    }, []);

    // 發送用戶資訊
    const sendUserMeta = useCallback((userName) => {
        wsManager.sendUserMeta(userName);
    }, []);

    // 斷開連線
    const disconnect = useCallback(() => {
        wsManager.disconnect();
        wsManager.setUserInteracted(false);
        wsManager.setListening(false);
    }, []);

    // 重新連線
    const reconnect = useCallback(() => {
        wsManager.connect();
    }, []);

    return {
        // 狀態
        isConnected,
        hasUserInteracted,
        isListening,
        audioUrl,
        latestReply,
        isLoading,
        autoListeningEnabled,
        needsManualActivation,

        // 方法
        handleUserInteraction,
        sendMessage,
        sendUserMeta,
        disconnect,
        reconnect,

        // Refs
        audioRef,

        // 低級別訪問（謹慎使用）
        wsManager
    };
}

export default useWebSocketConnection;
