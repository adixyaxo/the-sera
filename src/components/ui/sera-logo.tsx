import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SeraLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
  animated?: boolean;
}

export function SeraLogo({ 
  size = 'md', 
  showText = true, 
  className,
  animated = true 
}: SeraLogoProps) {
  const sizes = {
    sm: { icon: 24, text: 'text-lg', gap: 'gap-1.5' },
    md: { icon: 32, text: 'text-xl', gap: 'gap-2' },
    lg: { icon: 40, text: 'text-2xl', gap: 'gap-2.5' },
    xl: { icon: 56, text: 'text-4xl', gap: 'gap-3' },
  };

  const config = sizes[size];

  return (
    <motion.div 
      className={cn('flex items-center', config.gap, className)}
      initial={animated ? { opacity: 0, scale: 0.9 } : undefined}
      animate={animated ? { opacity: 1, scale: 1 } : undefined}
      transition={{ duration: 0.3 }}
    >
      {/* Logo Icon with Gradient */}
      <div 
        className="relative flex items-center justify-center rounded-xl overflow-hidden"
        style={{ 
          width: config.icon, 
          height: config.icon,
        }}
      >
        {/* Gradient background */}
        <div 
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(280 70% 50%) 50%, hsl(var(--accent)) 100%)',
          }}
        />
        
        {/* Animated shimmer effect */}
        {animated && (
          <motion.div
            className="absolute inset-0 opacity-60"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
            }}
            animate={{
              x: ['-100%', '100%'],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatDelay: 3,
              ease: 'easeInOut',
            }}
          />
        )}

        {/* S Letter */}
        <span 
          className="relative z-10 font-bold text-white"
          style={{ fontSize: config.icon * 0.5 }}
        >
          S
        </span>

        {/* Glow effect */}
        <div 
          className="absolute inset-0 blur-xl opacity-50"
          style={{
            background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(280 70% 50%) 50%, hsl(var(--accent)) 100%)',
          }}
        />
      </div>

      {/* Logo Text with Gradient */}
      {showText && (
        <span 
          className={cn(
            'font-bold tracking-tight',
            config.text,
          )}
          style={{
            background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(280 70% 60%) 50%, hsl(var(--accent)) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          SERA
        </span>
      )}
    </motion.div>
  );
}
