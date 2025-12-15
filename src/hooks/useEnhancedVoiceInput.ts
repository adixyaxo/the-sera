import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Type declarations for Web Speech API
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onend: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onerror: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionErrorEvent) => void) | null;
  onresult: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionEvent) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

function getSpeechRecognition(): SpeechRecognitionConstructor | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
}

interface UseEnhancedVoiceInputOptions {
  onTranscript?: (text: string) => void;
  onInterimTranscript?: (text: string) => void;
  onAIResponse?: (response: any) => void;
  autoProcess?: boolean; // Auto-send to AI after speech ends
  continuous?: boolean;
  language?: string;
}

export interface VoiceCommand {
  type: 'create_task' | 'create_note' | 'create_event' | 'search' | 'navigate' | 'general';
  data: Record<string, any>;
  confidence: number;
  originalText: string;
}

export function useEnhancedVoiceInput(options: UseEnhancedVoiceInputOptions = {}) {
  const { 
    onTranscript, 
    onInterimTranscript,
    onAIResponse,
    autoProcess = true,
    continuous = false,
    language = 'en-US' 
  } = options;
  
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [lastCommand, setLastCommand] = useState<VoiceCommand | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const finalTranscriptRef = useRef('');

  // Process voice command with Lovable AI
  const processVoiceCommand = useCallback(async (text: string): Promise<VoiceCommand | null> => {
    if (!text.trim()) return null;
    
    setIsProcessing(true);
    setError(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('voice-processor', {
        body: { transcript: text },
      });

      if (fnError) throw fnError;

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to process voice command');
      }

      const command: VoiceCommand = {
        type: data.command.type,
        data: data.command.data,
        confidence: data.command.confidence,
        originalText: text,
      };

      setLastCommand(command);
      onAIResponse?.(data);
      
      return command;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process voice';
      setError(errorMessage);
      console.error('Voice processing error:', err);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [onAIResponse]);

  useEffect(() => {
    const SpeechRecognitionAPI = getSpeechRecognition();
    setIsSupported(!!SpeechRecognitionAPI);

    if (SpeechRecognitionAPI) {
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = continuous;
      recognition.interimResults = true;
      recognition.lang = language;

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
        finalTranscriptRef.current = '';
      };

      recognition.onend = () => {
        setIsListening(false);
        
        // Auto-process when speech ends
        if (autoProcess && finalTranscriptRef.current.trim()) {
          processVoiceCommand(finalTranscriptRef.current);
        }
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        
        if (event.error === 'not-allowed') {
          setError('Microphone access denied');
          toast.error('Microphone access denied. Please enable microphone permissions.');
        } else if (event.error === 'no-speech') {
          setError('No speech detected');
          toast.error('No speech detected. Please try again.');
        } else if (event.error !== 'aborted') {
          setError(event.error);
          toast.error(`Voice input error: ${event.error}`);
        }
      };

      recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimText = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interimText += result[0].transcript;
          }
        }

        if (finalTranscript) {
          finalTranscriptRef.current = finalTranscript;
          setTranscript(finalTranscript);
          onTranscript?.(finalTranscript);
        }
        
        if (interimText) {
          setInterimTranscript(interimText);
          onInterimTranscript?.(interimText);
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [continuous, language, onTranscript, onInterimTranscript, autoProcess, processVoiceCommand]);

  const startListening = useCallback(async () => {
    if (!recognitionRef.current) {
      toast.error('Voice input is not supported in this browser.');
      return;
    }

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      setTranscript('');
      setInterimTranscript('');
      setLastCommand(null);
      setError(null);
      recognitionRef.current.start();
    } catch (error) {
      console.error('Microphone access error:', error);
      toast.error('Could not access microphone. Please check permissions.');
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Manual process trigger
  const processCurrentTranscript = useCallback(async () => {
    if (transcript.trim()) {
      return processVoiceCommand(transcript);
    }
    return null;
  }, [transcript, processVoiceCommand]);

  return {
    isListening,
    isProcessing,
    isSupported,
    transcript,
    interimTranscript,
    lastCommand,
    error,
    startListening,
    stopListening,
    toggleListening,
    processVoiceCommand,
    processCurrentTranscript,
  };
}
