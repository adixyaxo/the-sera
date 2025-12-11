import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SeraChat } from './SeraChat';

export function SeraFAB() {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <>
      <AnimatePresence>
        <SeraChat isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
      </AnimatePresence>

      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="fixed bottom-4 right-4 z-50"
      >
        <Button
          size="lg"
          className="w-14 h-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 relative overflow-hidden group"
          onClick={() => setIsChatOpen(!isChatOpen)}
        >
          <motion.div
            animate={isChatOpen ? { rotate: 180 } : { rotate: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Sparkles className="w-6 h-6" />
          </motion.div>
          
          {/* Glow effect */}
          <div className="absolute inset-0 rounded-full bg-primary/50 blur-xl opacity-0 group-hover:opacity-50 transition-opacity" />
        </Button>
      </motion.div>
    </>
  );
}
