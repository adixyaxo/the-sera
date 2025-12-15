import { motion } from 'framer-motion';

export const FloatingBackground = () => {
  const words = [
    { text: 'SERA', top: '5%', left: '8%', size: '10rem', delay: 0 },
    { text: 'AI POWERED', top: '15%', right: '12%', size: '7rem', delay: 0.5 },
    { text: 'ROUTINES', top: '30%', left: '20%', size: '8rem', delay: 1 },
    { text: 'FOCUS', top: '45%', right: '25%', size: '6rem', delay: 1.5 },
    { text: 'CLARITY', top: '55%', left: '5%', size: '7rem', delay: 2 },
    { text: 'DISCIPLINE', top: '65%', right: '10%', size: '8rem', delay: 0.3 },
    { text: 'GROWTH', top: '75%', left: '30%', size: '6rem', delay: 0.8 },
    { text: 'SYSTEMS', top: '85%', right: '20%', size: '7rem', delay: 1.2 },
    { text: 'SERA', top: '40%', left: '45%', size: '9rem', delay: 1.8 },
  ];

  return (
    <div className="fixed inset-0 pointer-events-none select-none overflow-hidden z-0">
      {/* Floating words layer - behind blur */}
      <div className="absolute inset-0 opacity-[0.04]">
        {words.map((word, index) => (
          <motion.div
            key={index}
            className="absolute font-light text-foreground whitespace-nowrap"
            style={{
              top: word.top,
              left: word.left,
              right: word.right,
              fontSize: word.size,
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ 
              opacity: 1, 
              y: [0, -15, 0],
            }}
            transition={{
              opacity: { duration: 1, delay: word.delay },
              y: {
                duration: 6,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: word.delay,
              }
            }}
          >
            {word.text}
          </motion.div>
        ))}
      </div>

      {/* Blur wall overlay - creates frosted glass effect */}
      <div className="absolute inset-0 backdrop-blur-xl bg-background/60" />

      {/* Gradient orbs for depth */}
      <motion.div
        className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full opacity-20"
        style={{
          background: 'radial-gradient(circle, hsl(var(--primary) / 0.3) 0%, transparent 70%)',
        }}
        animate={{
          scale: [1, 1.2, 1],
          x: [0, 50, 0],
          y: [0, -30, 0],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      <motion.div
        className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full opacity-15"
        style={{
          background: 'radial-gradient(circle, hsl(var(--accent) / 0.4) 0%, transparent 70%)',
        }}
        animate={{
          scale: [1, 1.3, 1],
          x: [0, -40, 0],
          y: [0, 40, 0],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 2,
        }}
      />

      {/* Subtle grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(to right, hsl(var(--foreground)) 1px, transparent 1px),
            linear-gradient(to bottom, hsl(var(--foreground)) 1px, transparent 1px)
          `,
          backgroundSize: '100px 100px',
        }}
      />
    </div>
  );
};
