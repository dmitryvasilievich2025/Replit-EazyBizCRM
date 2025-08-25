import { sql, relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  decimal,
  boolean,
  pgEnum,
  date,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User roles enum
export const userRoleEnum = pgEnum('user_role', ['demo', 'admin', 'director', 'manager', 'employee']);

// User registration status enum
export const userStatusEnum = pgEnum('user_status', ['pending', 'approved', 'rejected', 'active', 'inactive']);

// User storage table for Replit Auth
export const users: any = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: userRoleEnum("role").default('demo'),
  isActive: boolean("is_active").default(true),
  startDate: timestamp("start_date").defaultNow(),
  // Telegram integration fields
  telegramUserId: varchar("telegram_user_id").unique(),
  telegramUsername: varchar("telegram_username"),
  telegramFirstName: varchar("telegram_first_name"),
  telegramLastName: varchar("telegram_last_name"),
  registrationStatus: userStatusEnum("registration_status").default('pending'),
  approvedBy: varchar("approved_by").references((): any => users.id),
  approvedAt: timestamp("approved_at"),
  registrationSource: varchar("registration_source").default('telegram'), // 'web', 'telegram'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Employee management table (extended user info)
export const employees = pgTable("employees", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").unique().references(() => users.id),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  email: varchar("email").unique().notNull(),
  phone: varchar("phone"),
  dateOfBirth: timestamp("date_of_birth"),
  role: userRoleEnum("role").notNull().default("employee"),
  profileImageUrl: varchar("profile_image_url"),
  hireDate: timestamp("hire_date").defaultNow(),
  terminationDate: timestamp("termination_date"),
  isActive: boolean("is_active").default(true),
  monthlySalary: decimal("monthly_salary", { precision: 10, scale: 2 }),
  hourlyRate: decimal("hourly_rate", { precision: 8, scale: 2 }),
  dailyWorkingHours: decimal("daily_working_hours", { precision: 4, scale: 2 }).default("8.00"),
  plannedDailyHours: decimal("planned_daily_hours", { precision: 4, scale: 2 }).default("8.00"),
  // Rate coefficients
  overtimeRate: decimal("overtime_rate", { precision: 4, scale: 2 }).default("1.50"), // 150% for overtime
  weekendRate: decimal("weekend_rate", { precision: 4, scale: 2 }).default("1.25"), // 125% for weekends
  holidayRate: decimal("holiday_rate", { precision: 4, scale: 2 }).default("2.00"), // 200% for holidays
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Work schedule tracking
export const workSessions = pgTable("work_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  loginTime: timestamp("login_time").notNull(),
  logoutTime: timestamp("logout_time"),
  totalMinutes: integer("total_minutes"),
  date: timestamp("date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Lead sources enum
export const leadSourceEnum = pgEnum('lead_source', ['instagram', 'website', 'referral', 'email', 'phone', 'telegram', 'other']);

// Client status enum
export const clientStatusEnum = pgEnum('client_status', ['new', 'contacted', 'qualified', 'opportunity', 'customer', 'inactive']);

// Clients table
export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  email: varchar("email"),
  phone: varchar("phone"),
  company: varchar("company"),
  instagramUsername: varchar("instagram_username"),
  source: leadSourceEnum("source").notNull(),
  status: clientStatusEnum("status").default('new'),
  assignedTo: varchar("assigned_to").notNull().references(() => users.id),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  notes: text("notes"),
  tags: text("tags").array(),
  lastContactDate: timestamp("last_contact_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Deal stages enum
export const dealStageEnum = pgEnum('deal_stage', ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost']);

// Deal priority enum
export const dealPriorityEnum = pgEnum('deal_priority', ['low', 'medium', 'high', 'urgent']);

// Deals table
export const deals = pgTable("deals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description"),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  assignedTo: varchar("assigned_to").notNull().references(() => employees.id),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  value: decimal("value", { precision: 10, scale: 2 }),
  stage: dealStageEnum("stage").default('new'),
  priority: dealPriorityEnum("priority").default('medium'),
  probability: integer("probability").default(0), // 0-100%
  expectedCloseDate: timestamp("expected_close_date"),
  actualCloseDate: timestamp("actual_close_date"),
  tags: text("tags").array(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Task status enum
export const taskStatusEnum = pgEnum('task_status', ['open', 'in_progress', 'completed', 'overdue']);

// Task priority enum
export const taskPriorityEnum = pgEnum('task_priority', ['low', 'medium', 'high', 'urgent']);

// Tasks table
export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description"),
  assignedTo: varchar("assigned_to").notNull().references(() => employees.id),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  clientId: varchar("client_id").references(() => clients.id),
  dealId: varchar("deal_id").references(() => deals.id),
  status: taskStatusEnum("status").default('open'),
  priority: taskPriorityEnum("priority").default('medium'),
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  reminderDate: timestamp("reminder_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Interaction type enum
export const interactionTypeEnum = pgEnum('interaction_type', ['call', 'email', 'meeting', 'message', 'note', 'proposal']);

// Client interactions table
export const clientInteractions = pgTable("client_interactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  dealId: varchar("deal_id").references(() => deals.id),
  type: interactionTypeEnum("type").notNull(),
  subject: varchar("subject"),
  content: text("content"),
  duration: integer("duration"), // in minutes
  scheduledAt: timestamp("scheduled_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Lead sources tracking
export const leadSources = pgTable("lead_sources", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  type: leadSourceEnum("type").notNull(),
  isActive: boolean("is_active").default(true),
  apiConfig: jsonb("api_config"), // For storing API keys, endpoints, etc.
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// AI insights and recommendations
export const aiInsights = pgTable("ai_insights", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: varchar("type").notNull(), // 'lead_classification', 'deal_probability', 'recommendation'
  entityId: varchar("entity_id").notNull(), // client_id, deal_id, etc.
  entityType: varchar("entity_type").notNull(), // 'client', 'deal', 'user'
  confidence: decimal("confidence", { precision: 3, scale: 2 }), // 0.00-1.00
  data: jsonb("data").notNull(),
  userId: varchar("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Daily payroll tracking - Turkish labor law compliant
export const dailyPayroll = pgTable("daily_payroll", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  employeeId: varchar("employee_id").notNull().references(() => employees.id),
  date: timestamp("date").notNull(),
  plannedHours: decimal("planned_hours", { precision: 4, scale: 2 }).notNull(),
  actualHours: decimal("actual_hours", { precision: 4, scale: 2 }).default("0.00"),
  overtimeHours: decimal("overtime_hours", { precision: 4, scale: 2 }).default("0.00"), // hours > 8
  workHours: decimal("work_hours", { precision: 4, scale: 2 }).default("0.00"), // actual work hours from sessions
  hourlyRate: decimal("hourly_rate", { precision: 8, scale: 2 }).notNull(),
  basePay: decimal("base_pay", { precision: 10, scale: 2 }).notNull(), // base hours * hourly_rate
  actualPay: decimal("actual_pay", { precision: 10, scale: 2 }).default("0.00"), // actual hours * hourly_rate
  overtimePay: decimal("overtime_pay", { precision: 10, scale: 2 }).default("0.00"), // overtime hours * overtime_rate
  grossPay: decimal("gross_pay", { precision: 10, scale: 2 }).notNull(), // base + actual + overtime
  // Turkish tax deductions (daily proportional)
  incomeTax: decimal("income_tax", { precision: 10, scale: 2 }).default("0.00"), // 15%
  socialSecurity: decimal("social_security", { precision: 10, scale: 2 }).default("0.00"), // 14%
  unemploymentInsurance: decimal("unemployment_insurance", { precision: 10, scale: 2 }).default("0.00"), // 1%
  netPay: decimal("net_pay", { precision: 10, scale: 2 }).notNull(),
  isWorkday: boolean("is_workday").default(true), // exclude weekends
  isHoliday: boolean("is_holiday").default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Turkish holidays and special dates
export const turkishHolidays = pgTable("turkish_holidays", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  date: timestamp("date").notNull(),
  name: varchar("name").notNull(),
  type: varchar("type").notNull(), // 'national', 'religious', 'bank'
  isWorkday: boolean("is_workday").default(false), // whether employees should work
  payMultiplier: decimal("pay_multiplier", { precision: 3, scale: 2 }).default("2.00"), // 2x pay for holidays
  createdAt: timestamp("created_at").defaultNow(),
});

// Monthly payroll summary - Turkish labor law compliant
export const monthlyPayroll = pgTable("monthly_payroll", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  employeeId: varchar("employee_id").notNull().references(() => employees.id),
  month: integer("month").notNull(), // 1-12
  year: integer("year").notNull(),
  workingDays: integer("working_days").notNull(), // exclude weekends and holidays
  plannedHours: decimal("planned_hours", { precision: 6, scale: 2 }).notNull(),
  actualHours: decimal("actual_hours", { precision: 6, scale: 2 }).default("0.00"),
  overtimeHours: decimal("overtime_hours", { precision: 6, scale: 2 }).default("0.00"),
  hourlyRate: decimal("hourly_rate", { precision: 8, scale: 2 }).notNull(),
  basePay: decimal("base_pay", { precision: 12, scale: 2 }).notNull(),
  overtimePay: decimal("overtime_pay", { precision: 12, scale: 2 }).default("0.00"),
  grossSalary: decimal("gross_salary", { precision: 12, scale: 2 }).notNull(), // base + overtime
  // Turkish tax deductions
  incomeTax: decimal("income_tax", { precision: 10, scale: 2 }).default("0.00"),
  stampTax: decimal("stamp_tax", { precision: 10, scale: 2 }).default("0.00"), // 0.759%
  socialSecurityEmployee: decimal("social_security_employee", { precision: 10, scale: 2 }).default("0.00"), // 14%
  unemploymentInsuranceEmployee: decimal("unemployment_insurance_employee", { precision: 10, scale: 2 }).default("0.00"), // 1%
  totalDeductions: decimal("total_deductions", { precision: 10, scale: 2 }).default("0.00"),
  netSalary: decimal("net_salary", { precision: 12, scale: 2 }).notNull(),
  // Employer costs (for reference)
  socialSecurityEmployer: decimal("social_security_employer", { precision: 10, scale: 2 }).default("0.00"), // 15.5%
  unemploymentInsuranceEmployer: decimal("unemployment_insurance_employer", { precision: 10, scale: 2 }).default("0.00"), // 2%
  totalEmployerCost: decimal("total_employer_cost", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  workSessions: many(workSessions),
  clients: many(clients),
  deals: many(deals),
  tasks: many(tasks),
  interactions: many(clientInteractions),
  aiInsights: many(aiInsights),
}));

export const employeesRelations = relations(employees, ({ one, many }) => ({
  user: one(users, {
    fields: [employees.userId],
    references: [users.id],
  }),
  workSessions: many(workSessions),
  dailyPayroll: many(dailyPayroll),
  monthlyPayroll: many(monthlyPayroll),
}));

export const dailyPayrollRelations = relations(dailyPayroll, ({ one }) => ({
  employee: one(employees, {
    fields: [dailyPayroll.employeeId],
    references: [employees.id],
  }),
}));

export const monthlyPayrollRelations = relations(monthlyPayroll, ({ one }) => ({
  employee: one(employees, {
    fields: [monthlyPayroll.employeeId],
    references: [employees.id],
  }),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  assignedUser: one(users, {
    fields: [clients.assignedTo],
    references: [users.id],
  }),
  deals: many(deals),
  tasks: many(tasks),
  interactions: many(clientInteractions),
}));

export const dealsRelations = relations(deals, ({ one, many }) => ({
  client: one(clients, {
    fields: [deals.clientId],
    references: [clients.id],
  }),
  assignedUser: one(users, {
    fields: [deals.assignedTo],
    references: [users.id],
  }),
  tasks: many(tasks),
  interactions: many(clientInteractions),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  assignedUser: one(users, {
    fields: [tasks.assignedTo],
    references: [users.id],
  }),
  client: one(clients, {
    fields: [tasks.clientId],
    references: [clients.id],
  }),
  deal: one(deals, {
    fields: [tasks.dealId],
    references: [deals.id],
  }),
}));

export const workSessionsRelations = relations(workSessions, ({ one }) => ({
  user: one(users, {
    fields: [workSessions.userId],
    references: [users.id],
  }),
  employee: one(employees, {
    fields: [workSessions.userId],
    references: [employees.userId],
  }),
}));

export const clientInteractionsRelations = relations(clientInteractions, ({ one }) => ({
  client: one(clients, {
    fields: [clientInteractions.clientId],
    references: [clients.id],
  }),
  user: one(users, {
    fields: [clientInteractions.userId],
    references: [users.id],
  }),
  deal: one(deals, {
    fields: [clientInteractions.dealId],
    references: [deals.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users);
export const insertEmployeeSchema = createInsertSchema(employees).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertClientSchema = createInsertSchema(clients);
export const insertDealSchema = createInsertSchema(deals);
export const insertTaskSchema = createInsertSchema(tasks);
export const insertWorkSessionSchema = createInsertSchema(workSessions);
export const insertClientInteractionSchema = createInsertSchema(clientInteractions);
export const insertLeadSourceSchema = createInsertSchema(leadSources);
export const insertAiInsightSchema = createInsertSchema(aiInsights);
export const insertDailyPayrollSchema = createInsertSchema(dailyPayroll);
export const insertMonthlyPayrollSchema = createInsertSchema(monthlyPayroll);

// Types
export type UpsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Company settings table
export const companySettings = pgTable("company_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyName: varchar("company_name"),
  website: varchar("website"),
  phone: varchar("phone"),
  email: varchar("email"),
  address: text("address"),
  instagram: varchar("instagram"),
  facebook: varchar("facebook"),
  youtube: varchar("youtube"),
  twitter: varchar("twitter"),
  privacyPolicy: text("privacy_policy"),
  termsOfService: text("terms_of_service"),
  dataProcessing: text("data_processing"),
  cookiePolicy: text("cookie_policy"),
  emailNotifications: boolean("email_notifications").default(true),
  autoSave: boolean("auto_save").default(true),
  darkTheme: boolean("dark_theme").default(false),
  analytics: boolean("analytics").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCompanySettingsSchema = createInsertSchema(companySettings);
export type CompanySettings = typeof companySettings.$inferSelect;
export type InsertCompanySettings = z.infer<typeof insertCompanySettingsSchema>;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Employee = typeof employees.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;
export type InsertDeal = z.infer<typeof insertDealSchema>;
export type Deal = typeof deals.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertWorkSession = z.infer<typeof insertWorkSessionSchema>;
export type WorkSession = typeof workSessions.$inferSelect;
export type InsertClientInteraction = z.infer<typeof insertClientInteractionSchema>;
export type ClientInteraction = typeof clientInteractions.$inferSelect;
export type InsertLeadSource = z.infer<typeof insertLeadSourceSchema>;
export type LeadSource = typeof leadSources.$inferSelect;
export type InsertAiInsight = z.infer<typeof insertAiInsightSchema>;
export type AiInsight = typeof aiInsights.$inferSelect;
export type InsertDailyPayroll = z.infer<typeof insertDailyPayrollSchema>;
export type DailyPayroll = typeof dailyPayroll.$inferSelect;
export type InsertMonthlyPayroll = z.infer<typeof insertMonthlyPayrollSchema>;
export type MonthlyPayroll = typeof monthlyPayroll.$inferSelect;

// Instagram data tables
export const instagramAnalytics = pgTable("instagram_analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  datePeriod: date("date_period").notNull(),
  periodType: varchar("period_type").notNull().default('daily'),
  newMessagesCount: integer("new_messages_count").default(0),
  newLeadsCount: integer("new_leads_count").default(0),
  convertedLeadsCount: integer("converted_leads_count").default(0),
  responseRate: decimal("response_rate", { precision: 5, scale: 2 }).default("0.00"),
  avgResponseTimeMinutes: integer("avg_response_time_minutes").default(0),
  totalConversations: integer("total_conversations").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const instagramMessages = pgTable("instagram_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  instagramMessageId: varchar("instagram_message_id").unique(),
  senderUsername: varchar("sender_username").notNull(),
  senderId: varchar("sender_id"),
  messageContent: text("message_content"),
  messageType: varchar("message_type").default('text'),
  isProcessed: boolean("is_processed").default(false),
  clientId: varchar("client_id").references(() => clients.id),
  conversationId: varchar("conversation_id"),
  receivedAt: timestamp("received_at").defaultNow(),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const messageTemplates = pgTable("message_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateName: varchar("template_name").notNull(),
  templateContent: text("template_content").notNull(),
  category: varchar("category").default('general'),
  usageCount: integer("usage_count").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertInstagramAnalyticsSchema = createInsertSchema(instagramAnalytics);
export const insertInstagramMessageSchema = createInsertSchema(instagramMessages);
export const insertMessageTemplateSchema = createInsertSchema(messageTemplates);

export type InstagramAnalytics = typeof instagramAnalytics.$inferSelect;
export type InstagramMessage = typeof instagramMessages.$inferSelect;
export type MessageTemplate = typeof messageTemplates.$inferSelect;
export type InsertInstagramAnalytics = z.infer<typeof insertInstagramAnalyticsSchema>;
export type InsertInstagramMessage = z.infer<typeof insertInstagramMessageSchema>;
export type InsertMessageTemplate = z.infer<typeof insertMessageTemplateSchema>;

// Instagram leads from comments and mentions - Business API ready
export const instagramLeads = pgTable('instagram_leads', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  instagramUserId: varchar('instagram_user_id').notNull(),
  instagramUsername: varchar('instagram_username').notNull(),
  fullName: varchar('full_name'),
  profilePictureUrl: varchar('profile_picture_url'),
  
  // Lead source
  sourceType: varchar('source_type').notNull(), // 'comment', 'mention', 'story_reply'
  sourcePostId: varchar('source_post_id'),
  sourceCommentId: varchar('source_comment_id'),
  
  // Content
  message: text('message').notNull(),
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
  
  // Status
  status: varchar('status').notNull().default('new'), // 'new', 'contacted', 'converted', 'ignored'
  assignedTo: varchar('assigned_to').references(() => users.id),
  
  // If converted to client
  clientId: varchar('client_id').references(() => clients.id),
  
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const insertInstagramLeadSchema = createInsertSchema(instagramLeads);
export type InstagramLead = typeof instagramLeads.$inferSelect;
export type InsertInstagramLead = z.infer<typeof insertInstagramLeadSchema>;

// Company Knowledge Base - RAG система
export const knowledgeBase = pgTable('knowledge_base', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  title: varchar('title').notNull(),
  content: text('content').notNull(),
  category: varchar('category').notNull(), // 'services', 'products', 'faq', 'policies', 'about'
  // Метаданные для поиска
  summary: text('summary'), // краткое описание
  keywords: text('tags').array().default([]), // ключевые слова для поиска
  
  // Статус и видимость
  isActive: boolean('is_active').default(true),
  isPublic: boolean('is_public').default(true), // показывать клиентам
  priority: integer('priority').default(0), // приоритет в поиске
  
  // Для ассистента
  useInBot: boolean('use_in_bot').default(true), // использовать в боте
  autoResponse: text('auto_response'), // готовый ответ для бота
  
  createdBy: varchar('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Услуги компании
export const services = pgTable('services', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  name: varchar('name').notNull(),
  description: text('description'),
  detailedDescription: text('detailed_description'),
  
  // Ценообразование
  priceFrom: decimal('price_from', { precision: 10, scale: 2 }),
  priceTo: decimal('price_to', { precision: 10, scale: 2 }),
  priceDescription: text('price_description'), // "от 1500₽ за процедуру"
  
  // Характеристики
  duration: integer('duration'), // длительность в минутах
  category: varchar('category'), // "ресницы", "брови", "макияж"
  
  // Медиа
  images: text('images').array().default([]),
  videoUrl: varchar('video_url'),
  
  // SEO и поиск
  keywords: text('keywords').array().default([]),
  searchTerms: text('search_terms').array().default([]),
  
  // Статус
  isActive: boolean('is_active').default(true),
  isPopular: boolean('is_popular').default(false),
  isNew: boolean('is_new').default(false),
  
  // Для бронирования
  isBookable: boolean('is_bookable').default(true),
  requiresConsultation: boolean('requires_consultation').default(false),
  
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// FAQ для клиентов
export const faqItems = pgTable('faq_items', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  question: text('question').notNull(),
  answer: text('answer').notNull(),
  shortAnswer: text('short_answer'), // краткий ответ для бота
  
  category: varchar('category'), // "цены", "процедуры", "уход", "запись"
  serviceId: varchar('service_id').references(() => services.id),
  
  // Популярность
  viewCount: integer('view_count').default(0),
  helpfulCount: integer('helpful_count').default(0),
  
  // Для поиска
  keywords: text('keywords').array().default([]),
  relatedQuestions: text('related_questions').array().default([]),
  
  isActive: boolean('is_active').default(true),
  sortOrder: integer('sort_order').default(0),
  
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Шаблоны ответов для ассистента
export const responseTemplates = pgTable('response_templates', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  name: varchar('name').notNull(),
  trigger: text('trigger').notNull(), // ключевые слова для активации
  response: text('response').notNull(),
  
  // Тип шаблона
  type: varchar('type').notNull(), // 'greeting', 'service_info', 'booking', 'price', 'general'
  
  // Условия использования
  serviceId: varchar('service_id').references(() => services.id),
  context: varchar('context'), // когда использовать: "после_приветствия", "при_вопросе_о_цене"
  
  // Статистика
  usageCount: integer('usage_count').default(0),
  successRate: decimal('success_rate', { precision: 5, scale: 2 }).default('0.00'),
  
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const insertKnowledgeBaseSchema = createInsertSchema(knowledgeBase);
export const insertServiceSchema = createInsertSchema(services);
export const insertFaqItemSchema = createInsertSchema(faqItems);
export const insertResponseTemplateSchema = createInsertSchema(responseTemplates);

export type KnowledgeBase = typeof knowledgeBase.$inferSelect;
export type Service = typeof services.$inferSelect;
export type FaqItem = typeof faqItems.$inferSelect;
export type ResponseTemplate = typeof responseTemplates.$inferSelect;
export type InsertKnowledgeBase = z.infer<typeof insertKnowledgeBaseSchema>;
export type InsertService = z.infer<typeof insertServiceSchema>;
export type InsertFaqItem = z.infer<typeof insertFaqItemSchema>;
export type InsertResponseTemplate = z.infer<typeof insertResponseTemplateSchema>;

// Voice leads from 11Labs agent
export const voiceLeads = pgTable('voice_leads', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  
  // 11Labs conversation metadata
  conversationId: varchar('conversation_id').unique(),
  agentId: varchar('agent_id'),
  sessionId: varchar('session_id'),
  
  // Client information collected by agent
  clientName: varchar('client_name'),
  clientNeeds: text('client_needs'), // что хочет клиент
  messengerType: varchar('messenger_type'), // telegram, whatsapp, phone, etc.
  messengerContact: varchar('messenger_contact'), // номер или username
  
  // Lead qualification from agent
  isQualifiedLead: boolean('is_qualified_lead').default(false), // Lead/Not Lead from agent
  leadScore: integer('lead_score').default(0), // 0-100 confidence score
  leadReason: text('lead_reason'), // why qualified/not qualified
  
  // Conversation data
  transcription: text('transcription'), // полная транскрипция разговора
  audioUrl: varchar('audio_url'), // ссылка на аудио файл
  conversationDuration: integer('conversation_duration'), // длительность в секундах
  language: varchar('language').default('ru'), // язык разговора
  
  // Processing metadata
  rawWebhookData: jsonb('raw_webhook_data'), // сырые данные от 11Labs
  processingStatus: varchar('processing_status').default('pending'), // pending, processed, failed
  errorMessage: text('error_message'),
  
  // CRM integration
  status: varchar('status').notNull().default('new'), // new, contacted, converted, ignored
  assignedTo: varchar('assigned_to').references(() => users.id),
  clientId: varchar('client_id').references(() => clients.id), // if converted
  priority: varchar('priority').default('medium'), // low, medium, high
  
  // Notes and follow-up
  notes: text('notes'),
  followUpDate: timestamp('follow_up_date'),
  tags: text('tags').array().default([]),
  
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const insertVoiceLeadSchema = createInsertSchema(voiceLeads);
export type VoiceLead = typeof voiceLeads.$inferSelect;
export type InsertVoiceLead = z.infer<typeof insertVoiceLeadSchema>;
