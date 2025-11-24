import React from "react";
import { motion } from "framer-motion";
import { Zap, RefreshCw, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { StatusDot } from "../components/ui/badge";
import { ThemeToggle } from "../components/ui/theme-toggle";
import { getConnectionStatus } from "../lib/utils";

export default function HeroPage({ connected, dark, onToggleDark, isListening, onReconnect }) {
  const navigate = useNavigate();
  const status = getConnectionStatus(connected);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
      {/* Logo Section */}
      <motion.div
        className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 shadow-2xl mb-8 animate-pulse-soft"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-blue-400 to-purple-400 opacity-50 blur-sm animate-pulse"></div>
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/20 to-transparent"></div>
        <Zap className="relative h-10 w-10 text-white drop-shadow-lg" />
      </motion.div>

      {/* Title Section */}
      <motion.div
        className="mb-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <h1 className="typo-display-hero font-bold tracking-tight text-center mb-3 text-gray-900 dark:text-white"
          style={{
            textShadow: '0 2px 4px rgba(0,0,0,0.1), 0 0 8px rgba(59, 130, 246, 0.2)',
            filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))'
          }}>
          XiaoKa: AI Real-time Voice Assistant
        </h1>
        <p className="typo-display-subtitle text-gray-600 dark:text-gray-300"
          style={{
            textShadow: '0 1px 2px rgba(0,0,0,0.1)'
          }}>
          Intelligent conversation, real-time response, designed for seniors
        </p>
      </motion.div>

      {/* Status Section */}
      <motion.div
        className="flex flex-wrap items-center justify-center gap-4 mb-12"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        {/* Connection Status */}
        <div className={`flex items-center gap-3 px-6 py-3 rounded-2xl border-2 min-w-[140px] justify-center ${connected
          ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200"
          : "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200"
          }`}>
          <StatusDot connected={connected} />
          <span className="typo-content-primary font-semibold">
            {status.text}
          </span>
        </div>

        {/* Reconnect Button */}
        {!connected && (
          <button
            onClick={onReconnect}
            className="flex items-center gap-3 px-6 py-3 rounded-2xl border-2 min-w-[140px] justify-center border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-900/70 transition-colors duration-200 typo-content-primary font-semibold"
          >
            <RefreshCw className="h-4 w-4" />
            Reconnect
          </button>
        )}

        {/* Listening Status */}
        {connected && isListening && (
          <div className="flex items-center gap-3 px-6 py-3 rounded-2xl border-2 border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-200">
            <div className="h-3 w-3 rounded-full bg-blue-500 animate-pulse"></div>
            <span className="typo-content-primary font-semibold">🎤 Listening</span>
          </div>
        )}

        <div className="flex items-center">
          <ThemeToggle isDark={dark} onToggle={onToggleDark} />
        </div>
      </motion.div>

      {/* CTA Button */}
      <motion.button
        onClick={() => navigate('/chat')}
        className="group relative px-10 py-5 rounded-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white font-bold typo-display-title shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105 active:scale-95"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        whileHover={{ y: -5 }}
        whileTap={{ scale: 0.95 }}
      >
        <div className="absolute inset-0 rounded-2xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        <div className="relative flex items-center gap-3">
          <span>Start Chatting Now</span>
          <ArrowRight className="h-6 w-6 group-hover:translate-x-1 transition-transform duration-300" />
        </div>
      </motion.button>

      {/* Description */}
      <motion.p
        className="mt-8 typo-content-secondary text-gray-500 dark:text-gray-400 max-w-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.4 }}
      >
        Click the button above to enter the chat interface and start your AI conversation experience
      </motion.p>
    </div>
  );
}

