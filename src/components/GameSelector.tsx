import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Crosshair, ShieldAlert, Users, Zap, Play, ChevronLeft, Skull, Shield, ShieldHalf, Flame } from 'lucide-react';
import { DynamicBackground } from './DynamicBackground';

interface GameSelectorProps {
  onSelectMode: (mode: 'pvp' | 'pve' | 'team' | 'speed', difficulty?: 'easy' | 'normal' | 'hard' | 'nightmare') => void;
  nickname: string;
}

export function GameSelector({ onSelectMode, nickname }: GameSelectorProps) {
  const [showDifficulty, setShowDifficulty] = useState(false);

  return (
    <div className="min-h-screen text-white font-sans selection:bg-cyan-500/30 relative overflow-hidden flex flex-col items-center justify-center px-4 py-20">
      <DynamicBackground />
      
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="z-10 text-center mb-12"
      >
        <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-cyan-400 bg-[length:200%_auto] animate-[gradient_8s_linear_infinite] drop-shadow-[0_0_30px_rgba(255,0,255,0.4)]">
          SELECT DIRECTIVE
        </h1>
        <p className="mt-4 text-xl text-cyan-100 font-medium tracking-wide drop-shadow-[0_0_10px_rgba(0,255,255,0.5)]">
          Welcome, Agent {nickname}. Choose your combat simulation.
        </p>
      </motion.div>

      <div className="z-10 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8 max-w-[1400px] w-full">
        {/* PvP Mode Card */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="group relative rounded-3xl overflow-hidden bg-black/50 border border-cyan-500/30 backdrop-blur-md hover:border-cyan-400 transition-all duration-500"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/50 to-black z-10" />
          <img 
            src="https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=1000" 
            alt="PvP Arena" 
            className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-70 group-hover:scale-105 transition-all duration-700"
            referrerPolicy="no-referrer"
          />
          
          <div className="relative z-20 p-8 h-full flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-xl bg-cyan-500/20 border border-cyan-500/50">
                <Crosshair className="w-8 h-8 text-cyan-400" />
              </div>
              <h2 className="text-3xl font-bold text-cyan-400 tracking-wider uppercase">Neon Deathmatch</h2>
            </div>
            
            <p className="text-gray-300 mb-6 flex-grow leading-relaxed">
              Enter the free-for-all arena. Battle against other players in a fast-paced neon environment. Collect weapons, dodge lasers, and climb to the top of the leaderboard. Only the fastest survive.
            </p>
            
            <div className="flex gap-4 mb-8">
              <div className="flex items-center gap-2 text-sm text-cyan-200 bg-cyan-900/40 px-3 py-1.5 rounded-full border border-cyan-500/20">
                <Users className="w-4 h-4" /> Free For All
              </div>
              <div className="flex items-center gap-2 text-sm text-cyan-200 bg-cyan-900/40 px-3 py-1.5 rounded-full border border-cyan-500/20">
                <Zap className="w-4 h-4" /> Fast Paced
              </div>
            </div>
            
            <button
              onClick={() => onSelectMode('pvp')}
              className="w-full py-4 rounded-xl bg-cyan-500/20 hover:bg-cyan-500 text-cyan-100 hover:text-white border border-cyan-500/50 hover:border-cyan-400 font-bold uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 group-hover:shadow-[0_0_30px_rgba(0,255,255,0.4)]"
            >
              <Play className="w-5 h-5" /> Deploy to Arena
            </button>
          </div>
        </motion.div>

        {/* PvE Mode Card */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="group relative rounded-3xl overflow-hidden bg-black/50 border border-fuchsia-500/30 backdrop-blur-md hover:border-fuchsia-400 transition-all duration-500"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/50 to-black z-10" />
          <img 
            src="https://images.unsplash.com/photo-1614729939124-032f0b56c9ce?auto=format&fit=crop&q=80&w=1000" 
            alt="PvE Survival" 
            className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-70 group-hover:scale-105 transition-all duration-700"
            referrerPolicy="no-referrer"
          />
          
          <div className="relative z-20 p-8 h-full flex flex-col">
            <AnimatePresence mode="wait">
              {!showDifficulty ? (
                <motion.div 
                  key="pve-info"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex flex-col h-full"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 rounded-xl bg-fuchsia-500/20 border border-fuchsia-500/50">
                      <ShieldAlert className="w-8 h-8 text-fuchsia-400" />
                    </div>
                    <h2 className="text-3xl font-bold text-fuchsia-400 tracking-wider uppercase">Co-op Survival</h2>
                  </div>
                  
                  <p className="text-gray-300 mb-6 flex-grow leading-relaxed">
                    Team up with other players or go solo against relentless waves of rogue AI entities. Dodge drone lasers, avoid explosive lightbulbs, and survive as long as you can in a confined tactical zone.
                  </p>
                  
                  <div className="flex gap-4 mb-8">
                    <div className="flex items-center gap-2 text-sm text-fuchsia-200 bg-fuchsia-900/40 px-3 py-1.5 rounded-full border border-fuchsia-500/20">
                      <Users className="w-4 h-4" /> Co-op / Solo
                    </div>
                    <div className="flex items-center gap-2 text-sm text-fuchsia-200 bg-fuchsia-900/40 px-3 py-1.5 rounded-full border border-fuchsia-500/20">
                      <ShieldAlert className="w-4 h-4" /> Survival
                    </div>
                  </div>
                  
                  <button
                    onClick={() => setShowDifficulty(true)}
                    className="w-full py-4 rounded-xl bg-fuchsia-500/20 hover:bg-fuchsia-500 text-fuchsia-100 hover:text-white border border-fuchsia-500/50 hover:border-fuchsia-400 font-bold uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 group-hover:shadow-[0_0_30px_rgba(255,0,255,0.4)]"
                  >
                    <Play className="w-5 h-5" /> Select Difficulty
                  </button>
                </motion.div>
              ) : (
                <motion.div 
                  key="pve-difficulty"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex flex-col h-full"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <button 
                      onClick={() => setShowDifficulty(false)}
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <h2 className="text-2xl font-bold text-fuchsia-400 tracking-wider uppercase">Select Difficulty</h2>
                  </div>
                  
                  <div className="flex flex-col gap-4 flex-grow justify-center">
                    <button
                      onClick={() => onSelectMode('pve', 'easy')}
                      className="group/btn relative overflow-hidden rounded-xl bg-green-500/10 border border-green-500/30 hover:border-green-400 p-4 transition-all duration-300 text-left"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-green-500/0 via-green-500/10 to-green-500/0 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700" />
                      <div className="flex items-center gap-4 relative z-10">
                        <div className="p-2 rounded-lg bg-green-500/20 text-green-400">
                          <Shield className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-green-400 uppercase tracking-wide">Easy</h3>
                          <p className="text-sm text-green-200/70">Fewer enemies, more medkits. Good for training.</p>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => onSelectMode('pve', 'normal')}
                      className="group/btn relative overflow-hidden rounded-xl bg-yellow-500/10 border border-yellow-500/30 hover:border-yellow-400 p-4 transition-all duration-300 text-left"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/0 via-yellow-500/10 to-yellow-500/0 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700" />
                      <div className="flex items-center gap-4 relative z-10">
                        <div className="p-2 rounded-lg bg-yellow-500/20 text-yellow-400">
                          <ShieldHalf className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-yellow-400 uppercase tracking-wide">Normal</h3>
                          <p className="text-sm text-yellow-200/70">Standard combat simulation. Balanced threat level.</p>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => onSelectMode('pve', 'hard')}
                      className="group/btn relative overflow-hidden rounded-xl bg-red-500/10 border border-red-500/30 hover:border-red-400 p-4 transition-all duration-300 text-left"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-red-500/0 via-red-500/10 to-red-500/0 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700" />
                      <div className="flex items-center gap-4 relative z-10">
                        <div className="p-2 rounded-lg bg-red-500/20 text-red-400">
                          <Skull className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-red-400 uppercase tracking-wide">Hard</h3>
                          <p className="text-sm text-red-200/70">Lethal force authorized. Minimal supplies. Good luck.</p>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => onSelectMode('pve', 'nightmare')}
                      className="group/btn relative overflow-hidden rounded-xl bg-purple-500/10 border border-purple-500/30 hover:border-purple-400 p-4 transition-all duration-300 text-left"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/10 to-purple-500/0 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700" />
                      <div className="flex items-center gap-4 relative z-10">
                        <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
                          <Flame className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-purple-400 uppercase tracking-wide">Nightmare</h3>
                          <p className="text-sm text-purple-200/70">Absolute chaos. Relentless AI. Almost impossible.</p>
                        </div>
                      </div>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
        {/* Team Mode Card */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
          className="group relative rounded-3xl overflow-hidden bg-black/50 border border-blue-500/30 backdrop-blur-md hover:border-blue-400 transition-all duration-500"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/50 to-black z-10" />
          <img 
            src="https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=1000" 
            alt="Team Deathmatch" 
            className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-70 group-hover:scale-105 transition-all duration-700"
            referrerPolicy="no-referrer"
          />
          
          <div className="relative z-20 p-8 h-full flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-xl bg-blue-500/20 border border-blue-500/50">
                <Users className="w-8 h-8 text-blue-400" />
              </div>
              <h2 className="text-3xl font-bold text-blue-400 tracking-wider uppercase">Team Deathmatch</h2>
            </div>
            
            <p className="text-gray-300 mb-6 flex-grow leading-relaxed">
              Form a duo and battle other teams. Single players get 2 lives to balance the odds. Coordinate, survive, and dominate the arena.
            </p>
            
            <div className="flex gap-4 mb-8">
              <div className="flex items-center gap-2 text-sm text-blue-200 bg-blue-900/40 px-3 py-1.5 rounded-full border border-blue-500/20">
                <Users className="w-4 h-4" /> 2v2v2
              </div>
              <div className="flex items-center gap-2 text-sm text-blue-200 bg-blue-900/40 px-3 py-1.5 rounded-full border border-blue-500/20">
                <Shield className="w-4 h-4" /> Tactical
              </div>
            </div>
            
            <button
              onClick={() => onSelectMode('team')}
              className="w-full py-4 rounded-xl bg-blue-500/20 hover:bg-blue-500 text-blue-100 hover:text-white border border-blue-500/50 hover:border-blue-400 font-bold uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 group-hover:shadow-[0_0_30px_rgba(0,0,255,0.4)]"
            >
              <Play className="w-5 h-5" /> Enter Lobby
            </button>
          </div>
        </motion.div>

        {/* Speed Mode Card */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.8 }}
          className="group relative rounded-3xl overflow-hidden bg-black/50 border border-yellow-500/30 backdrop-blur-md hover:border-yellow-400 transition-all duration-500"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/50 to-black z-10" />
          <img 
            src="https://images.unsplash.com/photo-1518002171953-a080ee817e1f?auto=format&fit=crop&q=80&w=1000" 
            alt="Speed Mode" 
            className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-70 group-hover:scale-105 transition-all duration-700"
            referrerPolicy="no-referrer"
          />
          
          <div className="relative z-20 p-8 h-full flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-xl bg-yellow-500/20 border border-yellow-500/50">
                <Zap className="w-8 h-8 text-yellow-400" />
              </div>
              <h2 className="text-3xl font-bold text-yellow-400 tracking-wider uppercase">Speed Mode</h2>
            </div>
            
            <p className="text-gray-300 mb-6 flex-grow leading-relaxed">
              High octane, fast-paced combat. Everyone moves at lightning speed but dies in just 5 hits. Reflexes are everything.
            </p>
            
            <div className="flex gap-4 mb-8">
              <div className="flex items-center gap-2 text-sm text-yellow-200 bg-yellow-900/40 px-3 py-1.5 rounded-full border border-yellow-500/20">
                <Zap className="w-4 h-4" /> 50x Speed
              </div>
              <div className="flex items-center gap-2 text-sm text-yellow-200 bg-yellow-900/40 px-3 py-1.5 rounded-full border border-yellow-500/20">
                <Skull className="w-4 h-4" /> 125 Health
              </div>
            </div>
            
            <button
              onClick={() => onSelectMode('speed')}
              className="w-full py-4 rounded-xl bg-yellow-500/20 hover:bg-yellow-500 text-yellow-100 hover:text-white border border-yellow-500/50 hover:border-yellow-400 font-bold uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 group-hover:shadow-[0_0_30px_rgba(255,255,0,0.4)]"
            >
              <Play className="w-5 h-5" /> Enter Arena
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
