import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  action?: {
    intent: string;
    data?: Record<string, any>;
    confidence?: number;
  };
  timestamp: string;
}

interface SeraResponse {
  message: string;
  action?: {
    intent: string;
    data?: Record<string, any>;
    confidence?: number;
  };
}

export function useSeraAssistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = {
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('sera-assistant', {
        body: {
          message: text,
          conversationHistory: messages.slice(-10).map(m => ({
            role: m.role,
            content: m.content,
          })),
        },
      });

      if (fnError) throw fnError;

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to get response');
      }

      const response: SeraResponse = data.response;

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.message,
        action: response.action,
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMessage);
      toast.error(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [messages]);

  const executeAction = useCallback(async (intent: string, data: Record<string, any>) => {
    try {
      const { data: result, error } = await supabase.functions.invoke('sera-execute', {
        body: { intent, data },
      });

      if (error) throw error;

      if (!result?.success) {
        throw new Error(result?.error || 'Failed to execute action');
      }

      toast.success(`Action completed: ${result.result.action}`);
      return result.result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to execute action';
      toast.error(errorMessage);
      return null;
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    executeAction,
    clearMessages,
  };
}
