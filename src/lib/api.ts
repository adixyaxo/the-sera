// src/lib/api.ts
import { supabase } from '@/integrations/supabase/client';

export interface Card {
  card_id: string;
  type: 'schedule' | 'reschedule' | 'cancel' | 'reminder' | 'task';
  title: string;
  description: string;
  primary_action: {
    event_title: string;
    start_time: string;
    end_time: string;
    duration_minutes: number;
    location?: string;
    participants?: string[];
    notes?: string;
  };
  alternatives: Array<{
    start_time: string;
    end_time: string;
    reason: string;
  }>;
  confidence: number;
  metadata: {
    urgency: 'high' | 'medium' | 'low';
    flexibility: 'flexible' | 'fixed';
    priority: 'high' | 'medium' | 'low';
  };
  created_at: string;
  status: 'pending' | 'accepted' | 'rejected' | 'modified';
  user_id: string;
}

export interface CaptureTextResponse {
  session_id: string;
  cards: Card[];
  status: string;
  user_id: string;
  timestamp: string;
}

export interface CardActionRequest {
  action: 'accept' | 'reject' | 'modify' | 'snooze';
  modifications?: any;
  user_id: string;
}

export interface CardActionResponse {
  card_id: string;
  status: string;
  result: any;
  modifications?: any;
  success: boolean;
  timestamp: string;
}

class ApiService {
  async captureText(text: string): Promise<CaptureTextResponse> {
    const { data, error } = await supabase.functions.invoke('process-text', {
      body: { text },
    });

    if (error) throw error;
    return data;
  }

  async handleCardAction(cardId: string, action: CardActionRequest): Promise<CardActionResponse> {
    const { data, error } = await supabase.functions.invoke('card-action', {
      body: { 
        cardId, 
        action: action.action, 
        modifications: action.modifications 
      },
    });

    if (error) throw error;
    return data;
  }

  async getUserCards(): Promise<{ cards: Card[] }> {
    const { data, error } = await supabase.functions.invoke('get-user-cards');
    if (error) throw error;
    return data;
  }

  async healthCheck(): Promise<any> {
    return { status: 'healthy', timestamp: new Date().toISOString() };
  }
}

export const apiService = new ApiService();