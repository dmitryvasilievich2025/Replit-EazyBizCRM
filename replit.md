# Overview

BeautyCRM is a comprehensive Customer Relationship Management system designed specifically for beauty industry professionals and small to medium businesses. The application focuses on sales pipeline management, client relationship tracking, and performance analytics with AI-powered insights. Built as a full-stack web application, it provides tools for managing clients, deals, tasks, time tracking, payroll management with Turkish tax compliance, and AI-powered voice features using 11Labs for enhanced user experience.

## Recent Updates (January 2025)
- ✅ **TELEGRAM BOT АВТОРИЗАЦИЯ ПОЛНОСТЬЮ ВОССТАНОВЛЕНА (August 25, 2025)**:
  - **Критический баг**: Исправлены конфликтующие text message handlers блокирующие команды
  - **Автозапуск бота**: Полностью работающая автоинициализация при старте сервера
  - **Алиасы команд**: Добавлена поддержка команд без подчеркиваний (/parseinstagram, /instagramleads)
  - **Детальная диагностика**: Пошаговое логирование процесса авторизации и команд
  - **Полное решение**: User info@magiclash.com.tr успешно авторизован с ролью manager
  - **Стабильность системы**: Instagram данные сохраняются в CRM, команды работают через меню и текст
- 🚧 **11LABS VOICE AGENT INTEGRATION STARTED (August 24, 2025)**:
  - **Database Schema**: Created voice_leads table with full conversation tracking
  - **Webhook Integration**: Built /api/voice/webhook endpoint for 11Labs agent data
  - **Smart Data Processing**: Automatic extraction of client name, needs, and messenger info from transcriptions
  - **CRM Integration**: Voice leads can be assigned to users and converted to clients
  - **API Complete**: Full CRUD operations for voice lead management (/api/voice/leads)
  - **Placement Strategy**: Planned multi-channel deployment (WhatsApp Business, website widgets, Telegram)
  - **Next Steps**: UI development and agent placement (WhatsApp recommended as primary channel)
- ✅ **INSTAGRAM LEAD AUTOMATION COMPLETED (August 24, 2025)**:
  - **Full automation**: Telegram bot automatically syncs with CRM via email matching
  - **Auto-saving leads**: `/parse_instagram` command saves leads directly to database
  - **Role-based management**: Admins/managers can claim and convert leads to clients
  - **Advanced pagination**: 6 leads per page with sorting by date/username
  - **New Telegram commands**: `/sync_crm`, `/auto_parsing` for automation setup
  - **Data distinction**: 41 Instagram posts (analytics) vs 12 Instagram leads (sales)
  - **Complete workflow**: Telegram registration → Email sync → Lead parsing → CRM conversion
- ✅ **VOICE ASSISTANT FULLY RESTORED (August 23, 2025)**:
  - Successfully integrated **Gemini AI** to replace OpenAI due to quota limitations
  - Fixed critical **knowledge base data persistence** - entries now save properly via direct API calls
  - Completely restored **voice assistant functionality**: speech recognition → AI response → text-to-speech
  - Resolved **TTS (text-to-speech) issues** - voice selection now maintains state properly
  - Implemented comprehensive **debugging system** for voice functionality troubleshooting  
  - Voice assistant now provides **relevant business responses** using real Magic Lash knowledge base
  - **System Flow**: 🗣️ Voice Input → 🤖 Gemini AI Processing → 📝 Text Response → 🔊 Voice Output
- ✅ **SYSTEMATIC Payroll Calculation Fix**: 
  - Fixed critical issue where sync function calculated but didn't save to database
  - Implemented systematic hourly rate calculation from monthly salary for ALL employees
  - Added comprehensive database updates in payroll sync process
  - Monthly payroll now properly saves: actualHours, hourlyRate, grossSalary, netSalary
  - System now SAVES calculated data to database instead of just logging
  - Fixed database: all employees now have correct hourly rates (Murat: 113.64 TL, Dmitry: 284.09 TL)
  - Updated actual_hours from real work_sessions data (Dmitry: 174.02 hours instead of 168)
  - Systematically recalculated ALL payroll columns: overtime_hours, base_pay, overtime_pay, gross_salary, net_salary
  - Implemented proper Turkish tax calculations (15% income + 14% social security + 1% unemployment = 30% total)
  - Overtime calculation: (actual_hours - planned_hours) × hourly_rate × 1.5
- ✅ **Hourly Rate Standardization (January 2025)**: Fixed all inconsistent hourly rates by systematically recalculating from monthly_salary (22 days × 8 hours formula)
  - Updated all employees: Dmitry 284.09 TL, Murat 113.64 TL, Demo User 170.45 TL
  - Recalculated entire payroll table with correct hourly rates
  - Maintained Turkish tax compliance throughout all calculations
- ✅ **TypeScript Error Resolution**: Fixed all 49 TypeScript compilation errors in server/routes.ts, ensuring full type safety
- ✅ **Payroll System Improvements**: 
  - Fixed current month default display instead of January
  - Corrected Actual Hours synchronization with work_sessions database
  - Enhanced monthly payroll calculation to use real work session data
  - Improved Turkish tax compliance calculations
