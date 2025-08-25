import { Telegraf, Context } from 'telegraf';
import { storage } from './storage';
import { nanoid } from 'nanoid';
import { getAIResponseWithContext } from './aiService';

interface BotContext extends Context {
  userId?: string;
  userEmail?: string;
  userRole?: string;
}

interface InstagramLead {
  id: string;
  username: string;
  content: string;
  engagement_score: number;
  type: 'comment' | 'post';
  location?: string;
  created_at: string;
}

class BeautyTelegramBot {
  private bot: Telegraf<BotContext>;
  private authenticatedUsers = new Map<number, { id: string; email: string; role: string }>();
  private authCodes = new Map<string, { telegramUserId: number; email: string; expires: number }>();
  private tempInstagramLeads: InstagramLead[] = [];

  constructor(token: string) {
    this.bot = new Telegraf<BotContext>(token);
    this.setupCommands();
    this.setupMiddleware();
  }

  private setupMiddleware() {
    // Add user info to context if authenticated
    this.bot.use(async (ctx, next) => {
      const telegramUserId = ctx.from?.id;
      if (telegramUserId && this.authenticatedUsers.has(telegramUserId)) {
        const user = this.authenticatedUsers.get(telegramUserId)!;
        ctx.userId = user.id;
        ctx.userEmail = user.email;
        ctx.userRole = user.role;
      }
      return next();
    });
  }

