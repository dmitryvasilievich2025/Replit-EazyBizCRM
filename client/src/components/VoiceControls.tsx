import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Mic, Play, Download, Volume2, VolumeX } from "lucide-react";

interface VoiceControlsProps {
  employeeId?: string;
  taskId?: string;
  showTextToSpeech?: boolean;
  showPayrollReport?: boolean;
  showWorkSummary?: boolean;
  showTaskReminder?: boolean;
}

export function VoiceControls({
  employeeId,
  taskId,
  showTextToSpeech = true,
  showPayrollReport = false,
  showWorkSummary = false,
  showTaskReminder = false,
}: VoiceControlsProps) {
  const [text, setText] = useState("");
  const [selectedVoice, setSelectedVoice] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const { toast } = useToast();

  // Get available voices
  const { data: voicesData, isLoading: voicesLoading } = useQuery({
    queryKey: ["/api/voice/voices"],
    retry: false,
  });

  // Text to speech mutation
  const textToSpeechMutation = useMutation({
    mutationFn: async ({ text, voiceId }: { text: string; voiceId?: string }) => {
      const response = await fetch("/api/voice/text-to-speech", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          voiceId,
          voiceSettings: {
            stability: 0.5,
            similarity_boost: 0.5,
            style: 0.0,
            use_speaker_boost: true,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to generate speech");
      }

      return response.blob();
    },
    onSuccess: (audioBlob) => {
      const url = URL.createObjectURL(audioBlob);
      const audio = new Audio(url);
      
      setIsPlaying(true);
      audio.play();
      
      audio.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(url);
      };

      toast({
        title: "Success",
        description: "Speech generated successfully",
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

  // Payroll report mutation
  const payrollReportMutation = useMutation({
    mutationFn: async ({ employeeId, period }: { employeeId: string; period?: string }) => {
      const response = await fetch("/api/voice/payroll-report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ employeeId, period }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to generate payroll report");
      }

      return response.blob();
    },
    onSuccess: (audioBlob) => {
      const url = URL.createObjectURL(audioBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "payroll_report.mp3";
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Payroll report audio generated",
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

  // Work summary mutation
  const workSummaryMutation = useMutation({
    mutationFn: async ({ employeeId, date }: { employeeId: string; date?: string }) => {
      const response = await fetch("/api/voice/work-summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ employeeId, date }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to generate work summary");
      }

      return response.blob();
    },
    onSuccess: (audioBlob) => {
      const url = URL.createObjectURL(audioBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "work_summary.mp3";
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Work summary audio generated",
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

  // Task reminder mutation
  const taskReminderMutation = useMutation({
    mutationFn: async ({ taskId }: { taskId: string }) => {
      const response = await fetch("/api/voice/task-reminder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ taskId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to generate task reminder");
      }

      return response.blob();
    },
    onSuccess: (audioBlob) => {
      const url = URL.createObjectURL(audioBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "task_reminder.mp3";
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Task reminder audio generated",
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

  const handleTextToSpeech = () => {
    if (!text.trim()) {
      toast({
        title: "Error",
        description: "Please enter some text",
        variant: "destructive",
      });
      return;
    }

    textToSpeechMutation.mutate({ text, voiceId: selectedVoice });
  };

  const handlePayrollReport = () => {
    if (!employeeId) {
      toast({
        title: "Error",
        description: "Employee ID is required",
        variant: "destructive",
      });
      return;
    }

    payrollReportMutation.mutate({ employeeId });
  };

  const handleWorkSummary = () => {
    if (!employeeId) {
      toast({
        title: "Error",
        description: "Employee ID is required",
        variant: "destructive",
      });
      return;
    }

    workSummaryMutation.mutate({ employeeId });
  };

  const handleTaskReminder = () => {
    if (!taskId) {
      toast({
        title: "Error",
        description: "Task ID is required",
        variant: "destructive",
      });
      return;
    }

    taskReminderMutation.mutate({ taskId });
  };

  const isServiceAvailable = voicesData && voicesData.voices && voicesData.voices.length > 0;

  if (!isServiceAvailable && !voicesLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <VolumeX className="w-5 h-5" />
            Voice AI Service
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-muted-foreground mb-4">
              Voice AI service is not available. Please configure ELEVENLABS_API_KEY.
            </p>
            <div className="text-sm text-muted-foreground">
              <p>Supported languages:</p>
              <p className="mt-1">
                {voicesData?.supported_languages?.join(", ") || "English, Russian, Turkish, and more"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="w-5 h-5" />
          Voice AI Controls
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {showTextToSpeech && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Select Voice</label>
              <Select value={selectedVoice} onValueChange={setSelectedVoice} disabled={voicesLoading}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a voice (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {voicesData?.voices?.map((voice: any) => (
                    <SelectItem key={voice.voice_id} value={voice.voice_id}>
                      {voice.name} ({voice.category})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Text to Speech</label>
              <Textarea
                placeholder="Enter text to convert to speech..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={3}
              />
            </div>

            <Button
              onClick={handleTextToSpeech}
              disabled={textToSpeechMutation.isPending || !text.trim() || isPlaying}
              className="w-full"
            >
              {textToSpeechMutation.isPending ? (
                "Generating..."
              ) : isPlaying ? (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Playing...
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4 mr-2" />
                  Generate Speech
                </>
              )}
            </Button>
          </div>
        )}

        {showPayrollReport && employeeId && (
          <Button
            onClick={handlePayrollReport}
            disabled={payrollReportMutation.isPending}
            variant="outline"
            className="w-full"
          >
            {payrollReportMutation.isPending ? (
              "Generating..."
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Generate Payroll Report Audio
              </>
            )}
          </Button>
        )}

        {showWorkSummary && employeeId && (
          <Button
            onClick={handleWorkSummary}
            disabled={workSummaryMutation.isPending}
            variant="outline"
            className="w-full"
          >
            {workSummaryMutation.isPending ? (
              "Generating..."
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Generate Work Summary Audio
              </>
            )}
          </Button>
        )}

        {showTaskReminder && taskId && (
          <Button
            onClick={handleTaskReminder}
            disabled={taskReminderMutation.isPending}
            variant="outline"
            className="w-full"
          >
            {taskReminderMutation.isPending ? (
              "Generating..."
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Generate Task Reminder Audio
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}