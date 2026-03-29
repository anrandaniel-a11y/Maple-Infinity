import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { motion } from 'motion/react';
import { Users, CheckCircle2, Circle } from 'lucide-react';

const TEAMS = [
  { id: 'red', name: 'Red Team', color: 'bg-red-500/20 text-red-400 border-red-500/50' },
  { id: 'blue', name: 'Blue Team', color: 'bg-blue-500/20 text-blue-400 border-blue-500/50' },
  { id: 'green', name: 'Green Team', color: 'bg-green-500/20 text-green-400 border-green-500/50' },
  { id: 'yellow', name: 'Yellow Team', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' },
];

export function TeamLobby() {
  const players = useGameStore((state) => state.players);
  const myId = useGameStore((state) => state.myId);
  const teams = useGameStore((state) => state.teams);
  const votesToStart = useGameStore((state) => state.votesToStart);
  const joinTeam = useGameStore((state) => state.joinTeam);
  const voteStart = useGameStore((state) => state.voteStart);

  const myTeam = myId ? teams[myId] : null;
  const hasVoted = myId ? votesToStart.includes(myId) : false;
  const totalPlayers = Object.keys(players).length;
  const totalVotes = votesToStart.length;

  return (
    <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl w-full bg-black/50 border border-cyan-500/30 rounded-3xl p-8"
      >
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500 uppercase">
            Team Selection
          </h1>
          <p className="text-gray-400 mt-2">Select your duo. Single players receive 2 lives.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {TEAMS.map((team) => {
            const teamPlayers = Object.entries(teams)
              .filter(([_, tId]) => tId === team.id)
              .map(([pId]) => players[pId]);
            
            const isFull = teamPlayers.length >= 2;
            const isMyTeam = myTeam === team.id;

            return (
              <div 
                key={team.id}
                className={`border rounded-xl p-4 flex flex-col ${team.color} ${isMyTeam ? 'ring-2 ring-white' : ''} ${!isFull && !isMyTeam ? 'cursor-pointer hover:bg-white/5' : ''}`}
                onClick={() => !isFull && !isMyTeam && joinTeam(team.id)}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold uppercase tracking-wider">{team.name}</h3>
                  <Users className="w-5 h-5" />
                </div>
                
                <div className="flex-grow space-y-2">
                  {teamPlayers.map((p, i) => (
                    <div key={i} className="bg-black/40 px-3 py-2 rounded-lg text-sm truncate">
                      {p?.nickname || 'Unknown'}
                    </div>
                  ))}
                  {Array.from({ length: 2 - teamPlayers.length }).map((_, i) => (
                    <div key={`empty-${i}`} className="bg-black/20 px-3 py-2 rounded-lg text-sm text-white/30 border border-dashed border-white/20">
                      Empty Slot
                    </div>
                  ))}
                </div>
                
                {isMyTeam && (
                  <div className="mt-4 text-xs text-center font-bold bg-white/10 py-1 rounded">
                    YOUR TEAM
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex flex-col items-center gap-4 border-t border-white/10 pt-8">
          <button
            onClick={() => !hasVoted && myTeam && voteStart()}
            disabled={hasVoted || !myTeam}
            className={`px-8 py-4 rounded-xl font-bold uppercase tracking-widest flex items-center gap-3 transition-all ${
              hasVoted 
                ? 'bg-green-500/20 text-green-400 border border-green-500/50 cursor-not-allowed'
                : !myTeam
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 hover:bg-cyan-500 hover:text-white'
            }`}
          >
            {hasVoted ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
            {hasVoted ? 'Ready' : 'Vote to Start'}
          </button>
          
          <div className="text-gray-400 text-sm">
            {totalVotes} / {Math.max(2, totalPlayers)} players ready (Minimum 2 players required)
          </div>
        </div>
      </motion.div>
    </div>
  );
}
