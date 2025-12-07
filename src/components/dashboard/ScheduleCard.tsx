import { Check, X, Clock } from 'lucide-react';
import { Card } from '@/lib/api';
import { useWebSocket } from '@/hooks/useWebSocket';

interface ScheduleCardProps {
  card: Card;
  onAction?: (cardId: string, action: string) => void;
}

export const ScheduleCard = ({ card, onAction }: ScheduleCardProps) => {
  const { handleCardAction } = useWebSocket();

  const handleAccept = () => {
    handleCardAction(card.card_id, 'accept');
    onAction?.(card.card_id, 'accept');
  };

  const handleReject = () => {
    handleCardAction(card.card_id, 'reject');
    onAction?.(card.card_id, 'reject');
  };

  const formatTime = (isoString?: string) => {
    if (!isoString) return '--:--';
    try {
      return new Date(isoString).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '--:--';
    }
  };

  const primaryAction = card.primary_action;
  const metadata = card.metadata as { urgency?: string; flexibility?: string; priority?: string } | null;

  return (
    <div className="glass p-4 rounded-2xl border border-border/30 hover:border-border/50 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-medium mb-1">{card.title}</h3>
          <p className="text-muted-foreground text-sm mb-2">{card.description}</p>
          
          {primaryAction && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
              <Clock size={14} />
              <span>
                {formatTime(primaryAction.start_time)} - {formatTime(primaryAction.end_time)}
              </span>
              {metadata?.urgency === 'high' && (
                <span className="px-2 py-1 bg-destructive/20 text-destructive rounded-full text-xs">
                  Urgent
                </span>
              )}
            </div>
          )}
        </div>
        
        <div className="flex gap-1 ml-2">
          <button
            onClick={handleAccept}
            className="p-2 bg-accent/20 text-accent rounded-xl hover:bg-accent/30 transition-all"
          >
            <Check size={16} />
          </button>
          <button
            onClick={handleReject}
            className="p-2 bg-destructive/20 text-destructive rounded-xl hover:bg-destructive/30 transition-all"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {card.alternatives && card.alternatives.length > 0 && (
        <div className="border-t border-border/30 pt-3">
          <p className="text-sm text-muted-foreground mb-2">Alternative times:</p>
          <div className="space-y-1">
            {card.alternatives.map((alt, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {formatTime(alt.start_time)} - {formatTime(alt.end_time)}
                </span>
                <span className="text-muted-foreground/60 text-xs">{alt.reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mt-3 pt-3 border-t border-border/30">
        <div className="flex gap-2">
          {metadata?.flexibility === 'flexible' && (
            <span className="px-2 py-1 bg-accent/20 text-accent rounded-full text-xs">
              Flexible
            </span>
          )}
          {card.confidence != null && (
            <span className="px-2 py-1 bg-muted rounded-full text-xs">
              {Math.round(card.confidence * 100)}% confidence
            </span>
          )}
        </div>
        
        {card.created_at && (
          <span className="text-muted-foreground/50 text-xs">
            {new Date(card.created_at).toLocaleTimeString()}
          </span>
        )}
      </div>
    </div>
  );
};