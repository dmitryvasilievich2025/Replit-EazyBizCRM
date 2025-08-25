import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Brain,
  Search,
  Plus,
  BookOpen,
  MessageSquare,
  Wrench,
  Tag,
  Eye,
  Bot,
  Lightbulb,
  Save,
  Edit,
  Trash2,
  Mic,
  Volume2,
  User,
  Send,
  X,
  Loader2,
  MessageCircle
} from "lucide-react";

interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  category: string;
  summary?: string;
  keywords: string[];
  isActive: boolean;
  useInBot: boolean;
  priority: number;
}

interface Service {
  id: string;
  name: string;
  description: string;
  priceFrom?: number;
  priceTo?: number;
  category?: string;
  duration?: number;
  isActive: boolean;
}

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  shortAnswer?: string;
  category?: string;
  viewCount: number;
  isActive: boolean;
}

export default function KnowledgeBase() {
  const [activeTab, setActiveTab] = useState("knowledge");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [aiTestQuery, setAiTestQuery] = useState("");
  const [aiTestResult, setAiTestResult] = useState<any>(null);
  
  // Voice AI Chat Dialog
  const [isVoiceChatOpen, setIsVoiceChatOpen] = useState(false);
  const [voiceChatHistory, setVoiceChatHistory] = useState<Array<{id: string, type: 'user' | 'ai', message: string, timestamp: Date}>>([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState("");
  const [transcript, setTranscript] = useState("");
  const [recognition, setRecognition] = useState<any>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch data from API
  const { data: knowledgeData = [], isLoading: knowledgeLoading } = useQuery({
    queryKey: ['/api/knowledge-base'],
    queryFn: () => fetch('/api/knowledge-base').then(res => res.json())
  });

  const { data: servicesData = [], isLoading: servicesLoading } = useQuery({
    queryKey: ['/api/services'],
    queryFn: () => fetch('/api/services').then(res => res.json())
  });

  const { data: faqData = [], isLoading: faqLoading } = useQuery({
    queryKey: ['/api/faq'],
    queryFn: () => fetch('/api/faq').then(res => res.json())
  });

  // Mutations for creating/updating/deleting
  const createKnowledgeMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/knowledge-base', { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/knowledge-base'] });
      toast({ title: "Knowledge item created successfully" });
      setShowAddForm(false);
    }
  });

  const deleteKnowledgeMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/knowledge-base/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/knowledge-base'] });
      toast({ title: "Knowledge item deleted successfully" });
    }
  });

  const createServiceMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/services', { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      toast({ title: "Service created successfully" });
      setShowAddForm(false);
    }
  });

  const deleteServiceMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/services/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      toast({ title: "Service deleted successfully" });
    }
  });

  // Get available voices
  const { data: voicesData, isLoading: voicesLoading } = useQuery({
    queryKey: ["/api/voice/voices"],
    retry: false,
  });
  

  // Voice AI Chat mutation
  const voiceChatMutation = useMutation({
    mutationFn: async ({ message }: { message: string }) => {
      const response = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: message
        })
      });
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    },
    onSuccess: (data) => {
      console.log('Voice chat response:', data);
      const response = data?.response || data?.message || data?.answer || "Извините, не понял ваш вопрос.";
      const aiMessage = {
        id: Date.now().toString() + "_ai",
        type: 'ai' as const,
        message: response,
        timestamp: new Date()
      };
      setVoiceChatHistory(prev => [...prev, aiMessage]);
      
      // Generate speech if voice is selected
      if (selectedVoice && response) {
        console.log('🎤 Generating speech for response:', response.substring(0, 50) + '...');
        console.log('🎵 Selected voice:', selectedVoice);
        generateSpeech(response);
      } else {
        console.log('❌ Speech not generated. Voice selected?', !!selectedVoice, 'Response?', !!response);
      }
    },
    onError: (error: any) => {
      const errorMessage = {
        id: Date.now().toString() + "_error",
        type: 'ai' as const,
        message: "Извините, произошла ошибка. Попробуйте еще раз.",
        timestamp: new Date()
      };
      setVoiceChatHistory(prev => [...prev, errorMessage]);
      toast({ 
        title: "Ошибка чата", 
        description: error.message || "Не удалось получить ответ",
        variant: "destructive" 
      });
    }
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
      console.log('✅ TTS Success! Audio blob size:', audioBlob.size);
      const url = URL.createObjectURL(audioBlob);
      const audio = new Audio(url);
      
      setIsAiSpeaking(true);
      console.log('🔊 Playing audio...');
      
      audio.play().then(() => {
        console.log('✅ Audio playback started successfully');
      }).catch((error) => {
        console.error('❌ Audio playback failed:', error);
        setIsAiSpeaking(false);
        toast({
          title: "Ошибка воспроизведения",
          description: "Не удалось воспроизвести звук. Возможно, требуется взаимодействие с пользователем.",
          variant: "destructive"
        });
      });
      
      audio.onended = () => {
        console.log('🔇 Audio playback ended');
        setIsAiSpeaking(false);
        URL.revokeObjectURL(url);
      };
    },
    onError: (error: Error) => {
      console.error('❌ TTS Error:', error);
      setIsAiSpeaking(false);
      toast({
        title: "Ошибка озвучки",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Helper functions
  const generateSpeech = (text: string) => {
    console.log('🎯 generateSpeech called with:', { text: text.substring(0, 50) + '...', selectedVoice });
    if (selectedVoice) {
      console.log('🚀 Starting TTS mutation...');
      textToSpeechMutation.mutate({ text, voiceId: selectedVoice });
    } else {
      console.log('❌ No voice selected for TTS');
    }
  };

  const sendMessage = () => {
    if (!currentMessage.trim()) return;
    
    const userMessage = {
      id: Date.now().toString() + "_user",
      type: 'user' as const,
      message: currentMessage,
      timestamp: new Date()
    };
    
    setVoiceChatHistory(prev => [...prev, userMessage]);
    voiceChatMutation.mutate({ message: currentMessage });
    setCurrentMessage("");
  };

  const clearChat = () => {
    setVoiceChatHistory([]);
  };

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = 'ru-RU';
      
      recognitionInstance.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcriptPart = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcriptPart;
          } else {
            interimTranscript += transcriptPart;
          }
        }
        
        setTranscript(finalTranscript + interimTranscript);
        
        // Auto-send when final transcript is received and user stops talking
        if (finalTranscript) {
          setTimeout(() => {
            setCurrentMessage(finalTranscript);
            setTranscript("");
            recognitionInstance.stop();
            setIsListening(false);
            
            // Auto-send the message
            setTimeout(() => {
              if (finalTranscript.trim()) {
                const userMessage = {
                  id: Date.now().toString() + "_user",
                  type: 'user' as const,
                  message: finalTranscript,
                  timestamp: new Date()
                };
                setVoiceChatHistory(prev => [...prev, userMessage]);
                
                // Call API manually here to avoid mutation dependency issue
                fetch('/api/assistant/chat', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ message: finalTranscript })
                }).then(response => response.json()).then((data) => {
                  console.log('Voice recognition response:', data);
                  const response = data?.response || data?.message || data?.answer || "Извините, не понял ваш вопрос.";
                  console.log('🤖 AI Response extracted:', response.substring(0, 100) + '...');
                  const aiMessage = {
                    id: Date.now().toString() + "_ai",
                    type: 'ai' as const,
                    message: response,
                    timestamp: new Date()
                  };
                  console.log('💬 Adding AI message to chat history:', aiMessage);
                  setVoiceChatHistory(prev => {
                    console.log('📜 Previous chat history length:', prev.length);
                    const newHistory = [...prev, aiMessage];
                    console.log('📜 New chat history length:', newHistory.length);
                    return newHistory;
                  });
                  
                  // Generate speech if voice is selected  
                  console.log('🔍 Voice check for TTS:', { selectedVoice, hasResponse: !!response });
                  if (selectedVoice && response) {
                    console.log('🎤 Generating speech for AI response via voice recognition...');
                    console.log('🎵 Voice selected for TTS:', selectedVoice);
                    // Call text-to-speech API directly
                    fetch("/api/voice/text-to-speech", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        text: response,
                        voiceId: selectedVoice,
                        voiceSettings: {
                          stability: 0.5,
                          similarity_boost: 0.5,
                          style: 0.0,
                          use_speaker_boost: true,
                        },
                      }),
                    }).then(response => response.blob())
                    .then(audioBlob => {
                      console.log('✅ Voice TTS Success! Audio blob size:', audioBlob.size);
                      const url = URL.createObjectURL(audioBlob);
                      const audio = new Audio(url);
                      setIsAiSpeaking(true);
                      console.log('🔊 Playing AI voice response...');
                      audio.play().then(() => {
                        console.log('✅ AI voice playback started');
                      }).catch((error) => {
                        console.error('❌ AI voice playback failed:', error);
                        setIsAiSpeaking(false);
                      });
                      audio.onended = () => {
                        console.log('🔇 AI voice playback ended');
                        setIsAiSpeaking(false);
                        URL.revokeObjectURL(url);
                      };
                    }).catch(error => {
                      console.error('❌ Voice TTS Error:', error);
                    });
                  } else {
                    console.log('❌ No TTS - Voice selected?', !!selectedVoice, 'Response exists?', !!response);
                  }
                }).catch((error) => {
                  const errorMessage = {
                    id: Date.now().toString() + "_error",
                    type: 'ai' as const,
                    message: "Извините, произошла ошибка. Попробуйте еще раз.",
                    timestamp: new Date()
                  };
                  setVoiceChatHistory(prev => [...prev, errorMessage]);
                });
                
                setCurrentMessage("");
              }
            }, 500);
          }, 1000);
        }
      };
      
      recognitionInstance.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        // Toast call moved to separate effect to avoid dependency issues
      };
      
      recognitionInstance.onend = () => {
        setIsListening(false);
      };
      
      setRecognition(recognitionInstance);
    }
  }, []); // Empty dependency array to run only once

  // Start/stop listening functions
  const startListening = () => {
    if (recognition) {
      setTranscript("");
      setIsListening(true);
      recognition.start();
      toast({
        title: "Слушаю...",
        description: "Говорите сейчас, я вас слышу!",
      });
    } else {
      toast({
        title: "Ошибка",
        description: "Распознавание речи недоступно в вашем браузере",
        variant: "destructive",
      });
    }
  };

  const stopListening = () => {
    if (recognition) {
      recognition.stop();
      setIsListening(false);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Auto-greet when dialog opens
  const handleDialogOpen = (open: boolean) => {
    setIsVoiceChatOpen(open);
    if (open && voiceChatHistory.length === 0) {
      // Add welcome message when dialog opens for the first time
      const welcomeMessage = {
        id: Date.now().toString() + "_welcome",
        type: 'ai' as const,
        message: "Привет! 👋 Я голосовой ассистент Magic Lash. Готов ответить на ваши вопросы о материалах для наращивания ресниц, обучении и услугах. Выберите голос и задавайте вопросы!",
        timestamp: new Date()
      };
      setVoiceChatHistory([welcomeMessage]);
      
      // Auto-speak welcome if voice is selected
      setTimeout(() => {
        if (selectedVoice) {
          generateSpeech(welcomeMessage.message);
        }
      }, 500);
    }
    
    // Stop listening when dialog closes
    if (!open && isListening) {
      stopListening();
    }
  };

  const createFaqMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/faq', { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/faq'] });
      toast({ title: "FAQ item created successfully" });
      setShowAddForm(false);
    }
  });

  const deleteFaqMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/faq/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/faq'] });
      toast({ title: "FAQ item deleted successfully" });
    }
  });

  // AI Chat mutation
  const aiChatMutation = useMutation({
    mutationFn: (message: string) => apiRequest('/api/assistant/chat', { method: 'POST', body: { message } }),
    onSuccess: (response) => {
      setAiTestResult(response);
    },
    onError: () => {
      toast({ title: "AI Assistant error", description: "Unable to get response", variant: "destructive" });
    }
  });

  // Real company data from official websites (now used as fallback or initial seed data)
  const [fallbackKnowledgeData] = useState<KnowledgeItem[]>([
    {
      id: "1",
      title: "Magic Lash® - профессиональные материалы для наращивания ресниц",
      content: "Magic Lash® - ведущий поставщик высококачественных материалов для наращивания ресниц в Турции. Специализируемся на шелковых ресницах, профессиональных пинцетах, клеях и обучении мастеров. Наши продукты не вызывают аллергии, обеспечивают отличную стойкость до 4 недель.",
      category: "company",
      summary: "Ведущий поставщик материалов для наращивания ресниц в Турции",
      keywords: ["Magic Lash", "ресницы", "материалы", "пинцеты", "клей", "обучение"],
      isActive: true,
      useInBot: true,
      priority: 10
    },
    {
      id: "2",
      title: "W Lash шелковые ресницы - инновационная технология объема",
      content: "Новые W Lash шелковые ресницы позволяют создавать объем с невероятной скоростью. Мягкие, легкие, не травмируют натуральные ресницы. Идеальны для быстрого создания красивого объема.",
      category: "products",
      summary: "Инновационные шелковые ресницы для быстрого создания объема",
      keywords: ["W Lash", "шелковые ресницы", "объем", "быстро", "инновация"],
      isActive: true,
      useInBot: true,
      priority: 9
    },
    {
      id: "3",
      title: "InLei® Lash Lifting - итальянская система ламинирования ресниц",
      content: "InLei® - премиальная итальянская система для ламинирования и лифтинга ресниц. LASH FILLER 25.9 обеспечивает долговременный подъем, питание и восстановление ресниц. Профессиональные наборы для салонов красоты.",
      category: "products",
      summary: "Итальянская премиальная система ламинирования ресниц",
      keywords: ["InLei", "лифтинг", "ламинирование", "Италия", "LASH FILLER"],
      isActive: true,
      useInBot: true,
      priority: 8
    }
  ]);

  // Remove duplicate state - now using API data
  const [fallbackServicesData] = useState<Service[]>([
    {
      id: "1",
      name: "Профессиональное обучение наращиванию ресниц",
      description: "Курсы Magic Lash Academy с международным тренером Маргаритой Гулиной. Очные и онлайн курсы в Стамбуле",
      priceFrom: 2000,
      priceTo: 5000,
      category: "обучение",
      duration: 480,
      isActive: true
    },
    {
      id: "2",
      name: "Материалы Magic Lash для наращивания ресниц",
      description: "Профессиональные пинцеты, клеи, шелковые ресницы. Бесплатная доставка от 1500₺",
      priceFrom: 50,
      priceTo: 2000,
      category: "материалы",
      duration: 0,
      isActive: true
    },
    {
      id: "3",
      name: "InLei Lash Lifting наборы и препараты",
      description: "Итальянские премиальные системы для ламинирования ресниц. LASH FILLER, FORMA наборы",
      priceFrom: 500,
      priceTo: 15000,
      category: "препараты",
      duration: 0,
      isActive: true
    }
  ]);

  // Remove duplicate state - now using API data  
  const [fallbackFaqData] = useState<FAQItem[]>([
    {
      id: "1",
      question: "Где находится ваш магазин и академия?",
      answer: "Magic Lash Academy находится в Стамбуле, район Üsküdar, Altunizade. Интернет-магазин работает по всей Турции с доставкой. Телефон: +90 552 563 93 77",
      shortAnswer: "Стамбул, Üsküdar. Доставка по Турции",
      category: "контакты",
      viewCount: 245,
      isActive: true
    },
    {
      id: "2",
      question: "Какие условия доставки?",
      answer: "Бесплатная доставка от 1500₺. Заказы от 3000₺ получают скидку 10%. Отправляем в тот же день при заказе до 15:00.",
      shortAnswer: "Бесплатно от 1500₺, скидка 10% от 3000₺",
      category: "доставка",
      viewCount: 183,
      isActive: true
    },
    {
      id: "3",
      question: "Предоставляете ли вы обучение?",
      answer: "Да! Magic Lash Academy проводит профессиональные курсы по наращиванию ресниц. Есть очные курсы в Стамбуле и онлайн формат. Выпускники получают скидку 20% на все материалы.",
      shortAnswer: "Да, очные и онлайн курсы + скидка 20% выпускникам",
      category: "обучение",
      viewCount: 167,
      isActive: true
    },
    {
      id: "4",
      question: "В чем разница между Magic Lash и InLei продукцией?",
      answer: "Magic Lash - наши собственные материалы для наращивания ресниц (пинцеты, клеи, ресницы). InLei - итальянская премиальная линейка для лифтинга и ламинирования ресниц.",
      shortAnswer: "Magic Lash - наращивание, InLei - лифтинг/ламинирование",
      category: "продукция",
      viewCount: 134,
      isActive: true
    }
  ]);

  const handleAddKnowledge = () => {
    let newItem: any;
    
    if (activeTab === "knowledge") {
      newItem = {
        id: 'new',
        title: "",
        content: "",
        category: "services",
        keywords: [],
        isActive: true,
        useInBot: true,
        priority: 1
      };
    } else if (activeTab === "services") {
      newItem = {
        id: 'new',
        name: "",
        description: "",
        priceFrom: 0,
        priceTo: 0,
        category: "",
        duration: 60,
        isActive: true
      };
    } else if (activeTab === "faq") {
      newItem = {
        id: 'new',
        question: "",
        answer: "",
        shortAnswer: "",
        category: "",
        viewCount: 0,
        isActive: true
      };
    }
    
    setEditingItem(newItem);
    setShowAddForm(true);
  };

  const handleSaveItem = async () => {
    if (editingItem) {
      try {
        if (activeTab === "knowledge") {
          if (editingItem.id && editingItem.id !== 'new') {
            // Update existing
            await fetch(`/api/knowledge-base/${editingItem.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(editingItem)
            });
          } else {
            // Create new
            await fetch('/api/knowledge-base', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(editingItem)
            });
          }
          queryClient.invalidateQueries({ queryKey: ['/api/knowledge-base'] });
        } else if (activeTab === "services") {
          if (editingItem.id && editingItem.id !== 'new') {
            await fetch(`/api/services/${editingItem.id}`, {
              method: 'PUT', 
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(editingItem)
            });
          } else {
            await fetch('/api/services', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(editingItem)
            });
          }
          queryClient.invalidateQueries({ queryKey: ['/api/services'] });
        } else if (activeTab === "faq") {
          if (editingItem.id && editingItem.id !== 'new') {
            await fetch(`/api/faq/${editingItem.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(editingItem)
            });
          } else {
            await fetch('/api/faq', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(editingItem)
            });
          }
          queryClient.invalidateQueries({ queryKey: ['/api/faq'] });
        }
        
        setEditingItem(null);
        setShowAddForm(false);
        toast({
          title: "Сохранено!",
          description: "Информация успешно добавлена в базу знаний",
        });
      } catch (error) {
        toast({
          title: "Ошибка!",
          description: "Не удалось сохранить изменения.",
          variant: "destructive",
        });
      }
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      if (activeTab === "knowledge") {
        await fetch(`/api/knowledge-base/${id}`, { method: 'DELETE' });
        queryClient.invalidateQueries({ queryKey: ['/api/knowledge-base'] });
      } else if (activeTab === "services") {
        await fetch(`/api/services/${id}`, { method: 'DELETE' });
        queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      } else if (activeTab === "faq") {
        await fetch(`/api/faq/${id}`, { method: 'DELETE' });
        queryClient.invalidateQueries({ queryKey: ['/api/faq'] });
      }
      
      toast({
        title: "Удалено!",
        description: "Запись успешно удалена из базы знаний",
      });
    } catch (error) {
      toast({
        title: "Ошибка!",
        description: "Не удалось удалить запись.",
        variant: "destructive",
      });
    }
  };

  const testAISearch = () => {
    if (!aiTestQuery.trim()) return;

    const query = aiTestQuery.toLowerCase();
    
    // Simple keyword matching simulation
    const searchTerms = query.split(' ');
    let bestMatch = null;
    let bestScore = 0;

    // Search in knowledge base
    knowledgeData.forEach(item => {
      let score = 0;
      searchTerms.forEach(term => {
        if (item.title.toLowerCase().includes(term)) score += 10;
        if (item.content.toLowerCase().includes(term)) score += 5;
        if (item.keywords.some(k => k.toLowerCase().includes(term))) score += 8;
      });
      if (score > bestScore) {
        bestScore = score;
        bestMatch = {
          type: 'knowledge',
          data: item,
          score,
          answer: item.summary || item.content.substring(0, 150) + '...'
        };
      }
    });

    // Search in FAQ
    faqData.forEach(faq => {
      let score = 0;
      searchTerms.forEach(term => {
        if (faq.question.toLowerCase().includes(term)) score += 15;
        if (faq.answer.toLowerCase().includes(term)) score += 8;
      });
      if (score > bestScore) {
        bestScore = score;
        bestMatch = {
          type: 'faq',
          data: faq,
          score,
          answer: faq.shortAnswer || faq.answer
        };
      }
    });

    // Search in services
    servicesData.forEach(service => {
      let score = 0;
      searchTerms.forEach(term => {
        if (service.name.toLowerCase().includes(term)) score += 12;
        if (service.description?.toLowerCase().includes(term)) score += 6;
      });
      if (score > bestScore) {
        bestScore = score;
        bestMatch = {
          type: 'service',
          data: service,
          score,
          answer: `${service.name}: ${service.description}. Цена: от ${service.priceFrom}₽${service.priceTo ? ` до ${service.priceTo}₽` : ''}. Длительность: ${service.duration} мин.`
        };
      }
    });

    setAiTestResult(bestMatch || {
      type: 'no_match',
      answer: 'Извините, я не нашел ответ на ваш вопрос. Сейчас соединю вас с нашим консультантом.',
      score: 0
    });
  };

  const filteredKnowledge = Array.isArray(knowledgeData) ? knowledgeData.filter(item => 
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.keywords && Array.isArray(item.keywords) && item.keywords.some(keyword => keyword.toLowerCase().includes(searchQuery.toLowerCase())))
  ) : [];

  const filteredServices = Array.isArray(servicesData) ? servicesData.filter(service =>
    service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    service.description?.toLowerCase().includes(searchQuery.toLowerCase())
  ) : [];

  const filteredFAQ = Array.isArray(faqData) ? faqData.filter(faq =>
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  ) : [];

  return (
    <div className="min-h-screen bg-background">
      <main className="flex-1 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-r from-purple-500 to-blue-600 rounded-xl text-white">
                <Brain className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">База знаний компании</h1>
                <p className="text-gray-500 mt-1">Управление знаниями для ИИ-ассистента</p>
              </div>
            </div>
            
            <Button onClick={handleAddKnowledge} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Добавить
            </Button>
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Поиск по базе знаний..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <BookOpen className="w-8 h-8 text-blue-500" />
                  <div>
                    <p className="text-sm text-gray-600">Статьи</p>
                    <p className="text-2xl font-bold">{Array.isArray(knowledgeData) ? knowledgeData.length : 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Wrench className="w-8 h-8 text-green-500" />
                  <div>
                    <p className="text-sm text-gray-600">Услуги</p>
                    <p className="text-2xl font-bold">{Array.isArray(servicesData) ? servicesData.length : 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-8 h-8 text-orange-500" />
                  <div>
                    <p className="text-sm text-gray-600">FAQ</p>
                    <p className="text-2xl font-bold">{Array.isArray(faqData) ? faqData.length : 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Bot className="w-8 h-8 text-purple-500" />
                  <div>
                    <p className="text-sm text-gray-600">Для бота</p>
                    <p className="text-2xl font-bold">{Array.isArray(knowledgeData) ? knowledgeData.filter(k => k.useInBot).length : 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Content Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="knowledge">📚 База знаний</TabsTrigger>
              <TabsTrigger value="services">🛠️ Услуги</TabsTrigger>
              <TabsTrigger value="faq">❓ FAQ</TabsTrigger>
            </TabsList>

            <TabsContent value="knowledge" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredKnowledge.map((item) => (
                  <Card key={item.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg">{item.title}</CardTitle>
                        <div className="flex gap-2">
                          {item.isActive && <Badge variant="outline" className="text-green-600">Активно</Badge>}
                          {item.useInBot && <Badge variant="outline" className="text-blue-600">Бот</Badge>}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600 text-sm mb-3 line-clamp-3">{item.summary || item.content}</p>
                      <div className="flex flex-wrap gap-1 mb-3">
                        {item.keywords.map((keyword, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex justify-between items-center">
                        <Badge variant="outline">{item.category}</Badge>
                        <div className="flex gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setEditingItem(item);
                              setShowAddForm(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDeleteItem(item.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="services" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredServices.map((service) => (
                  <Card key={service.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        {service.name}
                        {service.isActive && <Badge variant="outline" className="text-green-600">Активна</Badge>}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600 mb-3">{service.description}</p>
                      <div className="space-y-2">
                        {service.priceFrom && (
                          <p className="text-sm">
                            <span className="font-medium">Цена:</span> от {service.priceFrom}₽ 
                            {service.priceTo && ` до ${service.priceTo}₽`}
                          </p>
                        )}
                        {service.duration && (
                          <p className="text-sm">
                            <span className="font-medium">Длительность:</span> {service.duration} мин
                          </p>
                        )}
                        <div className="flex justify-between items-center">
                          {service.category && (
                            <Badge variant="outline">{service.category}</Badge>
                          )}
                          <div className="flex gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                setEditingItem(service);
                                setShowAddForm(true);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDeleteItem(service.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="faq" className="space-y-4">
              <div className="space-y-4">
                {filteredFAQ.map((faq) => (
                  <Card key={faq.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-lg text-blue-600">{faq.question}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-700 mb-3">{faq.answer}</p>
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <div className="flex items-center gap-4">
                          {faq.category && <Badge variant="outline">{faq.category}</Badge>}
                          <span className="flex items-center gap-1">
                            <Eye className="w-4 h-4" />
                            {faq.viewCount} просмотров
                          </span>
                          {faq.isActive && <Badge variant="outline" className="text-green-600">Активен</Badge>}
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setEditingItem(faq);
                              setShowAddForm(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDeleteItem(faq.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          {/* Edit/Add Form Modal */}
          {showAddForm && editingItem && (
            <Card className="fixed inset-4 z-50 bg-white shadow-2xl overflow-auto">
              <CardHeader>
                <CardTitle>
                  {editingItem.id ? "Редактировать" : "Добавить"} 
                  {activeTab === "knowledge" ? " знание" : activeTab === "services" ? " услугу" : " FAQ"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder={activeTab === "faq" ? "Вопрос" : "Название"}
                  value={activeTab === "faq" ? (editingItem.question || "") : (editingItem.title || editingItem.name || "")}
                  onChange={(e) => setEditingItem({
                    ...editingItem,
                    [activeTab === "faq" ? "question" : (activeTab === "knowledge" ? "title" : "name")]: e.target.value
                  })}
                />
                
                <Textarea
                  placeholder={activeTab === "faq" ? "Ответ" : "Описание/Содержание"}
                  value={activeTab === "faq" ? (editingItem.answer || "") : (editingItem.content || editingItem.description || "")}
                  onChange={(e) => setEditingItem({
                    ...editingItem,
                    [activeTab === "faq" ? "answer" : (activeTab === "knowledge" ? "content" : "description")]: e.target.value
                  })}
                  rows={6}
                />
                
                <div className="flex gap-4">
                  <Button onClick={handleSaveItem} className="bg-green-600 hover:bg-green-700">
                    <Save className="w-4 h-4 mr-2" />
                    Сохранить
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowAddForm(false);
                      setEditingItem(null);
                    }}
                  >
                    Отмена
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Floating Voice AI Assistant Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Dialog open={isVoiceChatOpen} onOpenChange={handleDialogOpen}>
          <DialogTrigger asChild>
            <Button
              size="lg"
              className="rounded-full h-16 w-16 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all duration-300 group"
              data-testid="voice-ai-trigger"
            >
              <MessageCircle className="h-8 w-8 text-white group-hover:scale-110 transition-transform" />
            </Button>
          </DialogTrigger>
          
          <DialogContent className="sm:max-w-[600px] h-[600px] flex flex-col p-0" data-testid="voice-chat-dialog">
            <DialogDescription className="sr-only">
              Диалоговое окно для общения с голосовым ИИ-ассистентом Magic Lash
            </DialogDescription>
            <DialogHeader className="p-6 pb-4 border-b bg-gradient-to-r from-purple-50 to-blue-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src="/api/placeholder/48/48" />
                    <AvatarFallback className="bg-purple-600 text-white font-bold">AI</AvatarFallback>
                  </Avatar>
                  <div>
                    <DialogTitle className="text-xl font-bold text-gray-800">🎙️ Голосовой ИИ-Ассистент</DialogTitle>
                    <p className="text-sm text-gray-600">Умный помощник по красоте и материалам</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {isAiSpeaking && (
                    <div className="flex items-center space-x-1 text-purple-600">
                      <Volume2 className="h-4 w-4 animate-pulse" />
                      <span className="text-xs">Говорю...</span>
                    </div>
                  )}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={clearChat}
                    className="text-gray-500 hover:text-gray-700"
                    data-testid="clear-chat"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </DialogHeader>

            {/* Voice Selection */}
            <div className="px-6 py-3 border-b bg-gray-50">
              <div className="flex items-center space-x-3">
                <span className="text-sm font-medium text-gray-700">🔊 Голос:</span>
                {!selectedVoice && (
                  <span className="text-xs text-red-500 font-medium">⚠️ Выберите голос для озвучки!</span>
                )}
                <Select value={selectedVoice} onValueChange={(value) => {
                  console.log('🎵 Voice selected:', value);
                  setSelectedVoice(value);
                }}>
                  <SelectTrigger className="w-48 h-8 text-xs">
                    <SelectValue placeholder="Выберите голос" />
                  </SelectTrigger>
                  <SelectContent>
                    {voicesData?.voices?.map((voice: any) => (
                      <SelectItem key={voice.voice_id} value={voice.voice_id}>
                        {voice.name} ({voice.labels?.accent || 'English'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Chat History */}
            <ScrollArea className="flex-1 p-6">
              <div className="space-y-4">
                {voiceChatHistory.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <Bot className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                    <p className="text-lg font-medium">Привет! 👋</p>
                    <p className="text-sm">Я умный ассистент Magic Lash. Спрашивайте о материалах, обучении и услугах!</p>
                  </div>
                ) : (
                  voiceChatHistory.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                      data-testid={`message-${msg.type}`}
                    >
                      <div
                        className={`max-w-[80%] p-3 rounded-lg ${
                          msg.type === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-800 border'
                        }`}
                      >
                        {msg.type === 'ai' && (
                          <div className="flex items-center space-x-2 mb-1">
                            <Bot className="h-4 w-4 text-purple-600" />
                            <span className="text-xs font-medium text-purple-600">Magic AI</span>
                          </div>
                        )}
                        <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {msg.timestamp.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="p-6 pt-4 border-t bg-gray-50">
              {/* Voice Control Buttons */}
              <div className="flex justify-center space-x-3 mb-4">
                <Button
                  variant={isListening ? "default" : "outline"}
                  size="sm"
                  onClick={toggleListening}
                  disabled={voiceChatMutation.isPending}
                  className={`${isListening ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' : 'border-purple-300 text-purple-600 hover:bg-purple-50'}`}
                  data-testid="voice-toggle-button"
                >
                  <Mic className="h-4 w-4 mr-2" />
                  {isListening ? 'Слушаю...' : 'Говорить голосом'}
                </Button>
                
                {selectedVoice && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => generateSpeech("Тест голоса. Меня хорошо слышно?")}
                    disabled={isAiSpeaking || textToSpeechMutation.isPending}
                    className="border-blue-300 text-blue-600 hover:bg-blue-50"
                    data-testid="test-voice-button"
                  >
                    <Volume2 className="h-4 w-4 mr-2" />
                    Тест голоса
                  </Button>
                )}
              </div>
              
              {/* Live Transcript Display */}
              {(isListening || transcript) && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Mic className="h-4 w-4 text-blue-600 animate-pulse" />
                    <span className="text-sm font-medium text-blue-700">Распознавание речи:</span>
                  </div>
                  <p className="text-sm text-gray-700 min-h-[1.5rem]">
                    {transcript || (isListening ? "Говорите сейчас..." : "")}
                  </p>
                </div>
              )}
              
              {!recognition && (
                <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg text-center">
                  <p className="text-sm text-orange-700">
                    ⚠️ Распознавание речи не поддерживается в вашем браузере
                  </p>
                </div>
              )}
              
              <div className="flex space-x-3">
                <div className="flex-1">
                  <div className="relative">
                    <Input
                      value={currentMessage}
                      onChange={(e) => setCurrentMessage(e.target.value)}
                      placeholder="Напишите ваш вопрос..."
                      className="pr-12"
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      disabled={voiceChatMutation.isPending}
                      data-testid="message-input"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute right-1 top-1 h-8 w-8 p-0"
                      onClick={toggleListening}
                      disabled={voiceChatMutation.isPending}
                      data-testid="voice-input-button"
                    >
                      <Mic className={`h-4 w-4 ${isListening ? 'text-red-500 animate-pulse' : 'text-gray-500'}`} />
                    </Button>
                  </div>
                </div>
                <Button
                  onClick={sendMessage}
                  disabled={!currentMessage.trim() || voiceChatMutation.isPending}
                  className="bg-purple-600 hover:bg-purple-700"
                  data-testid="send-message"
                >
                  {voiceChatMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <div className="flex justify-between items-center mt-3 text-xs text-gray-500">
                <span>💡 Спрашивайте про материалы, цены, обучение</span>
                {selectedVoice && (
                  <span className="flex items-center space-x-1 text-green-600">
                    <Volume2 className="h-3 w-3" />
                    <span>Озвучка включена</span>
                  </span>
                )}
              </div>
              <div className="flex justify-between items-center mt-2 text-xs">
                {!selectedVoice && (
                  <span className="text-orange-600">⚠️ Выберите голос для озвучки</span>
                )}
                {recognition && (
                  <span className="text-green-600">🎤 Микрофон готов</span>
                )}
                {!recognition && (
                  <span className="text-red-600">🚫 Микрофон недоступен</span>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}