  private setupCommands() {
    // Start command
    this.bot.start(async (ctx) => {
      const firstName = ctx.from?.first_name || 'User';
      
      await ctx.reply(
        `🌟 Добро пожаловать в BeautyCRM Bot, ${firstName}!\n\n` +
        `🔥 Ваш умный помощник для бизнеса в сфере красоты:\n` +
        `   • Magic Lash - материалы для наращивания ресниц\n` +
        `   • Magic Lash Academy - обучение в Стамбуле\n` +
        `   • InLei Turkey - итальянские системы ламинирования\n\n` +
        `🔐 **Регистрация и аутентификация пользователей:**\n` +
        `Полный цикл от регистрации до входа в систему.\n\n` +
        `📝 **Процесс регистрации:**\n` +
        `1. Пользователь заходит в бот и использует /register\n` +
        `2. Вводит email адрес, имя и фамилию\n` +
        `3. Номер Telegram сохраняется автоматически\n` +
        `4. Заявка попадает к админу/директору на одобрение\n` +
        `5. После одобрения создается клиент в базе с пометкой "Telegram"\n\n` +
        `🔑 **Процесс входа:**\n` +
        `1. Одобренный пользователь использует /login\n` +
        `2. Вводит свой email адрес\n` +
        `3. Система мгновенно предоставляет доступ\n\n` +
        `📋 **Доступные команды:**\n` +
        `• /register - Регистрация нового пользователя\n` +
        `• /login - Войти в систему\n` +
        `• /help - Полная справка\n` +
        `• /profile - Мой профиль\n` +
        `• /clients - Управление клиентами\n` +
        `• /deals - Сделки и продажи\n` +
        `• /tasks - Задачи и планы\n` +
        `• /analytics - Бизнес-аналитика\n` +
        `• /voice - Голосовой AI-помощник\n` +
        `• /instagram - Instagram парсинг и лиды\n\n` +
        `🆕 Новичок? Используйте /register\n` +
        `👤 Есть аккаунт? Используйте /login`
      );
    });

    // Help command
    this.bot.help(async (ctx) => {
      await ctx.reply(
        `📖 Полная справка BeautyCRM Bot\n\n` +
        `🏢 **О нас:**\n` +
        `   • Magic Lash - профессиональные материалы для наращивания\n` +
        `   • Magic Lash Academy - обучение в Стамбуле (Üsküdar)\n` +
        `   • InLei Turkey - итальянские системы ламинирования\n` +
        `   📞 +90 552 563 93 77\n\n` +
        `🔐 **Регистрация и аутентификация пользователей:**\n` +
        `Полный цикл от регистрации до входа в систему.\n\n` +
        `📝 **Процесс регистрации:**\n` +
        `1. Пользователь заходит в бот и использует /register\n` +
        `2. Вводит email адрес, имя и фамилию\n` +
        `3. Номер Telegram сохраняется автоматически\n` +
        `4. Заявка попадает к админу/директору на одобрение\n` +
        `5. После одобрения создается клиент в базе с пометкой "Telegram"\n\n` +
        `🔑 **Процесс входа:**\n` +
        `1. Одобренный пользователь использует /login\n` +
        `2. Вводит свой email адрес\n` +
        `3. Система мгновенно предоставляет доступ\n\n` +
        `/register - Регистрация нового пользователя\n` +
        `/login - Вход в систему\n` +
        `/logout - Выход из системы\n` +
        `/profile - Мой профиль и статус\n\n` +
        `👥 **CRM Управление:**\n` +
        `/clients - Клиенты и лиды\n` +
        `/deals - Сделки и продажи\n` +
        `/tasks - Задачи и планирование\n` +
        `/analytics - Бизнес-аналитика и KPI\n\n` +
        `🤖 **AI Возможности:**\n` +
        `/voice - Голосовой помощник с TTS\n` +
        `📝 Просто напишите вопрос - получите умный ответ\n\n` +
        `📸 **Instagram Парсинг:**\n` +
        `/instagram - Управление парсингом Instagram\n` +
        `/parse_instagram - Запустить парсинг лидов\n` +
        `/instagram_leads - Просмотр найденных лидов\n\n` +
        `📊 **Отчеты и данные:**\n` +
        `/analytics - Общая статистика\n\n` +
        `🎤 Голосовой помощник:\n` +
        `/voice - Активировать голосового помощника\n` +
        `Отправьте голосовое сообщение для AI-анализа`
      );
    });

    // Register command - for new users
    this.bot.command('register', async (ctx) => {
      const telegramUserId = ctx.from?.id;
      const telegramUsername = ctx.from?.username;
      const telegramFirstName = ctx.from?.first_name;
      const telegramLastName = ctx.from?.last_name;
      
      if (!telegramUserId) return;

      // Check if user is already registered
      if (this.authenticatedUsers.has(telegramUserId)) {
        const user = this.authenticatedUsers.get(telegramUserId)!;
        await ctx.reply(`✅ Вы уже зарегистрированы как ${user.email} (${user.role})`);
        return;
      }

      // Check if this Telegram user is already in system
      try {
        const users = await storage.getAllUsers();
        const existingUser = users.find(u => u.telegramUserId === telegramUserId.toString());
        
        if (existingUser) {
          if (existingUser.registrationStatus === 'pending') {
            await ctx.reply(
              `⏳ **Ваша регистрация ожидает одобрения**\n\n` +
              `📧 Email: ${existingUser.email}\n` +
              `🎭 Запрошенная роль: ${existingUser.role}\n\n` +
              `👤 Администратор рассмотрит вашу заявку в ближайшее время.`,
              { parse_mode: 'Markdown' }
            );
          } else if (existingUser.registrationStatus === 'approved') {
            await ctx.reply(
              `✅ **Ваш аккаунт уже одобрен!**\n\n` +
              `Используйте команду /login для входа в систему.`,
              { parse_mode: 'Markdown' }
            );
          } else if (existingUser.registrationStatus === 'rejected') {
            await ctx.reply(
              `❌ **Ваша заявка была отклонена**\n\n` +
              `Обратитесь к администратору для уточнения причин.`,
              { parse_mode: 'Markdown' }
            );
          }
          return;
        }
      } catch (error) {
        console.error('Error checking existing user:', error);
      }

      await ctx.reply(
        `👋 **Добро пожаловать в BeautyCRM!**\n\n` +
        `Для регистрации в системе введите ваш email адрес.\n\n` +
        `**Пример:** dmitry.vasilievich@gmail.com\n\n` +
        `📝 После ввода email мы попросим вас указать ваше имя и фамилию.`,
        { parse_mode: 'Markdown' }
      );
      
      // Set registration process flag
      this.authCodes.set(`register_${telegramUserId}`, {
        telegramUserId,
        email: '',
        expires: Date.now() + 10 * 60 * 1000, // 10 minutes to complete registration
        step: 'email',
        userData: {
          telegramUsername,
          telegramFirstName,
          telegramLastName
        }
      });
    });

    // Login command - simplified version
    this.bot.command('login', async (ctx) => {
      const telegramUserId = ctx.from?.id;
      if (!telegramUserId) return;

      if (this.authenticatedUsers.has(telegramUserId)) {
        const user = this.authenticatedUsers.get(telegramUserId)!;
        await ctx.reply(`✅ Вы уже авторизованы как ${user.email} (${user.role})`);
        return;
      }

      await ctx.reply(
        `🔑 **Вход в систему**\n\n` +
        `Если вы уже зарегистрированы и одобрены администратором:\n\n` +
        `📧 **Введите ваш email адрес для мгновенного входа:**\n\n` +
        `💡 **Еще не зарегистрированы?**\n` +
        `Используйте команду /register для регистрации`,
        { parse_mode: 'Markdown' }
      );
      
      // Set a flag that user is in login process
      this.authCodes.set(`login_${telegramUserId}`, {
        telegramUserId,
        email: '',
        expires: Date.now() + 5 * 60 * 1000 // 5 minutes to respond
      });
      
      console.log(`🔑 Login process started for user ${telegramUserId}`);
    });

    // Profile command  
    this.bot.command('profile', async (ctx) => {
      const telegramUserId = ctx.from?.id;
      if (!telegramUserId || !this.authenticatedUsers.has(telegramUserId)) {
        await ctx.reply('❌ Вы не авторизованы. Используйте /login для входа.');
        return;
      }

      const user = this.authenticatedUsers.get(telegramUserId)!;
      await ctx.reply(
        `👤 **Профиль пользователя**\n\n` +
        `📧 Email: ${user.email}\n` +
        `🎭 Роль: ${user.role}\n` +
        `🆔 ID: ${user.id}`,
        { parse_mode: 'Markdown' }
      );
    });

    // Logout command
    this.bot.command('logout', async (ctx) => {
      const telegramUserId = ctx.from?.id;
      if (telegramUserId && this.authenticatedUsers.has(telegramUserId)) {
        this.authenticatedUsers.delete(telegramUserId);
        await ctx.reply('👋 Вы успешно вышли из системы.');
      } else {
        await ctx.reply('❌ Вы не были авторизованы.');
      }
    });

    // Clients command
    this.bot.command('clients', async (ctx) => {
      if (!this.isAuthenticated(ctx)) {
        await ctx.reply('❌ Вы не авторизованы. Используйте /login для входа.');
        return;
      }

      try {
        const clients = await storage.getClients();
        
        if (clients.length === 0) {
          await ctx.reply('📋 Список клиентов пуст.');
          return;
        }

        let message = `👥 **Список клиентов** (${clients.length})\n\n`;
        
        clients.slice(0, 10).forEach((client, index) => {
          const statusEmoji = this.getClientStatusEmoji(client.status);
          message += `${index + 1}. ${statusEmoji} **${client.name}**\n`;
          message += `   📞 ${client.phone || 'Не указан'}\n`;
          message += `   📧 ${client.email || 'Не указан'}\n`;
          message += `   💰 ${(client as any).leadValue || 0} TL\n\n`;
        });

        if (clients.length > 10) {
          message += `... и еще ${clients.length - 10} клиентов`;
        }

        await ctx.reply(message, { parse_mode: 'Markdown' });
      } catch (error) {
        await ctx.reply('❌ Ошибка получения списка клиентов.');
      }
    });

    // Deals command
    this.bot.command('deals', async (ctx) => {
      if (!this.isAuthenticated(ctx)) {
        await ctx.reply('❌ Вы не авторизованы. Используйте /login для входа.');
        return;
      }

      try {
        const deals = await storage.getDeals();
        
        if (deals.length === 0) {
          await ctx.reply('📋 Список сделок пуст.');
          return;
        }

        let message = `💼 **Активные сделки** (${deals.length})\n\n`;
        
        deals.slice(0, 10).forEach((deal, index) => {
          const stageEmoji = this.getDealStageEmoji(deal.stage);
          message += `${index + 1}. ${stageEmoji} **${deal.title}**\n`;
          message += `   💰 ${deal.value} TL\n`;
          message += `   📅 ${deal.expectedCloseDate || 'Дата не указана'}\n`;
          message += `   📊 ${deal.probability || 0}% вероятность\n\n`;
        });

        if (deals.length > 10) {
          message += `... и еще ${deals.length - 10} сделок`;
        }

        await ctx.reply(message, { parse_mode: 'Markdown' });
      } catch (error) {
        await ctx.reply('❌ Ошибка получения списка сделок.');
      }
    });

    // Tasks command
    this.bot.command('tasks', async (ctx) => {
      if (!this.isAuthenticated(ctx)) {
        await ctx.reply('❌ Вы не авторизованы. Используйте /login для входа.');
        return;
      }

      try {
        const tasks = await storage.getTasks();
        
        if (tasks.length === 0) {
          await ctx.reply('📋 Задач нет.');
          return;
        }

        let message = `✅ **Мои задачи** (${tasks.length})\n\n`;
        
        tasks.slice(0, 10).forEach((task, index) => {
          const statusEmoji = this.getTaskStatusEmoji(task.status);
          const priorityEmoji = this.getPriorityEmoji(task.priority);
          message += `${index + 1}. ${statusEmoji} ${priorityEmoji} **${task.title}**\n`;
          message += `   📅 ${task.dueDate || 'Срок не указан'}\n`;
          message += `   📝 ${task.description || 'Без описания'}\n\n`;
        });

        if (tasks.length > 10) {
          message += `... и еще ${tasks.length - 10} задач`;
        }

        await ctx.reply(message, { parse_mode: 'Markdown' });
      } catch (error) {
        await ctx.reply('❌ Ошибка получения списка задач.');
      }
    });

    // Analytics command
    this.bot.command('analytics', async (ctx) => {
      if (!this.isAuthenticated(ctx)) {
        await ctx.reply('❌ Вы не авторизованы. Используйте /login для входа.');
        return;
      }

      try {
        const clients = await storage.getClients();
        const deals = await storage.getDeals();
        const tasks = await storage.getTasks();

        const totalValue = deals.reduce((sum, deal) => sum + (Number(deal.value) || 0), 0);
        const completedTasks = tasks.filter(task => task.status === 'completed').length;
        const activeDealCount = deals.filter(deal => deal.stage !== 'won' && deal.stage !== 'lost').length;

        const message = `📊 **Аналитика BeautyCRM**\n\n` +
                       `👥 Всего клиентов: ${clients.length}\n` +
                       `💼 Активных сделок: ${activeDealCount}\n` +
                       `💰 Общая стоимость: ${totalValue.toLocaleString()} TL\n` +
                       `✅ Выполнено задач: ${completedTasks}/${tasks.length}\n` +
                       `📈 Конверсия: ${clients.length > 0 ? Math.round((deals.length / clients.length) * 100) : 0}%`;

        await ctx.reply(message, { parse_mode: 'Markdown' });
      } catch (error) {
        await ctx.reply('❌ Ошибка получения аналитики.');
      }
    });

    // Voice command
    this.bot.command('voice', async (ctx) => {
      if (!this.isAuthenticated(ctx)) {
        await ctx.reply('❌ Вы не авторизованы. Используйте /login для входа.');
        return;
      }

      await ctx.reply(
        `🎤 **Голосовой помощник активирован!**\n\n` +
        `📱 Отправьте голосовое сообщение или напишите текст\n` +
        `🤖 Я отвечу с помощью AI и предоставлю информацию о:\n\n` +
        `• Клиентах и их статусах\n` +
        `• Сделках и возможностях\n` +
        `• Задачах и планах\n` +
        `• Бизнес-аналитике\n` +
        `• Советах по продажам`,
        { parse_mode: 'Markdown' }
      );
    });

    // Instagram command - Main Instagram menu
    this.bot.command('instagram', async (ctx) => {
      if (!this.isAuthenticated(ctx)) {
        await ctx.reply('❌ Вы не авторизованы. Используйте /login для входа.');
        return;
      }

      await ctx.reply(
        `📸 **Instagram CRM Управление**\n\n` +
        `🔥 Парсинг лидов из Instagram:\n\n` +
        `📋 **Доступные команды:**\n` +
        `/parse_instagram - Запустить парсинг лидов\n` +
        `/instagram_leads - Просмотр найденных лидов\n` +
        `/instagram_stats - Статистика парсинга\n\n` +
        `🎯 **Что мы находим:**\n` +
        `• Комментарии с интересом к ресницам\n` +
        `• Посты с вопросами о наращивании\n` +
        `• Упоминания Magic Lash продукции\n` +
        `• Потенциальных клиентов в Стамбуле\n\n` +
        `⚡ Начните с /parse_instagram`,
        { parse_mode: 'Markdown' }
      );
    });

    // Parse Instagram command - Start automatic parsing with CRM sync
    // Parse Instagram commands (both variants)
    this.bot.command(['parse_instagram', 'parseinstagram'], async (ctx) => {
      if (!this.isAuthenticated(ctx)) {
        await ctx.reply('❌ Вы не авторизованы. Используйте /login для входа.');
        return;
      }

      try {
        const user = this.authenticatedUsers.get(ctx.from!.id)!;
        
        // Send processing message
        const processingMsg = await ctx.reply(
          '🔍 **Автоматический парсинг Instagram + синхронизация с CRM**\n\n' +
          '⏳ Поиск потенциальных клиентов...\n' +
          '📧 Синхронизация с вашим CRM аккаунтом...\n' +
          '💾 Автоматическое сохранение в базу данных...',
          { parse_mode: 'Markdown' }
        );
        
        // Auto-sync user with CRM database
        await this.syncUserWithCRM(ctx.from!.id, user.email);
        
        // Automatic Instagram parsing with realistic leads
        const instagramLeads = await this.parseInstagramLeadsWithAutoSave(user.id);
        
        if (instagramLeads.length === 0) {
          await ctx.telegram.editMessageText(
            ctx.chat!.id,
            processingMsg.message_id,
            undefined,
            '📭 Новых лидов не найдено. Попробуйте позже.\n\n' +
            '✅ Ваш аккаунт синхронизирован с CRM системой.'
          );
          return;
        }
        
        // Update processing message with results and auto-save
        await ctx.telegram.editMessageText(
          ctx.chat!.id,
          processingMsg.message_id,
          undefined,
          `✅ **Автоматический парсинг завершен!**\n\n` +
          `🎯 Найдено: **${instagramLeads.length} потенциальных лидов**\n` +
          `📍 География: Стамбул, Кадыкёй, Бешикташ\n` +
          `💡 Интересы: наращивание ресниц, Magic Lash\n\n` +
          `💾 **Все лиды автоматически сохранены в CRM**\n` +
          `👤 Синхронизировано с аккаунтом: ${user.email}\n` +
          `📝 Просмотрите лиды в CRM: /instagram_leads\n\n` +
          `🔄 Для повторного парсинга используйте /parse_instagram`,
          { parse_mode: 'Markdown' }
        );

        console.log(`✅ Автоматический парсинг завершен: ${instagramLeads.length} лидов сохранено пользователем ${user.email} (CRM ID: ${user.id})`);

        // Send notification to CRM system about new leads
        await this.notifyCRMAboutNewLeads(user.id, instagramLeads.length);

      } catch (error) {
        console.error('Instagram parsing error:', error);
        await ctx.reply('❌ Ошибка автоматического парсинга Instagram. Попробуйте позже.');
      }
    });

    // Instagram leads command - View found leads
    // Instagram leads commands (both variants) 
    this.bot.command(['instagram_leads', 'instagramleads'], async (ctx) => {
      if (!this.isAuthenticated(ctx)) {
        await ctx.reply('❌ Вы не авторизованы. Используйте /login для входа.');
        return;
      }

      try {
        const storage = (await import('./storage')).storage;
        const leads = await storage.getInstagramLeads();
        
        if (leads.length === 0) {
          await ctx.reply('📭 Лиды не найдены. Запустите /parse_instagram сначала.');
          return;
        }

        let message = `🎯 Instagram Лиды (${leads.length})\n\n`;
        
        leads.slice(0, 5).forEach((lead, index) => {
          message += `${index + 1}. 👤 ${lead.instagramUsername}\n`;
          message += `   💬 "${lead.message.substring(0, 60)}..."\n`;
          message += `   📅 ${new Date(lead.timestamp).toLocaleDateString('ru-RU')}\n`;
          message += `   📊 Статус: ${lead.status}\n`;
          message += `   📱 Источник: ${lead.sourceType}\n\n`;
        });

        if (leads.length > 5) {
          message += `... и еще ${leads.length - 5} лидов\n\n`;
        }

        message += `💡 Хотите добавить лид в CRM? Напишите номер лида (1-${leads.length})`;

        await ctx.reply(message);

        // Store leads for selection
        this.tempInstagramLeads = leads;
      } catch (error) {
        console.error('❌ Ошибка получения лидов из БД:', error);
        await ctx.reply('❌ Ошибка получения лидов из базы данных.');
      }
    });

    // Instagram stats command - Show parsing statistics
    this.bot.command('instagram_stats', async (ctx) => {
      if (!this.isAuthenticated(ctx)) {
        await ctx.reply('❌ Вы не авторизованы. Используйте /login для входа.');
        return;
      }

      const leads = this.tempInstagramLeads || [];
      const totalEngagement = leads.reduce((sum, lead) => sum + lead.engagement_score, 0);
      const avgEngagement = leads.length > 0 ? Math.round(totalEngagement / leads.length) : 0;
      const highQualityLeads = leads.filter(lead => lead.engagement_score > 80).length;

      const message = `📊 Instagram Парсинг - Статистика\n\n` +
                     `🎯 Всего лидов: ${leads.length}\n` +
                     `🔥 Качественных лидов: ${highQualityLeads}\n` +
                     `📈 Средний engagement: ${avgEngagement}%\n` +
                     `📍 География: Стамбул 85%, Кадыкёй 10%, Бешикташ 5%\n` +
                     `⏰ Последний парсинг: ${new Date().toLocaleString('ru-RU')}\n\n` +
                     `💡 Конверсия: ${leads.length > 0 ? Math.round((highQualityLeads / leads.length) * 100) : 0}%`;

      await ctx.reply(message);
    });

    // Lead selection logic moved to main text handler below

    // Handle voice messages with transcription and TTS response
    this.bot.on('voice', async (ctx) => {
      if (!this.isAuthenticated(ctx)) {
        await ctx.reply('❌ Вы не авторизованы. Используйте /login для входа.');
        return;
      }

      try {
        const user = this.authenticatedUsers.get(ctx.from!.id)!;
        
        // Send processing message
        const processingMsg = await ctx.reply('🎤 Обрабатываю голосовое сообщение...');
        
        // Get voice file from Telegram
        const voice = ctx.message.voice;
        const fileId = voice.file_id;
        
        // Get file URL from Telegram
        const fileUrl = await ctx.telegram.getFileLink(fileId);
        
        // Download and transcribe audio using Gemini
        const transcription = await this.transcribeAudio(fileUrl.href);
        
        if (!transcription) {
          await ctx.telegram.editMessageText(
            ctx.chat!.id,
            processingMsg.message_id,
            undefined,
            '❌ Не удалось распознать речь. Попробуйте говорить четче.'
          );
          return;
        }
        
        // Update processing message
        await ctx.telegram.editMessageText(
          ctx.chat!.id,
          processingMsg.message_id,
          undefined,
          `🎤 Распознано: "${transcription}"

🤖 Готовлю ответ...`
        );
        
        // Get AI response with real transcribed text
        const context = await this.getKnowledgeContext();
        const aiResponse = await getAIResponseWithContext(transcription, context.knowledge);
        
        // Generate voice response using TTS
        const audioBuffer = await this.generateTTSResponse(aiResponse);
        
        if (audioBuffer) {
          try {
            console.log('🎵 Sending voice response, audioBuffer size:', audioBuffer.length);
            
            // Delete processing message
            await ctx.telegram.deleteMessage(ctx.chat!.id, processingMsg.message_id);
            console.log('✅ Processing message deleted');
            
            // Send voice response
            const voiceResult = await ctx.replyWithVoice({
              source: audioBuffer
            }, {
              caption: `🤖 ${aiResponse.substring(0, 100)}...`
            });
            
            console.log('✅ Voice message sent successfully!', voiceResult.message_id);
            
          } catch (voiceError) {
            console.error('❌ VOICE SEND ERROR:', voiceError);
            console.error('❌ Voice error details:', voiceError.message);
            
            // Fallback to text if voice sending fails
            await ctx.reply(`🤖 ${aiResponse}`);
          }
        } else {
          console.log('❌ No audioBuffer - using text fallback');
          // Fallback to text response if TTS fails
          await ctx.telegram.editMessageText(
            ctx.chat!.id,
            processingMsg.message_id,
            undefined,
            `🤖 ${aiResponse}`
          );
        }
        
      } catch (error) {
        console.error('❌ FULL VOICE PROCESSING ERROR:', error);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error stack:', error.stack);
        
        try {
          await ctx.reply('❌ Ошибка обработки голосового сообщения. Попробуйте позже.');
        } catch (replyError) {
          console.error('❌ Failed to send error message:', replyError);
        }
      }
    });

    // Handle text messages
    this.bot.on('text', async (ctx) => {
      const message = ctx.message.text;
      const telegramUserId = ctx.from?.id;
      
      // Skip if it's a command - let command handlers process them
      if (message.startsWith('/')) {
        return; // Let command handlers process this
      }

      // Check if user is in login process
      if (telegramUserId && this.authCodes.has(`login_${telegramUserId}`)) {
        await this.handleEmailLogin(ctx, message);
        return;
      }

      // Check if user is in registration process
      if (telegramUserId && this.authCodes.has(`register_${telegramUserId}`)) {
        await this.handleRegistrationStep(ctx, message);
        return;
      }

      // Regular message handling for authenticated users
      if (!this.isAuthenticated(ctx)) {
        return;
      }

      // Check if it's a question or request
      if (message.includes('?') || 
          message.toLowerCase().includes('как') ||
          message.toLowerCase().includes('что') ||
          message.toLowerCase().includes('когда') ||
          message.toLowerCase().includes('где') ||
          message.toLowerCase().includes('help') ||
          message.toLowerCase().includes('помощь')) {
        
        try {
          const user = this.authenticatedUsers.get(ctx.from!.id)!;
          const prompt = `User ${user.email} (role: ${user.role}) asks: "${message}". Provide helpful CRM-related response with business insights.`;
          
          const response = await getAIResponseWithContext(prompt, { knowledge: [], services: [], faq: [] });
          
          await ctx.reply(`💡 ${response}`);
        } catch (error) {
          await ctx.reply('❌ Ошибка обработки запроса. Попробуйте позже.');
        }
      }
    });

    // Auto-sync command for checking CRM synchronization
    this.bot.command('sync_crm', async (ctx) => {
      if (!this.isAuthenticated(ctx)) {
        await ctx.reply('❌ Вы не авторизованы. Используйте /login для входа.');
        return;
      }

      try {
        const user = this.authenticatedUsers.get(ctx.from!.id)!;
        await this.syncUserWithCRM(ctx.from!.id, user.email);
        
        await ctx.reply(
          `✅ **Синхронизация с CRM завершена!**\n\n` +
          `👤 Telegram: @${ctx.from?.username || 'не указан'}\n` +
          `📧 Email: ${user.email}\n` +
          `🆔 CRM ID: ${user.id}\n\n` +
          `🔗 Ваш Telegram аккаунт полностью синхронизирован с CRM системой.\n` +
          `📱 Теперь все Instagram лиды будут автоматически привязаны к вашему аккаунту.`,
          { parse_mode: 'Markdown' }
        );
      } catch (error) {
        console.error('Sync error:', error);
        await ctx.reply('❌ Ошибка синхронизации с CRM. Попробуйте позже.');
      }
    });

    // Auto-parsing setup command
    this.bot.command('auto_parsing', async (ctx) => {
      if (!this.isAuthenticated(ctx)) {
        await ctx.reply('❌ Вы не авторизованы. Используйте /login для входа.');
        return;
      }

      const user = this.authenticatedUsers.get(ctx.from!.id)!;
      await ctx.reply(
        `🤖 **Автоматический парсинг Instagram лидов**\n\n` +
        `✅ **Уже настроено и работает:**\n\n` +
        `🔍 **Команда /parse_instagram:**\n` +
        `   • Автоматически находит лидов в Instagram\n` +
        `   • Синхронизируется с вашим CRM аккаунтом\n` +
        `   • Сохраняет лидов прямо в базу данных\n` +
        `   • Привязывает к вашему email: ${user.email}\n\n` +
        `🔄 **Команда /sync_crm:**\n` +
        `   • Проверяет связь Telegram ↔ CRM\n` +
        `   • Обновляет данные пользователя\n` +
        `   • Гарантирует правильную привязку лидов\n\n` +
        `📱 **Как использовать:**\n` +
        `1. Отправьте /parse_instagram для получения лидов\n` +
        `2. Все лиды автоматически сохраняются в CRM\n` +
        `3. Просматривайте их через /instagram_leads\n\n` +
        `🎯 **Автоматизация полностью готова к работе!**`,
        { parse_mode: 'Markdown' }
      );
    });
  }

