import Tilt from 'react-parallax-tilt';
import { motion } from 'motion/react';
import { ReactNode } from 'react';

interface FeatureCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  color: 'cyan' | 'fuchsia' | 'yellow' | 'green';
  delay?: number;
}

const colorMap = {
  cyan: 'from-cyan-500/20 to-cyan-500/5 border-cyan-500/30 shadow-[0_0_30px_rgba(0,255,255,0.1)] hover:shadow-[0_0_40px_rgba(0,255,255,0.3)] text-cyan-400',
  fuchsia: 'from-fuchsia-500/20 to-fuchsia-500/5 border-fuchsia-500/30 shadow-[0_0_30px_rgba(255,0,255,0.1)] hover:shadow-[0_0_40px_rgba(255,0,255,0.3)] text-fuchsia-400',
  yellow: 'from-yellow-500/20 to-yellow-500/5 border-yellow-500/30 shadow-[0_0_30px_rgba(255,255,0,0.1)] hover:shadow-[0_0_40px_rgba(255,255,0,0.3)] text-yellow-400',
  green: 'from-green-500/20 to-green-500/5 border-green-500/30 shadow-[0_0_30px_rgba(0,255,0,0.1)] hover:shadow-[0_0_40px_rgba(0,255,0,0.3)] text-green-400',
};

export function FeatureCard({ title, description, icon, color, delay = 0 }: FeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.6, delay }}
      className="h-full"
    >
      <Tilt
        glareEnable={true}
        glareMaxOpacity={0.3}
        glareColor="#ffffff"
        glarePosition="all"
        glareBorderRadius="24px"
        tiltMaxAngleX={10}
        tiltMaxAngleY={10}
        scale={1.02}
        transitionSpeed={2000}
        className="h-full"
      >
        <div className={`h-full p-8 rounded-3xl bg-gradient-to-br border backdrop-blur-md transition-all duration-500 ${colorMap[color]}`}>
          <div className="mb-6 inline-flex p-4 rounded-2xl bg-black/50 border border-white/10 shadow-inner">
            {icon}
          </div>
          <h3 className="text-2xl font-bold text-white mb-4 tracking-tight">{title}</h3>
          <p className="text-gray-300 leading-relaxed font-medium">{description}</p>
        </div>
      </Tilt>
    </motion.div>
  );
}
