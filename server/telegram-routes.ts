import { Express } from 'express';
import { BeautyTelegramBot } from './telegram-bot';

let telegramBot: BeautyTelegramBot | null = null;

// Auto-initialize bot if token is available
if (process.env.TELEGRAM_BOT_TOKEN && !telegramBot) {
  try {
    telegramBot = new BeautyTelegramBot(process.env.TELEGRAM_BOT_TOKEN);
    telegramBot.start().then(() => {
      console.log('🤖 Telegram bot auto-started successfully!');
    }).catch((error) => {
      console.error('❌ Failed to auto-start Telegram bot:', error);
      telegramBot = null;
    });
  } catch (error) {
    console.error('❌ Failed to create Telegram bot:', error);
  }
}

export function setupTelegramRoutes(app: Express) {
  // Initialize bot endpoint
  app.post('/api/telegram/init', async (req, res) => {
    try {
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({ message: 'Bot token is required' });
      }

      // Stop existing bot if any
      if (telegramBot) {
        telegramBot.stop();
      }

      // Create new bot instance
      telegramBot = new BeautyTelegramBot(token);
      await telegramBot.start();

      res.json({ message: 'Telegram bot initialized successfully' });
    } catch (error) {
      console.error('Error initializing Telegram bot:', error);
      res.status(500).json({ message: 'Failed to initialize bot' });
    }
  });

  // Webhook endpoint
  app.post('/api/telegram/webhook', async (req, res) => {
    try {
      if (!telegramBot) {
        return res.status(400).json({ message: 'Bot not initialized' });
      }

      await telegramBot.handleWebhook(req.body);
      res.status(200).json({ ok: true });
    } catch (error) {
      console.error('Error handling webhook:', error);
      res.status(500).json({ message: 'Webhook error' });
    }
  });

  // Bot status endpoint
  app.get('/api/telegram/status', (req, res) => {
    res.json({
      status: telegramBot ? 'active' : 'inactive',
      initialized: !!telegramBot
    });
  });

  // Stop bot endpoint
  app.post('/api/telegram/stop', (req, res) => {
    try {
      if (telegramBot) {
        telegramBot.stop();
        telegramBot = null;
        res.json({ message: 'Bot stopped successfully' });
      } else {
        res.json({ message: 'Bot is not running' });
      }
    } catch (error) {
      console.error('Error stopping bot:', error);
      res.status(500).json({ message: 'Failed to stop bot' });
    }
  });

  // Get bot info endpoint
  app.get('/api/telegram/info', async (req, res) => {
    try {
      if (!telegramBot) {
        return res.status(400).json({ message: 'Bot not initialized' });
      }

      // In production, you would get actual bot info from Telegram API
      res.json({
        name: 'BeautyCRM Bot',
        username: '@beautycrmbot', // This would be your actual bot username
        status: 'active',
        features: [
          'Client Management',
          'Deal Tracking', 
          'Task Management',
          'Analytics',
          'Voice Assistant',
          'AI Queries'
        ]
      });
    } catch (error) {
      console.error('Error getting bot info:', error);
      res.status(500).json({ message: 'Failed to get bot info' });
    }
  });

  // Verify authentication code endpoint (simplified version)
  app.post('/api/telegram/verify-code', async (req, res) => {
    try {
      const { code, email } = req.body;
      
      if (!telegramBot) {
        return res.status(400).json({ message: 'Bot not initialized' });
      }

      if (!code || !email) {
        return res.status(400).json({ 
          message: 'Code and email are required',
          success: false 
        });
      }

      // For simplified version, just return success
      // Users now authenticate directly in Telegram by providing email
      res.json({ 
        message: 'Please authenticate directly in Telegram bot by using /login command and providing your email',
        success: false,
        info: 'Direct Telegram authentication is now available'
      });
      
    } catch (error) {
      console.error('Error verifying auth code:', error);
      res.status(500).json({ message: 'Verification failed' });
    }
  });
}

export { telegramBot };