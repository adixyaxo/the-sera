// src/lib/websocket.ts
import { supabase } from '@/integrations/supabase/client';
import { Card } from './api';
import { RealtimeChannel } from '@supabase/supabase-js';

export type WebSocketMessage = 
  | { type: 'new_cards'; session_id: string; cards: Card[] }
  | { type: 'card_updated'; card_id: string; action: string; result: any }
  | { type: 'card_deleted'; card_id: string }
  | { type: 'current_cards'; cards: Card[] };

export class WebSocketService {
  private channel: RealtimeChannel | null = null;
  private messageHandlers: Map<string, ((data: any) => void)[]> = new Map();

  async connect(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    this.channel = supabase
      .channel('cards')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cards',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Card change:', payload);
          
          if (payload.eventType === 'INSERT') {
            this.handleMessage({
              type: 'new_cards',
              session_id: crypto.randomUUID(),
              cards: [payload.new as Card],
            });
          } else if (payload.eventType === 'UPDATE') {
            this.handleMessage({
              type: 'card_updated',
              card_id: payload.new.card_id,
              action: payload.new.status,
              result: payload.new,
            });
          } else if (payload.eventType === 'DELETE') {
            this.handleMessage({
              type: 'card_deleted',
              card_id: payload.old.card_id,
            });
          }
        }
      )
      .subscribe();

    console.log('✅ Realtime connected');
  }

  private handleMessage(message: WebSocketMessage) {
    const handlers = this.messageHandlers.get(message.type) || [];
    handlers.forEach(handler => handler(message));
  }

  on<T extends WebSocketMessage['type']>(
    type: T, 
    handler: (data: Extract<WebSocketMessage, { type: T }>) => void
  ) {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, []);
    }
    this.messageHandlers.get(type)!.push(handler as any);
  }

  disconnect() {
    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
    }
  }
}