"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { api } from "~/trpc/react";

export function usePresence() {
  const { data: session, status } = useSession();
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isOnlineRef = useRef(false);

  const setOnlineMutation = api.presence.setOnline.useMutation();
  const setOfflineMutation = api.presence.setOffline.useMutation();
  const heartbeatMutation = api.presence.heartbeat.useMutation();

  const setOnline = async () => {
    if (!isOnlineRef.current && session?.user) {
      try {
        await setOnlineMutation.mutateAsync();
        isOnlineRef.current = true;
        
        // Start heartbeat
        heartbeatIntervalRef.current = setInterval(() => {
          heartbeatMutation.mutate();
        }, 30000); // Send heartbeat every 30 seconds
      } catch (error) {
        console.error("Failed to set online:", error);
      }
    }
  };

  const setOffline = async () => {
    if (isOnlineRef.current && session?.user) {
      try {
        await setOfflineMutation.mutateAsync();
        isOnlineRef.current = false;
        
        // Clear heartbeat
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }
      } catch (error) {
        console.error("Failed to set offline:", error);
      }
    }
  };

  useEffect(() => {
    // Only proceed if user is authenticated
    if (status === "loading" || !session?.user) {
      return;
    }

    // Set online when authenticated
    setOnline();

    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        setOnline();
      } else {
        setOffline();
      }
    };

    // Handle page unload
    const handleBeforeUnload = () => {
      // Use navigator.sendBeacon for reliable offline signal
      navigator.sendBeacon('/api/trpc/presence.setOffline');
    };

    // Handle focus/blur
    const handleFocus = () => setOnline();
    const handleBlur = () => setOffline();

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);

    return () => {
      setOffline();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
      
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, [session, status]);

  return {
    setOnline,
    setOffline,
    isSettingOnline: setOnlineMutation.isPending,
    isSettingOffline: setOfflineMutation.isPending,
  };
}