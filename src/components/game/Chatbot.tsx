import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { X, Send, Bot, User } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export function Chatbot({ onClose, inline = false }: { onClose?: () => void, inline?: boolean }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: 'Hello! I am the Maple Infinity AI Assistant. How can I help you with the game today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });

  const systemInstruction = `You are the AI Assistant for the game "Maple Infinity". 
You have full knowledge of the game's mechanics, modes, and features.
Game Modes:
- Neon Deathmatch (PvP): Classic free-for-all combat.
- Co-op Survival (PvE): Team up to survive waves of enemies.
- Team Deathmatch: 2v2v2 tactical battles.
- Speed Mode: Hyper-fast movement, low health.
- Custom Game: Configure your own rules and bots.

Weapons:
- Revolver: High damage, slow fire rate.
- Shotgun: High spread, deadly at close range.
- RPG: Explosive damage, slow projectile.
- Knife: Melee weapon, high damage.

Entities/Enemies:
- LIGHTBULB, DRONE, MECH, LAVABOT, SNIPER, TANK, SWARMER, HEALER, BOSS

Features:
- Dynamic Backgrounds
- Logo Generator
- Admin Panel for points management
- Mobile Controls customization

Be helpful, concise, and stay in character as a cyberpunk AI assistant.`;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      // Format history for Gemini API
      const contents = messages.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }]
      }));
      
      // Add the new user message
      contents.push({
        role: 'user',
        parts: [{ text: userMessage }]
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
        }
      });

      const text = response.text || 'I encountered an error processing your request.';
      
      setMessages(prev => [...prev, { role: 'model', text }]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { role: 'model', text: 'Sorry, my neural link is experiencing interference. Please try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const content = (
    <div className={`bg-gray-900 border border-fuchsia-500/50 rounded-2xl w-full ${inline ? 'h-[600px]' : 'max-w-lg h-[80vh]'} shadow-[0_0_30px_rgba(255,0,255,0.1)] flex flex-col overflow-hidden`} onPointerDown={(e) => e.stopPropagation()}>
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-fuchsia-500/30 bg-black/50">
        <div className="flex items-center gap-2">
          <Bot className="text-fuchsia-400 w-6 h-6" />
          <h2 className="text-xl font-black text-fuchsia-400 uppercase tracking-widest">Maple AI</h2>
        </div>
        {!inline && onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-xl p-3 ${
              msg.role === 'user' 
                ? 'bg-cyan-500/20 border border-cyan-500/30 text-cyan-100 rounded-tr-none' 
                : 'bg-fuchsia-500/20 border border-fuchsia-500/30 text-fuchsia-100 rounded-tl-none'
            }`}>
              <div className="flex items-center gap-2 mb-1 opacity-70">
                {msg.role === 'user' ? <User size={12} /> : <Bot size={12} />}
                <span className="text-[10px] uppercase tracking-widest font-bold">
                  {msg.role === 'user' ? 'Agent' : 'System'}
                </span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-fuchsia-500/20 border border-fuchsia-500/30 text-fuchsia-100 rounded-xl rounded-tl-none p-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-fuchsia-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-fuchsia-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-fuchsia-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-fuchsia-500/30 bg-black/50">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask the AI..."
            className="flex-1 bg-black/50 border border-fuchsia-500/30 rounded-lg px-4 py-2 text-white outline-none focus:border-fuchsia-400"
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="bg-fuchsia-500/20 hover:bg-fuchsia-500/40 disabled:opacity-50 text-fuchsia-400 border border-fuchsia-500/50 rounded-lg px-4 py-2 transition-colors flex items-center justify-center"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );

  if (inline) {
    return content;
  }

  return (
    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center pointer-events-auto" onPointerDown={(e) => e.stopPropagation()}>
      {content}
    </div>
  );
}
