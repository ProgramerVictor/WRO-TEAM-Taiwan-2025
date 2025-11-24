import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, CheckCircle, AlertCircle, Bot } from "lucide-react";
import { Button } from "./components/ui/button";
import { Input, Label } from "./components/ui/input";
import { Badge } from "./components/ui/badge";
import { formatLatency } from "./lib/utils";

const getApiBase = () => {
    const envBase = process.env.REACT_APP_API_BASE;
    if (envBase) return envBase;
    if (typeof window !== "undefined") {
        return window.location.hostname === "localhost" ? "http://localhost:8000" : "";
    }
    // SSR fallback
    return "";
};

export default function RobotSettings({ webSocketConnection, isOpen }) {
    const [robotId, setRobotId] = useState("");
    const [currentRobotId, setCurrentRobotId] = useState("");
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState("");
    const [latencyMs, setLatencyMs] = useState(null);
    const [error, setError] = useState("");
    const [toast, setToast] = useState("");
    const { isConnected, wsManager } = webSocketConnection;

    // Load current robot_id from backend whenever settings panel opens
    useEffect(() => {
        if (!isOpen) return;
        
        const API_BASE = getApiBase();
        fetch(`${API_BASE}/robot`)
            .then(r => r.json())
            .then(data => {
                if (data && data.default_robot_id) {
                    setRobotId(data.default_robot_id);
                    setCurrentRobotId(data.default_robot_id);
                }
            })
            .catch(() => { });
    }, [isOpen]);

    const validate = (value) => {
        if (!value || !value.trim()) return "Please enter Robot ID";
        // Validate robot_id format (alphanumeric, dash, underscore)
        const robotIdRegex = /^[a-zA-Z0-9_-]+$/;
        if (!robotIdRegex.test(value)) return "Invalid format, use letters, numbers, dash or underscore";
        return "";
    };

    const testAndSave = async () => {
        const v = validate(robotId);
        if (v) { setError(v); return; }

        if (!isConnected) {
            setError("WebSocket not connected");
            return;
        }

        setLoading(true);
        setError("");
        setToast("");
        setLatencyMs(null);

        try {
            setProgress("Testing connection…");
            const t0 = performance.now();

            // Send set_robot_id command via WebSocket
            const success = wsManager.sendMessage(JSON.stringify({
                type: "set_robot_id",
                robot_id: robotId
            }));

            if (!success) {
                throw new Error("Failed to send robot_id to WebSocket");
            }

            // Wait for response (using a promise with timeout)
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error("Connection timeout")), 5000);

                const listener = (type, data) => {
                    if (type === 'textReceived') {
                        try {
                            const msg = JSON.parse(data);
                            if (msg.type === 'robot_id_set' && msg.robot_id === robotId) {
                                clearTimeout(timeout);
                                wsManager.listeners.delete(listener);
                                resolve(msg);
                            }
                        } catch (e) {
                            // Not a JSON message, ignore
                        }
                    }
                };

                wsManager.addListener(listener);
            });

            const t1 = performance.now();
            setLatencyMs(Math.max(0, Math.round(t1 - t0)));

            setProgress("Connected ✓");
            setCurrentRobotId(robotId);
            setToast(`Now controlling robot: ${robotId}`);
        } catch (e) {
            setProgress("");
            setError(e.message || String(e));
        } finally {
            setLoading(false);
            setTimeout(() => setToast(""), 3000);
        }
    };

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="robot-input">Robot ID</Label>
                <Input
                    id="robot-input"
                    value={robotId}
                    onChange={e => { setRobotId(e.target.value); if (error) setError(""); }}
                    placeholder="e.g. wro1, lab1"
                    error={!!error}
                    aria-invalid={!!error}
                    aria-describedby="robot-hint robot-error"
                />
                <p id="robot-hint" className="text-xs text-muted-foreground">
                    Enter the ID of the robot you want to control
                </p>
                {currentRobotId && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Bot className="h-3 w-3" />
                        <span>Currently controlling: <strong>{currentRobotId}</strong></span>
                    </div>
                )}
                <AnimatePresence>
                    {error && (
                        <motion.div
                            id="robot-error"
                            className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <AlertCircle className="h-4 w-4" />
                            {error}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="flex items-center gap-3">
                <Button
                    onClick={testAndSave}
                    disabled={loading || !isConnected}
                    className="min-w-[140px]"
                >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {loading ? "Testing..." : "Test & Switch"}
                </Button>

                <AnimatePresence>
                    {progress && (
                        <motion.div
                            className="flex items-center gap-2"
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            <Badge variant="secondary" className="gap-1.5">
                                <Bot className="h-3 w-3" />
                                <span className="digits">{progress}</span>
                                {latencyMs != null && (
                                    <span className="text-xs opacity-70">
                                        · {formatLatency(latencyMs)}
                                    </span>
                                )}
                            </Badge>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <AnimatePresence>
                {toast && (
                    <motion.div
                        className="fixed bottom-4 right-4 z-50"
                        initial={{ opacity: 0, y: 50, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 50, scale: 0.8 }}
                        transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    >
                        <div className="flex items-center gap-2 rounded-xl border bg-card px-4 py-3 shadow-lg">
                            <CheckCircle className="h-4 w-4 text-emerald-600" />
                            <span className="text-sm font-medium">{toast}</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
