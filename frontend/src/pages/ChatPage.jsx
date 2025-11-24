import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AudioSocketPlayer from "../AudioSocketPlayer";
import RobotSettings from "../MqttSettings";
import TypographyControls from "../components/TypographyControls";
import { StatusDot } from "../components/ui/badge";
import { getConnectionStatus } from "../lib/utils";

function SettingsDrawer({ open, onClose, webSocketConnection }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/40" onClick={onClose} />
          <motion.aside
            initial={{ x: 400 }}
            animate={{ x: 0 }}
            exit={{ x: 400 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto border-l border-gray-300/70 bg-white/95 backdrop-blur-lg p-6 shadow-2xl dark:bg-gray-900/95 dark:border-gray-600/70"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="typo-display-subtitle font-semibold">Settings</div>
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="content-gap-xl">
              <section className="content-gap-sm">
                <div className="typo-display-title font-bold">Robot Selection</div>
                <RobotSettings webSocketConnection={webSocketConnection} isOpen={open} />
              </section>

              <section className="content-gap-sm">
                <div className="typo-display-title font-bold">Fonts and Readability</div>
                <TypographyControls />
              </section>
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function ChatPage({ messages, connected, isListening, webSocketConnection, name, onAssistantText, onUserText }) {
  const [openSettings, setOpenSettings] = useState(false);
  const navigate = useNavigate();
  const status = getConnectionStatus(connected);

  return (
    <div className="min-h-screen w-screen flex flex-col overflow-hidden bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Chat Header */}
      <header className="relative border-b border-gray-300/60 dark:border-gray-600/60 p-4 bg-white/80 backdrop-blur-md dark:bg-gray-900/80 flex-shrink-0">
        <div className="container-custom mx-auto max-w-5xl flex items-center justify-between">
          {/* Left: Status + Back Button */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors typo-content-primary font-medium"
            >
              ← Back
            </button>
            <div className="flex items-center gap-2 typo-content-tertiary">
              <StatusDot connected={connected} />
              <span className="text-gray-700 dark:text-gray-200 font-medium">{status.text}</span>
              {connected && isListening && (
                <span className="ml-2 text-blue-600 dark:text-blue-400 font-medium">🎤 Listening</span>
              )}
            </div>
          </div>

          {/* Right: Settings Button */}
          <button 
            onClick={() => setOpenSettings(true)} 
            className="elderly-button-secondary gap-2 py-2 px-4 bg-white/70 hover:bg-white/90 dark:bg-gray-800/70 dark:hover:bg-gray-800/90 border-gray-300 dark:border-gray-600"
          >
            <Settings className="h-4 w-4" /> Settings
          </button>
        </div>
      </header>

      {/* Chat Messages Container - Scrollable */}
      <main className="flex-1 overflow-y-auto">
        <div className="container-custom mx-auto max-w-5xl px-6 py-8">
          {messages.length === 0 ? (
            <div className="rounded-2xl border border-gray-300/50 p-12 text-center bg-white/80 backdrop-blur-md shadow-lg dark:border-gray-600/50 dark:bg-gray-900/80">
              <div className="typo-display-subtitle font-semibold mb-2 text-gray-800 dark:text-gray-100">Start a new conversation</div>
              <div className="typo-content-secondary text-gray-600 dark:text-gray-300">Enter your question below, or use the microphone to speak</div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((m, idx) => (
                <div
                  key={`${m.role}-${idx}-${m.timestamp || idx}`}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`max-w-[75%] ${m.role === "assistant"
                      ? "rounded-3xl border border-gray-200/60 bg-white/85 backdrop-blur-md px-4 py-2 shadow-md dark:border-gray-600/60 dark:bg-gray-800/85"
                      : "rounded-3xl border border-blue-200/60 bg-blue-50/85 backdrop-blur-md px-5 py-3 shadow-md dark:border-blue-700/60 dark:bg-blue-950/70"
                      }`}
                  >
                    <div className="typo-content-tertiary mb-2 font-medium text-gray-600 dark:text-gray-300">
                      {m.role === "user" ? "You" : "AI"}
                    </div>
                    <div className={m.role === "assistant" ? "typo-ai-response whitespace-pre-wrap text-gray-800 dark:text-gray-100" : "typo-content-primary whitespace-pre-wrap text-gray-800 dark:text-gray-100"}>
                      {m.content}
                    </div>
                  </motion.div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Fixed Chat Input - Always at Bottom */}
      <div className="flex-shrink-0 p-6 bg-white/80 backdrop-blur-md dark:bg-gray-900/80 border-t border-gray-300/60 dark:border-gray-600/60">
        <div className="container-custom mx-auto max-w-4xl">
          <div className="bg-white/90 backdrop-blur-lg border border-gray-300/60 rounded-2xl shadow-2xl p-4 dark:bg-gray-900/90 dark:border-gray-600/60">
            <AudioSocketPlayer
              webSocketConnection={webSocketConnection}
              userName={name}
              onAssistantText={onAssistantText}
              onUserText={onUserText}
            />
          </div>
        </div>
      </div>

      {/* Settings Drawer */}
      <SettingsDrawer open={openSettings} onClose={() => setOpenSettings(false)} webSocketConnection={webSocketConnection} />
    </div>
  );
}

