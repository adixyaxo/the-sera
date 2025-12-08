import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  timezone: string;
  notification_email: boolean;
  notification_push: boolean;
  theme: string;
  created_at: string;
  updated_at: string;
}

export const useProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) {
        // If no profile exists, create one
        if (error.code === "PGRST116") {
          const { data: newProfile, error: insertError } = await supabase
            .from("profiles")
            .insert({
              user_id: user.id,
              full_name: user.user_metadata?.full_name || null,
            })
            .select()
            .single();

          if (insertError) {
            console.error("Error creating profile:", insertError);
          } else {
            setProfile(newProfile);
          }
        } else {
          console.error("Error fetching profile:", error);
        }
      } else {
        setProfile(data);
      }
    } catch (err) {
      console.error("Unexpected error:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: new Error("No user") };

    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      toast.error("Failed to update profile");
      return { error };
    }

    setProfile(data);
    toast.success("Profile updated");
    return { data };
  };

  return { profile, loading, updateProfile, refetch: fetchProfile };
};
