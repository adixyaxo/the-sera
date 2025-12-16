import { useState, useRef, useCallback, useEffect } from 'react';
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
  maxAlternatives: number;
  onstart: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onend: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onerror: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionErrorEvent) => void) | null;
  onresult: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionEvent) => void) | null;
  onspeechstart: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onspeechend: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onaudiostart: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onaudioend: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
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

export type VoiceInputStatus = 
  | 'idle' 
  | 'requesting_permission' 
  | 'listening' 
  | 'processing' 
  | 'error';

export type VoiceInputError = 
  | 'not_supported' 
  | 'permission_denied' 
  | 'no_speech' 
  | 'network_error' 
  | 'aborted' 
  | 'unknown';

interface UseVoiceInputOptions {
  onTranscript?: (text: string) => void;
  onInterimTranscript?: (text: string) => void;
  onStatusChange?: (status: VoiceInputStatus) => void;
  onError?: (error: VoiceInputError, message: string) => void;
  continuous?: boolean;
  language?: string;
  autoStopOnSilence?: boolean;
  silenceTimeout?: number; // ms before auto-stopping on silence
}

export function useVoiceInput(options: UseVoiceInputOptions = {}) {
  const { 
    onTranscript, 
    onInterimTranscript, 
    onStatusChange,
    onError,
    continuous = false,
    language = 'en-US',
    autoStopOnSilence = true,
    silenceTimeout = 3000, // 3 seconds default
  } = options;
  
  const [status, setStatus] = useState<VoiceInputStatus>('idle');
  const [isSupported, setIsSupported] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [errorType, setErrorType] = useState<VoiceInputError | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const [audioLevel, setAudioLevel] = useState(0);
  
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const hasReceivedFinalResult = useRef(false);
  const silenceTimerRef = useRef<number | null>(null);
  const lastSpeechTimeRef = useRef<number>(Date.now());
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const updateStatus = useCallback((newStatus: VoiceInputStatus) => {
    setStatus(newStatus);
    onStatusChange?.(newStatus);
  }, [onStatusChange]);

  const handleError = useCallback((error: VoiceInputError, message: string) => {
    setErrorType(error);
    updateStatus('error');
    onError?.(error, message);
  }, [onError, updateStatus]);

  // Check microphone permission
  const checkPermission = useCallback(async (): Promise<boolean> => {
    try {
      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      if (result.state === 'granted') {
        setPermissionStatus('granted');
        return true;
      } else if (result.state === 'denied') {
        setPermissionStatus('denied');
        return false;
      }
      return true; // prompt state - will ask
    } catch {
      return true; // Permissions API not supported, will try anyway
    }
  }, []);

  // Request microphone access
  const requestMicrophoneAccess = useCallback(async (): Promise<boolean> => {
    updateStatus('requesting_permission');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Set up audio level monitoring
      try {
        audioContextRef.current = new AudioContext();
        analyserRef.current = audioContextRef.current.createAnalyser();
        const source = audioContextRef.current.createMediaStreamSource(stream);
        source.connect(analyserRef.current);
        analyserRef.current.fftSize = 256;
      } catch {
        // Audio level monitoring not critical
      }
      
      setPermissionStatus('granted');
      return true;
    } catch (error) {
      console.error('Microphone access error:', error);
      setPermissionStatus('denied');
      handleError('permission_denied', 'Microphone access was denied. Please enable microphone permissions in your browser settings.');
      return false;
    }
  }, [handleError, updateStatus]);

  // Monitor audio level for visual feedback
  const startAudioLevelMonitoring = useCallback(() => {
    if (!analyserRef.current) return;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    
    const updateLevel = () => {
      if (!analyserRef.current || status !== 'listening') return;
      
      analyserRef.current.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      setAudioLevel(Math.min(100, average * 1.5)); // Normalize to 0-100
      
      animationFrameRef.current = requestAnimationFrame(updateLevel);
    };
    
    updateLevel();
  }, [status]);

  const stopAudioLevelMonitoring = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setAudioLevel(0);
  }, []);

  // Initialize recognition
  useEffect(() => {
    const SpeechRecognitionAPI = getSpeechRecognition();
    setIsSupported(!!SpeechRecognitionAPI);

    if (SpeechRecognitionAPI) {
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = continuous;
      recognition.interimResults = true;
      recognition.lang = language;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        updateStatus('listening');
        hasReceivedFinalResult.current = false;
        lastSpeechTimeRef.current = Date.now();
        startAudioLevelMonitoring();
      };

      recognition.onspeechstart = () => {
        lastSpeechTimeRef.current = Date.now();
        if (silenceTimerRef.current) {
          window.clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
      };

      recognition.onspeechend = () => {
        // Start silence timer
        if (autoStopOnSilence && !continuous) {
          silenceTimerRef.current = window.setTimeout(() => {
            if (!hasReceivedFinalResult.current) {
              recognition.stop();
            }
          }, silenceTimeout);
        }
      };

      recognition.onend = () => {
        updateStatus('idle');
        setInterimTranscript('');
        stopAudioLevelMonitoring();
        
        if (silenceTimerRef.current) {
          window.clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
      };

      recognition.onerror = (event) => {
        stopAudioLevelMonitoring();
        
        const errorMessages: Record<string, { type: VoiceInputError; message: string }> = {
          'not-allowed': { 
            type: 'permission_denied', 
            message: 'Microphone access denied. Please enable permissions in browser settings.' 
          },
          'no-speech': { 
            type: 'no_speech', 
            message: 'No speech detected. Please try speaking louder or closer to the microphone.' 
          },
          'network': { 
            type: 'network_error', 
            message: 'Network error occurred. Please check your internet connection.' 
          },
          'aborted': { 
            type: 'aborted', 
            message: 'Voice input was cancelled.' 
          },
        };

        const errorInfo = errorMessages[event.error] || { 
          type: 'unknown' as VoiceInputError, 
          message: `Voice input error: ${event.error}` 
        };
        
        // Don't show error toast for aborted (user-initiated stop)
        if (event.error !== 'aborted') {
          handleError(errorInfo.type, errorInfo.message);
          if (event.error !== 'no-speech') {
            toast.error(errorInfo.message);
          }
        }
        
        updateStatus('idle');
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
          hasReceivedFinalResult.current = true;
          setTranscript(finalTranscript);
          setInterimTranscript('');
          updateStatus('processing');
          onTranscript?.(finalTranscript);
          
          // Auto-stop after receiving final result if not continuous
          if (autoStopOnSilence && !continuous) {
            setTimeout(() => {
              recognition.stop();
            }, 100);
          }
        }
        
        if (interimText) {
          setInterimTranscript(interimText);
          onInterimTranscript?.(interimText);
          lastSpeechTimeRef.current = Date.now();
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      stopAudioLevelMonitoring();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [continuous, language, onTranscript, onInterimTranscript, autoStopOnSilence, silenceTimeout, updateStatus, handleError, startAudioLevelMonitoring, stopAudioLevelMonitoring]);

  const startListening = useCallback(async () => {
    if (!recognitionRef.current) {
      handleError('not_supported', 'Voice input is not supported in this browser. Please use Chrome, Edge, or Safari.');
      toast.error('Voice input is not supported in this browser.');
      return false;
    }

    // Clear previous state
    setTranscript('');
    setInterimTranscript('');
    setErrorType(null);
    hasReceivedFinalResult.current = false;

    // Check/request permission
    const hasPermission = await requestMicrophoneAccess();
    if (!hasPermission) {
      return false;
    }

    try {
      recognitionRef.current.start();
      return true;
    } catch (error) {
      console.error('Failed to start recognition:', error);
      handleError('unknown', 'Failed to start voice input. Please try again.');
      return false;
    }
  }, [handleError, requestMicrophoneAccess]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && status === 'listening') {
      recognitionRef.current.stop();
    }
    stopAudioLevelMonitoring();
  }, [status, stopAudioLevelMonitoring]);

  const toggleListening = useCallback(async () => {
    if (status === 'listening') {
      stopListening();
      return true;
    } else {
      return await startListening();
    }
  }, [status, startListening, stopListening]);

  const resetState = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setErrorType(null);
    updateStatus('idle');
  }, [updateStatus]);

  return {
    // State
    status,
    isListening: status === 'listening',
    isSupported,
    transcript,
    interimTranscript,
    errorType,
    permissionStatus,
    audioLevel,
    
    // Actions
    startListening,
    stopListening,
    toggleListening,
    resetState,
    checkPermission,
  };
}
