import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff, X, Loader2, Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { useSeraAssistant } from '@/hooks/useSeraAssistant';
import { cn } from '@/lib/utils';

interface SeraQuickVoiceProps {
  onClose: () => void;
}

export function SeraQuickVoice({ onClose }: SeraQuickVoiceProps) {
  const [status, setStatus] = useState<'idle' | 'listening' | 'processing' | 'success' | 'error'>('idle');
  const [displayText, setDisplayText] = useState('');
  const [responseText, setResponseText] = useState('');
  const { sendMessage, executeAction, isLoading } = useSeraAssistant();

  const { 
    isListening, 
    isSupported,
    interimTranscript,
    startListening,
    stopListening
  } = useVoiceInput({
    onTranscript: async (text) => {
      if (text.trim()) {
        setDisplayText(text);
        setStatus('processing');
        
        // Send to SERA
        const response = await sendMessage(text);
        
        if (response) {
          setResponseText(response.message);
          setStatus('success');
          
          // Auto-execute if there's an action with high confidence
          if (response.action && 
              response.action.intent !== 'general_chat' && 
              response.action.data &&
              response.action.confidence && 
              response.action.confidence > 0.8) {
            await executeAction(response.action.intent, response.action.data);
          }
          
          // Auto close after success
          setTimeout(() => {
            onClose();
          }, 2000);
        } else {
          setStatus('error');
        }
      }
    },
    onInterimTranscript: (text) => {
      setDisplayText(text);
    },
  });

  // Start listening immediately when opened
  useEffect(() => {
    if (isSupported) {
      startListening();
      setStatus('listening');
    }
  }, [isSupported, startListening]);

  // Update status based on listening state
  useEffect(() => {
    if (isListening && status === 'idle') {
      setStatus('listening');
    }
  }, [isListening, status]);

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else {
      setDisplayText('');
      setResponseText('');
      startListening();
      setStatus('listening');
    }
  };

  if (!isSupported) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-20 right-4 z-50 w-80 bg-background/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl p-6"
      >
        <p className="text-center text-muted-foreground">
          Voice input is not supported in this browser.
        </p>
        <Button variant="ghost" className="w-full mt-4" onClick={onClose}>
          Close
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className="fixed bottom-20 right-4 z-50 w-80 bg-background/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="font-medium text-sm">Quick Voice Capture</span>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="p-6 flex flex-col items-center">
        {/* Mic Button */}
        <motion.button
          onClick={handleMicClick}
          disabled={status === 'processing'}
          className={cn(
            "w-20 h-20 rounded-full flex items-center justify-center transition-all relative",
            status === 'listening' && "bg-red-500/20 text-red-400",
            status === 'processing' && "bg-primary/20 text-primary",
            status === 'success' && "bg-green-500/20 text-green-400",
            status === 'error' && "bg-red-500/20 text-red-400",
            status === 'idle' && "bg-primary/20 text-primary hover:bg-primary/30"
          )}
        >
          {/* Pulse animation for listening */}
          {status === 'listening' && (
            <>
              <motion.div
                className="absolute inset-0 rounded-full bg-red-500/30"
                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <motion.div
                className="absolute inset-0 rounded-full bg-red-500/20"
                animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
              />
            </>
          )}

          {status === 'listening' && <Mic className="w-8 h-8 relative z-10" />}
          {status === 'processing' && <Loader2 className="w-8 h-8 animate-spin" />}
          {status === 'success' && <Check className="w-8 h-8" />}
          {status === 'error' && <MicOff className="w-8 h-8" />}
          {status === 'idle' && <Mic className="w-8 h-8" />}
        </motion.button>

        {/* Status Text */}
        <p className={cn(
          "mt-4 text-sm font-medium",
          status === 'listening' && "text-red-400",
          status === 'processing' && "text-primary",
          status === 'success' && "text-green-400",
          status === 'error' && "text-red-400",
          status === 'idle' && "text-muted-foreground"
        )}>
          {status === 'listening' && 'Listening...'}
          {status === 'processing' && 'Processing...'}
          {status === 'success' && 'Done!'}
          {status === 'error' && 'Error occurred'}
          {status === 'idle' && 'Tap to speak'}
        </p>

        {/* Transcript Display */}
        {displayText && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 w-full"
          >
            <p className="text-sm text-center text-foreground bg-muted/30 rounded-lg px-4 py-3">
              "{displayText}"
            </p>
          </motion.div>
        )}

        {/* Response Display */}
        {responseText && status === 'success' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 w-full"
          >
            <p className="text-xs text-center text-muted-foreground">
              {responseText}
            </p>
          </motion.div>
        )}

        {/* Audio Visualizer for listening */}
        {status === 'listening' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-1 mt-4"
          >
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                className="w-1 bg-red-400 rounded-full"
                animate={{
                  height: [8, 24, 8],
                }}
                transition={{
                  duration: 0.5,
                  repeat: Infinity,
                  delay: i * 0.1,
                }}
              />
            ))}
          </motion.div>
        )}
      </div>

      {/* Hint */}
      <div className="px-4 pb-4">
        <p className="text-xs text-center text-muted-foreground">
          Say something like "Add a task to finish the report by Friday"
        </p>
      </div>
    </motion.div>
  );
}
