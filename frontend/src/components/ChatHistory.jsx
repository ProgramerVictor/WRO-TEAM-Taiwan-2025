import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, Download, Clock } from "lucide-react";
import { Button } from "./ui/button";

export default function ChatHistory({ messages, onClearHistory }) {
    // Remove duplicates and limit display count
    const uniqueMessages = React.useMemo(() => {
        const seen = new Set();
        const filtered = messages.filter(m => {
            const key = `${m.role}:${m.content}`;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });

        // Limit display to latest 50 messages
        return filtered.slice(-50);
    }, [messages]);

    const formatTime = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return date.toLocaleTimeString('zh-TW', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const exportHistory = () => {
        const historyText = uniqueMessages.map(m =>
            `[${m.role === 'user' ? 'User' : 'AI'}] ${m.content}`
        ).join('\n\n');

        const blob = new Blob([historyText], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chat-history-${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="content-gap-lg">
            {/* Top control bar - Senior-optimized version */}
            <div className="flex items-center justify-between p-6 rounded-2xl border-2 border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900">
                        <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <span className="typo-display-subtitle font-semibold">
                            Conversation History
                        </span>
                        <p className="typo-content-secondary text-muted-foreground">
                            Total {uniqueMessages.length} conversation records
                        </p>
                    </div>
                </div>

                {uniqueMessages.length > 0 && (
                    <div className="flex items-center gap-4">
                        <button
                            onClick={exportHistory}
                            className="elderly-button-secondary gap-3"
                        >
                            <Download className="h-5 w-5" />
                            Export Records
                        </button>

                        {onClearHistory && (
                            <button
                                onClick={onClearHistory}
                                className="elderly-button bg-red-600 border-red-600 text-white hover:bg-red-700 hover:border-red-700 focus:ring-red-200 dark:focus:ring-red-800/50 gap-3"
                            >
                                <Trash2 className="h-5 w-5" />
                                Clear All
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Message list - Senior-optimized version */}
            <div className="space-y-6 max-h-[600px] overflow-y-auto p-4 rounded-2xl border-2 border-gray-200 bg-gray-50/50 dark:border-gray-700 dark:bg-gray-800/30">
                <AnimatePresence>
                    {uniqueMessages.map((m, idx) => (
                        <div
                            key={`${m.role}-${idx}-${m.content.slice(0, 20)}`}
                            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                            <motion.div
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -15 }}
                                transition={{ duration: 0.3, delay: idx * 0.03 }}
                                className={`max-w-[75%] ${m.role === "user"
                                    ? "rounded-3xl border border-blue-200 bg-white px-4 py-3 shadow-sm dark:border-blue-800 dark:bg-gray-900"
                                    : "rounded-3xl border border-purple-200 bg-gradient-to-r from-blue-50 to-purple-50 px-4 py-2 shadow-sm dark:border-purple-800 dark:from-blue-950/50 dark:to-purple-950/50"
                                    }`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className={
                                            m.role === "user"
                                                ? "flex h-7 w-7 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900"
                                                : "flex h-7 w-7 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-900"
                                        }>
                                            <span className="typo-content-primary font-bold text-xs">
                                                {m.role === "user" ? "You" : "AI"}
                                            </span>
                                        </div>
                                        <span className="typo-content-secondary font-medium">
                                            {m.role === "user" ? "Your Message" : "AI Response"}
                                        </span>
                                    </div>
                                    {m.timestamp && (
                                        <div className="typo-content-tertiary text-muted-foreground">
                                            {formatTime(m.timestamp)}
                                        </div>
                                    )}
                                </div>
                                <div className={
                                    m.role === "assistant"
                                        ? "typo-ai-response whitespace-pre-wrap leading-relaxed"
                                        : "typo-content-primary whitespace-pre-wrap leading-relaxed"
                                }>
                                    {m.content}
                                </div>
                            </motion.div>
                        </div>
                    ))}
                </AnimatePresence>
            </div>

            {uniqueMessages.length === 0 && (
                <div className="text-center py-16 rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-800/50">
                    <div className="flex justify-center mb-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-700">
                            <Clock className="h-8 w-8 text-gray-400" />
                        </div>
                    </div>
                    <div className="typo-display-subtitle font-semibold text-muted-foreground mb-3">
                        No chat history yet
                    </div>
                    <div className="typo-content-primary text-muted-foreground">
                        After starting a conversation with AI, complete conversation records will be displayed here
                    </div>
                </div>
            )}

            {/* Message count notice - Senior-optimized version */}
            {uniqueMessages.length > 40 && (
                <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-6 dark:border-amber-800 dark:bg-amber-950/50">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900">
                            <span className="text-xl">💡</span>
                        </div>
                        <div>
                            <div className="typo-content-primary font-medium text-amber-800 dark:text-amber-200">
                                For better user experience
                            </div>
                            <div className="typo-content-secondary text-amber-700 dark:text-amber-300">
                                Only showing the latest 50 conversation records. Older records can be saved via the export function
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}


