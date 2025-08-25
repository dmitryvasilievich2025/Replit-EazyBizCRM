import { Readable } from "stream";

export interface VoiceSettings {
  stability: number;
  similarity_boost: number;
  style: number;
  use_speaker_boost: boolean;
}

export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  samples: any[];
  category: string;
  fine_tuning: {
    is_allowed_to_fine_tune: boolean;
    finetuning_state: string;
    verification_failures: string[];
    verification_attempts_count: number;
    manual_verification_requested: boolean;
  };
  labels: { [key: string]: string };
  description: string;
  preview_url: string;
  available_for_tiers: string[];
  settings: VoiceSettings;
  sharing: {
    status: string;
    history_item_sample_id: string;
    original_voice_id: string;
    public_owner_id: string;
    liked_by_count: number;
    cloned_by_count: number;
    name: string;
    description: string;
    labels: { [key: string]: string };
    category: string;
    created_at_unix: number;
  };
  high_quality_base_model_ids: string[];
}

export class ElevenLabsService {
  private apiKey: string;
  private baseUrl = "https://api.elevenlabs.io/v1";

  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY || "";
    if (!this.apiKey) {
      console.warn("ELEVENLABS_API_KEY not provided. Voice features will be disabled.");
    }
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    if (!this.apiKey) {
      throw new Error("ElevenLabs API key not configured");
    }

    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        "xi-api-key": this.apiKey,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ElevenLabs API error: ${response.status} - ${error}`);
    }

    return response;
  }

  /**
   * Get all available voices
   */
  async getVoices(): Promise<{ voices: ElevenLabsVoice[] }> {
    const response = await this.makeRequest("/voices");
    return response.json();
  }

  /**
   * Convert text to speech using a specific voice
   */
  async textToSpeech(
    voiceId: string,
    text: string,
    voiceSettings?: Partial<VoiceSettings>
  ): Promise<Buffer> {
    const defaultSettings: VoiceSettings = {
      stability: 0.5,
      similarity_boost: 0.5,
      style: 0.0,
      use_speaker_boost: true,
    };

    const settings = { ...defaultSettings, ...voiceSettings };

    const response = await this.makeRequest(`/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        voice_settings: settings,
        model_id: "eleven_multilingual_v2", // Supports multiple languages including Russian
      }),
    });

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Get voice settings for a specific voice
   */
  async getVoiceSettings(voiceId: string): Promise<VoiceSettings> {
    const response = await this.makeRequest(`/voices/${voiceId}/settings`);
    return response.json();
  }

  /**
   * Generate speech for CRM notifications
   */
  async generateCrmNotification(
    message: string,
    voiceId?: string
  ): Promise<Buffer> {
    // Default to Rachel voice (English) or other multilingual voice
    const defaultVoiceId = voiceId || "21m00Tcm4TlvDq8ikWAM"; // Rachel voice
    
    // Optimize settings for clear notification speech
    const notificationSettings: VoiceSettings = {
      stability: 0.7,
      similarity_boost: 0.8,
      style: 0.0,
      use_speaker_boost: true,
    };

    return this.textToSpeech(defaultVoiceId, message, notificationSettings);
  }

  /**
   * Generate speech for payroll reports
   */
  async generatePayrollReport(
    employeeName: string,
    reportData: {
      grossPay: number;
      netPay: number;
      deductions: number;
      period: string;
    }
  ): Promise<Buffer> {
    const text = `Payroll report for ${employeeName} for the period ${reportData.period}. 
    Gross pay: ${reportData.grossPay} Turkish Lira. 
    Total deductions: ${reportData.deductions} Turkish Lira. 
    Net pay: ${reportData.netPay} Turkish Lira.`;

    return this.generateCrmNotification(text);
  }

  /**
   * Generate speech for daily work summary
   */
  async generateWorkSummary(
    employeeName: string,
    workData: {
      plannedHours: number;
      actualHours: number;
      date: string;
    }
  ): Promise<Buffer> {
    const text = `Work summary for ${employeeName} on ${workData.date}. 
    Planned hours: ${workData.plannedHours}. 
    Actual hours worked: ${workData.actualHours}. 
    ${workData.actualHours > workData.plannedHours 
      ? `Overtime: ${workData.actualHours - workData.plannedHours} hours.` 
      : "No overtime."
    }`;

    return this.generateCrmNotification(text);
  }

  /**
   * Generate speech for task reminders
   */
  async generateTaskReminder(
    taskTitle: string,
    dueDate: string,
    priority: string
  ): Promise<Buffer> {
    const text = `Task reminder: ${taskTitle}. 
    Due date: ${dueDate}. 
    Priority: ${priority}. 
    Please complete this task on time.`;

    return this.generateCrmNotification(text);
  }

  /**
   * Check if ElevenLabs service is available
   */
  isAvailable(): boolean {
    return !!this.apiKey;
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): string[] {
    return [
      "English",
      "Russian", 
      "Turkish",
      "Spanish", 
      "French", 
      "German", 
      "Italian", 
      "Portuguese", 
      "Polish", 
      "Dutch",
      "Japanese",
      "Chinese",
      "Korean"
    ];
  }
}

export const elevenLabsService = new ElevenLabsService();