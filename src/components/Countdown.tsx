import { useState, useEffect } from 'react';
import { differenceInDays, differenceInHours, differenceInMinutes, differenceInSeconds } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

const TARGET_DATE = new Date('2027-01-03T00:00:00Z');

export function Countdown() {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      if (now >= TARGET_DATE) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      }

      return {
        days: differenceInDays(TARGET_DATE, now),
        hours: differenceInHours(TARGET_DATE, now) % 24,
        minutes: differenceInMinutes(TARGET_DATE, now) % 60,
        seconds: differenceInSeconds(TARGET_DATE, now) % 60,
      };
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex gap-3 sm:gap-6 justify-center mt-12">
      <TimeUnit value={timeLeft.days} label="Days" color="text-cyan-400" shadow="shadow-[0_0_20px_rgba(0,255,255,0.2)]" />
      <TimeUnit value={timeLeft.hours} label="Hours" color="text-fuchsia-400" shadow="shadow-[0_0_20px_rgba(255,0,255,0.2)]" />
      <TimeUnit value={timeLeft.minutes} label="Minutes" color="text-yellow-400" shadow="shadow-[0_0_20px_rgba(255,255,0,0.2)]" />
      <TimeUnit value={timeLeft.seconds} label="Seconds" color="text-green-400" shadow="shadow-[0_0_20px_rgba(0,255,0,0.2)]" />
    </div>
  );
}

function TimeUnit({ value, label, color, shadow }: { value: number; label: string; color: string; shadow: string }) {
  return (
    <motion.div 
      className="flex flex-col items-center"
      whileHover={{ scale: 1.05, y: -5 }}
      transition={{ type: "spring", stiffness: 400, damping: 10 }}
    >
      <div className={`w-16 h-16 sm:w-24 sm:h-24 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 flex items-center justify-center overflow-hidden ${shadow}`}>
        <AnimatePresence mode="popLayout">
          <motion.span 
            key={value}
            initial={{ y: 20, opacity: 0, scale: 0.5 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -20, opacity: 0, scale: 0.5 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className={`text-2xl sm:text-4xl font-display font-bold tracking-wider ${color}`}
          >
            {value.toString().padStart(2, '0')}
          </motion.span>
        </AnimatePresence>
      </div>
      <span className="text-[10px] sm:text-xs text-gray-400 mt-3 uppercase tracking-[0.2em] font-medium">{label}</span>
    </motion.div>
  );
}
