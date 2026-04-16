import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Crosshair, ShieldAlert, Users, Zap, Play, ChevronLeft, Skull, Shield, ShieldHalf, Flame, Settings } from 'lucide-react';
import { DynamicBackground } from './DynamicBackground';
import { Chatbot } from './game/Chatbot';

interface GameSelectorProps {
  onSelectMode: (mode: 'pvp' | 'pve' | 'team' | 'speed' | 'custom', difficulty?: 'easy' | 'normal' | 'hard' | 'nightmare') => void;
  nickname: string;
  isAdmin: boolean;
}

export function GameSelector({ onSelectMode, nickname, isAdmin }: GameSelectorProps) {
  const [showDifficulty, setShowDifficulty] = useState(false);
  const [showCustomConfig, setShowCustomConfig] = useState(false);
  const [customActive, setCustomActive] = useState(false);
  const [activeTab, setActiveTab] = useState<'games' | 'about' | 'admin' | 'ai'>('games');
  const [pointsData, setPointsData] = useState<Record<string, number>>({});
  const [randomSelection, setRandomSelection] = useState<string | null>(null);

  const handleRandomMode = () => {
    const modes = ['pvp', 'pve', 'team', 'speed'];
    const randomMode = modes[Math.floor(Math.random() * modes.length)];
    setRandomSelection(randomMode);
    
    setTimeout(() => {
      if (randomMode === 'pve') {
        const difficulties = ['easy', 'normal', 'hard', 'nightmare'];
        const randomDiff = difficulties[Math.floor(Math.random() * difficulties.length)];
        onSelectMode('pve', randomDiff as any);
      } else {
        onSelectMode(randomMode as any);
      }
    }, 1500);
  };
  
  const [customConfig, setCustomConfig] = useState({
    teams: false,
    teamSize: 2,
    enemyBots: 0,
    health: 500,
    speed: 12,
    spawnWeapon: 'DEFAULT'
  });

  useEffect(() => {
    fetch('/api/custom-game')
      .then(res => res.json())
      .then(data => {
        if (data.active) {
          setCustomActive(true);
        }
      })
      .catch(console.error);

    fetch('/api/points')
      .then(res => res.json())
      .then(data => setPointsData(data))
      .catch(console.error);
  }, []);

  const handleHostCustom = async () => {
    try {
      await fetch('/api/custom-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAdmin, config: customConfig })
      });
      onSelectMode('custom');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen text-white font-sans selection:bg-cyan-500/30 relative overflow-hidden flex flex-col items-center justify-center px-4 py-20">
      <DynamicBackground />
      
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="z-10 text-center mb-8"
      >
        <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-cyan-400 bg-[length:200%_auto] animate-[gradient_8s_linear_infinite] drop-shadow-[0_0_30px_rgba(255,0,255,0.4)]">
          SELECT DIRECTIVE
        </h1>
        <p className="mt-4 text-xl text-cyan-100 font-medium tracking-wide drop-shadow-[0_0_10px_rgba(0,255,255,0.5)]">
          Welcome, Agent {nickname}. Choose your combat simulation.
        </p>
      </motion.div>

      <div className="z-10 flex gap-4 mb-12">
        <button
          onClick={() => setActiveTab('games')}
          className={`px-8 py-3 rounded-xl font-bold uppercase tracking-widest transition-all duration-300 ${
            activeTab === 'games' 
              ? 'bg-cyan-500 text-black shadow-[0_0_20px_rgba(0,255,255,0.4)]' 
              : 'bg-black/50 text-cyan-500 border border-cyan-500/30 hover:border-cyan-400'
          }`}
        >
          Games
        </button>
        <button
          onClick={() => setActiveTab('about')}
          className={`px-8 py-3 rounded-xl font-bold uppercase tracking-widest transition-all duration-300 ${
            activeTab === 'about' 
              ? 'bg-fuchsia-500 text-white shadow-[0_0_20px_rgba(255,0,255,0.4)]' 
              : 'bg-black/50 text-fuchsia-500 border border-fuchsia-500/30 hover:border-fuchsia-400'
          }`}
        >
          About
        </button>
        <button
          onClick={() => setActiveTab('ai')}
          className={`px-8 py-3 rounded-xl font-bold uppercase tracking-widest transition-all duration-300 ${
            activeTab === 'ai' 
              ? 'bg-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.4)]' 
              : 'bg-black/50 text-purple-500 border border-purple-500/30 hover:border-purple-400'
          }`}
        >
          Maple AI
        </button>
        {isAdmin && (
          <button
            onClick={() => setActiveTab('admin')}
            className={`px-8 py-3 rounded-xl font-bold uppercase tracking-widest transition-all duration-300 ${
              activeTab === 'admin' 
                ? 'bg-yellow-500 text-black shadow-[0_0_20px_rgba(255,255,0,0.4)]' 
                : 'bg-black/50 text-yellow-500 border border-yellow-500/30 hover:border-yellow-400'
            }`}
          >
            Admin Panel
          </button>
        )}
      </div>

      {activeTab === 'games' ? (
        <div className="z-10 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8 max-w-[1400px] w-full">
          {/* Player Points Display and Random Button */}
          <div className="col-span-full mb-4 flex justify-between items-center">
            <button
              onClick={handleRandomMode}
              className="px-6 py-3 rounded-xl bg-blue-500/20 hover:bg-blue-500/40 text-blue-400 border border-blue-500/50 font-bold uppercase tracking-widest transition-all duration-300 flex items-center gap-2"
            >
              <Zap className="w-5 h-5" /> Random Gamemode
            </button>
            <div className="bg-black/50 border border-cyan-500/30 rounded-xl px-6 py-3 backdrop-blur-md flex items-center gap-3">
              <span className="text-cyan-200 uppercase tracking-widest text-sm font-bold">Your Points:</span>
              <span className="text-2xl font-black text-cyan-400 font-mono">{pointsData[nickname] || 0}</span>
            </div>
          </div>

          {/* PvP Mode Card */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className={`group relative rounded-3xl overflow-hidden bg-black/50 border ${randomSelection === 'pvp' ? 'border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.8)]' : 'border-cyan-500/30 hover:border-cyan-400'} backdrop-blur-md transition-all duration-500`}
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
          className={`group relative rounded-3xl overflow-hidden bg-black/50 border ${randomSelection === 'pve' ? 'border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.8)]' : 'border-fuchsia-500/30 hover:border-fuchsia-400'} backdrop-blur-md transition-all duration-500`}
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
          className={`group relative rounded-3xl overflow-hidden bg-black/50 border ${randomSelection === 'team' ? 'border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.8)]' : 'border-blue-500/30 hover:border-blue-400'} backdrop-blur-md transition-all duration-500`}
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
          className={`group relative rounded-3xl overflow-hidden bg-black/50 border ${randomSelection === 'speed' ? 'border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.8)]' : 'border-yellow-500/30 hover:border-yellow-400'} backdrop-blur-md transition-all duration-500`}
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

        {/* Custom Mode Card */}
        {(customActive || isAdmin) && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0 }}
            className="group relative rounded-3xl overflow-hidden bg-black/50 border border-emerald-500/30 backdrop-blur-md hover:border-emerald-400 transition-all duration-500 md:col-span-2 xl:col-span-4"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/50 to-black z-10" />
            <img 
              src="https://images.unsplash.com/photo-1555680202-c86f0e12f086?auto=format&fit=crop&q=80&w=1000" 
              alt="Custom Mode" 
              className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-70 group-hover:scale-105 transition-all duration-700"
              referrerPolicy="no-referrer"
            />
            
            <div className="relative z-20 p-8 h-full flex flex-col">
              <AnimatePresence mode="wait">
                {!showCustomConfig ? (
                  <motion.div 
                    key="custom-info"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex flex-col h-full"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/50">
                        <Settings className="w-8 h-8 text-emerald-400" />
                      </div>
                      <h2 className="text-3xl font-bold text-emerald-400 tracking-wider uppercase">Custom Game</h2>
                    </div>
                    
                    <p className="text-gray-300 mb-6 flex-grow leading-relaxed">
                      {customActive ? 'An admin has hosted a custom game! Join now to experience unique rules.' : 'Configure a custom game mode with unique rules, teams, bots, and more.'}
                    </p>
                    
                    <div className="flex gap-4 mb-8">
                      <div className="flex items-center gap-2 text-sm text-emerald-200 bg-emerald-900/40 px-3 py-1.5 rounded-full border border-emerald-500/20">
                        <Settings className="w-4 h-4" /> Custom Rules
                      </div>
                    </div>
                    
                    {customActive ? (
                      <button
                        onClick={() => onSelectMode('custom')}
                        className="w-full py-4 rounded-xl bg-emerald-500/20 hover:bg-emerald-500 text-emerald-100 hover:text-white border border-emerald-500/50 hover:border-emerald-400 font-bold uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 group-hover:shadow-[0_0_30px_rgba(16,185,129,0.4)]"
                      >
                        <Play className="w-5 h-5" /> Join Custom Game
                      </button>
                    ) : (
                      <button
                        onClick={() => setShowCustomConfig(true)}
                        className="w-full py-4 rounded-xl bg-emerald-500/20 hover:bg-emerald-500 text-emerald-100 hover:text-white border border-emerald-500/50 hover:border-emerald-400 font-bold uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 group-hover:shadow-[0_0_30px_rgba(16,185,129,0.4)]"
                      >
                        <Settings className="w-5 h-5" /> Configure Game
                      </button>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="custom-config"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex flex-col h-full"
                  >
                    <div className="flex items-center gap-3 mb-6">
                      <button 
                        onClick={() => setShowCustomConfig(false)}
                        className="p-2 rounded-lg bg-black/50 hover:bg-emerald-500/20 border border-emerald-500/30 transition-colors"
                      >
                        <ChevronLeft className="w-6 h-6 text-emerald-400" />
                      </button>
                      <h2 className="text-2xl font-bold text-emerald-400 tracking-wider uppercase">Configuration</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 flex-grow">
                      <div className="space-y-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={customConfig.teams}
                            onChange={(e) => setCustomConfig({...customConfig, teams: e.target.checked})}
                            className="w-5 h-5 accent-emerald-500"
                          />
                          <span className="text-white font-medium">Enable Teams</span>
                        </label>
                        
                        {customConfig.teams && (
                          <div>
                            <label className="block text-sm text-emerald-200 mb-1">Team Size: {customConfig.teamSize}</label>
                            <input 
                              type="range" min="2" max="10" step="1"
                              value={customConfig.teamSize}
                              onChange={(e) => setCustomConfig({...customConfig, teamSize: parseInt(e.target.value)})}
                              className="w-full accent-emerald-500"
                            />
                          </div>
                        )}

                        <div>
                          <label className="block text-sm text-emerald-200 mb-1">Enemy Bots: {customConfig.enemyBots}</label>
                          <input 
                            type="range" min="0" max="50" step="1"
                            value={customConfig.enemyBots}
                            onChange={(e) => setCustomConfig({...customConfig, enemyBots: parseInt(e.target.value)})}
                            className="w-full accent-emerald-500"
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm text-emerald-200 mb-1">Spawn Health: {customConfig.health}</label>
                          <input 
                            type="range" min="1" max="2000" step="10"
                            value={customConfig.health}
                            onChange={(e) => setCustomConfig({...customConfig, health: parseInt(e.target.value)})}
                            className="w-full accent-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm text-emerald-200 mb-1">Speed: {customConfig.speed}</label>
                          <input 
                            type="range" min="5" max="100" step="1"
                            value={customConfig.speed}
                            onChange={(e) => setCustomConfig({...customConfig, speed: parseInt(e.target.value)})}
                            className="w-full accent-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm text-emerald-200 mb-1">Spawn Weapon</label>
                          <select 
                            value={customConfig.spawnWeapon}
                            onChange={(e) => setCustomConfig({...customConfig, spawnWeapon: e.target.value})}
                            className="w-full bg-black/50 border border-emerald-500/30 rounded-lg p-2 text-white outline-none focus:border-emerald-500"
                          >
                            <option value="DEFAULT">Default</option>
                            <option value="REVOLVER">Revolver</option>
                            <option value="SHOTGUN">Shotgun</option>
                            <option value="RPG">RPG</option>
                            <option value="KNIFE">Knife</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleHostCustom}
                      className="w-full py-4 rounded-xl bg-emerald-500/20 hover:bg-emerald-500 text-emerald-100 hover:text-white border border-emerald-500/50 hover:border-emerald-400 font-bold uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 group-hover:shadow-[0_0_30px_rgba(16,185,129,0.4)]"
                    >
                      <Play className="w-5 h-5" /> Host Custom Game
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
        </div>
      ) : activeTab === 'admin' ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="z-10 max-w-4xl w-full bg-black/50 border border-yellow-500/30 rounded-3xl p-8 backdrop-blur-md"
        >
          <h2 className="text-3xl font-bold text-yellow-400 mb-6 uppercase tracking-wider">Admin Panel</h2>
          <div className="space-y-6">
            <h3 className="text-xl text-yellow-200">Player Points Management</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(pointsData).map(([player, points]) => (
                <div key={player} className="flex items-center justify-between bg-black/40 p-4 rounded-xl border border-yellow-500/20">
                  <span className="text-lg font-bold text-white">{player}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-yellow-400 font-mono text-xl">{points} pts</span>
                    <button
                      onClick={() => {
                        fetch('/api/points', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ isAdmin, nickname: player, points: 1 })
                        })
                        .then(res => res.json())
                        .then(data => {
                          if (data.success) {
                            setPointsData(prev => ({ ...prev, [player]: data.points }));
                          }
                        });
                      }}
                      className="px-3 py-1 bg-yellow-500/20 hover:bg-yellow-500/40 text-yellow-400 rounded-lg border border-yellow-500/50 transition-colors font-bold"
                    >
                      +1 Point
                    </button>
                  </div>
                </div>
              ))}
              {Object.keys(pointsData).length === 0 && (
                <p className="text-gray-400 italic">No players have points yet.</p>
              )}
            </div>
            
            <div className="mt-8 pt-8 border-t border-yellow-500/20">
              <h3 className="text-xl text-yellow-200 mb-4">Add Points to New Player</h3>
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.target as HTMLFormElement;
                  const input = form.elements.namedItem('newPlayer') as HTMLInputElement;
                  const newPlayer = input.value.trim();
                  if (newPlayer) {
                    fetch('/api/points', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ isAdmin, nickname: newPlayer, points: 1 })
                    })
                    .then(res => res.json())
                    .then(data => {
                      if (data.success) {
                        setPointsData(prev => ({ ...prev, [newPlayer]: data.points }));
                        input.value = '';
                      }
                    });
                  }
                }}
                className="flex gap-4"
              >
                <input 
                  type="text" 
                  name="newPlayer"
                  placeholder="Player Nickname" 
                  className="flex-1 bg-black/40 border border-yellow-500/30 rounded-xl px-4 py-2 text-white outline-none focus:border-yellow-400"
                />
                <button type="submit" className="px-6 py-2 bg-yellow-500 text-black font-bold rounded-xl hover:bg-yellow-400 transition-colors">
                  Add Player
                </button>
              </form>
            </div>
          </div>
        </motion.div>
      ) : activeTab === 'ai' ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="z-10 max-w-4xl w-full"
        >
          <Chatbot inline={true} />
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="z-10 max-w-3xl w-full bg-black/50 border border-fuchsia-500/30 rounded-3xl p-8 backdrop-blur-md"
        >
          <h2 className="text-3xl font-bold text-fuchsia-400 mb-6 uppercase tracking-wider">About Maple Infinity</h2>
          <div className="space-y-6 text-gray-300 leading-relaxed">
            <p>
              Maple Infinity is a cutting-edge multiplayer combat simulation designed to test your reflexes, tactical thinking, and teamwork. Set in a vibrant neon-drenched cyberpunk arena, players engage in various game modes ranging from fast-paced free-for-alls to cooperative survival against rogue AI.
            </p>
            <p>
              <strong>Game Modes:</strong>
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong className="text-cyan-400">Neon Deathmatch (PvP):</strong> Classic free-for-all combat.</li>
              <li><strong className="text-fuchsia-400">Co-op Survival (PvE):</strong> Team up to survive waves of enemies.</li>
              <li><strong className="text-blue-400">Team Deathmatch:</strong> 2v2v2 tactical battles.</li>
              <li><strong className="text-yellow-400">Speed Mode:</strong> Hyper-fast movement, low health.</li>
              <li><strong className="text-emerald-400">Custom Game:</strong> Configure your own rules and bots.</li>
            </ul>
            <div className="pt-8 flex justify-center">
              <a
                href="https://github.com/anrandaniel-a11y/Maple-Infinity"
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-fuchsia-500 to-cyan-500 text-white font-bold uppercase tracking-widest hover:shadow-[0_0_30px_rgba(255,0,255,0.4)] transition-all duration-300 hover:scale-[1.05] active:scale-[0.95] flex items-center gap-3"
              >
                <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                My GitHub
              </a>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
