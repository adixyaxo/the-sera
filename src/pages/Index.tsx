import { Header } from "@/components/layout/Header";
import { QuickCapture } from "@/components/dashboard/QuickCapture";
import { TimelineWidget } from "@/components/dashboard/TimelineWidget";
import { FocusModeCard } from "@/components/dashboard/FocusModeCard";
import { ScheduleCard } from "@/components/dashboard/ScheduleCard";
import { TasksWidget } from "@/components/dashboard/TasksWidget";
import { ConfirmationDialog } from "@/components/dashboard/ConfirmationDialog";
import { FloatingBackground } from "@/components/dashboard/FloatingBackground";
import { useState, useEffect } from 'react';
import { Card } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from "react-router-dom";
import { Analytics } from "@vercel/analytics/next";

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [suggestedCards, setSuggestedCards] = useState<Card[]>([]);
  const [pendingCards, setPendingCards] = useState<Card[]>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);

  useEffect(() => {
    if (!user) {
      //navigate('/auth');
    } else {
      loadUserCards();
    }
    // loadUserCards();
  }, [user, navigate]);

  const loadUserCards = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('cards')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      const formattedCards = data.map(card => ({
        card_id: card.card_id,
        type: card.type as any,
        title: card.title,
        description: card.description || '',
        primary_action: card.primary_action as any,
        alternatives: card.alternatives as any,
        confidence: Number(card.confidence),
        metadata: card.metadata as any,
        created_at: card.created_at,
        status: card.status as any,
        user_id: card.user_id,
      }));
      setSuggestedCards(formattedCards);
    }
  };

  const handleNewCards = (newCards: Card[]) => {
    setPendingCards(newCards);
    setShowConfirmation(true);
  };

  const handleConfirm = async () => {
    if (!user) return;

    for (const card of pendingCards) {
      const { error } = await supabase.from('cards').insert({
        user_id: user.id,
        card_id: card.card_id,
        type: card.type,
        title: card.title,
        description: card.description,
        primary_action: card.primary_action,
        alternatives: card.alternatives,
        confidence: card.confidence,
        metadata: card.metadata,
        status: 'pending',
      });

      if (error) {
        console.error('Error saving card:', error);
        toast.error('Failed to save some cards');
      }
    }

    setSuggestedCards(prev => [...pendingCards, ...prev]);
    setPendingCards([]);
    setShowConfirmation(false);
    toast.success('Changes applied successfully');
  };

  const handleReject = () => {
    setPendingCards([]);
    setShowConfirmation(false);
    toast.info('Please try a different request');
  };

  const handleCardAction = async (cardId: string, action: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('cards')
      .update({ status: action })
      .eq('card_id', cardId)
      .eq('user_id', user.id);

    if (!error) {
      setSuggestedCards(prev => prev.filter(card => card.card_id !== cardId));
      toast.success(`Card ${action}`);
    }
  };

  return (
    <div className="min-h-screen w-full relative">
      <FloatingBackground />
      <Header />
      <main className="pt-32 sm:pt-28 pb-24 sm:pb-16 px-4 sm:px-8 min-h-screen relative z-10">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="animate-fade-in glass p-6 rounded-3xl">
            <h1 className="text-2xl sm:text-3xl font-light mb-2">Good morning</h1>
            <p className="text-muted-foreground text-sm sm:text-base">Here's your intelligent routine overview</p>
          </div>

          <QuickCapture onNewCards={handleNewCards} />

          {showConfirmation && (
            <ConfirmationDialog
              generatedCards={pendingCards}
              onConfirm={handleConfirm}
              onReject={handleReject}
              isVisible={showConfirmation}
            />
          )}

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Timeline */}
            <div className="lg:col-span-2 space-y-6">
              <TimelineWidget />

              {/* Dynamic Suggested Adjustments from Backend */}
              <div className="space-y-4">
                <h2 className="text-lg font-medium px-1">Suggested Adjustments</h2>

                {suggestedCards.length > 0 ? (
                  suggestedCards.map((card) => (
                    <ScheduleCard
                      key={card.card_id}
                      card={card}
                      onAction={handleCardAction}
                    />
                  ))
                ) : (
                  // Fallback to static examples when no real cards
                  <>
                    <ScheduleCard
                      card={{
                        card_id: 'fallback-1',
                        type: 'reschedule',
                        title: 'Move study block to 18:00',
                        description: 'Traffic detected on your route. Adjusting commute buffer by 30 minutes.',
                        primary_action: {
                          event_title: 'Study Block',
                          start_time: new Date().toISOString(),
                          end_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
                          duration_minutes: 120
                        },
                        alternatives: [],
                        confidence: 0.85,
                        metadata: { urgency: 'medium', flexibility: 'flexible', priority: 'medium' },
                        created_at: new Date().toISOString(),
                        status: 'pending',
                        user_id: 'default_user'
                      }}
                    />
                    <ScheduleCard
                      card={{
                        card_id: 'fallback-2',
                        type: 'schedule',
                        title: 'Add break before meeting',
                        description: 'Energy levels typically drop at this time. Consider a 15-minute break.',
                        primary_action: {
                          event_title: 'Break',
                          start_time: new Date().toISOString(),
                          end_time: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
                          duration_minutes: 15
                        },
                        alternatives: [],
                        confidence: 0.75,
                        metadata: { urgency: 'low', flexibility: 'flexible', priority: 'low' },
                        created_at: new Date().toISOString(),
                        status: 'pending',
                        user_id: 'default_user'
                      }}
                    />
                  </>
                )}
              </div>
            </div>

            {/* Right Column - Widgets */}
            <div className="space-y-6">
              <FocusModeCard />
              <TasksWidget />
            </div>
          </div>
        </div>
      </main>

      <div className="fixed bottom-2 right-2 text-[0.5rem] text-red-500 opacity-70 select-none z-50">
        made by aditya
      </div>
    </div>
  );
};

export default Index;