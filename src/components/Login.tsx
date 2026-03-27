import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Lock, User, KeyRound, X } from 'lucide-react';

interface LoginProps {
  onLogin: (nickname: string, isAdmin: boolean) => void;
  onClose: () => void;
}

export function Login({ onLogin, onClose }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) {
      setError('Please enter a nickname for the leaderboard.');
      return;
    }
    if ((username === 'Maple 2' || username === 'Admin') && password === 'Illu-Maple') {
      onLogin(nickname.trim(), username === 'Admin');
    } else {
      setError('Invalid credentials. Access denied.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-md p-8 rounded-3xl bg-black/80 backdrop-blur-xl border border-white/10 shadow-[0_0_50px_rgba(0,255,255,0.2)] relative overflow-hidden"
      >
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10"
        >
          <X className="w-6 h-6" />
        </button>
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-fuchsia-500 to-cyan-500" />
        
        <div className="flex justify-center mb-8 mt-4">
          <div className="p-4 rounded-full bg-cyan-500/10 border border-cyan-500/30 shadow-[0_0_20px_rgba(0,255,255,0.2)]">
            <Lock className="w-8 h-8 text-cyan-400" />
          </div>
        </div>

        <h2 className="text-3xl font-bold text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500">
          System Access
        </h2>
        <p className="text-center text-gray-400 mb-8 text-sm uppercase tracking-widest">
          Maple Infinity Portal
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-medium text-cyan-400 uppercase tracking-wider mb-2">
              Username
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all"
                placeholder="Enter username"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-fuchsia-400 uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-fuchsia-500/50 focus:ring-1 focus:ring-fuchsia-500/50 transition-all"
                placeholder="Enter password"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-green-400 uppercase tracking-wider mb-2">
              Player Nickname
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={12}
                className="w-full bg-black/50 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 transition-all"
                placeholder="Enter display name"
              />
            </div>
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="text-red-400 text-sm text-center font-medium"
            >
              {error}
            </motion.p>
          )}

          <button
            type="submit"
            className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white font-bold uppercase tracking-widest hover:shadow-[0_0_30px_rgba(0,255,255,0.4)] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          >
            Authenticate
          </button>
        </form>
      </motion.div>
    </div>
  );
}
