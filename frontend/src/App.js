import React from "react";
import { motion } from "framer-motion";
import { Settings, Zap, RefreshCw, X } from "lucide-react";
import AudioSocketPlayer from "./AudioSocketPlayer";
import RobotSettings from "./MqttSettings";
import TypographyControls from "./components/TypographyControls";
import { StatusDot } from "./components/ui/badge";
import { ThemeToggle } from "./components/ui/theme-toggle";
import { getConnectionStatus } from "./lib/utils";
import { useWebSocketConnection } from "./hooks/useWebSocketConnection";



function Header({ connected, dark, onToggleDark, isListening, onReconnect }) {
  const status = getConnectionStatus(connected);

  return (
    <motion.header
      className="min-h-screen flex flex-col items-center justify-center text-center"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Logo Section */}
      <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 shadow-2xl mb-8 animate-pulse-soft">
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-blue-400 to-purple-400 opacity-50 blur-sm animate-pulse"></div>
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/20 to-transparent"></div>
        <Zap className="relative h-10 w-10 text-white drop-shadow-lg" />
      </div>

      {/* Title Section */}
      <div className="mb-10">
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
      </div>

      {/* Status Section */}
      <div className="flex flex-wrap items-stretch justify-center gap-4">
        {/* Connection Status - enforced equal size */}
        <div className={`flex items-center gap-3 px-6 py-3 rounded-2xl border-2 w-[180px] h-[56px] justify-center ${connected
          ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200"
          : "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200"
          }`}>
          <StatusDot connected={connected} />
          <span className="typo-content-primary font-semibold">
            {status.text}
          </span>
        </div>

        {/* Reconnect Button - enforced equal size */}
        {!connected && (
          <button
            onClick={onReconnect}
            className="flex items-center gap-3 px-6 py-3 rounded-2xl border-2 w-[180px] h-[56px] justify-center border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-900/70 transition-colors duration-200 typo-content-primary font-semibold"
          >
            <RefreshCw className="h-4 w-4" />
            Reconnect
          </button>
        )}

        {/* Listening Status - enforced equal size */}
        {connected && isListening && (
          <div className="flex items-center gap-3 px-6 py-3 rounded-2xl border-2 w-[180px] h-[56px] justify-center border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-200">
            <div className="h-3 w-3 rounded-full bg-blue-500 animate-pulse"></div>
            <span className="typo-content-primary font-semibold">🎤 Listening</span>
          </div>
        )}

        <div className="flex items-center">
          <ThemeToggle isDark={dark} onToggle={onToggleDark} />
        </div>
      </div>
    </motion.header>
  );
}

function SettingsDrawer({ open, onClose, webSocketConnection }) {
  return (
    <motion.div className={open ? "fixed inset-0 z-40" : "hidden"}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <motion.aside
        initial={{ x: 400 }}
        animate={{ x: open ? 0 : 400 }}
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
  );
}

function ChatInterface({ messages, connected, isListening, onOpenSettings, webSocketConnection, name, onAssistantText, onUserText }) {
  const status = getConnectionStatus(connected);

  return (
    <div className="h-screen flex flex-col">
      {/* Chat Header */}
      <header className="relative border-b border-gray-300/60 dark:border-gray-600/60 p-4 bg-white/80 backdrop-blur-md dark:bg-gray-900/80 flex-shrink-0">
        <div className="container-custom mx-auto max-w-5xl flex items-center justify-between">
          <div className="flex items-center gap-2 typo-content-tertiary">
            <StatusDot connected={connected} />
            <span className="text-gray-700 dark:text-gray-200 font-medium">{status.text}</span>
            {connected && isListening && (
              <span className="ml-2 text-blue-600 dark:text-blue-400 font-medium">🎤 Listening</span>
            )}
          </div>
          <button onClick={onOpenSettings} className="elderly-button-secondary gap-2 py-2 px-4 bg-white/70 hover:bg-white/90 dark:bg-gray-800/70 dark:hover:bg-gray-800/90 border-gray-300 dark:border-gray-600">
            <Settings className="h-4 w-4" /> Settings
          </button>
        </div>
      </header>

      {/* Chat Messages Container - Scrollable */}
      <main className="flex-1 overflow-y-auto bg-white/80 backdrop-blur-md dark:bg-gray-900/80">
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
      <div className="flex-shrink-0 p-6 bg-white/80 backdrop-blur-md dark:bg-gray-900/80">
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
    </div>
  );
}

