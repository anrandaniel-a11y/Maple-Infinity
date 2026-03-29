import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DynamicBackground } from './components/DynamicBackground';
import { LogoGenerator } from './components/LogoGenerator';
import { Countdown } from './components/Countdown';
import { FeatureCard } from './components/FeatureCard';
import { Login } from './components/Login';
import { GameSelector } from './components/GameSelector';
import { LaserTag } from './components/game/LaserTag';
import { Calendar, MapPin, Zap, Users, Sparkles, Radio, ShieldCheck } from 'lucide-react';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [nickname, setNickname] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [gameMode, setGameMode] = useState<'pvp' | 'pve' | 'team' | 'speed' | null>(null);
  const [difficulty, setDifficulty] = useState<'easy' | 'normal' | 'hard' | 'nightmare'>('normal');

  if (isAuthenticated && gameMode) {
    return <LaserTag nickname={nickname} isAdmin={isAdmin} gameMode={gameMode} difficulty={difficulty} />;
  }

  if (isAuthenticated && !gameMode) {
    return <GameSelector 
      onSelectMode={(mode, diff) => {
        setGameMode(mode);
        if (diff) setDifficulty(diff);
      }} 
      nickname={nickname} 
    />;
  }

  return (
    <div className="min-h-screen text-white font-sans selection:bg-cyan-500/30">
      <DynamicBackground />
      
      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4 py-20 overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="z-10 text-center w-full"
        >
          <LogoGenerator />
          
          <motion.h1 
            className="mt-12 text-6xl sm:text-8xl md:text-9xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-cyan-400 bg-[length:200%_auto] animate-[gradient_8s_linear_infinite] drop-shadow-[0_0_30px_rgba(255,0,255,0.4)]"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            MAPLE
            <br />
            INFINITY
          </motion.h1>
          
          <motion.p 
            className="mt-6 text-xl sm:text-2xl text-cyan-100 font-medium tracking-wide max-w-2xl mx-auto drop-shadow-[0_0_10px_rgba(0,255,255,0.5)]"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.8 }}
          >
            The Ultimate Digital Convergence Event
          </motion.p>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.8 }}
            className="mt-12"
          >
            <p className="text-sm uppercase tracking-widest text-fuchsia-400 font-bold mb-4 drop-shadow-[0_0_10px_rgba(255,0,255,0.5)]">
              Event Activates: January 3, 2027
            </p>
            <Countdown />
          </motion.div>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div 
          className="absolute bottom-4 sm:bottom-10 left-1/2 -translate-x-1/2 hidden sm:flex flex-col items-center gap-2 text-cyan-500/50"
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <span className="text-xs uppercase tracking-widest font-bold">Scroll to Discover</span>
          <div className="w-px h-12 bg-gradient-to-b from-cyan-500/50 to-transparent" />
        </motion.div>
      </section>

      {/* About Section */}
      <section className="relative py-32 px-4 max-w-7xl mx-auto">
        <motion.div 
          className="text-center max-w-4xl mx-auto"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-4xl sm:text-6xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-cyan-400 drop-shadow-[0_0_20px_rgba(255,0,255,0.3)]">
            Beyond the Horizon
          </h2>
          <p className="text-xl sm:text-2xl text-gray-300 leading-relaxed font-light">
            Maple Infinity is not just an event; it's a digital awakening. Hosted entirely in the virtual realm, we bring together the brightest minds in technology, art, and cybernetics. Prepare to experience the next evolution of the web on <strong className="text-cyan-400 font-bold drop-shadow-[0_0_10px_rgba(0,255,255,0.5)]">January 3rd, 2027</strong>.
          </p>
        </motion.div>
      </section>

      {/* Features Grid */}
      <section className="relative py-32 px-4 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <FeatureCard 
            title="Virtual Keynotes" 
            description="Immersive 3D presentations from industry leaders, streamed directly to your neural interface."
            icon={<Radio className="w-8 h-8" />}
            color="cyan"
            delay={0.1}
          />
          <FeatureCard 
            title="Cyber Networking" 
            description="Connect with millions of attendees in our neon-lit virtual lobbies and private encrypted channels."
            icon={<Users className="w-8 h-8" />}
            color="fuchsia"
            delay={0.2}
          />
          <FeatureCard 
            title="Next-Gen Tech" 
            description="Get exclusive early access to quantum computing APIs and neural-link developer kits."
            icon={<Zap className="w-8 h-8" />}
            color="yellow"
            delay={0.3}
          />
          <FeatureCard 
            title="Digital Art Galleries" 
            description="Explore mind-bending AI-generated artworks and interactive installations in zero gravity."
            icon={<Sparkles className="w-8 h-8" />}
            color="green"
            delay={0.4}
          />
          <FeatureCard 
            title="Global Access" 
            description="No borders, no travel. Access the entire event from anywhere on Earth with a standard connection."
            icon={<MapPin className="w-8 h-8" />}
            color="cyan"
            delay={0.5}
          />
          <FeatureCard 
            title="Save the Date" 
            description="Mark your calendars for January 3rd, 2027. The future waits for no one."
            icon={<Calendar className="w-8 h-8" />}
            color="fuchsia"
            delay={0.6}
          />
        </div>
      </section>

      {/* Portal Access Section */}
      <section className="relative py-32 px-4 max-w-4xl mx-auto text-center">
        <div className="p-1 rounded-3xl bg-gradient-to-r from-cyan-500/30 via-fuchsia-500/30 to-cyan-500/30">
          <div className="bg-black/80 backdrop-blur-xl rounded-[23px] p-8 sm:p-12 border border-white/5">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-white">Authorized Personnel Only</h2>
              <p className="text-gray-400 mb-8 max-w-xl mx-auto">
                Access the secure Maple Infinity portal to manage your event itinerary, neural-link settings, and VIP access passes.
              </p>
              <button
                onClick={() => setIsLoginOpen(true)}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white font-bold uppercase tracking-widest hover:shadow-[0_0_30px_rgba(0,255,255,0.4)] transition-all duration-300 hover:scale-[1.05] active:scale-[0.95]"
              >
                Open Sign In Portal
              </button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-12 border-t border-white/10 text-center text-gray-500 bg-black/50 backdrop-blur-lg">
        <p className="font-mono text-sm tracking-widest uppercase">
          &copy; 2027 Maple Infinity. All rights reserved.
        </p>
      </footer>

      <AnimatePresence>
        {isLoginOpen && (
          <Login 
            onLogin={(name, admin) => {
              setNickname(name);
              setIsAdmin(admin);
              setIsAuthenticated(true);
              setIsLoginOpen(false);
            }} 
            onClose={() => setIsLoginOpen(false)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
