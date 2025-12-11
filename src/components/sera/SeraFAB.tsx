import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Mic, X, MessageSquare, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SeraChat } from './SeraChat';
import { SeraQuickVoice } from './SeraQuickVoice';
import { cn } from '@/lib/utils';

type SeraMode = 'closed' | 'chat' | 'voice' | 'menu';

export function SeraFAB() {
  const [mode, setMode] = useState<SeraMode>('closed');

  const handleFABClick = useCallback(() => {
    if (mode === 'closed') {
      setMode('menu');
    } else {
      setMode('closed');
    }
  }, [mode]);

  const openChat = useCallback(() => setMode('chat'), []);
  const openVoice = useCallback(() => setMode('voice'), []);
  const close = useCallback(() => setMode('closed'), []);

  return (
    <>
      {/* Chat Panel */}
      <AnimatePresence>
        {mode === 'chat' && (
          <SeraChat isOpen={true} onClose={close} />
        )}
      </AnimatePresence>

      {/* Quick Voice Panel */}
      <AnimatePresence>
        {mode === 'voice' && (
          <SeraQuickVoice onClose={close} />
        )}
      </AnimatePresence>

      {/* Quick Action Menu */}
      <AnimatePresence>
        {mode === 'menu' && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            className="fixed bottom-20 right-4 z-50 flex flex-col gap-2"
          >
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Button
                onClick={openChat}
                className="w-full justify-start gap-3 bg-background/95 backdrop-blur-xl border border-border/50 text-foreground hover:bg-muted/50 shadow-lg"
                variant="outline"
              >
                <MessageSquare className="w-4 h-4 text-primary" />
                <span>Open Chat</span>
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
            >
              <Button
                onClick={openVoice}
                className="w-full justify-start gap-3 bg-background/95 backdrop-blur-xl border border-border/50 text-foreground hover:bg-muted/50 shadow-lg"
                variant="outline"
              >
                <Mic className="w-4 h-4 text-green-400" />
                <span>Voice Capture</span>
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Button
                onClick={close}
                className="w-full justify-start gap-3 bg-background/95 backdrop-blur-xl border border-border/50 text-foreground hover:bg-muted/50 shadow-lg"
                variant="outline"
              >
                <X className="w-4 h-4 text-muted-foreground" />
                <span>Cancel</span>
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB Button */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="fixed bottom-4 right-4 z-50"
      >
        <Button
          size="lg"
          className={cn(
            "w-14 h-14 rounded-full shadow-lg relative overflow-hidden group transition-all duration-300",
            mode !== 'closed' 
              ? 'bg-muted hover:bg-muted/80' 
              : 'bg-primary hover:bg-primary/90'
          )}
          onClick={handleFABClick}
        >
          <motion.div
            animate={{ 
              rotate: mode !== 'closed' ? 45 : 0,
              scale: mode !== 'closed' ? 0.9 : 1
            }}
            transition={{ duration: 0.2 }}
          >
            {mode !== 'closed' ? (
              <X className="w-6 h-6" />
            ) : (
              <Sparkles className="w-6 h-6" />
            )}
          </motion.div>
          
          {/* Glow effect */}
          <div className={cn(
            "absolute inset-0 rounded-full blur-xl opacity-0 group-hover:opacity-50 transition-opacity",
            mode !== 'closed' ? 'bg-muted' : 'bg-primary/50'
          )} />
          
          {/* Pulse effect when closed */}
          {mode === 'closed' && (
            <motion.div
              className="absolute inset-0 rounded-full bg-primary"
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          )}
        </Button>
      </motion.div>
    </>
  );
}
