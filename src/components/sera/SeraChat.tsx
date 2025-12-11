import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Sparkles, X, Loader2, Play, Mic, MicOff, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSeraAssistant } from '@/hooks/useSeraAssistant';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { cn } from '@/lib/utils';

interface SeraChatProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SeraChat({ isOpen, onClose }: SeraChatProps) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { messages, isLoading, sendMessage, executeAction } = useSeraAssistant();

  // Voice input hook
  const { 
    isListening, 
    isSupported: voiceSupported,
    interimTranscript,
    toggleListening,
    stopListening
  } = useVoiceInput({
    onTranscript: (text) => {
      if (text.trim()) {
        setInput(text);
        // Auto-send after voice input
        handleVoiceSend(text);
      }
    },
    onInterimTranscript: (text) => {
      setInput(text);
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current && !isListening) {
      inputRef.current.focus();
    }
  }, [isOpen, isListening]);

  // Stop listening when chat closes
  useEffect(() => {
    if (!isOpen && isListening) {
      stopListening();
    }
  }, [isOpen, isListening, stopListening]);

  const handleVoiceSend = async (text: string) => {
    if (!text.trim() || isLoading) return;
    setInput('');
    await sendMessage(text);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const text = input;
    setInput('');
    await sendMessage(text);
  };

  const handleExecuteAction = async (intent: string, data: Record<string, any>) => {
    await executeAction(intent, data);
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className="fixed bottom-20 right-4 z-50 w-[380px] sm:w-96 h-[500px] bg-background/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50 bg-primary/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">SERA Assistant</h3>
            <p className="text-xs text-muted-foreground">
              {isListening ? (
                <span className="text-primary flex items-center gap-1">
                  <Volume2 className="w-3 h-3 animate-pulse" /> Listening...
                </span>
              ) : (
                'AI-powered task management'
              )}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">Hi! I'm SERA, your smart assistant.</p>
              <p className="text-xs mt-2">Try: "Add a task to review my notes tomorrow"</p>
              {voiceSupported && (
                <p className="text-xs mt-2 text-primary">
                  <Mic className="w-3 h-3 inline mr-1" />
                  Click the mic button to use voice input
                </p>
              )}
            </div>
          )}

          <AnimatePresence>
            {messages.map((message, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  'flex gap-2',
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {message.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-3 h-3 text-primary" />
                  </div>
                )}
                
                <div
                  className={cn(
                    'max-w-[80%] rounded-2xl px-4 py-2',
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/50'
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  
                  {/* Action button if available */}
                  {message.action && 
                   message.action.intent !== 'general_chat' && 
                   message.action.data && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="mt-2 h-7 text-xs"
                      onClick={() => handleExecuteAction(
                        message.action!.intent,
                        message.action!.data!
                      )}
                    >
                      <Play className="w-3 h-3 mr-1" />
                      Execute Action
                    </Button>
                  )}
                </div>

                {message.role === 'user' && (
                  <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                    <User className="w-3 h-3" />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-2"
            >
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                <Bot className="w-3 h-3 text-primary" />
              </div>
              <div className="bg-muted/50 rounded-2xl px-4 py-2">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            </motion.div>
          )}
        </div>
      </ScrollArea>

      {/* Voice indicator */}
      <AnimatePresence>
        {isListening && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 py-2 bg-primary/10 border-t border-primary/20"
          >
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-1 h-4 bg-primary rounded-full"
                    animate={{
                      scaleY: [1, 1.5, 1],
                    }}
                    transition={{
                      duration: 0.5,
                      repeat: Infinity,
                      delay: i * 0.1,
                    }}
                  />
                ))}
              </div>
              <span className="text-xs text-primary">
                {interimTranscript || 'Speak now...'}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-border/50">
        <div className="flex gap-2">
          {voiceSupported && (
            <Button
              type="button"
              size="icon"
              variant={isListening ? 'default' : 'outline'}
              onClick={toggleListening}
              disabled={isLoading}
              className={cn(
                'flex-shrink-0 transition-all',
                isListening && 'bg-red-500 hover:bg-red-600 border-red-500'
              )}
            >
              {isListening ? (
                <MicOff className="w-4 h-4" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </Button>
          )}
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isListening ? 'Listening...' : 'Ask SERA anything...'}
            disabled={isLoading || isListening}
            className="flex-1 bg-muted/30 border-border/50"
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim() || isListening}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </motion.div>
  );
}
