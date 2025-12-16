import { Header } from "@/components/layout/Header";
import { TimelineWidget } from "@/components/dashboard/TimelineWidget";
import { FocusModeCard } from "@/components/dashboard/FocusModeCard";
import { GTDWidget } from "@/components/dashboard/GTDWidget";
import { GTDAnalytics } from "@/components/dashboard/GTDAnalytics";
import { FloatingBackground } from "@/components/dashboard/FloatingBackground";
import { SeraFAB } from "@/components/sera/SeraFAB";
import { SeraPlannerCard } from "@/components/sera/SeraPlannerCard";
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from "react-router-dom";

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="min-h-screen w-full relative">
      <FloatingBackground />
      <Header />
      
      {/* Main content with transparent glass effect to show floating background */}
      <main className="pt-32 sm:pt-28 pb-24 sm:pb-16 px-4 sm:px-8 min-h-screen relative z-10">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Greeting Card - more transparent */}
          <div className="animate-fade-in glass p-6 rounded-3xl bg-background/60 backdrop-blur-md">
            <h1 className="text-2xl sm:text-3xl font-light mb-2">{getGreeting()}</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Here's your productivity overview. Use the SERA button below to quickly capture tasks.
            </p>
          </div>

          {/* Main Grid - Timeline full width, then AI Planner below */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Timeline and AI Planner (2/3 width) */}
            <div className="lg:col-span-2 space-y-6">
              <TimelineWidget />
              
              {/* AI Planner Card - positioned left-aligned below Timeline */}
              <div className="max-w-md">
                <SeraPlannerCard />
              </div>
            </div>

            {/* Right Column - Focus, GTD Widgets (1/3 width) */}
            <div className="space-y-6">
              <FocusModeCard />
              <GTDWidget />
              <GTDAnalytics />
            </div>
          </div>
        </div>
      </main>

      {/* SERA AI Assistant FAB */}
      <SeraFAB />

      <div className="fixed bottom-2 left-2 text-[0.5rem] text-muted-foreground/50 select-none z-50">
        made by aditya
      </div>
    </div>
  );
};

export default Index;
