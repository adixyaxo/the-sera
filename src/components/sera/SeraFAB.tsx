import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Sparkles, X, Loader2, Play, Mic, MicOff, Volume2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSeraAssistant } from '@/hooks/useSeraAssistant';
import { useVoiceInput, VoiceInputStatus } from '@/hooks/useVoiceInput';
import { cn } from '@/lib/utils';

type SeraMode = 'closed' | 'chat';

export function SeraFAB() {
  const [mode, setMode] = useState<SeraMode>('closed');
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { messages, isLoading, sendMessage, executeAction, clearMessages } = useSeraAssistant();

  // Enhanced voice input with status tracking
  const { 
    status: voiceStatus,
    isListening, 
    isSupported: voiceSupported,
    interimTranscript,
    audioLevel,
    permissionStatus,
    errorType,
    startListening,
    stopListening,
    resetState
  } = useVoiceInput({
    autoStopOnSilence: true,
    silenceTimeout: 2500,
    onTranscript: (text) => {
      if (text.trim()) {
        handleSend(text);
      }
    },
    onInterimTranscript: (text) => {
      setInput(text);
    },
    onStatusChange: (status) => {
      console.log('Voice status:', status);
    },
    onError: (error, message) => {
      console.error('Voice error:', error, message);
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (mode === 'chat' && inputRef.current && !isListening) {
      inputRef.current.focus();
    }
  }, [mode, isListening]);

  // Stop listening when panel closes
  useEffect(() => {
    if (mode === 'closed' && isListening) {
      stopListening();
    }
  }, [mode, isListening, stopListening]);

  const handleFABClick = useCallback(() => {
    if (mode === 'closed') {
      setMode('chat');
    } else {
      setMode('closed');
    }
  }, [mode]);

  const close = useCallback(() => {
    setMode('closed');
    if (isListening) stopListening();
  }, [isListening, stopListening]);

  const handleSend = async (text: string) => {
    if (!text.trim() || isLoading) return;
    setInput('');
    
    const response = await sendMessage(text);
    
    // Auto-execute high-confidence actions
    if (response?.action && 
        response.action.intent !== 'general_chat' && 
        response.action.data &&
        response.action.confidence && 
        response.action.confidence >= 0.9) {
      await executeAction(response.action.intent, response.action.data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleSend(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(input);
    }
  };

  const handleVoiceToggle = async () => {
    if (isListening) {
      stopListening();
    } else {
      setInput('');
      resetState();
      await startListening();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px';
    }
  };

  const handleExecuteAction = async (intent: string, data: Record<string, any>) => {
    await executeAction(intent, data);
  };

  const getVoiceStatusMessage = (status: VoiceInputStatus): string => {
    switch (status) {
      case 'requesting_permission': return 'Requesting microphone access...';
      case 'listening': return interimTranscript || 'Speak now...';
      case 'processing': return 'Processing...';
      case 'error': return 'Voice input error';
      default: return 'Smart Assistant';
    }
  };

  const getVoiceErrorMessage = (): string | null => {
    if (errorType === 'permission_denied') {
      return 'Microphone access denied. Click to retry.';
    }
    if (errorType === 'no_speech') {
      return 'No speech detected. Try again.';
    }
    if (errorType === 'not_supported') {
      return 'Voice not supported in this browser.';
    }
    return null;
  };

  return (
    <>
      {/* Chat Panel */}
      <AnimatePresence>
        {mode === 'chat' && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-20 right-4 z-50 w-[380px] sm:w-[420px] h-[550px] bg-background/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border/50 bg-primary/5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">SERA</h3>
                  <p className="text-xs text-muted-foreground">
                    {voiceStatus === 'listening' ? (
                      <span className="text-primary flex items-center gap-1">
                        <Volume2 className="w-3 h-3 animate-pulse" /> Listening...
                      </span>
                    ) : voiceStatus === 'requesting_permission' ? (
                      <span className="text-yellow-500 flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" /> Requesting mic...
                      </span>
                    ) : voiceStatus === 'error' ? (
                      <span className="text-destructive flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Error
                      </span>
                    ) : isLoading ? (
                      'Processing...'
                    ) : (
                      'Smart Assistant'
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => clearMessages()}
                  className="text-xs h-7 px-2"
                >
                  Clear
                </Button>
                <Button variant="ghost" size="icon" onClick={close}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              <div className="space-y-4">
                {messages.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-sm">Hi! I'm SERA, your smart assistant.</p>
                    <p className="text-xs mt-2 text-muted-foreground">
                      Try: "Add a task to finish the report by Friday"
                    </p>
                    {voiceSupported && (
                      <p className="text-xs mt-3 text-primary/80">
                        <Mic className="w-3 h-3 inline mr-1" />
                        Click the mic to use voice input
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
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0">
                          <Bot className="w-3 h-3 text-white" />
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
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                      <Bot className="w-3 h-3 text-white" />
                    </div>
                    <div className="bg-muted/50 rounded-2xl px-4 py-2">
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    </div>
                  </motion.div>
                )}
              </div>
            </ScrollArea>

            {/* Voice indicator with waveform */}
            <AnimatePresence>
              {(voiceStatus === 'listening' || voiceStatus === 'requesting_permission') && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-4 py-3 bg-primary/10 border-t border-primary/20"
                >
                  <div className="flex items-center justify-center gap-3">
                    {/* Animated waveform based on audio level */}
                    <div className="flex gap-1 items-center h-8">
                      {[...Array(7)].map((_, i) => (
                        <motion.div
                          key={i}
                          className="w-1 bg-primary rounded-full"
                          animate={{
                            height: voiceStatus === 'listening' 
                              ? [8, Math.max(8, Math.min(32, audioLevel * 0.4 + Math.random() * 8)), 8]
                              : 8,
                          }}
                          transition={{
                            duration: 0.15,
                            repeat: Infinity,
                            delay: i * 0.05,
                          }}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-primary font-medium">
                      {getVoiceStatusMessage(voiceStatus)}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error message */}
            <AnimatePresence>
              {voiceStatus === 'error' && errorType && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-4 py-3 bg-destructive/10 border-t border-destructive/20"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {getVoiceErrorMessage()}
                    </span>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-6 text-xs"
                      onClick={() => {
                        resetState();
                        startListening();
                      }}
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Retry
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input Area */}
            <form onSubmit={handleSubmit} className="p-4 border-t border-border/50">
              <div className="flex gap-2 items-end">
                {voiceSupported && (
                  <Button
                    type="button"
                    size="icon"
                    variant={isListening ? 'default' : 'outline'}
                    onClick={handleVoiceToggle}
                    disabled={isLoading || voiceStatus === 'requesting_permission'}
                    className={cn(
                      'flex-shrink-0 h-10 w-10 transition-all relative overflow-hidden',
                      isListening && 'bg-red-500 hover:bg-red-600 border-red-500'
                    )}
                  >
                    {voiceStatus === 'requesting_permission' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isListening ? (
                      <MicOff className="w-4 h-4" />
                    ) : (
                      <Mic className="w-4 h-4" />
                    )}
                    
                    {/* Pulse ring when listening */}
                    {isListening && (
                      <motion.span
                        className="absolute inset-0 rounded-lg border-2 border-red-400"
                        animate={{ scale: [1, 1.3, 1], opacity: [0.8, 0, 0.8] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                    )}
                  </Button>
                )}
                <div className="flex-1 relative">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={handleTextareaChange}
                    onKeyDown={handleKeyDown}
                    placeholder={isListening ? 'Listening...' : 'Type or speak to SERA...'}
                    disabled={isLoading || isListening}
                    className={cn(
                      "w-full bg-muted/30 border border-border/50 rounded-xl px-4 py-2.5 pr-12 resize-none focus:outline-none focus:border-primary/50 min-h-[44px] max-h-[120px] text-sm transition-colors",
                      isListening && "border-primary/30 bg-primary/5"
                    )}
                    rows={1}
                  />
                  <Button 
                    type="submit" 
                    size="icon"
                    disabled={isLoading || !input.trim() || isListening}
                    className="absolute right-1.5 bottom-1.5 h-8 w-8"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2 text-center">
                Press Enter to send • Shift+Enter for new line
              </p>
            </form>
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
              : 'bg-gradient-to-br from-primary via-purple-500 to-accent hover:opacity-90'
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
              <Sparkles className="w-6 h-6 text-white" />
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
