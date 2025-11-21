// src/hooks/useWebSocket.ts
import { useEffect, useState, useCallback } from 'react';
import { WebSocketService } from '@/lib/websocket';
import { Card } from '@/lib/api';

export const useWebSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [wsService, setWsService] = useState<WebSocketService | null>(null);
  const [cards, setCards] = useState<Card[]>([]);

  useEffect(() => {
    const service = new WebSocketService();
    setWsService(service);

    service.connect()
      .then(() => setIsConnected(true))
      .catch(console.error);

    // Set up message handlers
    service.on('new_cards', (data) => {
      console.log('New cards received:', data.cards);
      setCards(prev => [...data.cards, ...prev]);
    });

    service.on('card_updated', (data) => {
      console.log('Card updated:', data);
      setCards(prev => prev.map(card => 
        card.card_id === data.card_id 
          ? { ...card, status: data.action as any }
          : card
      ));
    });

    service.on('current_cards', (data) => {
      setCards(data.cards);
    });

    return () => {
      service.disconnect();
    };
  }, []);

  const handleCardAction = useCallback(async (cardId: string, action: string, modifications?: any) => {
    console.log(`Card action: ${action} on ${cardId}`, modifications);
  }, []);

  return {
    isConnected,
    cards,
    handleCardAction,
    connect: () => wsService?.connect(),
  };
};