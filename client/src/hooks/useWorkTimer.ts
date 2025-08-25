import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { WorkSession } from "@shared/schema";

interface TimerState {
  isRunning: boolean;
  totalSeconds: number;
  currentSessionId: string | null;
  startTime: Date | null;
}

export function useWorkTimer(userId?: string) {
  const [timer, setTimer] = useState<TimerState>({
    isRunning: false,
    totalSeconds: 0,
    currentSessionId: null,
    startTime: null,
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get today's work sessions to calculate total time
  const { data: todaySessions } = useQuery({
    queryKey: ["/api/work-sessions", userId, "today"],
    queryFn: () => {
      if (!userId) return [];
      return apiRequest(`/api/work-sessions`);
    },
    enabled: !!userId,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Calculate total time from completed sessions + current timer
  useEffect(() => {
    if (!todaySessions) return;

    const completedTime = todaySessions
      .filter((session: WorkSession) => session.logoutTime)
      .reduce((total: number, session: WorkSession) => {
        if (!session.loginTime || !session.logoutTime) return total;
        const start = new Date(session.loginTime).getTime();
        const end = new Date(session.logoutTime).getTime();
        return total + (end - start) / 1000;
      }, 0);

    // Find active session
    const activeSession = todaySessions.find(
      (session: WorkSession) => !session.logoutTime
    );

    if (activeSession && !timer.isRunning && activeSession.loginTime) {
      // Resume timer from active session
      const startTime = new Date(activeSession.loginTime);
      const currentTime = Date.now();
      const elapsedSeconds = Math.floor((currentTime - startTime.getTime()) / 1000);
      
      setTimer({
        isRunning: true,
        totalSeconds: Math.floor(completedTime) + elapsedSeconds,
        currentSessionId: activeSession.id,
        startTime: startTime,
      });
    } else if (!activeSession && timer.isRunning) {
      // No active session but timer is running - sync
      setTimer(prev => ({
        ...prev,
        isRunning: false,
        totalSeconds: Math.floor(completedTime),
        currentSessionId: null,
        startTime: null,
      }));
    } else if (!timer.isRunning && !activeSession) {
      // Update total time from completed sessions only
      setTimer(prev => ({
        ...prev,
        totalSeconds: Math.floor(completedTime),
      }));
    }
  }, [todaySessions, timer.isRunning]);

  // Timer increment effect
  useEffect(() => {
    if (timer.isRunning) {
      intervalRef.current = setInterval(() => {
        setTimer(prev => ({
          ...prev,
          totalSeconds: prev.totalSeconds + 1,
        }));
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [timer.isRunning]);

  // Start work session mutation
  const startSessionMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("User ID required");
      
      const response = await apiRequest(
        "POST",
        "/api/work-sessions",
        {
          userId,
          loginTime: new Date().toISOString(),
          description: "Work session",
          date: new Date().toISOString(),
        }
      );
      return response.json();
    },
    onSuccess: (session) => {
      setTimer(prev => ({
        ...prev,
        isRunning: true,
        currentSessionId: session.id,
        startTime: new Date(session.loginTime || session.date),
      }));
      
      queryClient.invalidateQueries({ 
        queryKey: ["/api/work-sessions"] 
      });
      
      toast({
        title: "Work session started",
        description: "Time tracking is now active",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Stop work session mutation
  const stopSessionMutation = useMutation({
    mutationFn: async () => {
      if (!timer.currentSessionId) throw new Error("No active session");
      
      const response = await apiRequest(
        "PATCH",
        `/api/work-sessions/${timer.currentSessionId}`,
        {
          logoutTime: new Date().toISOString(),
        }
      );
      return response.json();
    },
    onSuccess: () => {
      setTimer(prev => ({
        ...prev,
        isRunning: false,
        currentSessionId: null,
        startTime: null,
      }));
      
      queryClient.invalidateQueries({ 
        queryKey: ["/api/work-sessions"] 
      });
      
      toast({
        title: "Work session ended",
        description: "Time has been recorded",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const startTimer = () => {
    if (!timer.isRunning) {
      startSessionMutation.mutate();
    }
  };

  const stopTimer = () => {
    if (timer.isRunning) {
      stopSessionMutation.mutate();
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return {
    ...timer,
    startTimer,
    stopTimer,
    formatTime: () => formatTime(timer.totalSeconds),
    isLoading: startSessionMutation.isPending || stopSessionMutation.isPending,
  };
}