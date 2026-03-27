import { useEffect, useState } from 'react';
import { motion } from 'motion/react';

export function DynamicBackground() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const updateMousePosition = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', updateMousePosition);

    return () => {
      window.removeEventListener('mousemove', updateMousePosition);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden bg-[#050505]">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_0%,#000_70%,transparent_100%)]"></div>
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none"
        animate={{
          x: mousePosition.x - 300,
          y: mousePosition.y - 300,
        }}
        transition={{ type: 'spring', stiffness: 40, damping: 20, mass: 0.5 }}
      />
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full bg-fuchsia-500/10 blur-[120px] pointer-events-none"
        animate={{
          x: mousePosition.x - 250,
          y: mousePosition.y - 250,
        }}
        transition={{ type: 'spring', stiffness: 30, damping: 25, mass: 0.8 }}
      />
    </div>
  );
}
