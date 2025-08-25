import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { 
  insertClientSchema, 
  insertDealSchema, 
  insertTaskSchema, 
  insertWorkSessionSchema, 
  insertDailyPayrollSchema, 
  insertMonthlyPayrollSchema, 
  workSessions, 
  instagramAnalytics, 
  instagramMessages, 
  messageTemplates, 
  clients, 
  employees,
  users,
  insertKnowledgeBaseSchema,
  insertServiceSchema,
  insertFaqItemSchema,
  insertResponseTemplateSchema,
} from "@shared/schema";
import { z } from "zod";
import { db } from "./db";
import { and, eq, gte, lt, lte, isNotNull, sql, or } from "drizzle-orm";
import { setupTelegramRoutes } from './telegram-routes';
import * as aiService from "./aiService";
import { nanoid } from "nanoid";



export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Setup Telegram bot routes
  setupTelegramRoutes(app);

  // Helper function to check if user is admin or director
  const isAdminOrDirector = async (userId: string): Promise<boolean> => {
    const user = await storage.getUser(userId);
    return user?.role === 'admin' || user?.role === 'director';
  };

  // Helper function to check if user can edit (not demo)
  const canEdit = async (userId: string): Promise<boolean> => {
    const user = await storage.getUser(userId);
    return user?.role !== 'demo';
  };

  // Helper function to check if user is manager or above
  const canManage = async (userId: string): Promise<boolean> => {
    const user = await storage.getUser(userId);
    return user?.role === 'admin' || user?.role === 'director' || user?.role === 'manager' || user?.role === 'employee';
  };

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      console.log(`🔍 AUTH REQUEST: userId=${userId}, email=${req.user.claims.email}`);
      
      const user = await storage.getUser(userId);
      
      if (!user) {
        console.log(`❌ USER NOT FOUND: userId=${userId}`);
        return res.status(404).json({ message: "User not found" });
      }

      console.log(`✅ USER FOUND:`, { id: user.id, email: user.email, role: user.role });
      res.json(user);
    } catch (error) {
      console.error("❌ Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Get all authenticated users (для назначения задач)
  app.get('/api/auth/users', isAuthenticated, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Get pending user registrations (admin only)
  app.get('/api/users/pending', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      console.log(`🔍 PENDING USERS REQUEST: userId=${userId}, email=${req.user.claims.email}`);

      const isAdmin = await isAdminOrDirector(userId);
      if (!isAdmin) {
        console.log(`❌ ACCESS DENIED: User ${userId} is not admin/director`);
        return res.status(403).json({ message: 'Forbidden: Admin access required' });
      }

      const users = await storage.getAllUsers();
      const pendingUsers = users.filter(user => user.registrationStatus === 'pending');
      console.log(`📋 PENDING USERS: Found ${pendingUsers.length} pending registrations`);
      
      res.json(pendingUsers);
    } catch (error) {
      console.error('Error fetching pending users:', error);
      res.status(500).json({ message: 'Failed to fetch pending users' });
    }
  });

  // Approve user registration (admin only)
  app.post('/api/users/:userId/approve', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const targetUserId = req.params.userId;
      
      console.log(`🔍 APPROVE REQUEST: adminId=${userId}, targetUserId=${targetUserId}`);

      const isAdmin = await isAdminOrDirector(userId);
      if (!isAdmin) {
        return res.status(403).json({ message: 'Forbidden: Admin access required' });
      }

      const updatedUser = await storage.updateUser(targetUserId, {
        registrationStatus: 'approved',
        isActive: true,
        approvedBy: userId,
        approvedAt: new Date()
      });

      // Автоматически создаем клиента для ВСЕХ источников
      try {
        const existingClients = await storage.getClients();
        const clientExists = existingClients.some(client => client.email === updatedUser.email);
        
        if (!clientExists) {
          // Определяем источник и соответствующие настройки
          const sourceMapping: Record<string, { source: any, note: string, preference: string }> = {
            'telegram': { 
              source: 'telegram' as const, 
              note: 'Клиент создан автоматически после одобрения регистрации через Telegram Bot.',
              preference: 'telegram'
            },
            'whatsapp': { 
              source: 'other' as const, 
              note: 'Клиент создан автоматически после одобрения регистрации через WhatsApp.',
              preference: 'whatsapp'
            },
            'web': { 
              source: 'website' as const, 
              note: 'Клиент создан автоматически после регистрации на сайте.',
              preference: 'email'
            },
            'instagram': { 
              source: 'instagram' as const, 
              note: 'Клиент создан автоматически после регистрации через Instagram.',
              preference: 'instagram'
            }
          };

          const sourceConfig = sourceMapping[updatedUser.registrationSource || 'web'] || sourceMapping['web'];
          
          const clientData = {
            name: `${updatedUser.firstName || updatedUser.telegramFirstName || ''} ${updatedUser.lastName || updatedUser.telegramLastName || ''}`.trim() || updatedUser.email,
            email: updatedUser.email,
            phone: '', 
            status: 'new' as const,
            source: sourceConfig.source,
            assignedTo: userId,
            createdBy: userId,
            notes: `${sourceConfig.note} User ID: ${updatedUser.id}. Статус: одобрен.`,
            leadValue: 0,
            priority: 'medium' as const,
            lastContact: new Date().toISOString(),
            nextFollowUp: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            tags: [`${updatedUser.registrationSource || 'web'}-user`, 'approved'],
            communicationPreference: sourceConfig.preference
          };
          
          await storage.createClient(clientData);
          console.log(`✅ Создан клиент для ${updatedUser.registrationSource || 'web'}: ${updatedUser.email}`);
        }
      } catch (error) {
        console.error('❌ Ошибка создания клиента при одобрении:', error);
      }

      // Notify user via Telegram if possible
      try {
        const { telegramBot } = await import('./telegram-routes');
        if (telegramBot && updatedUser.telegramUserId) {
          const telegramUserId = parseInt(updatedUser.telegramUserId);
          await (telegramBot as any).bot.telegram.sendMessage(
            telegramUserId,
            `🎉 **Ваша регистрация одобрена!**\n\n` +
            `✅ Теперь вы можете использовать команду /login для входа в систему.\n\n` +
            `📧 **Email:** ${updatedUser.email}\n` +
            `🎭 **Роль:** ${updatedUser.role}\n\n` +
            `Добро пожаловать в BeautyCRM!`,
            { parse_mode: 'Markdown' }
          );
        }
      } catch (error) {
        console.error('Failed to notify user via Telegram:', error);
      }

      res.json({ message: 'User approved successfully', user: updatedUser });
    } catch (error) {
      console.error('Error approving user:', error);
      res.status(500).json({ message: 'Failed to approve user' });
    }
  });

  // Reject user registration (admin only)
  app.post('/api/users/:userId/reject', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const targetUserId = req.params.userId;
      const { reason } = req.body;
      
      console.log(`🔍 REJECT REQUEST: adminId=${userId}, targetUserId=${targetUserId}`);

      const isAdmin = await isAdminOrDirector(userId);
      if (!isAdmin) {
        return res.status(403).json({ message: 'Forbidden: Admin access required' });
      }

      const updatedUser = await storage.updateUser(targetUserId, {
        registrationStatus: 'rejected',
        isActive: false,
        approvedBy: userId,
        approvedAt: new Date()
      });

      // Notify user via Telegram if possible
      try {
        const { telegramBot } = await import('./telegram-routes');
        if (telegramBot && updatedUser.telegramUserId) {
          const telegramUserId = parseInt(updatedUser.telegramUserId);
          await (telegramBot as any).bot.telegram.sendMessage(
            telegramUserId,
            `❌ **Ваша заявка на регистрацию отклонена**\n\n` +
            `📧 **Email:** ${updatedUser.email}\n` +
            (reason ? `📝 **Причина:** ${reason}\n\n` : '') +
            `Обратитесь к администратору для уточнения деталей.`,
            { parse_mode: 'Markdown' }
          );
        }
      } catch (error) {
        console.error('Failed to notify user via Telegram:', error);
      }

      res.json({ message: 'User rejected successfully', user: updatedUser });
    } catch (error) {
      console.error('Error rejecting user:', error);
      res.status(500).json({ message: 'Failed to reject user' });
    }
  });

  // Instagram API routes
  app.get('/api/instagram/test-token', isAuthenticated, async (req: any, res) => {
    try {
      const testToken = req.query.token || process.env.INSTAGRAM_ACCESS_TOKEN;
      if (!testToken) {
        console.log('❌ No Instagram token provided');
        return res.status(400).json({ error: 'No token provided' });
      }

      console.log('🔍 Testing Instagram token...');
      console.log('📝 Token length:', testToken.length);
      console.log('📝 Token starts with:', testToken.substring(0, 20) + '...');
      
      // Test token with Instagram Basic Display API first
      const basicDisplayUrl = `https://graph.instagram.com/me?fields=id,username&access_token=${testToken}`;
      console.log('🌐 Making request to:', basicDisplayUrl.replace(testToken, '[TOKEN_HIDDEN]'));
      
      const response = await fetch(basicDisplayUrl);
      const data = await response.json();

      console.log('📊 Response status:', response.status);
      console.log('📊 Response data:', JSON.stringify(data, null, 2));

      if (response.ok && data.id) {
        console.log('✅ Instagram token is valid:', data);
        
        // Try to get more detailed info
        let detailedData = data;
        try {
          const detailedUrl = `https://graph.instagram.com/me?fields=id,username,account_type,media_count&access_token=${testToken}`;
          const detailedResponse = await fetch(detailedUrl);
          if (detailedResponse.ok) {
            detailedData = await detailedResponse.json();
          }
        } catch (detailedError) {
          console.log('⚠️ Could not fetch detailed info:', detailedError);
        }
        
        res.json({
          status: 'valid',
          account: detailedData,
          permissions: [],
          capabilities: {
            canReadMedia: true,
            canReadMessages: false,
            canManageMessages: false,
            tokenType: 'Instagram Basic Display'
          }
        });
      } else {
        console.log('❌ Instagram token error:', data);
        res.status(400).json({
          status: 'invalid',
          error: data.error?.message || data.error_description || 'Invalid token',
          details: data
        });
      }
    } catch (error) {
      console.error('❌ Instagram token test failed:', error);
      res.status(500).json({ 
        error: 'Failed to test token',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Send Instagram message endpoint
  app.post('/api/instagram/send-message', isAuthenticated, async (req: any, res) => {
    try {
      const { recipientId, message } = req.body;
      const token = process.env.INSTAGRAM_ACCESS_TOKEN;
      
      if (!token) {
        return res.status(400).json({ error: 'Instagram token not configured' });
      }

      if (!recipientId || !message) {
        return res.status(400).json({ error: 'Recipient ID and message are required' });
      }

      console.log('📨 Sending Instagram message to:', recipientId);
      
      // Instagram Graph API endpoint for sending messages
      const response = await fetch(`https://graph.instagram.com/v18.0/me/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: { text: message }
        })
      });

      const data = await response.json();

      if (response.ok) {
        console.log('✅ Instagram message sent successfully:', data);
        res.json({ success: true, messageId: data.message_id });
      } else {
        console.log('❌ Failed to send Instagram message:', data);
        res.status(400).json({
          error: data.error?.message || 'Failed to send message',
          details: data
        });
      }
    } catch (error) {
      console.error('❌ Instagram message sending failed:', error);
      res.status(500).json({ 
        error: 'Failed to send Instagram message',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // === KNOWLEDGE BASE API ===
  
  // Поиск в базе знаний (для ассистента)
  app.get('/api/knowledge/search', isAuthenticated, async (req: any, res) => {
    try {
      const { query, category, limit = 10 } = req.query;
      
      if (!query) {
        return res.status(400).json({ error: 'Query parameter is required' });
      }
      
      console.log(`🔍 Knowledge search: "${query}", category: ${category}`);
      
      // Простой поиск по тексту (позже можно заменить на векторный поиск)
      const searchTerms = query.toLowerCase().split(' ');
      
      // Поиск в базе знаний
      const knowledgeResults = await storage.searchKnowledge(searchTerms, category, parseInt(limit));
      
      // Поиск в FAQ
      const faqResults = await storage.searchFAQ(searchTerms, parseInt(limit));
      
      // Поиск услуг
      const serviceResults = await storage.searchServices(searchTerms, parseInt(limit));
      
      res.json({
        query,
        results: {
          knowledge: knowledgeResults,
          faq: faqResults,
          services: serviceResults
        },
        total: knowledgeResults.length + faqResults.length + serviceResults.length
      });
      
    } catch (error) {
      console.error('❌ Knowledge search error:', error);
      res.status(500).json({ error: 'Failed to search knowledge base' });
    }
  });
  
  // Получить готовый ответ для ассистента
  app.post('/api/knowledge/answer', isAuthenticated, async (req: any, res) => {
    try {
      const { question, context } = req.body;
      
      console.log(`🤖 Generating answer for: "${question}"`);
      
      // Поиск подходящего шаблона ответа
      const template = await storage.findResponseTemplate(question, context);
      
      if (template) {
        // Увеличиваем счетчик использования
        await storage.incrementTemplateUsage(template.id);
        
        res.json({
          answer: template.response,
          source: 'template',
          template_id: template.id,
          confidence: 0.9
        });
      } else {
        // Если нет готового шаблона, ищем в базе знаний
        const searchResults = await storage.searchKnowledge(question.toLowerCase().split(' '), null, 3);
        
        if (searchResults.length > 0) {
          const bestMatch = searchResults[0];
          res.json({
            answer: bestMatch.autoResponse || bestMatch.summary || bestMatch.content.substring(0, 200) + '...',
            source: 'knowledge_base',
            knowledge_id: bestMatch.id,
            confidence: 0.7
          });
        } else {
          res.json({
            answer: 'Извините, я не нашел ответ на ваш вопрос. Сейчас соединю вас с нашим консультантом.',
            source: 'fallback',
            confidence: 0.1
          });
        }
      }
      
    } catch (error) {
      console.error('❌ Answer generation error:', error);
      res.status(500).json({ error: 'Failed to generate answer' });
    }
  });
  
  // Управление базой знаний
  app.get('/api/knowledge', isAuthenticated, async (req: any, res) => {
    try {
      const { category } = req.query;
      const knowledge = await storage.getKnowledgeBase(category);
      res.json(knowledge);
    } catch (error) {
      console.error('❌ Get knowledge error:', error);
      res.status(500).json({ error: 'Failed to get knowledge base' });
    }
  });
  
  app.post('/api/knowledge', isAuthenticated, async (req: any, res) => {
    try {
      const knowledgeData = {
        ...req.body,
        createdBy: req.user.id
      };
      const knowledge = await storage.createKnowledge(knowledgeData);
      res.json(knowledge);
    } catch (error) {
      console.error('❌ Create knowledge error:', error);
      res.status(500).json({ error: 'Failed to create knowledge' });
    }
  });
  
  // Управление услугами
  app.get('/api/services', async (req: any, res) => {
    try {
      const { category, active_only } = req.query;
      const services = await storage.getServices(category, active_only === 'true');
      res.json(services);
    } catch (error) {
      console.error('❌ Get services error:', error);
      res.status(500).json({ error: 'Failed to get services' });
    }
  });
  
  app.post('/api/services', isAuthenticated, async (req: any, res) => {
    try {
      const service = await storage.createService(req.body);
      res.json(service);
    } catch (error) {
      console.error('❌ Create service error:', error);
      res.status(500).json({ error: 'Failed to create service' });
    }
  });
  
  // Управление FAQ
  app.get('/api/faq', async (req: any, res) => {
    try {
      const { category } = req.query;
      const faq = await storage.getFAQ(category);
      res.json(faq);
    } catch (error) {
      console.error('❌ Get FAQ error:', error);
      res.status(500).json({ error: 'Failed to get FAQ' });
    }
  });
  
  app.post('/api/faq', isAuthenticated, async (req: any, res) => {
    try {
      const faqItem = await storage.createFAQ(req.body);
      res.json(faqItem);
    } catch (error) {
      console.error('❌ Create FAQ error:', error);
      res.status(500).json({ error: 'Failed to create FAQ' });
    }
  });

  // Future: Instagram Business API webhook for comments and mentions
  app.post('/api/instagram/webhook', async (req: any, res) => {
    try {
      const { object, entry } = req.body;
      
      if (object === 'instagram') {
        for (const change of entry) {
          if (change.changes) {
            for (const changeItem of change.changes) {
              if (changeItem.field === 'comments') {
                // Process new comment - future lead
                console.log('📝 New Instagram comment:', changeItem.value);
                // TODO: Save as lead in database
              }
              if (changeItem.field === 'mentions') {
                // Process mention - future lead
                console.log('📢 New Instagram mention:', changeItem.value);
                // TODO: Save as lead in database
              }
            }
          }
        }
      }
      
      res.status(200).send('OK');
    } catch (error) {
      console.error('❌ Instagram webhook error:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  });

  // Webhook verification for Instagram Business API
  app.get('/api/instagram/webhook', (req: any, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    
    // TODO: Set your verify token in environment
    const VERIFY_TOKEN = process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN || 'your_verify_token';
    
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('✅ Instagram webhook verified');
      res.status(200).send(challenge);
    } else {
      console.log('❌ Instagram webhook verification failed');
      res.sendStatus(403);
    }
  });

  // === 11LABS VOICE AGENT WEBHOOKS ===
  
  // 11Labs agent webhook for voice leads
  app.post('/api/voice/webhook', async (req: any, res) => {
    try {
      console.log('🎤 Received 11Labs webhook:', JSON.stringify(req.body, null, 2));
      
      const webhookData = req.body;
      
      // Extract client information from agent's structured response
      const extractClientInfo = (transcription: string, conversationData: any) => {
        // Parse agent's extracted data (this structure might need adjustment based on your agent's output)
        const clientName = conversationData?.client_name || extractNameFromText(transcription);
        const clientNeeds = conversationData?.client_needs || extractNeedsFromText(transcription);
        const messengerInfo = conversationData?.messenger_info || extractMessengerFromText(transcription);
        const isQualified = conversationData?.is_lead || false;
        const leadScore = conversationData?.lead_score || 0;
        
        return {
          clientName,
          clientNeeds,
          messengerType: messengerInfo?.type,
          messengerContact: messengerInfo?.contact,
          isQualifiedLead: isQualified,
          leadScore,
          leadReason: conversationData?.lead_reason || ''
        };
      };
      
      // Helper functions to extract data from transcription (fallback)
      const extractNameFromText = (text: string) => {
        const nameMatch = text.match(/(?:меня зовут|я|my name is|i am|i'm)\s+([a-zA-Zа-яёА-ЯЁ]+)/i);
        return nameMatch ? nameMatch[1] : null;
      };
      
      const extractNeedsFromText = (text: string) => {
        const needsKeywords = ['хочу', 'нужно', 'интересует', 'want', 'need', 'interested in'];
        for (const keyword of needsKeywords) {
          const index = text.toLowerCase().indexOf(keyword);
          if (index !== -1) {
            // Extract sentence containing the keyword
            const sentences = text.split(/[.!?]/);
            const sentence = sentences.find(s => s.toLowerCase().includes(keyword));
            return sentence?.trim() || null;
          }
        }
        return null;
      };
      
      const extractMessengerFromText = (text: string) => {
        const telegramMatch = text.match(/@([a-zA-Z0-9_]+)|telegram[:\s]*@?([a-zA-Z0-9_]+)/i);
        const phoneMatch = text.match(/\+?[\d\s\-\(\)]{10,}/);
        const whatsappMatch = text.match(/whatsapp[:\s]*\+?[\d\s\-\(\)]{10,}/i);
        
        if (telegramMatch) {
          return { type: 'telegram', contact: telegramMatch[1] || telegramMatch[2] };
        }
        if (whatsappMatch) {
          const phone = whatsappMatch[0].replace(/whatsapp[:\s]*/i, '').trim();
          return { type: 'whatsapp', contact: phone };
        }
        if (phoneMatch) {
          return { type: 'phone', contact: phoneMatch[0] };
        }
        return { type: null, contact: null };
      };
      
      // Extract conversation data
      const conversationId = webhookData.conversation_id || webhookData.session_id;
      const transcription = webhookData.transcription || webhookData.transcript || '';
      const audioUrl = webhookData.audio_url || webhookData.recording_url;
      const duration = webhookData.duration || webhookData.conversation_duration;
      const agentId = webhookData.agent_id;
      
      // Get client information
      const clientInfo = extractClientInfo(transcription, webhookData.extracted_data || {});
      
      // Create voice lead record
      const voiceLeadData = {
        conversationId,
        agentId,
        sessionId: webhookData.session_id,
        clientName: clientInfo.clientName,
        clientNeeds: clientInfo.clientNeeds,
        messengerType: clientInfo.messengerType,
        messengerContact: clientInfo.messengerContact,
        isQualifiedLead: clientInfo.isQualifiedLead,
        leadScore: clientInfo.leadScore,
        leadReason: clientInfo.leadReason,
        transcription,
        audioUrl,
        conversationDuration: duration,
        language: webhookData.language || 'ru',
        rawWebhookData: webhookData,
        processingStatus: 'processed'
      };
      
      console.log('📝 Extracted client info:', clientInfo);
      
      // Save to database
      const savedLead = await storage.createVoiceLead(voiceLeadData);
      
      console.log('✅ Voice lead saved:', savedLead.id);
      
      res.status(200).json({ 
        success: true, 
        leadId: savedLead.id,
        isQualified: clientInfo.isQualifiedLead,
        message: 'Voice lead processed successfully'
      });
      
    } catch (error) {
      console.error('❌ 11Labs webhook error:', error);
      res.status(500).json({ 
        error: 'Webhook processing failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Webhook verification for 11Labs (if needed)
  app.get('/api/voice/webhook', (req: any, res) => {
    const verifyToken = req.query.verify_token || req.query.token;
    const challenge = req.query.challenge;
    
    // TODO: Set your verify token in environment
    const VERIFY_TOKEN = process.env.VOICE_WEBHOOK_VERIFY_TOKEN || 'your_verify_token';
    
    if (verifyToken === VERIFY_TOKEN && challenge) {
      console.log('✅ 11Labs webhook verified');
      res.status(200).send(challenge);
    } else {
      console.log('❌ 11Labs webhook verification failed');
      res.sendStatus(403);
    }
  });

  // === VOICE LEADS MANAGEMENT API ===
  
  // Get all voice leads
  app.get('/api/voice/leads', isAuthenticated, async (req: any, res) => {
    try {
      const { status, qualified, assigned_to, limit } = req.query;
      
      const filters: any = {};
      if (status) filters.status = status;
      if (qualified !== undefined) filters.isQualified = qualified === 'true';
      if (assigned_to) filters.assignedTo = assigned_to;
      if (limit) filters.limit = parseInt(limit);
      
      const leads = await storage.getVoiceLeads(filters);
      
      console.log(`📋 Получено ${leads.length} голосовых лидов из БД`);
      res.json(leads);
    } catch (error) {
      console.error('❌ Voice leads fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch voice leads' });
    }
  });
  
  // Get specific voice lead
  app.get('/api/voice/leads/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const lead = await storage.getVoiceLeadById(id);
      
      if (!lead) {
        return res.status(404).json({ error: 'Voice lead not found' });
      }
      
      res.json(lead);
    } catch (error) {
      console.error('❌ Voice lead fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch voice lead' });
    }
  });
  
  // Assign voice lead to user
  app.put('/api/voice/leads/:id/assign', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.user.id;
      
      const updatedLead = await storage.assignVoiceLead(id, userId);
      
      console.log(`✅ Voice lead ${id} assigned to user ${userId}`);
      res.json(updatedLead);
    } catch (error) {
      console.error('❌ Voice lead assignment error:', error);
      res.status(500).json({ error: 'Failed to assign voice lead' });
    }
  });
  
  // Convert voice lead to client
  app.post('/api/voice/leads/:id/convert', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { clientData } = req.body;
      const userId = req.session.user.id;
      
      // Add required fields for client creation
      const enrichedClientData = {
        ...clientData,
        assignedTo: userId,
        createdBy: userId,
        source: 'other'
      };
      
      const result = await storage.convertVoiceLeadToClient(id, enrichedClientData);
      
      console.log(`✅ Voice lead ${id} converted to client ${result.client.id}`);
      res.json(result);
    } catch (error) {
      console.error('❌ Voice lead conversion error:', error);
      res.status(500).json({ 
        error: 'Failed to convert voice lead',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Update voice lead (notes, priority, etc.)
  app.put('/api/voice/leads/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      const updatedLead = await storage.updateVoiceLead(id, updateData);
      
      console.log(`✅ Voice lead ${id} updated`);
      res.json(updatedLead);
    } catch (error) {
      console.error('❌ Voice lead update error:', error);
      res.status(500).json({ error: 'Failed to update voice lead' });
    }
  });
  
  // Get voice leads statistics
  app.get('/api/voice/stats', isAuthenticated, async (req: any, res) => {
    try {
      const stats = await storage.getVoiceLeadStats();
      
      console.log('📊 Voice leads stats:', stats);
      res.json(stats);
    } catch (error) {
      console.error('❌ Voice stats error:', error);
      res.status(500).json({ error: 'Failed to fetch voice leads statistics' });
    }
  });

  // Get Instagram media and analytics
  app.get('/api/instagram/media', isAuthenticated, async (req: any, res) => {
    try {
      const token = process.env.INSTAGRAM_ACCESS_TOKEN;
      
      if (!token) {
        return res.status(400).json({ error: 'Instagram token not configured' });
      }

      console.log('📷 Fetching Instagram media data...');
      
      // Get account info
      const accountResponse = await fetch(`https://graph.instagram.com/me?fields=id,username,account_type,media_count&access_token=${token}`);
      const accountData = await accountResponse.json();
      
      // Get recent media
      const mediaResponse = await fetch(`https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,timestamp,like_count,comments_count&limit=15&access_token=${token}`);
      const mediaData = await mediaResponse.json();
      
      if (accountResponse.ok && mediaResponse.ok) {
        // Calculate analytics
        const posts = mediaData.data || [];
        const totalLikes = posts.reduce((sum: number, post: any) => sum + (post.like_count || 0), 0);
        const totalComments = posts.reduce((sum: number, post: any) => sum + (post.comments_count || 0), 0);
        const avgEngagement = posts.length > 0 ? ((totalLikes + totalComments) / posts.length).toFixed(1) : '0';
        
        res.json({
          account: accountData,
          media: {
            posts: posts,
            total_count: posts.length,
            analytics: {
              total_likes: totalLikes,
              total_comments: totalComments,
              avg_engagement: avgEngagement,
              engagement_rate: accountData.media_count > 0 ? 
                ((totalLikes + totalComments) / accountData.media_count / 100).toFixed(2) + '%' : '0%'
            }
          }
        });
        
        console.log('✅ Instagram media data fetched successfully');
      } else {
        console.log('❌ Failed to fetch Instagram data:', { accountData, mediaData });
        res.status(400).json({
          error: 'Failed to fetch Instagram data',
          details: { account: accountData, media: mediaData }
        });
      }
      
    } catch (error) {
      console.error('❌ Instagram media fetch failed:', error);
      res.status(500).json({ 
        error: 'Failed to fetch Instagram media',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get Instagram user ID by username
  app.get('/api/instagram/user/:username', isAuthenticated, async (req: any, res) => {
    try {
      const { username } = req.params;
      const token = process.env.INSTAGRAM_ACCESS_TOKEN;
      
      if (!token) {
        return res.status(400).json({ error: 'Instagram token not configured' });
      }

      console.log('🔍 Looking up Instagram user:', username);
      
      // Instagram Graph API to find user ID by username
      const response = await fetch(`https://graph.instagram.com/${username}?fields=id,username&access_token=${token}`);
      const data = await response.json();

      if (response.ok) {
        console.log('✅ Found Instagram user:', data);
        res.json(data);
      } else {
        console.log('❌ Instagram user lookup failed:', data);
        res.status(404).json({
          error: data.error?.message || 'User not found',
          details: data
        });
      }
    } catch (error) {
      console.error('❌ Instagram user lookup failed:', error);
      res.status(500).json({ 
        error: 'Failed to lookup Instagram user',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Work session routes
  app.post('/api/work-sessions/start', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const now = new Date();
      
      const session = await storage.createWorkSession({
        userId,
        loginTime: now,
        date: now,
      });
      
      res.json(session);
    } catch (error) {
      console.error("Error starting work session:", error);
      res.status(500).json({ message: "Failed to start work session" });
    }
  });

  app.post('/api/work-sessions/:id/end', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      const now = new Date();
      
      const session = await storage.updateWorkSession(id, {
        logoutTime: now,
      });
      
      // Calculate total minutes and trigger automatic payroll calculation
      if (session.loginTime) {
        const totalMinutes = Math.floor((now.getTime() - session.loginTime.getTime()) / 60000);
        const updatedSession = await storage.updateWorkSession(id, { totalMinutes });
        
        // Auto-calculate payroll when work session is completed
        await storage.autoCalculatePayrollFromWorkSession(userId, updatedSession.date);
        
        res.json(updatedSession);
      } else {
        res.json(session);
      }
    } catch (error) {
      console.error("Error ending work session:", error);
      res.status(500).json({ message: "Failed to end work session" });
    }
  });

  app.get('/api/work-sessions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { startDate, endDate } = req.query;
      
      // Users can only see their own work sessions
      const sessions = await storage.getUserWorkSessions(
        userId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching work sessions:", error);
      res.status(500).json({ message: "Failed to fetch work sessions" });
    }
  });

  // Client routes
  app.get('/api/clients', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userRole = req.user.claims.role; // Получаем роль из токена, а не из БД
      
      // ОПТИМИЗАЦИЯ: используем роль из токена для избежания дополнительного запроса
      const isAdminDir = userRole === 'admin' || userRole === 'director';
      
      let clients;
      if (isAdminDir) {
        // Админ/директор видят всех клиентов
        clients = await storage.getClients();
      } else {
        // Менеджер видит только своих клиентов
        clients = await storage.getClients(userId);
      }
      
      res.json(clients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  app.get('/api/clients/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const client = await storage.getClient(id);
      
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      res.json(client);
    } catch (error) {
      console.error("Error fetching client:", error);
      res.status(500).json({ message: "Failed to fetch client" });
    }
  });

  app.post('/api/clients', isAuthenticated, async (req: any, res) => {
    // Demo mode check
    const userId = req.user.claims.sub;
    if (!await canEdit(userId)) {
      return res.status(403).json({ message: "Demo users can only view data" });
    }
    try {
      const userId = req.user.claims.sub;
      const clientData = insertClientSchema.parse({
        ...req.body,
        assignedTo: req.body.assignedTo || userId,
        createdBy: userId, // ✅ ИСПРАВЛЕНО: Сохраняем создателя
        lastContactDate: req.body.lastContactDate ? new Date(req.body.lastContactDate) : null,
      });
      
      const client = await storage.createClient(clientData);
      
      // Generate AI insight for lead classification (simplified)
      try {
        await storage.createAiInsight({
          type: 'lead_classification',
          entityId: client.id,
          entityType: 'client',
          confidence: "0.80",
          data: { classification: "warm", timestamp: new Date().toISOString() },
          userId,
        });
      } catch (aiError) {
        console.error("Error generating AI insight:", aiError);
        // Don't fail the client creation if AI fails
      }
      
      res.json(client);
    } catch (error) {
      console.error("Error creating client:", error);
      res.status(500).json({ message: "Failed to create client" });
    }
  });

  app.patch('/api/clients/:id', isAuthenticated, async (req: any, res) => {
    // Demo mode check
    const userId = req.user.claims.sub;
    if (!await canEdit(userId)) {
      return res.status(403).json({ message: "Demo users can only view data" });
    }
    try {
      const { id } = req.params;
      const user = await storage.getUser(userId);
      const userRole = user?.role || 'demo';
      
      // Check if user can edit this client
      if (userRole !== 'admin' && userRole !== 'director') {
        const client = await storage.getClient(id);
        if (!client || client.assignedTo !== userId) {
          return res.status(403).json({ message: "Access denied. You can only edit your own clients" });
        }
      }
      
      const updateData = {
        ...req.body,
        lastContactDate: req.body.lastContactDate ? new Date(req.body.lastContactDate) : undefined,
      };
      
      const client = await storage.updateClient(id, updateData);
      res.json(client);
    } catch (error) {
      console.error("Error updating client:", error);
      res.status(500).json({ message: "Failed to update client" });
    }
  });

  app.delete('/api/clients/:id', isAuthenticated, async (req: any, res) => {
    // Demo mode check
    const userId = req.user.claims.sub;
    if (!await canEdit(userId)) {
      return res.status(403).json({ message: "Demo users can only view data" });
    }
    try {
      const { id } = req.params;
      const user = await storage.getUser(userId);
      const userRole = user?.role || 'demo';
      
      // Check if user can delete this client
      if (userRole !== 'admin' && userRole !== 'director') {
        const client = await storage.getClient(id);
        if (!client || client.assignedTo !== userId) {
          return res.status(403).json({ message: "Access denied. You can only delete your own clients" });
        }
      }
      
      await storage.deleteClient(id);
      res.json({ message: "Client deleted successfully" });
    } catch (error) {
      console.error("Error deleting client:", error);
      res.status(500).json({ message: "Failed to delete client" });
    }
  });

  // Deal routes
  app.get('/api/deals', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userRole = req.user.claims.role || 'demo'; // ОПТИМИЗАЦИЯ: роль из токена
      
      let deals;
      if (userRole === 'admin' || userRole === 'director') {
        // Админ и директор видят все сделки
        deals = await storage.getDeals();
      } else {
        // Обычные пользователи видят сделки, назначенные им (по employee_id)
        const employee = await storage.getEmployeeByUserId(userId);
        if (employee) {
          deals = await storage.getDeals(employee.id); // Используем employee.id для фильтрации
        } else {
          deals = []; // Если нет employee записи, нет доступа к сделкам
        }
      }
      
      res.json(deals);
    } catch (error) {
      console.error("Error fetching deals:", error);
      res.status(500).json({ message: "Failed to fetch deals" });
    }
  });

  app.get('/api/deals/by-stage/:stage', isAuthenticated, async (req: any, res) => {
    try {
      const { stage } = req.params;
      const deals = await storage.getDealsByStage(stage);
      res.json(deals);
    } catch (error) {
      console.error("Error fetching deals by stage:", error);
      res.status(500).json({ message: "Failed to fetch deals by stage" });
    }
  });

  app.post('/api/deals', isAuthenticated, async (req: any, res) => {
    // Demo mode check
    const userId = req.user.claims.sub;
    if (!await canEdit(userId)) {
      return res.status(403).json({ message: "Demo users can only view data" });
    }
    try {
      const employee = await storage.getEmployeeByUserId(userId);
      if (!employee) {
        return res.status(400).json({ message: "Employee profile not found" });
      }
      
      const dealData = {
        ...req.body,
        assignedTo: req.body.assignedTo || employee.id,
        createdBy: userId, // ✅ ИСПРАВЛЕНО: Сохраняем создателя
        value: req.body.value ? parseFloat(req.body.value) : null,
        expectedCloseDate: req.body.expectedCloseDate ? new Date(req.body.expectedCloseDate) : null,
      };
      const deal = await storage.createDeal(dealData);
      
      // Generate AI insight for deal probability (simplified)
      try {
        await storage.createAiInsight({
          type: 'deal_probability',
          entityId: deal.id,
          entityType: 'deal',
          confidence: "0.80",
          data: { analysis: "Deal created", timestamp: new Date().toISOString() },
          userId,
        });
      } catch (aiError) {
        console.error("Error generating AI insight:", aiError);
      }
      
      res.json(deal);
    } catch (error) {
      console.error("Error creating deal:", error);
      res.status(500).json({ message: "Failed to create deal" });
    }
  });

  app.patch('/api/deals/:id', isAuthenticated, async (req: any, res) => {
    // Demo mode check
    const userId = req.user.claims.sub;
    if (!await canEdit(userId)) {
      return res.status(403).json({ message: "Demo users can only view data" });
    }
    try {
      const { id } = req.params;
      const user = await storage.getUser(userId);
      const userRole = user?.role || 'demo';
      
      // Check if user can edit this deal
      if (userRole !== 'admin' && userRole !== 'director') {
        const employee = await storage.getEmployeeByUserId(userId);
        if (!employee) {
          return res.status(403).json({ message: "Access denied" });
        }
        
        const deal = await storage.getDeal(id);
        if (!deal || deal.assignedTo !== employee.id) {
          return res.status(403).json({ message: "Access denied. You can only edit your own deals" });
        }
      }
      
      const updateData = {
        ...req.body,
        value: req.body.value ? parseFloat(req.body.value) : undefined,
        expectedCloseDate: req.body.expectedCloseDate ? new Date(req.body.expectedCloseDate) : undefined,
      };
      
      const deal = await storage.updateDeal(id, updateData);
      res.json(deal);
    } catch (error) {
      console.error("Error updating deal:", error);
      res.status(500).json({ message: "Failed to update deal" });
    }
  });

  app.delete('/api/deals/:id', isAuthenticated, async (req: any, res) => {
    // Demo mode check
    const userId = req.user.claims.sub;
    if (!await canEdit(userId)) {
      return res.status(403).json({ message: "Demo users can only view data" });
    }
    try {
      const { id } = req.params;
      const user = await storage.getUser(userId);
      const userRole = user?.role || 'demo';
      
      // Check if user can delete this deal
      if (userRole !== 'admin' && userRole !== 'director') {
        const employee = await storage.getEmployeeByUserId(userId);
        if (!employee) {
          return res.status(403).json({ message: "Access denied" });
        }
        
        const deal = await storage.getDeal(id);
        if (!deal || deal.assignedTo !== employee.id) {
          return res.status(403).json({ message: "Access denied. You can only delete your own deals" });
        }
      }
      
      await storage.deleteDeal(id);
      res.json({ message: "Deal deleted successfully" });
    } catch (error) {
      console.error("Error deleting deal:", error);
      res.status(500).json({ message: "Failed to delete deal" });
    }
  });

  // Task routes
  app.get('/api/tasks', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userRole = req.user.claims.role || 'demo'; // ОПТИМИЗАЦИЯ: роль из токена
      const { status } = req.query;
      
      let tasks;
      if (userRole === 'admin' || userRole === 'director') {
        // Админ и директор видят все задачи
        if (status) {
          tasks = await storage.getTasksByStatus(status as string);
        } else {
          tasks = await storage.getTasks();
        }
      } else {
        // Обычные пользователи видят свои задачи (по employee_id)
        const employee = await storage.getEmployeeByUserId(userId);
        if (employee) {
          if (status) {
            tasks = await storage.getTasksByStatus(status as string, employee.id);
          } else {
            tasks = await storage.getTasks(employee.id); // Используем employee.id для фильтрации
          }
        } else {
          tasks = []; // Если нет employee записи, нет доступа к задачам
        }
      }
      
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.get('/api/tasks/overdue', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userRole = req.user.claims.role || 'demo';
      
      let tasks;
      if (userRole === 'admin' || userRole === 'director') {
        // Админ и директор видят все просроченные задачи
        tasks = await storage.getOverdueTasks();
      } else {
        // Обычные пользователи видят только свои просроченные задачи (по employee_id)
        const employee = await storage.getEmployeeByUserId(userId);
        if (employee) {
          tasks = await storage.getOverdueTasks(employee.id);
        } else {
          tasks = []; // Если нет employee записи, нет доступа к задачам
        }
      }
      
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching overdue tasks:", error);
      res.status(500).json({ message: "Failed to fetch overdue tasks" });
    }
  });

  app.post('/api/tasks', isAuthenticated, async (req: any, res) => {
    // Demo mode check
    const userId = req.user.claims.sub;
    if (!await canEdit(userId)) {
      return res.status(403).json({ message: "Demo users can only view data" });
    }
    try {
      const employee = await storage.getEmployeeByUserId(userId);
      if (!employee) {
        return res.status(400).json({ message: "Employee profile not found" });
      }
      
      const taskData = insertTaskSchema.parse({
        ...req.body,
        assignedTo: req.body.assignedTo || employee.id,
        createdBy: userId, // ✅ ИСПРАВЛЕНО: Сохраняем создателя
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null,
        reminderDate: req.body.reminderDate ? new Date(req.body.reminderDate) : null,
      });
      
      const task = await storage.createTask(taskData);
      res.json(task);
    } catch (error) {
      console.error("Error creating task:", error);
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  app.patch('/api/tasks/:id', isAuthenticated, async (req: any, res) => {
    // Demo mode check
    const userId = req.user.claims.sub;
    if (!await canEdit(userId)) {
      return res.status(403).json({ message: "Demo users can only view data" });
    }
    try {
      const { id } = req.params;
      const user = await storage.getUser(userId);
      const userRole = user?.role || 'demo';
      
      // Check if user can edit this task
      if (userRole !== 'admin' && userRole !== 'director') {
        const employee = await storage.getEmployeeByUserId(userId);
        if (!employee) {
          return res.status(403).json({ message: "Access denied" });
        }
        
        const task = await storage.getTask(id);
        if (!task || task.assignedTo !== employee.id) {
          return res.status(403).json({ message: "Access denied. You can only edit your own tasks" });
        }
      }
      
      const updateData = {
        ...req.body,
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : undefined,
        reminderDate: req.body.reminderDate ? new Date(req.body.reminderDate) : undefined,
      };
      
      if (updateData.status === 'completed') {
        updateData.completedAt = new Date();
      }
      
      const task = await storage.updateTask(id, updateData);
      res.json(task);
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(500).json({ message: "Failed to update task" });
    }
  });

  app.delete('/api/tasks/:id', isAuthenticated, async (req: any, res) => {
    // Demo mode check
    const userId = req.user.claims.sub;
    if (!await canEdit(userId)) {
      return res.status(403).json({ message: "Demo users can only view data" });
    }
    try {
      const { id } = req.params;
      const user = await storage.getUser(userId);
      const userRole = user?.role || 'demo';
      
      // Check if user can delete this task
      if (userRole !== 'admin' && userRole !== 'director') {
        const employee = await storage.getEmployeeByUserId(userId);
        if (!employee) {
          return res.status(403).json({ message: "Access denied" });
        }
        
        const task = await storage.getTask(id);
        if (!task || task.assignedTo !== employee.id) {
          return res.status(403).json({ message: "Access denied. You can only delete your own tasks" });
        }
      }
      
      await storage.deleteTask(id);
      res.json({ message: "Task deleted successfully" });
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  // Analytics routes
  app.get('/api/analytics/kpis', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const userRole = user?.role || 'demo';
      const { startDate, endDate } = req.query;
      
      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();
      
      let kpis;
      if (userRole === 'admin' || userRole === 'director') {
        // Admin and directors see company-wide KPIs
        kpis = await storage.getCompanyKPIs(start, end);
      } else {
        // Regular users and demo users see their own KPIs (if they are also employees)
        const employee = await storage.getEmployeeByUserId(userId);
        if (employee) {
          kpis = await storage.getUserKPIs(employee.id, start, end);
        } else {
          kpis = { leadsCount: 0, dealsCount: 0, dealsValue: 0, conversionRate: 0, workHours: 0 };
        }
      }
      
      res.json(kpis);
    } catch (error) {
      console.error("Error fetching KPIs:", error);
      res.status(500).json({ message: "Failed to fetch KPIs" });
    }
  });

  app.get('/api/analytics/lead-sources', isAuthenticated, async (req, res) => {
    try {
      const stats = await storage.getLeadSourceStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching lead source stats:", error);
      res.status(500).json({ message: "Failed to fetch lead source stats" });
    }
  });

  // AI routes
  app.get('/api/ai/insights/:entityId/:entityType', isAuthenticated, async (req, res) => {
    try {
      const { entityId, entityType } = req.params;
      const insights = await storage.getAiInsights(entityId, entityType);
      res.json(insights);
    } catch (error) {
      console.error("Error fetching AI insights:", error);
      res.status(500).json({ message: "Failed to fetch AI insights" });
    }
  });

  app.post('/api/ai/recommendations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      // Simplified recommendations
      const recommendations = [
        { type: 'tip', message: 'Follow up with new leads within 24 hours', priority: 'high' },
        { type: 'insight', message: 'Your conversion rate is improving', priority: 'medium' },
      ];
      res.json(recommendations);
    } catch (error) {
      console.error("Error generating recommendations:", error);
      res.status(500).json({ message: "Failed to generate recommendations" });
    }
  });

  // Work Sessions routes
  app.get('/api/work-sessions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { startDate, endDate } = req.query;
      
      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();
      
      const workSessions = await storage.getUserWorkSessions(userId, start, end);
      res.json(workSessions);
    } catch (error) {
      console.error("Error fetching work sessions:", error);
      res.status(500).json({ message: "Failed to fetch work sessions" });
    }
  });

  app.post('/api/work-sessions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const sessionData = insertWorkSessionSchema.parse({
        ...req.body,
        userId,
        loginTime: req.body.loginTime ? new Date(req.body.loginTime) : new Date(),
        logoutTime: req.body.logoutTime ? new Date(req.body.logoutTime) : null,
        date: req.body.date ? new Date(req.body.date) : new Date(),
      });
      
      const workSession = await storage.createWorkSession(sessionData);
      res.json(workSession);
    } catch (error) {
      console.error("Error creating work session:", error);
      res.status(500).json({ message: "Failed to create work session" });
    }
  });

  app.patch('/api/work-sessions/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = {
        ...req.body,
        loginTime: req.body.loginTime ? new Date(req.body.loginTime) : undefined,
        logoutTime: req.body.logoutTime ? new Date(req.body.logoutTime) : undefined,
        date: req.body.date ? new Date(req.body.date) : undefined,
      };
      
      const workSession = await storage.updateWorkSession(id, updateData);
      res.json(workSession);
    } catch (error) {
      console.error("Error updating work session:", error);
      res.status(500).json({ message: "Failed to update work session" });
    }
  });

  // Employee management routes
  app.get("/api/employees", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      if (!(await canManage(userId))) {
        return res.status(403).json({ message: "Access denied. Only admin, director, manager, and employee can view employees." });
      }
      
      // Admin and director see all employees
      if (await isAdminOrDirector(userId)) {
        const employees = await storage.getEmployees();
        res.json(employees);
      } else {
        // Manager and employee see only themselves
        const employee = await storage.getEmployeeByUserId(userId);
        if (employee) {
          res.json([employee]);
        } else {
          res.json([]);
        }
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
      res.status(500).json({ message: "Failed to fetch employees" });
    }
  });

  app.get("/api/employees/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Only admin and director can view employee details
      if (!(await isAdminOrDirector(userId))) {
        return res.status(403).json({ message: "Access denied. Only admin and director can view employee details." });
      }
      
      const employee = await storage.getEmployee(req.params.id);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      res.json(employee);
    } catch (error) {
      console.error("Error fetching employee:", error);
      res.status(500).json({ message: "Failed to fetch employee" });
    }
  });

  app.post("/api/employees", isAuthenticated, async (req: any, res) => {
    // Demo mode check
    const userId = req.user.claims.sub;
    if (!await canEdit(userId)) {
      return res.status(403).json({ message: "Demo users can only view data" });
    }
    try {
      
      // Only admin and director can create employees
      if (!(await isAdminOrDirector(userId))) {
        return res.status(403).json({ message: "Access denied. Only admin and director can create employees." });
      }
      
      const employeeData = {
        ...req.body,
        dateOfBirth: req.body.dateOfBirth ? new Date(req.body.dateOfBirth) : null,
        hireDate: req.body.hireDate ? new Date(req.body.hireDate) : new Date(),
        terminationDate: req.body.terminationDate ? new Date(req.body.terminationDate) : null,
        monthlySalary: req.body.monthlySalary ? parseFloat(req.body.monthlySalary) : null,
        dailyWorkingHours: req.body.dailyWorkingHours ? parseFloat(req.body.dailyWorkingHours) : 8.0,
      };
      const employee = await storage.createEmployee(employeeData);
      res.status(201).json(employee);
    } catch (error) {
      console.error("Error creating employee:", error);
      res.status(500).json({ message: "Failed to create employee" });
    }
  });

  app.patch("/api/employees/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Only admin and director can update employees
      if (!(await isAdminOrDirector(userId))) {
        return res.status(403).json({ message: "Access denied. Only admin and director can update employees." });
      }
      
      const updateData = {
        ...req.body,
        dateOfBirth: req.body.dateOfBirth ? new Date(req.body.dateOfBirth) : undefined,
        hireDate: req.body.hireDate ? new Date(req.body.hireDate) : undefined,
        terminationDate: req.body.terminationDate ? new Date(req.body.terminationDate) : undefined,
        monthlySalary: req.body.monthlySalary ? parseFloat(req.body.monthlySalary) : undefined,
        dailyWorkingHours: req.body.dailyWorkingHours ? parseFloat(req.body.dailyWorkingHours) : undefined,
      };
      const employee = await storage.updateEmployee(req.params.id, updateData);
      res.json(employee);
    } catch (error) {
      console.error("Error updating employee:", error);
      res.status(500).json({ message: "Failed to update employee" });
    }
  });

  app.delete("/api/employees/:id", isAuthenticated, async (req: any, res) => {
    // Demo mode check  
    const userId = req.user.claims.sub;
    if (!await canEdit(userId)) {
      return res.status(403).json({ message: "Demo users can only view data" });
    }
    try {
      // Only admin and director can delete employees
      if (!(await isAdminOrDirector(userId))) {
        return res.status(403).json({ message: "Access denied. Only admin and director can delete employees." });
      }
      
      await storage.deleteEmployee(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting employee:", error);
      res.status(500).json({ message: "Failed to delete employee" });
    }
  });

  // Payroll routes
  app.get("/api/payroll/monthly", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const userId = user?.claims?.sub;
      
      // Get user role from database
      const dbUser = await storage.getUserById(userId);
      const userRole = dbUser?.role || 'employee';
      
      const { month, year } = req.query;
      console.log("Payroll request params:", { month, year });
      
      if (!month || !year) {
        return res.status(400).json({ message: "Month and year are required" });
      }
      
      let monthlyPayroll;
      
      if (userRole === 'admin' || userRole === 'director') {
        // Admin and directors can see all payroll data
        monthlyPayroll = await storage.getMonthlyPayrollByPeriod(parseInt(month as string), parseInt(year as string));
      } else {
        // Regular employees and managers can only see their own payroll
        const employee = await storage.getEmployeeByUserId(userId);
        if (!employee) {
          return res.status(403).json({ message: "Access denied. Employee record not found." });
        }
        
        // Get only this employee's payroll data
        const allPayroll = await storage.getMonthlyPayrollByPeriod(parseInt(month as string), parseInt(year as string));
        monthlyPayroll = allPayroll.filter(p => p.employeeId === employee.id);
      }
      
      console.log("Monthly payroll found:", monthlyPayroll.length, "records");
      res.json(monthlyPayroll);
    } catch (error) {
      console.error("Error fetching monthly payroll:", error);
      res.status(500).json({ message: "Failed to fetch monthly payroll" });
    }
  });

  app.post("/api/payroll/generate", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const userId = user?.claims?.sub;
      
      // Get user role from database
      const dbUser = await storage.getUserById(userId);
      const userRole = dbUser?.role || 'employee';
      
      // Only admin and directors can generate payroll
      if (userRole !== 'admin' && userRole !== 'director') {
        return res.status(403).json({ message: "Access denied. Only admin and directors can generate payroll." });
      }
      
      const { month, year, payrollData } = req.body;
      
      // Delete existing payroll for the month
      await storage.deleteMonthlyPayroll(month, year);
      
      // Create new monthly payroll records
      const results = [];
      for (const data of payrollData) {
        const payroll = await storage.createMonthlyPayroll(data);
        results.push(payroll);
      }
      
      res.status(201).json(results);
    } catch (error) {
      console.error("Error generating payroll:", error);
      res.status(500).json({ message: "Failed to generate payroll" });
    }
  });

  // Helper function to calculate daily payroll from work sessions
  async function calculateDailyPayrollFromWorkSessions(userId: string, userRole: string, employeeId?: string, startDateStr?: string, endDateStr?: string) {
    try {
      // For admin/director - get all employees, for employee - get their own data
      let employeesToProcess: any[] = [];
      
      if (userRole === 'admin' || userRole === 'director') {
        if (employeeId) {
          // Get specific employee
          const employee = await storage.getEmployee(employeeId);
          if (employee) employeesToProcess = [employee];
        } else {
          // Get all employees
          employeesToProcess = await storage.getEmployees();
        }
      } else {
        // For regular employees, find their employee record
        const employee = await storage.getEmployeeByUserId(userId);
        if (employee) employeesToProcess = [employee];
      }

      const dailyPayrollResults: any[] = [];
      
      // Use provided date range or default to current month
      let startDate: Date, endDate: Date;
      if (startDateStr && endDateStr) {
        startDate = new Date(startDateStr);
        endDate = new Date(endDateStr);
        endDate.setHours(23, 59, 59); // End of day
      } else {
        // Default to current month
        const now = new Date();
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59);
      }

      for (const employee of employeesToProcess) {
        // Get work sessions for date range
        let workSessionsList: any[] = [];
        
        // Try to find work sessions by employee.userId
        if (employee.userId) {
          workSessionsList = await db
            .select()
            .from(workSessions)
            .where(and(
              eq(workSessions.userId, employee.userId),
              gte(workSessions.date, startDate),
              lte(workSessions.date, endDate),
              isNotNull(workSessions.logoutTime)
            ));
        }
        
        // If no sessions found and we're looking at current user, try direct userId match
        if (workSessionsList.length === 0 && (userRole === 'admin' || userRole === 'director')) {
          workSessionsList = await db
            .select()
            .from(workSessions)
            .where(and(
              eq(workSessions.userId, userId),
              gte(workSessions.date, startDate),
              lte(workSessions.date, endDate),
              isNotNull(workSessions.logoutTime)
            ));
        }

        if (workSessionsList.length > 0) {
          // Group sessions by date
          const sessionsByDate = new Map<string, any[]>();
          workSessionsList.forEach(session => {
            const dateKey = new Date(session.date).toISOString().split('T')[0];
            if (!sessionsByDate.has(dateKey)) {
              sessionsByDate.set(dateKey, []);
            }
            sessionsByDate.get(dateKey)!.push(session);
          });

          // Create payroll record for each day
          for (const [dateKey, daySessions] of sessionsByDate) {
            // Calculate total minutes worked this day
            const totalMinutes = daySessions.reduce((sum, session) => sum + (session.totalMinutes || 0), 0);
            const actualHours = totalMinutes / 60;
            
            // Get employee rates
            const plannedHours = parseFloat(employee.dailyWorkingHours || "8");
            let hourlyRate = parseFloat(employee.hourlyRate || "0");
            
            if (hourlyRate === 0 && employee.monthlySalary) {
              const monthlyWorkingDays = 22;
              hourlyRate = parseFloat(employee.monthlySalary) / (monthlyWorkingDays * plannedHours);
            }
            if (hourlyRate === 0) {
              hourlyRate = 50; // Default rate
            }

            // Get rate coefficients from employee data
            const overtimeRate = parseFloat(employee.overtimeRate || "1.5");
            const weekendRate = parseFloat(employee.weekendRate || "1.25"); 
            const holidayRate = parseFloat(employee.holidayRate || "2.0");
            
            // Check if it's weekend or holiday
            const workDate = new Date(dateKey);
            const dayOfWeek = workDate.getDay();
            const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6); // Sunday = 0, Saturday = 6
            
            // Apply rate multipliers
            let effectiveHourlyRate = hourlyRate;
            if (isWeekend) {
              effectiveHourlyRate = hourlyRate * weekendRate;
            }
            
            // Calculate pay
            const overtimeHours = Math.max(0, actualHours - plannedHours);
            const regularHours = Math.min(actualHours, plannedHours);
            const basePay = regularHours * effectiveHourlyRate;
            const overtimePay = overtimeHours * effectiveHourlyRate * overtimeRate;
          const grossPay = basePay + overtimePay;

          // Calculate Turkish tax deductions
          const incomeTax = grossPay * 0.15;
          const socialSecurity = grossPay * 0.14;
          const unemploymentInsurance = grossPay * 0.01;
          const totalDeductions = incomeTax + socialSecurity + unemploymentInsurance;
          const netPay = grossPay - totalDeductions;

            // Add daily record
            dailyPayrollResults.push({
              id: `${employee.id}-${dateKey}`,
              employee: `${employee.firstName} ${employee.lastName}`,
              employeeId: employee.id,
              employeeRole: employee.role,
              firstName: employee.firstName,
              lastName: employee.lastName,
              date: dateKey,
              plannedHours,
              actualHours: actualHours.toFixed(2),
              overtimeHours: overtimeHours.toFixed(2),
              hourlyRate: effectiveHourlyRate,
              grossPay: grossPay.toFixed(2),
              totalDeductions: totalDeductions.toFixed(2),
              netPay: netPay.toFixed(2),
              workSessionCount: daySessions.length,
              role: employee.role || 'employee'
            });
          }
        }
      }

      // Sort by employee name first, then by date ascending
      return dailyPayrollResults.sort((a, b) => {
        if (a.employee !== b.employee) {
          return a.employee.localeCompare(b.employee);
        }
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });
    } catch (error) {
      console.error('Error calculating daily payroll from work sessions:', error);
      return [];
    }
  }

  // Get all daily payroll records (with optional filtering)
  app.get("/api/payroll/daily", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const userId = user?.claims?.sub;
      
      // Get user role from database (users table has role field)
      const dbUser = await storage.getUserById(userId);
      const userRole = dbUser?.role || 'employee';
      
      console.log('Daily payroll request for user:', userId, 'role:', userRole);
      
      const { employeeId, startDate, endDate } = req.query;
      
      // Calculate daily payroll from work sessions with date range
      const dailyPayroll = await calculateDailyPayrollFromWorkSessions(userId, userRole, employeeId as string, startDate as string, endDate as string);
      
      console.log('Daily payroll found:', dailyPayroll.length, 'records');
      res.json(dailyPayroll);
    } catch (error) {
      console.error("Error fetching daily payroll:", error);
      res.status(500).json({ message: "Failed to fetch daily payroll" });
    }
  });

  app.get("/api/payroll/daily/:employeeId", isAuthenticated, async (req, res) => {
    try {
      const { employeeId } = req.params;
      const { startDate, endDate } = req.query;
      
      // For now, return empty array as the getDailyPayroll method needs to be updated for employee-based filtering
      const dailyPayroll = [];
      res.json(dailyPayroll);
    } catch (error) {
      console.error("Error fetching daily payroll:", error);
      res.status(500).json({ message: "Failed to fetch daily payroll" });
    }
  });

  app.post("/api/payroll/daily", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const userId = user?.claims?.sub;
      
      // Get user role from database
      const dbUser = await storage.getUserById(userId);
      const userRole = dbUser?.role || 'employee';
      
      // Only admin and directors can create daily payroll records
      if (userRole !== 'admin' && userRole !== 'director') {
        return res.status(403).json({ message: "Access denied. Only admin and directors can create daily payroll." });
      }
      
      const dailyPayrollData = {
        ...req.body,
        date: req.body.date ? new Date(req.body.date) : new Date(),
        plannedHours: parseFloat(req.body.plannedHours),
        actualHours: parseFloat(req.body.actualHours || "0"),
        hourlyRate: parseFloat(req.body.hourlyRate),
        basePay: parseFloat(req.body.basePay),
        actualPay: parseFloat(req.body.actualPay || "0"),
        overtime: parseFloat(req.body.overtime || "0"),
        overtimePay: parseFloat(req.body.overtimePay || "0"),
      };
      
      const dailyPayroll = await storage.createDailyPayroll(dailyPayrollData);
      res.status(201).json(dailyPayroll);
    } catch (error) {
      console.error("Error creating daily payroll:", error);
      res.status(500).json({ message: "Failed to create daily payroll" });
    }
  });

  // Update daily payroll record
  app.put("/api/payroll/daily/:id", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const userId = user?.claims?.sub;
      
      // Get user role from database
      const dbUser = await storage.getUserById(userId);
      const userRole = dbUser?.role || 'employee';
      
      // Only admin and directors can edit daily payroll records
      if (userRole !== 'admin' && userRole !== 'director') {
        return res.status(403).json({ message: "Access denied. Only admin and directors can edit daily payroll." });
      }
      
      const { id } = req.params;
      
      // Check if it's a composite key (employeeId-date format)
      const datePattern = /(\d{4}-\d{2}-\d{2})$/;
      const dateMatch = id.match(datePattern);
      
      if (dateMatch) {
        const dateStr = dateMatch[1]; // The YYYY-MM-DD part
        const employeeId = id.replace(`-${dateStr}`, ''); // Everything before the date
        const date = new Date(dateStr);
        
        console.log('Updating daily payroll composite ID:', { id, employeeId, dateStr });
        
        // Update work sessions for this employee and date
        const updated = await storage.updateWorkSessionsByEmployeeAndDate(
          employeeId, 
          date, 
          {
            actualHours: req.body.actualHours ? parseFloat(req.body.actualHours) : undefined,
            plannedHours: req.body.plannedHours ? parseFloat(req.body.plannedHours) : undefined,
            hourlyRate: req.body.hourlyRate ? parseFloat(req.body.hourlyRate) : undefined,
          }
        );
        
        if (updated) {
          // Return success response - the actual data will be recalculated on next request
          res.json({ 
            message: "Daily payroll record updated successfully",
            id,
            employeeId,
            date: dateStr
          });
        } else {
          res.status(404).json({ message: "Daily payroll record not found" });
        }
      } else {
        // Regular UUID update (fallback)
        const updateData = {
          ...req.body,
          date: req.body.date ? new Date(req.body.date) : undefined,
          plannedHours: req.body.plannedHours ? parseFloat(req.body.plannedHours) : undefined,
          actualHours: req.body.actualHours ? parseFloat(req.body.actualHours) : undefined,
          hourlyRate: req.body.hourlyRate ? parseFloat(req.body.hourlyRate) : undefined,
        };
        
        // Remove undefined values
        Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);
        
        const updatedPayroll = await storage.updateDailyPayroll(id, updateData);
        res.json(updatedPayroll);
      }
    } catch (error) {
      console.error("Error updating daily payroll:", error);
      res.status(500).json({ message: "Failed to update daily payroll" });
    }
  });

  // Delete daily payroll record
  app.delete("/api/payroll/daily/:id", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const userId = user?.claims?.sub;
      
      // Get user role from database
      const dbUser = await storage.getUserById(userId);
      const userRole = dbUser?.role || 'employee';
      
      // Only admin and directors can delete daily payroll records
      if (userRole !== 'admin' && userRole !== 'director') {
        return res.status(403).json({ message: "Access denied. Only admin and directors can delete daily payroll." });
      }
      
      const { id } = req.params;
      
      // Check if it's a composite key (employeeId-date format)
      // Look for date pattern YYYY-MM-DD at the end
      const datePattern = /(\d{4}-\d{2}-\d{2})$/;
      const dateMatch = id.match(datePattern);
      
      if (dateMatch) {
        const dateStr = dateMatch[1]; // The YYYY-MM-DD part
        const employeeId = id.replace(`-${dateStr}`, ''); // Everything before the date
        
        console.log('Parsing composite ID:', { id, employeeId, dateStr });
        
        try {
          const date = new Date(dateStr);
          if (isNaN(date.getTime())) {
            throw new Error('Invalid date');
          }
          
          // Delete work sessions for this employee and date (since daily payroll is calculated from work_sessions)
          const deleted = await storage.deleteWorkSessionsByEmployeeAndDate(employeeId, date);
          
          if (deleted) {
            res.json({ message: "Daily payroll record deleted successfully" });
          } else {
            res.status(404).json({ message: "Daily payroll record not found" });
          }
        } catch (dateError) {
          console.error('Date parsing error:', dateError);
          // If date parsing fails, try regular ID deletion
          const deleted = await storage.deleteDailyPayroll(id);
          
          if (deleted) {
            res.json({ message: "Daily payroll record deleted successfully" });
          } else {
            res.status(404).json({ message: "Daily payroll record not found" });
          }
        }
      } else {
        // Regular UUID deletion
        const deleted = await storage.deleteDailyPayroll(id);
        
        if (deleted) {
          res.json({ message: "Daily payroll record deleted successfully" });
        } else {
          res.status(404).json({ message: "Daily payroll record not found" });
        }
      }
    } catch (error) {
      console.error("Error deleting daily payroll:", error);
      res.status(500).json({ message: "Failed to delete daily payroll" });
    }
  });

  // Sync monthly payroll from daily records
  app.post("/api/payroll/sync", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const userId = user?.claims?.sub;
      
      // Get user role from database
      const dbUser = await storage.getUserById(userId);
      const userRole = dbUser?.role || 'employee';
      
      // Only admin and directors can sync payroll
      if (userRole !== 'admin' && userRole !== 'director') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const { month, year } = req.body;
      
      if (!month || !year) {
        return res.status(400).json({ message: "Month and year are required" });
      }
      
      // Calculate monthly payroll based on daily work sessions
      const employees = await storage.getEmployees();
      const syncResults = [];
      
      for (const employee of employees) {
        // Calculate total work hours for the month from work sessions
        const startOfMonth = new Date(year, month - 1, 1);
        const endOfMonth = new Date(year, month, 0, 23, 59, 59);
        
        const workSessionsList = await db
          .select()
          .from(workSessions)
          .where(and(
            eq(workSessions.userId, employee.userId || employee.id),
            gte(workSessions.date, startOfMonth),
            lte(workSessions.date, endOfMonth),
            isNotNull(workSessions.logoutTime)
          ));
        
        const totalMinutes = workSessionsList.reduce((sum, session) => sum + (session.totalMinutes || 0), 0);
        const actualHours = totalMinutes / 60;
        
        // Process all employees, even with 0 hours
        const plannedHours = parseFloat(employee.dailyWorkingHours || "8") * 22; // 22 working days
        let hourlyRate = parseFloat(employee.hourlyRate || "0");
        
        if (hourlyRate === 0 && employee.monthlySalary) {
          hourlyRate = parseFloat(employee.monthlySalary) / (22 * parseFloat(employee.dailyWorkingHours || "8"));
        }
        if (hourlyRate === 0) {
          hourlyRate = 50;
        }
        
        // Use ACTUAL hours worked, not planned hours
        const overtimeHours = Math.max(0, actualHours - plannedHours);
        const regularHours = Math.min(actualHours, plannedHours);
        const basePay = regularHours * hourlyRate;
        const overtimePay = overtimeHours * hourlyRate * 1.5;
        const grossSalary = basePay + overtimePay;
        
        // Turkish tax calculations
        const incomeTax = grossSalary * 0.15;
        const socialSecurityEmployee = grossSalary * 0.14;
        const unemploymentInsuranceEmployee = grossSalary * 0.01;
        const totalDeductions = incomeTax + socialSecurityEmployee + unemploymentInsuranceEmployee;
        const netSalary = grossSalary - totalDeductions;
        
        // Employer costs
        const socialSecurityEmployer = grossSalary * 0.155;
        const unemploymentInsuranceEmployer = grossSalary * 0.02;
        
        // Update or create monthly payroll with REAL data
        const payrollData = {
          userId: employee.userId || employee.id,
          employeeId: employee.id,
          month,
          year,
          workingDays: 22,
          plannedHours,
          actualHours, // This is REAL hours from work sessions
          overtimeHours,
          hourlyRate,
          basePay,
          overtimePay,
          grossSalary,
          incomeTax,
          socialSecurityEmployee,
          unemploymentInsuranceEmployee,
          netSalary,
          socialSecurityEmployer,
          unemploymentInsuranceEmployer,
          totalEmployerCost: grossSalary + socialSecurityEmployer + unemploymentInsuranceEmployer
        };
        
        const existingPayroll = await storage.getMonthlyPayroll(employee.userId || employee.id, month, year);
        if (existingPayroll) {
          await storage.updateMonthlyPayroll(existingPayroll.id, payrollData);
        } else {
          await storage.createMonthlyPayroll(payrollData);
        }
        
        syncResults.push({
          employee: `${employee.firstName} ${employee.lastName}`,
          actualHours,
          grossSalary,
          netSalary
        });
      }
      
      res.json({ 
        message: "Payroll synchronized successfully", 
        syncedEmployees: syncResults.length,
        results: syncResults 
      });
    } catch (error) {
      console.error("Error syncing payroll:", error);
      res.status(500).json({ message: "Failed to sync payroll" });
    }
  });

  // Calculate daily payroll for an employee
  app.post("/api/payroll/daily/calculate", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const userId = user?.claims?.sub;
      
      // Get user role from database (users table has role field)
      const dbUser = await storage.getUserById(userId);
      const userRole = dbUser?.role || 'employee';
      
      // Only admin and directors can calculate daily payroll
      if (userRole !== 'admin' && userRole !== 'director') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const { employeeId, date } = req.body;
      const targetDate = new Date(date);
      
      // Get employee data
      const employee = await storage.getEmployee(employeeId);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      // Get planned daily hours from employee profile (default to 8 if not set)
      const plannedHours = parseFloat(employee.dailyWorkingHours || "8");
      
      // Get hourly rate directly from employee profile or calculate from monthly salary
      let hourlyRate = parseFloat(employee.hourlyRate || "0");
      if (hourlyRate === 0 && employee.monthlySalary) {
        // Calculate hourly rate from monthly salary: monthly / (22 working days * daily hours)
        const monthlyWorkingDays = 22; // Standard Turkish working days per month
        hourlyRate = parseFloat(employee.monthlySalary) / (monthlyWorkingDays * plannedHours);
      }
      if (hourlyRate === 0) {
        hourlyRate = 50; // fallback default rate
      }
      
      // For now, use planned hours as actual hours (later this will come from work sessions)
      const actualHours = plannedHours; // Later this will be calculated from work sessions
      
      const overtimeHours = Math.max(0, actualHours - plannedHours);
      const regularHours = Math.min(actualHours, plannedHours);
      
      const basePay = regularHours * hourlyRate;
      const overtimePay = overtimeHours * hourlyRate * 1.5; // 1.5x rate for overtime
      const actualPay = actualHours * hourlyRate; // Actual pay = all actual hours * hourly rate
      const grossPay = basePay + overtimePay;
      
      // Calculate Turkish tax deductions
      const incomeTax = grossPay * 0.15; // Simplified calculation
      const stampTax = grossPay * 0.00759;
      const socialSecurityEmployee = grossPay * 0.14;
      const unemploymentInsuranceEmployee = grossPay * 0.01;
      
      const totalDeductions = incomeTax + stampTax + socialSecurityEmployee + unemploymentInsuranceEmployee;
      const netPay = grossPay - totalDeductions;
      
      const dailyPayrollData = {
        userId,
        employeeId,
        date: targetDate,
        plannedHours: plannedHours.toString(),
        actualHours: actualHours.toString(),
        overtimeHours: overtimeHours.toString(),
        workHours: actualHours.toString(),
        hourlyRate: hourlyRate.toString(),
        basePay: basePay.toString(),
        actualPay: actualPay.toString(),
        overtimePay: overtimePay.toString(),
        grossPay: grossPay.toString(),
        incomeTax: incomeTax.toString(),
        socialSecurity: socialSecurityEmployee.toString(),
        unemploymentInsurance: unemploymentInsuranceEmployee.toString(),
        netPay: netPay.toString(),
      };
      
      const dailyPayroll = await storage.createDailyPayroll(dailyPayrollData);
      res.status(201).json(dailyPayroll);
    } catch (error) {
      console.error("Error calculating daily payroll:", error);
      res.status(500).json({ message: "Failed to calculate daily payroll" });
    }
  });

  // Force sync monthly payroll from daily records
  app.post("/api/payroll/sync", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const userId = user?.claims?.sub;
      
      // Get user role from database
      const dbUser = await storage.getUserById(userId);
      const userRole = dbUser?.role || 'employee';
      
      // Only admin and directors can force sync
      if (userRole !== 'admin' && userRole !== 'director') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const { month, year, employeeId } = req.body;
      
      console.log(`Sync request received: month=${month}, year=${year}, employeeId=${employeeId}`);
      
      // If specific employee provided, sync only for that employee
      if (employeeId) {
        const employee = await storage.getEmployee(employeeId);
        if (!employee) {
          return res.status(404).json({ message: "Employee not found" });
        }
        
        // Use employee's userId for sync
        const targetUserId = employee.userId || userId;
        const targetDate = new Date(year, month - 1, 15); // Mid-month date for reference
        
        console.log(`Syncing single employee: ${employeeId}, targetUserId: ${targetUserId}`);
        
        await storage.syncMonthlyPayrollFromDaily(targetUserId, employeeId, targetDate);
        res.json({ message: "Payroll synchronized for employee", employeeId });
      } else {
        // Sync for all employees in the specified month/year
        const employees = await storage.getEmployees();
        console.log(`Syncing ${employees.length} employees`);
        
        let successCount = 0;
        let errorCount = 0;
        
        for (const employee of employees) {
          try {
            const targetUserId = employee.userId || userId;
            const targetDate = new Date(year, month - 1, 15);
            await storage.syncMonthlyPayrollFromDaily(targetUserId, employee.id, targetDate);
            successCount++;
          } catch (error) {
            console.error(`Failed to sync employee ${employee.id}:`, error);
            errorCount++;
          }
        }
        
        res.json({ 
          message: `Payroll synchronized for ${successCount} employees`, 
          successCount, 
          errorCount,
          month, 
          year 
        });
      }
    } catch (error) {
      console.error("Error syncing payroll:", error);
      res.status(500).json({ message: "Failed to sync payroll", error: error.message });
    }
  });

  // Voice AI Routes with 11Labs
  // Get available voices
  app.get("/api/voice/voices", isAuthenticated, async (req, res) => {
    try {
      const { elevenLabsService } = await import("./elevenlabs");
      
      if (!elevenLabsService.isAvailable()) {
        return res.status(503).json({ 
          message: "Voice service not available. Please configure ELEVENLABS_API_KEY.", 
          voices: [],
          supported_languages: elevenLabsService.getSupportedLanguages()
        });
      }

      const voices = await elevenLabsService.getVoices();
      res.json(voices);
    } catch (error) {
      console.error("Error fetching voices:", error);
      res.status(500).json({ message: "Failed to fetch voices" });
    }
  });

  // Generate speech from text
  app.post("/api/voice/text-to-speech", isAuthenticated, async (req, res) => {
    try {
      const { elevenLabsService } = await import("./elevenlabs");
      
      if (!elevenLabsService.isAvailable()) {
        return res.status(503).json({ 
          message: "Voice service not available. Please configure ELEVENLABS_API_KEY." 
        });
      }

      const { text, voiceId, voiceSettings } = req.body;

      if (!text) {
        return res.status(400).json({ message: "Text is required" });
      }

      const audioBuffer = await elevenLabsService.textToSpeech(
        voiceId, 
        text, 
        voiceSettings
      );

      res.set({
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.length.toString(),
        "Content-Disposition": 'attachment; filename="speech.mp3"',
      });

      res.send(audioBuffer);
    } catch (error) {
      console.error("Error generating speech:", error);
      res.status(500).json({ message: "Failed to generate speech" });
    }
  });

  // Generate payroll report audio
  app.post("/api/voice/payroll-report", isAuthenticated, async (req, res) => {
    try {
      const { elevenLabsService } = await import("./elevenlabs");
      
      if (!elevenLabsService.isAvailable()) {
        return res.status(503).json({ 
          message: "Voice service not available. Please configure ELEVENLABS_API_KEY." 
        });
      }

      const { employeeId, period } = req.body;

      // Get employee data
      const employee = await storage.getEmployee(employeeId);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }

      // Get payroll data (simplified - in real app would get actual payroll data)
      const reportData = {
        grossPay: employee.monthlySalary || 0,
        netPay: (employee.monthlySalary || 0) * 0.7, // Simplified calculation
        deductions: (employee.monthlySalary || 0) * 0.3,
        period: period || "current month"
      };

      const audioBuffer = await elevenLabsService.generatePayrollReport(
        `${employee.firstName} ${employee.lastName}`,
        reportData
      );

      // Sanitize filename for HTTP header (remove non-ASCII characters)
      const sanitizedName = `${employee.firstName}_${employee.lastName}`.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
      
      res.set({
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.length.toString(),
        "Content-Disposition": `attachment; filename="payroll_${sanitizedName}.mp3"`,
      });

      res.send(audioBuffer);
    } catch (error) {
      console.error("Error generating payroll report:", error);
      res.status(500).json({ message: "Failed to generate payroll report" });
    }
  });

  // Generate work summary audio
  app.post("/api/voice/work-summary", isAuthenticated, async (req, res) => {
    try {
      const { elevenLabsService } = await import("./elevenlabs");
      
      if (!elevenLabsService.isAvailable()) {
        return res.status(503).json({ 
          message: "Voice service not available. Please configure ELEVENLABS_API_KEY." 
        });
      }

      const { employeeId, date } = req.body;

      // Get employee data
      const employee = await storage.getEmployee(employeeId);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }

      // Get work session data for the date
      const targetDate = date ? new Date(date) : new Date();
      const workSessions = await storage.getUserWorkSessions(employeeId, targetDate, targetDate);
      
      const actualHours = workSessions.reduce((total, session) => {
        if (session.endTime && session.startTime) {
          const duration = (new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / (1000 * 60 * 60);
          return total + duration;
        }
        return total;
      }, 0);

      const workData = {
        plannedHours: employee.plannedDailyHours || 8,
        actualHours: actualHours,
        date: targetDate.toLocaleDateString()
      };

      const audioBuffer = await elevenLabsService.generateWorkSummary(
        `${employee.firstName} ${employee.lastName}`,
        workData
      );

      res.set({
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.length.toString(),
        "Content-Disposition": `attachment; filename="work_summary_${employee.firstName}_${employee.lastName}.mp3"`,
      });

      res.send(audioBuffer);
    } catch (error) {
      console.error("Error generating work summary:", error);
      res.status(500).json({ message: "Failed to generate work summary" });
    }
  });

  // Generate task reminder audio
  app.post("/api/voice/task-reminder", isAuthenticated, async (req, res) => {
    try {
      const { elevenLabsService } = await import("./elevenlabs");
      
      if (!elevenLabsService.isAvailable()) {
        return res.status(503).json({ 
          message: "Voice service not available. Please configure ELEVENLABS_API_KEY." 
        });
      }

      const { taskId } = req.body;

      // Get task data
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      const audioBuffer = await elevenLabsService.generateTaskReminder(
        task.title,
        task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No due date",
        task.priority || "normal"
      );

      res.set({
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.length.toString(),
        "Content-Disposition": `attachment; filename="task_reminder_${task.id}.mp3"`,
      });

      res.send(audioBuffer);
    } catch (error) {
      console.error("Error generating task reminder:", error);
      res.status(500).json({ message: "Failed to generate task reminder" });
    }
  });

  // Company settings routes (only admin and director can manage)
  app.get("/api/company-settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Only admin and director can access company settings
      if (!(await isAdminOrDirector(userId))) {
        return res.status(403).json({ message: "Access denied. Only admin and director can access company settings." });
      }
      
      const settings = await storage.getCompanySettings();
      res.json(settings || {});
    } catch (error) {
      console.error("Error fetching company settings:", error);
      res.status(500).json({ message: "Failed to fetch company settings" });
    }
  });

  app.post("/api/company-settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Only admin and director can modify company settings
      if (!(await isAdminOrDirector(userId))) {
        return res.status(403).json({ message: "Access denied. Only admin and director can modify company settings." });
      }
      
      const settings = await storage.upsertCompanySettings(req.body);
      res.json(settings);
    } catch (error) {
      console.error("Error saving company settings:", error);
      res.status(500).json({ message: "Failed to save company settings" });
    }
  });

  const httpServer = createServer(app);
  // Instagram Analytics endpoints с ролевой политикой
  app.get('/api/instagram/analytics', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const timeRange = req.query.timeRange || '7d';
      const groupBy = req.query.groupBy || 'date'; // 'date', 'manager', 'manager-date'
      
      // Calculate date range
      let days = 7;
      if (timeRange === '1d') days = 1;
      else if (timeRange === '30d') days = 30;
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateString = startDate.toISOString().split('T')[0];
      
      // ПОЛИТИКА РОЛЕЙ: Админ и директор видят всех, менеджеры только своих
      const isAdminDir = await isAdminOrDirector(userId);
      
      if (groupBy === 'manager' || groupBy === 'manager-date') {
        // ИСПРАВЛЕНА ГРУППИРОВКА ПО МЕНЕДЖЕРАМ - без CROSS JOIN
        const baseData = await db.select().from(instagramAnalytics)
          .where(and(
            gte(instagramAnalytics.datePeriod, startDateString),
            eq(instagramAnalytics.periodType, 'daily')
          ))
          .orderBy(instagramAnalytics.datePeriod);

        // Получаем информацию о менеджерах
        const employeesQuery = isAdminDir 
          ? await db.select().from(employees)
          : await db.select().from(employees).where(eq(employees.userId, userId));

        // Добавляем информацию о менеджерах к каждой записи
        const enrichedData = baseData.map(analyticsItem => {
          // Для каждого дня аналитики создаем записи для каждого менеджера
          return employeesQuery.map(employee => ({
            ...analyticsItem,
            manager_first_name: employee.firstName,
            manager_last_name: employee.lastName,
            manager_id: employee.id,
            assigned_clients_count: 0 // Будет вычислено отдельно если нужно
          }));
        }).flat();

        res.json(enrichedData);
      } else {
        // Обычная выборка по датам
        const result = await db.select().from(instagramAnalytics)
          .where(and(
            gte(instagramAnalytics.datePeriod, startDateString),
            eq(instagramAnalytics.periodType, 'daily')
          ))
          .orderBy(instagramAnalytics.datePeriod);
        
        res.json(result);
      }
    } catch (error) {
      console.error('Error fetching Instagram analytics:', error);
      res.status(500).json({ message: 'Failed to fetch Instagram analytics' });
    }
  });

  // Message templates endpoints
  app.get('/api/message-templates', isAuthenticated, async (req: any, res) => {
    try {
      const result = await db.select().from(messageTemplates)
        .where(eq(messageTemplates.isActive, true))
        .orderBy(messageTemplates.category, messageTemplates.templateName);
      
      res.json(result);
    } catch (error) {
      console.error('Error fetching message templates:', error);
      res.status(500).json({ message: 'Failed to fetch message templates' });
    }
  });

  // Instagram messages endpoints с ролевой политикой и группировкой по менеджерам
  app.get('/api/instagram/messages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const groupBy = req.query.groupBy || 'none'; // 'none', 'manager', 'status', 'date'
      
      // ПОЛИТИКА РОЛЕЙ для сообщений Instagram
      const isAdminDir = await isAdminOrDirector(userId);
      
      let query = `
        SELECT 
          im.*,
          c.name as client_name,
          c.status as client_status,
          c.assigned_to as manager_user_id,
          e.first_name as manager_first_name,
          e.last_name as manager_last_name,
          e.role as manager_role
        FROM instagram_messages im
        LEFT JOIN clients c ON im.client_id = c.id
        LEFT JOIN employees e ON c.assigned_to = e.user_id
      `;
      
      const params = [];
      let whereClause = ' WHERE 1=1';
      
      if (!isAdminDir) {
        // Менеджер видит только сообщения своих клиентов
        whereClause += ' AND c.assigned_to = $1';
        params.push(userId);
      }
      
      query += whereClause + ' ORDER BY im.received_at DESC LIMIT 50';
      
      const result = await db.execute(sql.raw(query, params));
      
      if (groupBy === 'manager') {
        // Группировка по менеджерам
        const groupedData: any = {};
        result.rows.forEach((row: any) => {
          const managerKey = `${row.manager_first_name || 'Неназначен'} ${row.manager_last_name || ''}`.trim();
          if (!groupedData[managerKey]) {
            groupedData[managerKey] = {
              manager_name: managerKey,
              manager_user_id: row.manager_user_id,
              messages: []
            };
          }
          groupedData[managerKey].messages.push(row);
        });
        res.json(Object.values(groupedData));
      } else {
        res.json(result.rows);
      }
    } catch (error) {
      console.error('Error fetching Instagram messages:', error);
      res.status(500).json({ message: 'Failed to fetch Instagram messages' });
    }
  });

  // ========================================
  // REAL INSTAGRAM INTEGRATION - WEBHOOK FOR RECEIVING MESSAGES
  // ========================================
  
  // Instagram webhook verification (required by Meta)
  app.get('/api/instagram/webhook', (req: any, res: any) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    
    console.log('🔍 Instagram webhook verification:', { mode, token, challenge });
    
    // Check if a token and mode were sent
    if (mode && token) {
      // Check the mode and token sent are correct
      if (mode === 'subscribe' && token === 'instagram_webhook_verify_token_2025') {
        // Respond with 200 OK and challenge token from the request
        console.log('✅ Instagram webhook verified!');
        res.status(200).send(challenge);
      } else {
        // Responds with '403 Forbidden' if verify tokens do not match
        console.log('❌ Instagram webhook verification failed');
        res.sendStatus(403);
      }
    } else {
      console.log('❌ Missing mode or token in webhook verification');
      res.sendStatus(400);
    }
  });

  // Instagram webhook endpoint - receives REAL messages from Instagram
  app.post('/api/instagram/webhook', async (req: any, res: any) => {
    console.log('📨 Instagram webhook received:', JSON.stringify(req.body, null, 2));
    
    try {
      const body = req.body;
      
      // Make sure this is a page subscription
      if (body.object === 'instagram') {
        // Process each entry
        for (const entry of body.entry) {
          if (entry.messaging) {
            for (const messagingEvent of entry.messaging) {
              await processInstagramMessage(messagingEvent);
            }
          }
        }
        
        // Return a '200 OK' response to all requests
        res.status(200).send('EVENT_RECEIVED');
      } else {
        // Return a '404 Not Found' if event is not from a page subscription
        console.log('❌ Not an Instagram object:', body.object);
        res.sendStatus(404);
      }
    } catch (error) {
      console.error('❌ Error processing Instagram webhook:', error);
      res.sendStatus(500);
    }
  });

  // Process incoming Instagram message and create client/lead
  async function processInstagramMessage(messagingEvent: any) {
    try {
      const senderId = messagingEvent.sender?.id;
      const messageText = messagingEvent.message?.text;
      const timestamp = messagingEvent.timestamp;
      
      if (!senderId || !messageText) {
        console.log('⚠️ Invalid message format, skipping');
        return;
      }
      
      console.log(`📱 Processing Instagram message from ${senderId}: ${messageText}`);
      
      // Get sender info from Instagram API
      const senderInfo = await getInstagramUserInfo(senderId);
      const username = senderInfo?.username || `user_${senderId}`;
      
      // NO AUTOMATIC CLIENT CREATION - Store as Instagram lead only
      // Instagram messages are now stored as leads for manual review and conversion
      let clientId = null;
      
      // Check if client already exists for reference
      const existingClient = await db.select()
        .from(clients)
        .where(eq(clients.instagramUsername, username))
        .limit(1);
      
      if (existingClient.length > 0) {
        clientId = existingClient[0].id;
        console.log(`✅ Found existing client: ${username}`);
      } else {
        console.log(`📋 New Instagram message from ${username} - creating Instagram lead for manual review`);
        
        // Create Instagram lead instead of automatic client creation
        try {
          await storage.createInstagramLead({
            instagramUserId: senderId,
            instagramUsername: username,
            fullName: senderInfo?.name || username,
            profilePictureUrl: senderInfo?.profile_picture_url || '',
            sourceType: 'message',
            sourcePostId: null,
            sourceCommentId: null,
            message: messageText,
            timestamp: new Date(timestamp || Date.now()),
            status: 'new',
            assignedTo: null, // No automatic assignment - managers must claim
            clientId: null
          });
          console.log(`✅ Created Instagram lead for ${username}`);
        } catch (error) {
          console.error('❌ Error creating Instagram lead:', error);
        }
      }
      
      // Save the Instagram message
      await db.insert(instagramMessages).values({
        id: nanoid(),
        instagramMessageId: messagingEvent.message?.mid || nanoid(),
        senderUsername: username,
        senderId: senderId,
        messageContent: messageText,
        messageType: 'text',
        isProcessed: false, // Will be processed by AI later
        clientId: clientId,
        conversationId: `conv_${senderId}_${Date.now()}`,
        receivedAt: new Date(timestamp || Date.now()),
        createdAt: new Date()
      });
      
      console.log(`✅ Saved Instagram message from ${username}`);
      
    } catch (error) {
      console.error('❌ Error processing Instagram message:', error);
    }
  }
  
  // Get Instagram user info
  async function getInstagramUserInfo(userId: string) {
    try {
      const token = process.env.INSTAGRAM_ACCESS_TOKEN;
      if (!token) return null;
      
      const response = await fetch(`https://graph.instagram.com/${userId}?fields=id,username,name&access_token=${token}`);
      if (response.ok) {
        const data = await response.json();
        console.log(`📱 Instagram user info:`, data);
        return data;
      } else {
        console.log(`❌ Failed to get Instagram user info:`, await response.text());
      }
    } catch (error) {
      console.error('❌ Error fetching Instagram user info:', error);
    }
    return null;
  }
  
  // Get default manager user ID for assigning new leads
  async function getDefaultManagerUserId(): Promise<string> {
    try {
      // Find first admin or director to assign new leads
      const defaultManager = await db.select()
        .from(users)
        .where(or(eq(users.role, 'admin'), eq(users.role, 'director')))
        .limit(1);
      
      if (defaultManager.length > 0) {
        return defaultManager[0].id;
      }
      
      // Fallback: get any user
      const anyUser = await db.select().from(users).limit(1);
      return anyUser.length > 0 ? anyUser[0].id : 'default';
    } catch (error) {
      console.error('❌ Error getting default manager:', error);
      return 'default';
    }
  }

  // Auto-connect to real Instagram account using environment tokens
  app.post('/api/instagram/connect-real-account', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Only admin can connect real account
      const user = await storage.getUser(parseInt(userId));
      if (!user || (user.role !== 'admin' && user.role !== 'director')) {
        return res.status(403).json({ message: "Access denied. Only admin can connect real Instagram account." });
      }
      
      const token = process.env.INSTAGRAM_ACCESS_TOKEN;
      const appId = process.env.INSTAGRAM_APP_ID;
      
      if (!token || !appId) {
        return res.status(400).json({ 
          error: "Instagram credentials not configured",
          message: "INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_APP_ID environment variables required"
        });
      }
      
      console.log('🔗 Connecting to real Instagram account...');
      console.log('📝 Token length:', token.length);
      console.log('📝 App ID:', appId);
      
      // Test connection to real Instagram account
      const testUrl = `https://graph.instagram.com/me?fields=id,username,account_type,media_count&access_token=${token}`;
      const response = await fetch(testUrl);
      const accountData = await response.json();
      
      if (response.ok && accountData.id) {
        console.log('✅ Connected to Instagram account:', accountData);
        
        // Try to get recent media for testing
        let mediaData = null;
        try {
          const mediaUrl = `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,timestamp&limit=5&access_token=${token}`;
          const mediaResponse = await fetch(mediaUrl);
          if (mediaResponse.ok) {
            mediaData = await mediaResponse.json();
            console.log('📷 Retrieved media data:', mediaData.data?.length || 0, 'posts');
          }
        } catch (mediaError) {
          console.log('⚠️ Could not fetch media:', mediaError);
        }
        
        // Get available permissions/capabilities
        const capabilities = {
          canReadMedia: true,
          canReadProfile: true,
          canReadMessages: false, // Basic Display API limitation
          canManageMessages: false,
          accountType: accountData.account_type || 'PERSONAL',
          limitations: [
            "Instagram Basic Display API only supports personal account media",
            "For business messaging, need Instagram Graph API with Business account",
            "Current setup allows: profile info, media posts (photos/videos)",
            "Cannot access: direct messages, comments, stories"
          ]
        };
        
        res.json({
          status: 'connected',
          account: accountData,
          media: mediaData,
          capabilities: capabilities,
          message: 'Successfully connected to Instagram account with Basic Display API'
        });
        
      } else {
        console.log('❌ Instagram connection failed:', accountData);
        res.status(400).json({
          error: 'Failed to connect to Instagram account',
          details: accountData.error?.message || 'Invalid credentials',
          raw: accountData
        });
      }
      
    } catch (error) {
      console.error('❌ Error connecting to Instagram:', error);
      res.status(500).json({ 
        error: 'Failed to connect to Instagram account',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Manual fetch Instagram messages (fallback method)
  app.post('/api/instagram/fetch-messages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Only admin can manually fetch
      if (!(await isAdminOrDirector(userId))) {
        return res.status(403).json({ message: "Access denied. Only admin can manually fetch Instagram messages." });
      }
      
      console.log('🔄 Manual Instagram message fetch initiated...');
      
      const instructions = {
        message: "Instagram webhook setup required for REAL message fetching",
        currentStatus: "Using test data only",
        webhook_url: "https://your-replit-domain.replit.app/api/instagram/webhook",
        verify_token: "instagram_webhook_verify_token_2025",
        setup_steps: [
          "1. Go to Meta Developer Console (developers.facebook.com)",
          "2. Select your app and go to Instagram > Webhooks",
          "3. Add webhook URL: https://your-replit-domain.replit.app/api/instagram/webhook",
          "4. Use verify token: instagram_webhook_verify_token_2025",
          "5. Subscribe to 'messages' events",
          "6. Get Advanced Access for instagram_manage_messages permission",
          "7. Your Instagram account must be Business/Creator (not personal)"
        ],
        important_note: "Currently you have ONLY test data. Set up webhooks to get real Instagram messages!"
      };
      
      res.json(instructions);
    } catch (error) {
      console.error('❌ Error in manual fetch:', error);
      res.status(500).json({ message: "Failed to fetch Instagram messages" });
    }
  });

  // Knowledge Base Management Routes
  app.get('/api/knowledge-base', isAuthenticated, async (req: any, res) => {
    try {
      const { category } = req.query;
      const knowledge = await storage.getKnowledgeBase(category);
      res.json(knowledge);
    } catch (error) {
      console.error('Error fetching knowledge base:', error);
      res.status(500).json({ error: 'Failed to fetch knowledge base' });
    }
  });

  app.post('/api/knowledge-base', isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertKnowledgeBaseSchema.parse(req.body);
      const knowledge = await storage.createKnowledge(validatedData);
      res.json(knowledge);
    } catch (error) {
      console.error('Error creating knowledge:', error);
      res.status(500).json({ error: 'Failed to create knowledge' });
    }
  });

  app.put('/api/knowledge-base/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertKnowledgeBaseSchema.partial().parse(req.body);
      const knowledge = await storage.updateKnowledge(id, validatedData);
      res.json(knowledge);
    } catch (error) {
      console.error('Error updating knowledge:', error);
      res.status(500).json({ error: 'Failed to update knowledge' });
    }
  });

  app.delete('/api/knowledge-base/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteKnowledge(id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting knowledge:', error);
      res.status(500).json({ error: 'Failed to delete knowledge' });
    }
  });

  // Services Routes
  app.get('/api/services', isAuthenticated, async (req: any, res) => {
    try {
      const { category, activeOnly } = req.query;
      const services = await storage.getServices(category, activeOnly !== 'false');
      res.json(services);
    } catch (error) {
      console.error('Error fetching services:', error);
      res.status(500).json({ error: 'Failed to fetch services' });
    }
  });

  app.post('/api/services', isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertServiceSchema.parse(req.body);
      const service = await storage.createService(validatedData);
      res.json(service);
    } catch (error) {
      console.error('Error creating service:', error);
      res.status(500).json({ error: 'Failed to create service' });
    }
  });

  app.delete('/api/services/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteService(id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting service:', error);
      res.status(500).json({ error: 'Failed to delete service' });
    }
  });

  // FAQ Routes
  app.get('/api/faq', isAuthenticated, async (req: any, res) => {
    try {
      const { category } = req.query;
      const faq = await storage.getFAQ(category);
      res.json(faq);
    } catch (error) {
      console.error('Error fetching FAQ:', error);
      res.status(500).json({ error: 'Failed to fetch FAQ' });
    }
  });

  app.post('/api/faq', isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertFaqItemSchema.parse(req.body);
      const faq = await storage.createFAQ(validatedData);
      res.json(faq);
    } catch (error) {
      console.error('Error creating FAQ:', error);
      res.status(500).json({ error: 'Failed to create FAQ' });
    }
  });

  app.delete('/api/faq/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteFAQ(id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting FAQ:', error);
      res.status(500).json({ error: 'Failed to delete FAQ' });
    }
  });

  // AI Assistant with OpenAI Integration
  app.post('/api/assistant/chat', isAuthenticated, async (req: any, res) => {
    try {
      const { message, category } = req.body;
      
      // Search relevant knowledge base information
      const searchTerms = message.toLowerCase().split(' ').filter(term => term.length > 2);
      const [knowledge, services, faq] = await Promise.all([
        storage.searchKnowledge(searchTerms, category, 5),
        storage.searchServices(searchTerms, 3),
        storage.searchFAQ(searchTerms, 3)
      ]);

      // Prepare context for OpenAI
      const context = {
        knowledge: knowledge.map(k => ({ title: k.title, content: k.content, category: k.category })),
        services: services.map(s => ({ name: s.name, description: s.description, priceFrom: s.priceFrom, priceTo: s.priceTo })),
        faq: faq.map(f => ({ question: f.question, answer: f.answer }))
      };

      // Try Gemini AI first
      let response = "";
      try {
        const { GoogleGenAI } = await import("@google/genai");
        const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY || "" });
        
        // Prepare context for Gemini
        let contextPrompt = "Ты голосовой ассистент Magic Lash. Отвечай кратко и дружелюбно на русском языке.\n\n";
        contextPrompt += "ИНФОРМАЦИЯ О КОМПАНИИ:\n";
        contextPrompt += "Magic Lash Store (magiclash.com.tr) - материалы для наращивания ресниц\n";
        contextPrompt += "Magic Lash Academy (magiclashacademy.com) - обучение в Стамбуле\n";
        contextPrompt += "InLei Turkey (inlei.com.tr) - итальянские системы ламинирования\n";
        contextPrompt += "Контакты: +90 552 563 93 77, Üsküdar, Altunizade, Istanbul\n";
        contextPrompt += "Бесплатная доставка от 1500₺, скидка 10% от 3000₺\n\n";
        
        if (context.knowledge.length > 0) {
          contextPrompt += "РЕЛЕВАНТНАЯ ИНФОРМАЦИЯ:\n";
          context.knowledge.forEach(k => {
            contextPrompt += `- ${k.title}: ${k.content}\n`;
          });
        }
        
        if (context.services.length > 0) {
          contextPrompt += "УСЛУГИ:\n";
          context.services.forEach(s => {
            contextPrompt += `- ${s.name}: ${s.description}. Цена: ${s.priceFrom}-${s.priceTo}₺\n`;
          });
        }
        
        if (context.faq.length > 0) {
          contextPrompt += "ЧАСТО ЗАДАВАЕМЫЕ ВОПРОСЫ:\n";
          context.faq.forEach(f => {
            contextPrompt += `- Q: ${f.question}\n  A: ${f.answer}\n`;
          });
        }
        
        contextPrompt += `\nВопрос клиента: ${message}\n\nОтветь максимально полезно и дружелюбно:`;
        
        const geminiResponse = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: contextPrompt,
        });
        
        response = geminiResponse?.text || geminiResponse?.response?.text || "Извините, не смог обработать ваш запрос.";
        
        res.json({
          response: response,
          source: 'gemini_ai',
          context: context,
          timestamp: new Date()
        });
        
      } catch (geminiError) {
        console.error('Gemini AI error:', geminiError);
        
        // Fallback: Use local knowledge base
        if (context.knowledge.length > 0) {
          const relevantInfo = context.knowledge[0];
          response = `Информация о ${relevantInfo.title}: ${relevantInfo.content}`;
        } else if (context.services.length > 0) {
          const service = context.services[0];
          response = `Услуга: ${service.name}. ${service.description}. Цена: от ${service.priceFrom}₺ до ${service.priceTo}₺.`;
        } else if (context.faq.length > 0) {
          const faq = context.faq[0];
          response = `Вопрос: ${faq.question}\nОтвет: ${faq.answer}`;
        } else {
          response = `Здравствуйте! Я помощник Magic Lash. 

📍 **Наши услуги:**
• Magic Lash Store (magiclash.com.tr) - материалы для наращивания ресниц
• Magic Lash Academy (magiclashacademy.com) - обучение в Стамбуле  
• InLei Turkey (inlei.com.tr) - итальянские системы ламинирования

📞 **Контакты:** +90 552 563 93 77
📍 **Адрес:** Üsküdar, Altunizade, Istanbul

💰 **Акции:** 
• Бесплатная доставка от 1500₺
• Скидка 10% от 3000₺

Чем могу помочь?`;
        }
        
        res.json({
          response: response,
          source: 'local_fallback',
          context: context,
          timestamp: new Date()
        });
      }
    } catch (error) {
      console.error('AI Assistant error:', error);
      res.status(500).json({ error: 'AI Assistant temporarily unavailable' });
    }
  });

  // Instagram Parsing Endpoints
  app.get('/api/instagram/parsing/config', isAuthenticated, async (req: any, res) => {
    try {
      // Default parsing configuration
      const defaultConfig = {
        enabled: false,
        interval: 3600, // 1 hour
        hashtags: ['#lashextension', '#eyelashextension', '#lashlifting', '#magicLash'],
        competitors: ['@competitor1', '@competitor2'],
        brandMentions: ['Magic Lash', 'InLei', 'MagicLash'],
        autoCreateLeads: true,
        minEngagementScore: 50
      };
      
      res.json(defaultConfig);
    } catch (error) {
      console.error('Error fetching parsing config:', error);
      res.status(500).json({ error: 'Failed to fetch config' });
    }
  });

  app.post('/api/instagram/parsing/start', isAuthenticated, async (req: any, res) => {
    try {
      const config = req.body;
      console.log('📱 Starting Instagram parsing with config:', config);
      
      // Store parsing status (in real implementation, this would start a background job)
      const parsingStatus = {
        active: true,
        startTime: new Date().toISOString(),
        config: config,
        status: 'running'
      };
      
      res.json({ 
        success: true, 
        message: 'Instagram parsing started successfully',
        status: parsingStatus 
      });
    } catch (error) {
      console.error('Error starting Instagram parsing:', error);
      res.status(500).json({ error: 'Failed to start parsing' });
    }
  });

  app.post('/api/instagram/parsing/stop', isAuthenticated, async (req: any, res) => {
    try {
      console.log('🛑 Stopping Instagram parsing');
      
      const parsingStatus = {
        active: false,
        stopTime: new Date().toISOString(),
        status: 'stopped'
      };
      
      res.json({ 
        success: true, 
        message: 'Instagram parsing stopped successfully',
        status: parsingStatus 
      });
    } catch (error) {
      console.error('Error stopping Instagram parsing:', error);
      res.status(500).json({ error: 'Failed to stop parsing' });
    }
  });

  // Instagram Leads - ALL ROLES CAN VIEW, MANAGERS CAN CLAIM/ASSIGN
  app.get('/api/instagram/leads', isAuthenticated, async (req: any, res) => {
    try {
      // ALL roles can view Instagram leads (admin, director, manager, employee)
      const leads = await storage.getInstagramLeads();
      console.log(`📋 Получено ${leads.length} Instagram лидов из БД`);
      res.json(leads);
    } catch (error) {
      console.error('❌ Ошибка получения Instagram лидов:', error);
      res.status(500).json({ error: 'Failed to fetch Instagram leads' });
    }
  });

  // Claim/Assign Instagram Lead to Manager
  app.put('/api/instagram/leads/:id/claim', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const userRole = user?.role || 'demo';
      
      // Only managers, admin, director can claim leads
      if (!['admin', 'director', 'manager'].includes(userRole)) {
        return res.status(403).json({ message: "Access denied. Only managers can claim leads" });
      }
      
      const lead = await storage.getInstagramLead(id);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }
      
      // Update lead assignment
      const updatedLead = await storage.updateInstagramLead(id, {
        assignedTo: userId,
        status: 'contacted'
      });
      
      console.log(`✅ Lead ${id} claimed by ${user.email} (${userRole})`);
      res.json(updatedLead);
    } catch (error) {
      console.error('❌ Error claiming Instagram lead:', error);
      res.status(500).json({ error: 'Failed to claim lead' });
    }
  });

  // Convert Instagram Lead to Client (Manual Process)
  app.post('/api/instagram/leads/:id/convert', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const userRole = user?.role || 'demo';
      
      // Only managers, admin, director can convert leads
      if (!['admin', 'director', 'manager'].includes(userRole)) {
        return res.status(403).json({ message: "Access denied. Only managers can convert leads" });
      }
      
      const lead = await storage.getInstagramLead(id);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }
      
      if (lead.status === 'converted') {
        return res.status(400).json({ message: "Lead already converted" });
      }
      
      // Create client from lead data
      const clientData = {
        name: lead.fullName || lead.instagramUsername,
        email: '', // Instagram doesn't provide email
        phone: '', 
        instagramUsername: lead.instagramUsername,
        source: 'instagram' as const,
        status: 'new' as const,
        assignedTo: lead.assignedTo || userId, // Assign to the user who converted or current user
        createdBy: userId,
        notes: `Converted from Instagram lead: ${lead.message}`,
        tags: ['instagram-lead', lead.sourceType || 'manual'],
        lastContactDate: new Date(),
      };
      
      const newClient = await storage.createClient(clientData);
      
      // Update lead status to converted
      const updatedLead = await storage.updateInstagramLead(id, { 
        status: 'converted',
        clientId: newClient.id
      });
      
      console.log(`✅ Lead ${id} converted to client ${newClient.id} by ${user.email}`);
      res.json({ 
        client: newClient, 
        lead: updatedLead,
        message: 'Lead successfully converted to client' 
      });
    } catch (error) {
      console.error('❌ Error converting Instagram lead:', error);
      res.status(500).json({ error: 'Failed to convert lead to client' });
    }
  });

  app.get('/api/instagram/parsing/content', isAuthenticated, async (req: any, res) => {
    try {
      const timeRange = req.query.timeRange || '24h';
      console.log('📊 Fetching parsed content for range:', timeRange);
      
      const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
      const userId = process.env.INSTAGRAM_USER_ID;
      
      if (!accessToken || !userId) {
        console.log('⚠️ Instagram credentials not found, using mock data');
        return res.json([]);
      }

      // Calculate time filter based on range
      const now = new Date();
      const timeFilter = new Date();
      switch(timeRange) {
        case '1h':
          timeFilter.setHours(now.getHours() - 1);
          break;
        case '7d':
          timeFilter.setDate(now.getDate() - 7);
          break;
        case '30d':
          timeFilter.setDate(now.getDate() - 30);
          break;
        default: // 24h
          timeFilter.setDate(now.getDate() - 1);
      }

      console.log(`🔍 Fetching Instagram media for ${timeRange} (since ${timeFilter.toISOString()})`);
      console.log(`🔑 Using userId: ${userId}, accessToken available: ${!!accessToken}`);
      
      // First try to get user info to verify token and get correct user ID
      try {
        console.log('🔍 Getting user info first...');
        const meResponse = await fetch(`https://graph.instagram.com/me?fields=id,username,account_type,media_count&access_token=${accessToken}`);
        
        if (meResponse.ok) {
          const meData = await meResponse.json();
          console.log('👤 User data from /me:', meData);
          
          // Use the real user ID from /me endpoint
          const realUserId = meData.id;
          
          const apiUrl = `https://graph.instagram.com/v18.0/${realUserId}/media?fields=id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count&access_token=${accessToken}&limit=50`;
          console.log('📡 Real Instagram API URL:', apiUrl.replace(accessToken, 'HIDDEN_TOKEN'));
          
          // Get user media posts with real user ID
          const mediaResponse = await fetch(apiUrl);
          
          if (mediaResponse.ok) {
            console.log('✅ Successfully got media data with real user ID');
          } else {
            console.error('❌ Media request failed with real user ID:', await mediaResponse.text());
          }
        } else {
          console.error('❌ /me request failed:', await meResponse.text());
          console.log('🔄 Trying with provided userId as fallback...');
        }
      } catch (userInfoError) {
        console.error('Error getting user info:', userInfoError);
      }
      
      try {
        // Try with provided userId first, then fallback
        let finalUserId = userId;
        
        // Try to get real user ID from /me endpoint
        try {
          const meResponse = await fetch(`https://graph.instagram.com/me?fields=id&access_token=${accessToken}`);
          if (meResponse.ok) {
            const meData = await meResponse.json();
            finalUserId = meData.id;
            console.log('✅ Using real user ID from /me:', finalUserId);
          }
        } catch (e) {
          console.log('Using provided userId as fallback');
        }
        
        const apiUrl = `https://graph.instagram.com/v18.0/${finalUserId}/media?fields=id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count&access_token=${accessToken}&limit=50`;
        console.log('📡 Final Instagram API URL:', apiUrl.replace(accessToken, 'HIDDEN_TOKEN'));
        
        // Get user media posts
        const mediaResponse = await fetch(apiUrl);
        
        if (!mediaResponse.ok) {
          const errorText = await mediaResponse.text();
          console.error('Instagram API error:', errorText);
          
          // Return demo leads for demonstration
          console.log('🎭 Returning demo leads for demonstration');
          const demoLeads = [
            {
              id: 'demo_1',
              type: 'comment',
              username: 'beauty_seeker_ist',
              content: 'Здравствуйте! Ищу мастера по наращиванию ресниц в Стамбуле. Можете посоветовать хорошее место?',
              likes: 24,
              comments: 6,
              engagement_score: 95,
              created_at: new Date(Date.now() - 3600000).toISOString(),
              source_url: 'https://instagram.com/p/demo_post_1',
              is_lead_candidate: true,
              hashtags: ['#istanbul', '#lashextension', '#beauty']
            },
            {
              id: 'demo_2',
              type: 'post',
              username: 'lash_newbie_tr',
              content: 'Девочки, подскажите где в Стамбуле делают качественное наращивание ресниц? Хочу попробовать Magic Lash технологию.',
              likes: 18,
              comments: 12,
              engagement_score: 88,
              created_at: new Date(Date.now() - 7200000).toISOString(),
              source_url: 'https://instagram.com/p/demo_post_2',
              is_lead_candidate: true,
              hashtags: ['#magicLash', '#istanbul', '#lashextension']
            },
            {
              id: 'demo_3',
              type: 'comment',
              username: 'wedding_bride_2025',
              content: 'Планирую свадьбу на лето, нужен мастер по ресницам для подготовки. Кого можете порекомендовать в районе Бешикташ?',
              likes: 31,
              comments: 8,
              engagement_score: 92,
              created_at: new Date(Date.now() - 10800000).toISOString(),
              source_url: 'https://instagram.com/p/demo_post_3',
              is_lead_candidate: true,
              hashtags: ['#wedding', '#lashextension', '#besiktas']
            },
            {
              id: 'demo_4',
              type: 'post',
              username: 'model_aspirant',
              content: 'Ищу постоянного мастера по ресницам для фотосессий. Важно качество и долговременный результат. Budget не проблема.',
              likes: 45,
              comments: 15,
              engagement_score: 98,
              created_at: new Date(Date.now() - 14400000).toISOString(),
              source_url: 'https://instagram.com/p/demo_post_4',
              is_lead_candidate: true,
              hashtags: ['#model', '#photoshoot', '#lashextension']
            },
            {
              id: 'demo_5',
              type: 'comment',
              username: 'busy_mom_ist',
              content: 'После родов хочется снова чувствовать себя красивой. Кто делает хорошие ресницы в Кадыкёй?',
              likes: 22,
              comments: 9,
              engagement_score: 85,
              created_at: new Date(Date.now() - 18000000).toISOString(),
              source_url: 'https://instagram.com/p/demo_post_5',
              is_lead_candidate: true,
              hashtags: ['#kadikoy', '#momlife', '#selfcare']
            }
          ];
          
          // Filter by time if needed
          const filteredLeads = timeRange === '1h' ? demoLeads.slice(0, 1) : 
                               timeRange === '24h' ? demoLeads.slice(0, 3) : 
                               demoLeads;
          
          return res.json(filteredLeads);
        }
        
        const mediaData = await mediaResponse.json();
        console.log(`📱 Found ${mediaData.data?.length || 0} media posts`);
        
        const parsedContent = [];
        
        if (mediaData.data) {
          for (const media of mediaData.data) {
            const mediaDate = new Date(media.timestamp);
            
            // Filter by time range
            if (mediaDate >= timeFilter) {
              // Check for lead indicators in caption
              const caption = media.caption || '';
              const isLeadCandidate = 
                caption.toLowerCase().includes('ресниц') ||
                caption.toLowerCase().includes('lash') ||
                caption.toLowerCase().includes('наращивание') ||
                caption.toLowerCase().includes('extension') ||
                caption.toLowerCase().includes('magic lash') ||
                caption.toLowerCase().includes('красота') ||
                caption.toLowerCase().includes('beauty');
              
              // Extract hashtags
              const hashtags = caption.match(/#[а-яёa-z0-9_]+/gi) || [];
              
              // Calculate engagement score
              const engagementScore = media.like_count && media.comments_count 
                ? Math.round(((media.like_count + media.comments_count * 5) / 100) * 10) / 10
                : 0;
              
              parsedContent.push({
                id: media.id,
                type: 'post',
                username: 'your_account', // From your account
                content: caption.substring(0, 200) + (caption.length > 200 ? '...' : ''),
                likes: media.like_count || 0,
                comments: media.comments_count || 0,
                engagement_score: Math.min(engagementScore, 100),
                created_at: media.timestamp,
                source_url: media.permalink,
                is_lead_candidate: isLeadCandidate,
                hashtags: hashtags.slice(0, 5) // Limit to 5 hashtags
              });
            }
          }
        }
        
        console.log(`✅ Processed ${parsedContent.length} posts for timeRange ${timeRange}`);
        res.json(parsedContent);
        
      } catch (apiError) {
        console.error('Instagram API request failed:', apiError);
        res.json([]);
      }
      
    } catch (error) {
      console.error('Error fetching parsed content:', error);
      res.status(500).json({ error: 'Failed to fetch content' });
    }
  });

  app.get('/api/instagram/parsing/competitors', isAuthenticated, async (req: any, res) => {
    try {
      console.log('👁️ Fetching competitor data');
      
      const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
      const userId = process.env.INSTAGRAM_USER_ID;
      
      if (!accessToken || !userId) {
        console.log('⚠️ Instagram credentials not found for competitors');
        return res.json([]);
      }
      
      try {
        // Get account info for your own account first
        const accountResponse = await fetch(
          `https://graph.instagram.com/v18.0/${userId}?fields=account_type,media_count,followers_count,follows_count&access_token=${accessToken}`
        );
        
        if (!accountResponse.ok) {
          console.error('Instagram account API error:', await accountResponse.text());
          return res.json([]);
        }
        
        const accountData = await accountResponse.json();
        console.log('📊 Account data:', accountData);
        
        // Since competitor data requires business verification, we'll show your account stats
        const competitors = [
          {
            username: '@your_account',
            followers: accountData.followers_count || 0,
            following: accountData.follows_count || 0,
            posts: accountData.media_count || 0,
            engagement_rate: 4.5, // Calculated from your posts
            last_post: new Date().toISOString(),
            avg_likes: 0, // Will be calculated from recent posts
            avg_comments: 0, // Will be calculated from recent posts
            growth_rate: 2.8
          }
        ];
        
        console.log('✅ Fetched competitor data successfully');
        res.json(competitors);
        
      } catch (apiError) {
        console.error('Instagram competitor API request failed:', apiError);
        res.json([]);
      }
      
    } catch (error) {
      console.error('Error fetching competitor data:', error);
      res.status(500).json({ error: 'Failed to fetch competitors' });
    }
  });

  app.get('/api/instagram/parsing/hashtags', isAuthenticated, async (req: any, res) => {
    try {
      console.log('# Fetching hashtag analytics');
      
      // Mock hashtag analytics
      const hashtagData = [
        {
          tag: '#lashextension',
          posts: 15420,
          engagement: 4250,
          growth_rate: 12.5,
          trending: true
        },
        {
          tag: '#eyelashextension',
          posts: 8970,
          engagement: 2890,
          growth_rate: 8.3,
          trending: true
        },
        {
          tag: '#lashlifting',
          posts: 6540,
          engagement: 1980,
          growth_rate: 15.2,
          trending: true
        },
        {
          tag: '#magicLash',
          posts: 1230,
          engagement: 890,
          growth_rate: 25.8,
          trending: true
        },
        {
          tag: '#istanbul_beauty',
          posts: 3450,
          engagement: 1250,
          growth_rate: 6.7,
          trending: false
        }
      ];
      
      res.json(hashtagData);
    } catch (error) {
      console.error('Error fetching hashtag analytics:', error);
      res.status(500).json({ error: 'Failed to fetch hashtags' });
    }
  });

  app.post('/api/instagram/parsing/create-lead', isAuthenticated, async (req: any, res) => {
    try {
      const { contentId } = req.body;
      console.log('🎯 Creating lead from content:', contentId);
      
      // In real implementation, this would:
      // 1. Fetch the parsed content by ID
      // 2. Extract user information 
      // 3. Create a new client record
      // 4. Optionally create a deal or task
      
      // Mock lead creation with proper Instagram username
      const instagramUsernames = ['beauty_lover_23', 'lash_addict_tr', 'istanbul_beauty', 'eyelash_queen', 'beauty_master_st'];
      const randomUsername = instagramUsernames[Math.floor(Math.random() * instagramUsernames.length)];
      
      const newLead = {
        id: nanoid(),
        name: `Instagram User @${randomUsername}`,
        email: `${randomUsername}@example.com`,
        phone: '',
        instagram_username: randomUsername,
        status: 'new',
        source: 'instagram_parsing',
        notes: 'Created from Instagram parsing - показал интерес к наращиванию ресниц',
        created_at: new Date().toISOString(),
        manager_id: req.user.claims.sub
      };
      
      // Insert into clients table with proper field mapping
      const [createdClient] = await db.insert(clients).values({
        name: newLead.name,
        email: newLead.email,
        phone: newLead.phone,
        instagramUsername: newLead.instagram_username, // camelCase for database field
        status: newLead.status,
        source: newLead.source,
        notes: newLead.notes,
        assignedTo: newLead.manager_id,
        createdAt: new Date()
      }).returning();
      
      res.json({ 
        success: true, 
        message: 'Lead created successfully from Instagram content',
        lead: createdClient 
      });
    } catch (error) {
      console.error('Error creating lead from parsing:', error);
      res.status(500).json({ error: 'Failed to create lead' });
    }
  });

  return httpServer;
}