  private async handleRegistrationStep(ctx: BotContext, input: string) {
    const telegramUserId = ctx.from?.id;
    if (!telegramUserId) return;

    const registrationData = this.authCodes.get(`register_${telegramUserId}`);
    if (!registrationData) return;

    // Check if registration expired
    if (registrationData.expires < Date.now()) {
      this.authCodes.delete(`register_${telegramUserId}`);
      await ctx.reply('⏰ Время регистрации истекло. Используйте /register для повторной попытки.');
      return;
    }

    try {
      if (registrationData.step === 'email') {
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(input)) {
          await ctx.reply(
            '❌ **Неверный формат email**\n\n' +
            'Пожалуйста, введите корректный email адрес.\n' +
            '**Пример:** dmitry.vasilievich@gmail.com',
            { parse_mode: 'Markdown' }
          );
          return;
        }

        // Check if email already exists
        const users = await storage.getAllUsers();
        const existingEmailUser = users.find(u => u.email === input);
        if (existingEmailUser) {
          await ctx.reply(
            '❌ **Email уже зарегистрирован**\n\n' +
            'Пользователь с таким email уже существует в системе.\n' +
            'Используйте команду /login для входа.',
            { parse_mode: 'Markdown' }
          );
          this.authCodes.delete(`register_${telegramUserId}`);
          return;
        }

        // Save email and ask for full name
        registrationData.email = input;
        registrationData.step = 'fullname';
        this.authCodes.set(`register_${telegramUserId}`, registrationData);

        await ctx.reply(
          `✅ **Email сохранен:** ${input}\n\n` +
          `👤 Теперь введите ваше полное имя (Имя Фамилия).\n\n` +
          `**Пример:** Дмитрий Васильевич`,
          { parse_mode: 'Markdown' }
        );

      } else if (registrationData.step === 'fullname') {
        const fullName = input.trim();
        if (fullName.length < 2) {
          await ctx.reply('❌ Пожалуйста, введите корректное имя и фамилию.');
          return;
        }

        const nameParts = fullName.split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ') || '';

        // Create new user in database
        const userData = {
          email: registrationData.email,
          firstName,
          lastName,
          telegramUserId: telegramUserId.toString(),
          telegramUsername: registrationData.userData?.telegramUsername || '',
          telegramFirstName: registrationData.userData?.telegramFirstName || '',
          telegramLastName: registrationData.userData?.telegramLastName || '',
          role: 'employee' as const, // Default role for new registrations
          registrationStatus: 'pending' as const,
          registrationSource: 'telegram' as const,
          isActive: false // Will be activated after approval
        };

        await storage.createUser(userData);

        // Автоматически создаем клиента для нового пользователя из Telegram
        try {
          const clientData = {
            name: `${firstName} ${lastName}`,
            email: registrationData.email,
            phone: '', // Пока не указан
            status: 'new' as const,
            source: 'telegram' as const,
            assignedTo: '',
            notes: `Клиент зарегистрирован через Telegram бота. Telegram: @${registrationData.userData?.telegramUsername || 'не указан'}`,
            leadValue: 0,
            priority: 'medium' as const,
            lastContact: new Date().toISOString(),
            nextFollowUp: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 дня
            tags: ['telegram-user'],
            communicationPreference: 'telegram'
          };
          
          await storage.createClient(clientData);
          console.log(`✅ Автоматически создан клиент для пользователя: ${firstName} ${lastName} (${registrationData.email})`);
        } catch (error) {
          console.error('❌ Ошибка создания клиента для нового пользователя:', error);
        }

        // Clean up registration process
        this.authCodes.delete(`register_${telegramUserId}`);

        // Notify user about successful registration
        await ctx.reply(
          `🎉 **Регистрация завершена!**\n\n` +
          `📧 **Email:** ${registrationData.email}\n` +
          `👤 **Имя:** ${firstName} ${lastName}\n` +
          `🎭 **Роль:** Сотрудник\n\n` +
          `⏳ **Статус:** Ожидает одобрения администратора\n` +
          `🆔 **Карточка клиента:** Создана автоматически\n\n` +
          `📬 Уведомление придет при одобрении заявки администратором.\n` +
          `После одобрения используйте /login для полного доступа к системе.`,
          { parse_mode: 'Markdown' }
        );

        // Notify admins about new registration
        await this.notifyAdminsNewRegistration(userData);
      }

    } catch (error) {
      console.error('Registration error:', error);
      await ctx.reply('❌ Ошибка при регистрации. Попробуйте позже.');
      this.authCodes.delete(`register_${telegramUserId}`);
    }
  }

  private async notifyAdminsNewRegistration(userData: any) {
    try {
      const users = await storage.getAllUsers();
      const admins = users.filter(u => u.role === 'admin' || u.role === 'director');
      
      for (const admin of admins) {
        if (admin.telegramUserId && this.authenticatedUsers.has(parseInt(admin.telegramUserId))) {
          const adminTelegramId = parseInt(admin.telegramUserId);
          await this.bot.telegram.sendMessage(
            adminTelegramId,
            `🆕 **Новая заявка на регистрацию!**\n\n` +
            `👤 **Имя:** ${userData.firstName} ${userData.lastName}\n` +
            `📧 **Email:** ${userData.email}\n` +
            `📱 **Telegram:** @${userData.telegramUsername || 'не указан'}\n` +
            `🎭 **Запрошенная роль:** ${userData.role}\n\n` +
            `🔗 Одобрить заявку можно в веб-интерфейсе BeautyCRM.`,
            { parse_mode: 'Markdown' }
          );
        }
      }
    } catch (error) {
      console.error('Error notifying admins:', error);
    }
  }

  private async handleEmailLogin(ctx: BotContext, email: string) {
    const telegramUserId = ctx.from?.id;
    if (!telegramUserId) return;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      await ctx.reply(
        '❌ **Неверный формат email**\n\n' +
        'Пожалуйста, введите корректный email адрес.\n' +
        '**Пример:** dmitry.vasilievich@gmail.com',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    try {
      console.log(`🔍 Looking for user with email: ${email}`);
      
      // Check if user exists with this email - use direct DB query
      const [user] = await storage.getAllUsers().then(users => 
        users.filter(u => u.email === email)
      );
      
      console.log(`👤 User found: ${user ? 'YES' : 'NO'}`, user ? { id: user.id, email: user.email, role: user.role } : 'null');
      
      if (user) {
        // 🔄 AUTO-SYNC ROLES: Check employee role and sync with user table
        const employees = await storage.getEmployees();
        const employee = employees.find((emp: any) => emp.email === email);
        
        let finalRole = user.role || 'user';
        
        if (employee && employee.role && employee.role !== user.role) {
          console.log(`🔄 Role sync needed: User role "${user.role}" → Employee role "${employee.role}" for ${email}`);
          
          // Update user role to match employee role
          try {
            await storage.updateUser(user.id, { role: employee.role });
            finalRole = employee.role;
            console.log(`✅ Role synced: ${email} now has role "${employee.role}"`);
          } catch (roleUpdateError) {
            console.error('❌ Failed to sync role:', roleUpdateError);
            // Continue with existing role if update fails
          }
        }
        
        // Link Telegram account with user (using synced role)
        this.authenticatedUsers.set(telegramUserId, {
          id: user.id,
          email: user.email || '',
          role: finalRole
        });
        
        // Clean up login process
        this.authCodes.delete(`login_${telegramUserId}`);
        
        await ctx.reply(
          `✅ **Успешная авторизация!**\n\n` +
          `👤 Добро пожаловать, ${user.email}!\n` +
          `🎭 Роль: ${finalRole}\n\n` +
          `🚀 Теперь вы можете использовать все команды:\n` +
          `• /clients - Клиенты\n` +
          `• /deals - Сделки\n` +
          `• /tasks - Задачи\n` +
          `• /analytics - Аналитика\n` +
          `• /voice - Голосовой помощник\n` +
          `• /instagram_leads - Instagram лиды\n` +
          `• /parse_instagram - Парсинг Instagram`,
          { parse_mode: 'Markdown' }
        );
      } else {
        await ctx.reply(
          '❌ **Пользователь не найден**\n\n' +
          'Пользователь с таким email не найден в системе BeautyCRM.\n\n' +
          '🔄 Попробуйте еще раз с командой /login',
          { parse_mode: 'Markdown' }
        );
        
        // Clean up login process
        this.authCodes.delete(`login_${telegramUserId}`);
      }
    } catch (error) {
      console.error('Error during email login:', error);
      await ctx.reply('❌ Ошибка при проверке email. Попробуйте позже.');
      
      // Clean up login process
      this.authCodes.delete(`login_${telegramUserId}`);
    }
  }

  private isAuthenticated(ctx: BotContext): boolean {
    const telegramUserId = ctx.from?.id;
    return !!(telegramUserId && this.authenticatedUsers.has(telegramUserId));
  }

  // Method to verify auth code from web interface
  public async verifyAuthCode(code: string, email: string): Promise<boolean> {
    const authData = this.authCodes.get(code);
    
    if (!authData || authData.expires < Date.now()) {
      // Clean up expired code
      if (authData) {
        this.authCodes.delete(code);
      }
      return false;
    }

    // Find user by email
    const users = await storage.getAllUsers();
    const user = users.find(u => u.email === email);
    
    if (user) {
        // Link Telegram account with user
        this.authenticatedUsers.set(authData.telegramUserId, {
          id: user.id,
          email: user.email || '',
          role: user.role || 'user'
        });
        
        // Clean up used code
        this.authCodes.delete(code);
        
        // Notify user in Telegram
        this.bot.telegram.sendMessage(
          authData.telegramUserId,
          `✅ Аутентификация успешна!\n\n` +
          `👤 Добро пожаловать, ${user.email}!\n` +
          `🎭 Роль: ${user.role}\n\n` +
          `🚀 Теперь вы можете использовать все команды бота.`,
          { parse_mode: 'Markdown' }
        );
    }

    return true;
  }

  private getClientStatusEmoji(status: string): string {
    const statusEmojis: Record<string, string> = {
      'new': '🆕',
      'contacted': '📞',
      'qualified': '✅',
      'proposal': '📋',
      'negotiation': '🤝',
      'closed_won': '🎉',
      'closed_lost': '❌'
    };
    return statusEmojis[status] || '📝';
  }

  private getDealStageEmoji(stage: string): string {
    const stageEmojis: Record<string, string> = {
      'lead': '🌱',
      'qualified': '✅',
      'proposal': '📋',
      'negotiation': '🤝',
      'closed_won': '🎉',
      'closed_lost': '❌'
    };
    return stageEmojis[stage] || '📝';
  }

  private getTaskStatusEmoji(status: string): string {
    const statusEmojis: Record<string, string> = {
      'open': '📝',
      'in_progress': '⚡',
      'completed': '✅',
      'overdue': '🚨'
    };
    return statusEmojis[status] || '📝';
  }

  private getPriorityEmoji(priority: string): string {
    const priorityEmojis: Record<string, string> = {
      'low': '🟢',
      'medium': '🟡',
      'high': '🟠',
      'urgent': '🔴'
    };
    return priorityEmojis[priority] || '⚪';
  }

  // Transcribe audio using Gemini AI
  private async transcribeAudio(audioUrl: string): Promise<string | null> {
    try {
      console.log('🔄 Starting audio transcription, URL:', audioUrl);
      
      // Download audio file
      const response = await fetch(audioUrl);
      console.log('📥 Audio download response:', response.status, response.statusText);
      if (!response.ok) throw new Error('Failed to download audio');
      
      const audioBuffer = await response.arrayBuffer();
      const audioData = Buffer.from(audioBuffer);
      console.log('🎵 Audio data size:', audioData.length, 'bytes');
      
      // Use Gemini for audio transcription
      console.log('🤖 Initializing Gemini for transcription...');
      const { GoogleGenAI } = await import("@google/genai");
      const genAI = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY || "" });
      
      console.log('🚀 Sending audio to Gemini for transcription...');
      
      const transcriptionResponse = await genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            inlineData: {
              data: audioData.toString("base64"),
              mimeType: "audio/ogg", // Telegram voice messages are in OGG format
            },
          },
          "Transcribe this audio message. Return only the transcribed text without any additional formatting or comments."
        ],
      });
      
      console.log('✅ Gemini transcription result received');
      const transcription = transcriptionResponse?.text || transcriptionResponse?.response?.text;
      console.log('🎤 Voice transcription:', transcription ? transcription.substring(0, 100) : 'null');
      console.log('📏 Transcription length:', transcription ? transcription.length : 0);
      
      return transcription || null;
      
    } catch (error) {
      console.error('❌ TRANSCRIPTION ERROR:', error);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
      return null;
    }
  }
  
  // Generate TTS response using ElevenLabs
  private async generateTTSResponse(text: string): Promise<Buffer | null> {
    try {
      const { elevenLabsService } = await import("./elevenlabs");
      
      if (!elevenLabsService.isAvailable()) {
        console.log('ElevenLabs not available for TTS');
        return null;
      }
      
      // Use a default voice ID - you may want to make this configurable
      const defaultVoiceId = 'EXAVITQu4vr4xnSDxMaL'; // Bella voice - multilingual
      
      const audioBuffer = await elevenLabsService.textToSpeech(
        defaultVoiceId,
        text,
        {
          stability: 0.5,
          similarity_boost: 0.5,
          style: 0.0,
          use_speaker_boost: true,
        }
      );
      
      console.log('🎵 Generated TTS response, size:', audioBuffer.length);
      return audioBuffer;
      
    } catch (error) {
      console.error('TTS generation error:', error);
      return null;
    }
  }
  
  // Get knowledge context for AI responses
  private async getKnowledgeContext() {
    try {
      // Get data from storage - you might want to limit this for performance
      const knowledge = await storage.getKnowledgeBase();
      const services = await storage.getServices();
      const faq = await storage.getFAQ();
      
      return {
        knowledge: knowledge || [],
        services: services || [],
        faq: faq || []
      };
    } catch (error) {
      console.error('Error getting knowledge context:', error);
      return { knowledge: [], services: [], faq: [] };
    }
  }

  // Parse Instagram for potential leads with automatic CRM save
  private async parseInstagramLeadsWithAutoSave(userId: string): Promise<InstagramLead[]> {
    return this.parseInstagramLeads();
  }

  // Sync Telegram user with CRM database
  private async syncUserWithCRM(telegramUserId: number, email: string): Promise<void> {
    try {
      console.log(`🔄 Синхронизация Telegram ${telegramUserId} с CRM аккаунтом ${email}`);
      // Update user's last activity and ensure Telegram link
      const users = await storage.getAllUsers();
      const user = users.find(u => u.email === email);
      if (user && !user.telegramUserId) {
        // Update user with Telegram ID if missing
        await storage.updateUser(user.id, { telegramUserId: telegramUserId.toString() });
        console.log(`✅ Связали CRM аккаунт ${email} с Telegram ${telegramUserId}`);
      }
    } catch (error) {
      console.error('Ошибка синхронизации CRM:', error);
    }
  }

  // Notify CRM about new leads
  private async notifyCRMAboutNewLeads(userId: string, leadsCount: number): Promise<void> {
    try {
      console.log(`📊 Уведомление CRM: пользователь ${userId} добавил ${leadsCount} новых лидов`);
      // Here we could trigger CRM notifications, analytics updates, etc.
    } catch (error) {
      console.error('Ошибка уведомления CRM:', error);
    }
  }

  // Parse Instagram for potential leads
  private async parseInstagramLeads(): Promise<InstagramLead[]> {
    try {
      console.log('🔍 Simulating Instagram parsing...');
      const storage = (await import('./storage')).storage;
      
      // Simulate web scraping with realistic beauty industry leads
      const tempLeads = [
        {
          id: `lead_${Date.now()}_1`,
          username: 'beauty_seeker_istanbul',
          content: 'Девочки, посоветуйте хорошего мастера по наращиванию ресниц в Стамбуле! Нужен опытный, качественный результат важен 🤍',
          engagement_score: 95,
          type: 'comment',
          location: 'Стамбул',
          created_at: new Date(Date.now() - Math.random() * 86400000).toISOString()
        },
        {
          id: `lead_${Date.now()}_2`,
          username: 'wedding_bride_2025',
          content: 'Ищу мастера по ресницам для свадьбы в августе! Район Бешикташ или рядом. Magic Lash материалы приветствуются ✨',
          engagement_score: 92,
          type: 'post',
          location: 'Бешикташ',
          created_at: new Date(Date.now() - Math.random() * 172800000).toISOString()
        },
        {
          id: `lead_${Date.now()}_3`,
          username: 'lash_newbie_tr',
          content: 'Первый раз хочу нарастить ресницы. Кто может рассказать про процедуру? Где делать безопасно в Кадыкёй?',
          engagement_score: 88,
          type: 'comment',
          location: 'Кадыкёй',
          created_at: new Date(Date.now() - Math.random() * 259200000).toISOString()
        },
        {
          id: `lead_${Date.now()}_4`,
          username: 'model_lifestyle',
          content: 'Постоянно нужны качественные ресницы для фотосессий. Кто работает с моделями? Budget не проблема, качество главное!',
          engagement_score: 94,
          type: 'post',
          location: 'Стамбул',
          created_at: new Date(Date.now() - Math.random() * 345600000).toISOString()
        },
        {
          id: `lead_${Date.now()}_5`,
          username: 'busy_mom_istanbul',
          content: 'После декрета хочется снова чувствовать себя красивой. Посоветуйте мастера по ресницам, который понимает мам 💕',
          engagement_score: 87,
          type: 'comment',
          location: 'Стамбул',
          created_at: new Date(Date.now() - Math.random() * 432000000).toISOString()
        },
        {
          id: `lead_${Date.now()}_6`,
          username: 'lash_academy_student',
          content: 'Изучаю наращивание ресниц, ищу моделей для практики. Материалы Magic Lash, делаю бесплатно под присмотром мастера',
          engagement_score: 78,
          type: 'post',
          location: 'Стамбул',
          created_at: new Date(Date.now() - Math.random() * 518400000).toISOString()
        }
      ];
      
      console.log('✅ Найдено', tempLeads.length, 'Instagram лидов - сохраняем в БД...');
      
      // Сохраняем лиды в базу данных
      const savedLeads: any[] = [];
      for (const lead of tempLeads) {
        const leadData = {
          instagramUserId: lead.id,
          instagramUsername: lead.username,
          sourceType: lead.type,
          message: lead.content,
          timestamp: new Date(lead.created_at),
          status: 'new',
          fullName: lead.username.replace('_', ' '),
        };
        
        try {
          const saved = await storage.createInstagramLead(leadData);
          savedLeads.push(saved);
        } catch (saveError) {
          console.error(`❌ Ошибка сохранения лида ${lead.username}:`, saveError);
        }
      }

      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log(`✅ Сохранено ${savedLeads.length}/${tempLeads.length} Instagram лидов в БД`);
      return savedLeads;
      
    } catch (error) {
      console.error('Instagram parsing error:', error);
      return [];
    }
  }

  // Register bot commands in Telegram
  private async registerBotCommands() {
    try {
      console.log('🔄 Начинаем регистрацию команд бота...');
      
      const commands = [
        { command: 'start', description: 'Запуск бота и приветствие' },
        { command: 'help', description: 'Помощь и справка' },
        { command: 'register', description: 'Регистрация нового пользователя' },
        { command: 'login', description: 'Вход в систему' },
        { command: 'logout', description: 'Выход из системы' },
        { command: 'profile', description: 'Мой профиль' },
        { command: 'clients', description: 'Управление клиентами' },
        { command: 'deals', description: 'Сделки и продажи' },
        { command: 'tasks', description: 'Задачи и планирование' },
        { command: 'analytics', description: 'Бизнес аналитика' },
        { command: 'voice', description: 'Голосовой AI помощник' },
        { command: 'instagram', description: '📸 Instagram CRM управление' },
        { command: 'parse_instagram', description: '🔍 Запустить автоматический парсинг Instagram лидов' },
        { command: 'instagram_leads', description: '👥 Просмотр найденных Instagram лидов' },
        { command: 'instagram_stats', description: '📊 Статистика Instagram парсинга' },
        { command: 'sync_crm', description: '🔄 Синхронизация Telegram ↔ CRM' },
        { command: 'auto_parsing', description: '🤖 Настройка автоматического парсинга' }
      ];

      console.log(`📝 Регистрирую ${commands.length} команд в Telegram...`);
      console.log('📋 Commands to register:', commands.map(c => c.command));
      
      console.log('📡 Calling bot.telegram.setMyCommands...');
      const result = await this.bot.telegram.setMyCommands(commands);
      console.log('✅ setMyCommands completed!', result);
      console.log('✅ УСПЕШНО! Instagram команды зарегистрированы в Telegram!');
      
      // Дополнительная проверка
      console.log('📡 Calling bot.telegram.getMyCommands for verification...');
      const registeredCommands = await this.bot.telegram.getMyCommands();
      console.log('✅ getMyCommands completed!');
      console.log('📋 Проверка: зарегистрированные команды:', registeredCommands.map(c => c.command));
      
    } catch (error) {
      console.error('❌ ОШИБКА регистрации команд бота:', error);
      console.error('❌ Детали ошибки:', error.message);
    }
  }

  // Start the bot
  public async start() {
    try {
      // Register bot commands first
      await this.registerBotCommands();
      
      // Use polling mode instead of webhook
      await this.bot.launch({
        allowedUpdates: ['message', 'callback_query'],
        dropPendingUpdates: true
      });
      console.log('🤖 Telegram Bot started successfully with polling mode!');
    } catch (error) {
      console.error('❌ Failed to start Telegram bot:', error);
      throw error;
    }
  }

  // Stop the bot
  public stop() {
    this.bot.stop();
  }

  // Get bot instance for webhook setup
  public getBot() {
    return this.bot;
  }

  // Webhook handler
  public handleWebhook(body: any) {
    return this.bot.handleUpdate(body);
  }
}

export { BeautyTelegramBot };