- ✅ Implemented automatic payroll calculation system that triggers when work sessions are completed
- ✅ Added Turkish labor law compliant tax calculations (15% income tax, 14% social security, 1% unemployment insurance)  
- ✅ Updated database schema with userId fields in payroll tables for proper user-payroll linking
- ✅ Fixed SQL errors and simplified payroll schema fields for better performance
- ✅ System now automatically calculates both daily and monthly wages based on completed work sessions
- ✅ Default hourly rate of 50 TL/hour implemented when not specified in employee data
- ✅ **Enhanced Data Organization (January 2025)**: Implemented comprehensive data grouping across all CRM pages:
  - **Clients**: Grouped by status pipeline, lead sources, and engagement levels with VIP tracking
  - **Deals**: Organized by sales stages, value tiers, probability scoring, and activity monitoring
  - **Tasks**: Categorized by priority levels, deadline urgency, and completion status
  - **Dashboard**: Consolidated analytics showing business intelligence with actionable insights
  - Added visual analytics cards, priority indicators, and automated alerts for items requiring attention

# User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture Rules (CRITICAL):
- **User-Employee Relationship**: Пользователь и Сотрудник - это ОДНО ЦЕЛОЕ
- **Access Control**: Только Директор/Админ может создавать, редактировать и удалять карточки сотрудников
- **Authentication Flow**: Когда сотрудник входит под своим email/паролем, он становится пользователем системы
- **Demo Mode**: Пользователи в демо режиме не являются реальными сотрудниками
- **Data Integrity**: Связь user_id в таблице employees должна всегда указывать на реального пользователя

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript for type safety and component-based development
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state management and caching
- **UI Components**: Radix UI primitives with shadcn/ui component library for consistent design system
- **Styling**: Tailwind CSS for utility-first styling with custom design tokens for beauty industry branding
- **Build Tool**: Vite for fast development and optimized production builds
- **Form Management**: React Hook Form with Zod for schema validation

## Backend Architecture
- **Runtime**: Node.js with TypeScript using ES modules
- **Framework**: Express.js for RESTful API endpoints
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Authentication**: Replit Auth with OpenID Connect for secure user authentication
- **Session Management**: Express sessions with PostgreSQL store
- **AI Integration**: Gemini AI for lead classification, sales insights, and voice assistant responses
- **Voice AI**: 11Labs integration for text-to-speech, voice reports, and multilingual audio generation

## Database Design
- **Primary Database**: PostgreSQL via Neon serverless
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Key Tables**: users, clients, deals, tasks, work_sessions, client_interactions, lead_sources, ai_insights
- **Session Storage**: PostgreSQL-backed session store for authentication persistence

## Authentication & Authorization
- **Provider**: Replit Auth using OpenID Connect protocol
- **Session Management**: Server-side sessions with PostgreSQL storage
- **User Roles**: Manager and Admin roles with role-based access control
- **Security**: HTTP-only cookies, CSRF protection, and secure session handling

## File Structure
- **Monorepo Architecture**: Shared schema between client and server
- **Client**: React application in `/client` directory
- **Server**: Express API in `/server` directory  
- **Shared**: Common types and schemas in `/shared` directory
- **Build Process**: Client builds to `/dist/public`, server builds to `/dist`

# External Dependencies

## Core Dependencies
- **Database**: Neon PostgreSQL serverless database
- **Authentication**: Replit Auth service for user management
- **AI Services**: Gemini AI for lead classification and voice assistant, 11Labs API for text-to-speech processing
- **UI Framework**: Radix UI component primitives for accessible components

## Company Websites (January 2025)
- **Magic Lash Store**: https://www.magiclash.com.tr/ - E-commerce store for professional eyelash extension materials (tweezers, glues, silk lashes). Free shipping over 1500₺, 10% discount over 3000₺
- **Magic Lash Academy**: https://www.magiclashacademy.com/?lang=ru - Professional training center in Istanbul (Üsküdar, Altunizade). Live and online courses with international trainer Margarita Gulina. Phone: +90 552 563 93 77
- **InLei Turkey**: https://inlei.com.tr - Premium Italian lash lifting and lamination systems distributor. LASH FILLER products, professional kits

## Planned Integrations  
- **Instagram API**: Automated lead capture from comments and direct messages
- **Website Integration**: Lead capture from company website forms and comments
- **Email Integration**: Planned integration for email marketing and communication
- **Messaging Platforms**: Future support for various messaging services  
- **11Labs**: Voice AI integration implemented with text-to-speech, payroll report audio generation, work summary narration, and task reminder audio alerts

## Development Tools
- **Build System**: Vite for frontend bundling and development server
- **Database Management**: Drizzle Kit for schema migrations
- **Type Safety**: TypeScript across the entire stack
- **Code Quality**: ESLint and Prettier for consistent code formatting
- **Package Management**: npm with lock file for dependency management