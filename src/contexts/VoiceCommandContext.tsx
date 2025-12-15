import React, { createContext, useContext, useCallback, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEnhancedVoiceInput, VoiceCommand } from '@/hooks/useEnhancedVoiceInput';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface VoiceCommandContextType {
  isListening: boolean;
  isProcessing: boolean;
  isSupported: boolean;
  transcript: string;
  interimTranscript: string;
  lastCommand: VoiceCommand | null;
  startListening: () => void;
  stopListening: () => void;
  toggleListening: () => void;
  executeCommand: (command: VoiceCommand) => Promise<void>;
}

const VoiceCommandContext = createContext<VoiceCommandContextType | null>(null);

export function VoiceCommandProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [lastExecutedCommand, setLastExecutedCommand] = useState<VoiceCommand | null>(null);

  const handleAIResponse = useCallback((response: any) => {
    if (response?.command?.response) {
      // Speak the response (text-to-speech)
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(response.command.response);
        utterance.rate = 1;
        utterance.pitch = 1;
        speechSynthesis.speak(utterance);
      }
    }
  }, []);

  const voiceInput = useEnhancedVoiceInput({
    autoProcess: true,
    onAIResponse: handleAIResponse,
  });

  // Execute voice commands
  const executeCommand = useCallback(async (command: VoiceCommand) => {
    if (!user) {
      toast.error('Please sign in to use voice commands');
      return;
    }

    setLastExecutedCommand(command);

    try {
      switch (command.type) {
        case 'navigate':
          const destination = command.data.destination?.toLowerCase();
          const routes: Record<string, string> = {
            dashboard: '/',
            home: '/',
            calendar: '/calendar',
            tasks: '/tasks',
            projects: '/projects',
            notes: '/notes',
            analytics: '/analytics',
            profile: '/profile',
            automations: '/automations',
          };
          if (routes[destination]) {
            navigate(routes[destination]);
            toast.success(`Navigating to ${destination}`);
          }
          break;

        case 'create_task':
          const { data: taskResult, error: taskError } = await supabase.functions.invoke('sera-execute', {
            body: { 
              intent: 'create_task', 
              data: {
                title: command.data.title,
                description: command.data.description,
                priority: command.data.priority || 'medium',
                deadline: command.data.deadline,
                gtd_status: command.data.gtd_status || 'NEXT',
              }
            },
          });
          if (taskError) throw taskError;
          toast.success('Task created via voice command!');
          break;

        case 'create_note':
          const { error: noteError } = await supabase
            .from('notes')
            .insert({
              user_id: user.id,
              title: command.data.title || 'Voice Note',
              content: command.data.content || '',
            });
          if (noteError) throw noteError;
          toast.success('Note created via voice command!');
          navigate('/notes');
          break;

        case 'create_event':
          const startTime = new Date();
          if (command.data.date) {
            const dateStr = command.data.date.toLowerCase();
            if (dateStr === 'tomorrow') {
              startTime.setDate(startTime.getDate() + 1);
            } else if (dateStr === 'next week') {
              startTime.setDate(startTime.getDate() + 7);
            }
          }
          if (command.data.time) {
            const timeParts = command.data.time.match(/(\d+):?(\d*)?\s*(am|pm)?/i);
            if (timeParts) {
              let hours = parseInt(timeParts[1]);
              const minutes = parseInt(timeParts[2]) || 0;
              const isPM = timeParts[3]?.toLowerCase() === 'pm';
              if (isPM && hours < 12) hours += 12;
              if (!isPM && hours === 12) hours = 0;
              startTime.setHours(hours, minutes, 0, 0);
            }
          }

          const { error: eventError } = await supabase
            .from('events')
            .insert({
              user_id: user.id,
              title: command.data.title || 'Voice Event',
              description: command.data.description,
              start_time: startTime.toISOString(),
            });
          if (eventError) throw eventError;
          toast.success('Event created via voice command!');
          navigate('/calendar');
          break;

        case 'search':
          toast.info(`Searching for: ${command.data.query}`);
          // Could implement search navigation here
          break;

        case 'general':
          // General commands handled by chat
          toast.info('Opening SERA chat for your question...');
          break;
      }
    } catch (error) {
      console.error('Command execution error:', error);
      toast.error('Failed to execute voice command');
    }
  }, [user, navigate]);

  // Auto-execute commands when they arrive
  useEffect(() => {
    if (voiceInput.lastCommand && 
        voiceInput.lastCommand !== lastExecutedCommand &&
        voiceInput.lastCommand.confidence >= 0.7) {
      executeCommand(voiceInput.lastCommand);
    }
  }, [voiceInput.lastCommand, lastExecutedCommand, executeCommand]);

  return (
    <VoiceCommandContext.Provider value={{
      ...voiceInput,
      executeCommand,
    }}>
      {children}
    </VoiceCommandContext.Provider>
  );
}

export function useVoiceCommands() {
  const context = useContext(VoiceCommandContext);
  if (!context) {
    throw new Error('useVoiceCommands must be used within a VoiceCommandProvider');
  }
  return context;
}
