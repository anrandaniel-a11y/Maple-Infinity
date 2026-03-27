import { useState, useEffect } from 'react';
import { differenceInDays, differenceInHours, differenceInMinutes, differenceInSeconds } from 'date-fns';

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
    <div className="flex flex-col items-center">
      <div className={`w-16 h-16 sm:w-24 sm:h-24 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 flex items-center justify-center ${shadow}`}>
        <span className={`text-2xl sm:text-4xl font-mono font-bold ${color}`}>
          {value.toString().padStart(2, '0')}
        </span>
      </div>
      <span className="text-[10px] sm:text-xs text-gray-400 mt-3 uppercase tracking-[0.2em] font-medium">{label}</span>
    </div>
  );
}