export default function App() {
  const [dark, setDark] = React.useState(() => {
    if (typeof window === "undefined") return false;
    const saved = localStorage.getItem("theme");
    if (saved === "dark") return true;
    if (saved === "light") return false;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [messages, setMessages] = React.useState([]);
  const [openSettings, setOpenSettings] = React.useState(false);

  const addMessage = React.useCallback((role, content) => {
    const newMessage = { role, content: content.trim(), timestamp: Date.now() };
    setMessages(prev => {
      const recent = prev.slice(-3);
      const dup = recent.some(m => m.role === role && m.content === newMessage.content && Math.abs(m.timestamp - newMessage.timestamp) < 2000);
      if (dup) return prev;
      const updated = [...prev, newMessage];
      return updated.length > 100 ? updated.slice(-100) : updated;
    });
  }, []);

  const webSocketConnection = useWebSocketConnection();

  React.useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  React.useEffect(() => {
    const initializeTypography = () => {
      const savedFontSize = localStorage.getItem('wro2025_font_size') || 'standard';
      const savedHighContrast = localStorage.getItem('wro2025_high_contrast') === 'true';

      // Handle both old Chinese font sizes and new English font sizes, with fallback
      const scaleMultipliers = {
        // New English font sizes
        'small': 0.875,
        'standard': 1.0,
        'large': 1.25,
        'senior-friendly': 1.5,
        'extra-large': 1.75,
        // Old Chinese font sizes for backward compatibility
        '小': 0.875,
        '標準': 1.0,
        '大': 1.25,
        '長者適用': 1.5,
        '超大': 1.75
      };

      const multiplier = scaleMultipliers[savedFontSize] || 1.0; // Default fallback
      const root = document.documentElement;
      const baseSize = 20 * multiplier;
      root.style.setProperty('--typo-base-size', `${baseSize}px`);
      root.style.setProperty('--typo-user-scale', multiplier.toString());
      const scale = 1.333;
      root.style.setProperty('--typo-xs', `${baseSize / scale / scale}px`);
      root.style.setProperty('--typo-sm', `${baseSize / scale}px`);
      root.style.setProperty('--typo-md', `${baseSize}px`);
      root.style.setProperty('--typo-lg', `${baseSize * scale}px`);
      root.style.setProperty('--typo-xl', `${baseSize * scale * scale}px`);
      root.style.setProperty('--typo-2xl', `${baseSize * scale * scale * scale}px`);
      root.style.setProperty('--typo-3xl', `${baseSize * scale * scale * scale * scale}px`);
      root.classList.toggle('high-contrast', savedHighContrast);
    };
    initializeTypography();
  }, []);

  return (
    <div className="min-h-screen gradient-bg animated-gradient relative">
      {/* Subtle atmosphere elements */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/5 w-1 h-1 bg-blue-400/10 rounded-full animate-pulse"
          style={{ animationDelay: '0s', animationDuration: '8s' }}></div>
        <div className="absolute top-1/2 right-1/4 w-1.5 h-1.5 bg-purple-400/8 rounded-full animate-pulse"
          style={{ animationDelay: '4s', animationDuration: '10s' }}></div>
        <div className="absolute bottom-1/3 left-1/3 w-1 h-1 bg-cyan-400/10 rounded-full animate-pulse"
          style={{ animationDelay: '2s', animationDuration: '12s' }}></div>
      </div>

      {/* Universal mesh overlay for texture */}
      <div className="fixed inset-0 opacity-[0.02] dark:opacity-[0.05] z-0"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(0,0,0,0.3) 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }}></div>

      {/* Hero Section - Full Screen */}
      <div className="relative min-h-screen z-10">
        <Header
          connected={webSocketConnection.isConnected}
          dark={dark}
          onToggleDark={() => setDark(v => !v)}
          isListening={webSocketConnection.isListening}
          onReconnect={webSocketConnection.reconnect}
        />
      </div>

      {/* Chat Interface - Full Screen */}
      <div className="relative z-10">
        <ChatInterface
          messages={messages}
          connected={webSocketConnection.isConnected}
          isListening={webSocketConnection.isListening}
          onOpenSettings={() => setOpenSettings(true)}
          webSocketConnection={webSocketConnection}
          name=""
          onAssistantText={(t) => addMessage("assistant", t)}
          onUserText={(t) => addMessage("user", t)}
        />
      </div>

      <SettingsDrawer open={openSettings} onClose={() => setOpenSettings(false)} webSocketConnection={webSocketConnection} />
    </div>
  );
}
