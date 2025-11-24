import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useWebSocketConnection } from "./hooks/useWebSocketConnection";
import HeroPage from "./pages/HeroPage";
import ChatPage from "./pages/ChatPage";



export default function App() {
  const [dark, setDark] = React.useState(() => {
    if (typeof window === "undefined") return false;
    const saved = localStorage.getItem("theme");
    if (saved === "dark") return true;
    if (saved === "light") return false;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [messages, setMessages] = React.useState([]);

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
    <Router>
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

        {/* Routes */}
        <Routes>
          <Route 
            path="/" 
            element={
              <div className="relative min-h-screen z-10">
                <HeroPage
                  connected={webSocketConnection.isConnected}
                  dark={dark}
                  onToggleDark={() => setDark(v => !v)}
                  isListening={webSocketConnection.isListening}
                  onReconnect={webSocketConnection.reconnect}
                />
              </div>
            } 
          />
          <Route 
            path="/chat" 
            element={
              <ChatPage
                messages={messages}
                connected={webSocketConnection.isConnected}
                isListening={webSocketConnection.isListening}
                webSocketConnection={webSocketConnection}
                name=""
                onAssistantText={(t) => addMessage("assistant", t)}
                onUserText={(t) => addMessage("user", t)}
              />
            } 
          />
        </Routes>
      </div>
    </Router>
  );
}
