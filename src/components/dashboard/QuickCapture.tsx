import { useState, useRef } from 'react';
import { Mic, MicOff, Send, Sparkles } from 'lucide-react';
import { useSeraAssistant } from '@/hooks/useSeraAssistant';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { cn } from '@/lib/utils';

interface QuickCaptureProps {
  onNewCards?: (cards: any[]) => void;
}

export const QuickCapture = ({ onNewCards }: QuickCaptureProps) => {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { sendMessage, executeAction, isLoading } = useSeraAssistant();

  // Voice input
  const { 
    isListening, 
    isSupported: voiceSupported,
    toggleListening,
    stopListening
  } = useVoiceInput({
    onTranscript: (transcript) => {
      setText(transcript);
      // Auto-submit voice input
      handleSubmitText(transcript);
    },
    onInterimTranscript: (interim) => {
      setText(interim);
    },
  });

  const handleSubmitText = async (inputText: string) => {
    if (!inputText.trim() || isLoading) return;

    try {
      const response = await sendMessage(inputText);
      
      if (response?.action && 
          response.action.intent !== 'general_chat' && 
          response.action.data) {
        // Auto-execute the action
        const result = await executeAction(response.action.intent, response.action.data);
        if (result) {
          onNewCards?.([result.task]);
        }
      }
      
      setText('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (error) {
      console.error('Error capturing text:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleSubmitText(text);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitText(text);
    }
  };

  return (
    <div className="animate-fade-in glass p-6 rounded-3xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-medium">Quick Capture</h2>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="text-xs">Powered by SERA AI</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder={isListening 
              ? "Listening... speak now" 
              : "What would you like to do? (e.g., 'Add a task to review notes tomorrow')"
            }
            className={cn(
              "w-full bg-muted/30 border border-border/50 rounded-2xl px-4 py-3 pr-24 resize-none focus:outline-none focus:border-primary/50 min-h-[60px] max-h-[120px] transition-colors",
              isListening && "border-red-400/50 bg-red-500/5"
            )}
            rows={1}
            disabled={isLoading}
          />
          
          <div className="absolute right-3 top-3 flex gap-2">
            {voiceSupported && (
              <button
                type="button"
                onClick={toggleListening}
                disabled={isLoading}
                className={cn(
                  "p-2 rounded-xl transition-all",
                  isListening 
                    ? "bg-red-400/20 text-red-400 animate-pulse" 
                    : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                {isListening ? <MicOff size={16} /> : <Mic size={16} />}
              </button>
            )}
            <button
              type="submit"
              disabled={!text.trim() || isLoading}
              className="p-2 rounded-xl bg-primary/20 text-primary hover:bg-primary/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <Send size={16} />
            </button>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            {isLoading ? (
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                SERA is processing...
              </span>
            ) : isListening ? (
              <span className="text-red-400">🎤 Listening...</span>
            ) : (
              'Press Enter to send or use voice input'
            )}
          </div>
        </div>
      </form>
    </div>
  );
};
