var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  aiInsights: () => aiInsights,
  clientInteractions: () => clientInteractions,
  clientInteractionsRelations: () => clientInteractionsRelations,
  clientStatusEnum: () => clientStatusEnum,
  clients: () => clients,
  clientsRelations: () => clientsRelations,
  dealPriorityEnum: () => dealPriorityEnum,
  dealStageEnum: () => dealStageEnum,
  deals: () => deals,
  dealsRelations: () => dealsRelations,
  employees: () => employees,
  insertAiInsightSchema: () => insertAiInsightSchema,
  insertClientInteractionSchema: () => insertClientInteractionSchema,
  insertClientSchema: () => insertClientSchema,
  insertDealSchema: () => insertDealSchema,
  insertEmployeeSchema: () => insertEmployeeSchema,
  insertLeadSourceSchema: () => insertLeadSourceSchema,
  insertTaskSchema: () => insertTaskSchema,
  insertUserSchema: () => insertUserSchema,
  insertWorkSessionSchema: () => insertWorkSessionSchema,
  interactionTypeEnum: () => interactionTypeEnum,
  leadSourceEnum: () => leadSourceEnum,
  leadSources: () => leadSources,
  sessions: () => sessions,
  taskPriorityEnum: () => taskPriorityEnum,
  taskStatusEnum: () => taskStatusEnum,
  tasks: () => tasks,
  tasksRelations: () => tasksRelations,
  userRoleEnum: () => userRoleEnum,
  users: () => users,
  usersRelations: () => usersRelations,
  workSessions: () => workSessions,
  workSessionsRelations: () => workSessionsRelations
});
import { sql, relations } from "drizzle-orm";
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
  pgEnum
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
var sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull()
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);
var userRoleEnum = pgEnum("user_role", ["admin", "director", "manager", "employee"]);
var users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: userRoleEnum("role").default("employee"),
  isActive: boolean("is_active").default(true),
  startDate: timestamp("start_date").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var employees = pgTable("employees", {
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
  dailyWorkingHours: decimal("daily_working_hours", { precision: 4, scale: 2 }).default("8.00"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var workSessions = pgTable("work_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  loginTime: timestamp("login_time").notNull(),
  logoutTime: timestamp("logout_time"),
  totalMinutes: integer("total_minutes"),
  date: timestamp("date").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});
var leadSourceEnum = pgEnum("lead_source", ["instagram", "website", "referral", "email", "phone", "other"]);
var clientStatusEnum = pgEnum("client_status", ["new", "contacted", "qualified", "opportunity", "customer", "inactive"]);
var clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  email: varchar("email"),
  phone: varchar("phone"),
  company: varchar("company"),
  source: leadSourceEnum("source").notNull(),
  status: clientStatusEnum("status").default("new"),
  assignedTo: varchar("assigned_to").notNull().references(() => users.id),
  notes: text("notes"),
  tags: text("tags").array(),
  lastContactDate: timestamp("last_contact_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var dealStageEnum = pgEnum("deal_stage", ["new", "contacted", "qualified", "proposal", "negotiation", "won", "lost"]);
var dealPriorityEnum = pgEnum("deal_priority", ["low", "medium", "high", "urgent"]);
var deals = pgTable("deals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description"),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  assignedTo: varchar("assigned_to").notNull().references(() => users.id),
  value: decimal("value", { precision: 10, scale: 2 }),
  stage: dealStageEnum("stage").default("new"),
  priority: dealPriorityEnum("priority").default("medium"),
  probability: integer("probability").default(0),
  // 0-100%
  expectedCloseDate: timestamp("expected_close_date"),
  actualCloseDate: timestamp("actual_close_date"),
  tags: text("tags").array(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var taskStatusEnum = pgEnum("task_status", ["open", "in_progress", "completed", "overdue"]);
var taskPriorityEnum = pgEnum("task_priority", ["low", "medium", "high", "urgent"]);
var tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description"),
  assignedTo: varchar("assigned_to").notNull().references(() => users.id),
  clientId: varchar("client_id").references(() => clients.id),
  dealId: varchar("deal_id").references(() => deals.id),
  status: taskStatusEnum("status").default("open"),
  priority: taskPriorityEnum("priority").default("medium"),
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  reminderDate: timestamp("reminder_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var interactionTypeEnum = pgEnum("interaction_type", ["call", "email", "meeting", "message", "note", "proposal"]);
var clientInteractions = pgTable("client_interactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  dealId: varchar("deal_id").references(() => deals.id),
  type: interactionTypeEnum("type").notNull(),
  subject: varchar("subject"),
  content: text("content"),
  duration: integer("duration"),
  // in minutes
  scheduledAt: timestamp("scheduled_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow()
});
var leadSources = pgTable("lead_sources", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  type: leadSourceEnum("type").notNull(),
  isActive: boolean("is_active").default(true),
  apiConfig: jsonb("api_config"),
  // For storing API keys, endpoints, etc.
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var aiInsights = pgTable("ai_insights", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: varchar("type").notNull(),
  // 'lead_classification', 'deal_probability', 'recommendation'
  entityId: varchar("entity_id").notNull(),
  // client_id, deal_id, etc.
  entityType: varchar("entity_type").notNull(),
  // 'client', 'deal', 'user'
  confidence: decimal("confidence", { precision: 3, scale: 2 }),
  // 0.00-1.00
  data: jsonb("data").notNull(),
  userId: varchar("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow()
});
var usersRelations = relations(users, ({ many }) => ({
  workSessions: many(workSessions),
  clients: many(clients),
  deals: many(deals),
  tasks: many(tasks),
  interactions: many(clientInteractions),
  aiInsights: many(aiInsights)
}));
var clientsRelations = relations(clients, ({ one, many }) => ({
  assignedUser: one(users, {
    fields: [clients.assignedTo],
    references: [users.id]
  }),
  deals: many(deals),
  tasks: many(tasks),
  interactions: many(clientInteractions)
}));
var dealsRelations = relations(deals, ({ one, many }) => ({
  client: one(clients, {
    fields: [deals.clientId],
    references: [clients.id]
  }),
  assignedUser: one(users, {
    fields: [deals.assignedTo],
    references: [users.id]
  }),
  tasks: many(tasks),
  interactions: many(clientInteractions)
}));
var tasksRelations = relations(tasks, ({ one }) => ({
  assignedUser: one(users, {
    fields: [tasks.assignedTo],
    references: [users.id]
  }),
  client: one(clients, {
    fields: [tasks.clientId],
    references: [clients.id]
  }),
  deal: one(deals, {
    fields: [tasks.dealId],
    references: [deals.id]
  })
}));
var workSessionsRelations = relations(workSessions, ({ one }) => ({
  user: one(users, {
    fields: [workSessions.userId],
    references: [users.id]
  })
}));
var clientInteractionsRelations = relations(clientInteractions, ({ one }) => ({
  client: one(clients, {
    fields: [clientInteractions.clientId],
    references: [clients.id]
  }),
  user: one(users, {
    fields: [clientInteractions.userId],
    references: [users.id]
  }),
  deal: one(deals, {
    fields: [clientInteractions.dealId],
    references: [deals.id]
  })
}));
var insertUserSchema = createInsertSchema(users);
var insertEmployeeSchema = createInsertSchema(employees).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertClientSchema = createInsertSchema(clients);
var insertDealSchema = createInsertSchema(deals);
var insertTaskSchema = createInsertSchema(tasks);
var insertWorkSessionSchema = createInsertSchema(workSessions);
var insertClientInteractionSchema = createInsertSchema(clientInteractions);
var insertLeadSourceSchema = createInsertSchema(leadSources);
var insertAiInsightSchema = createInsertSchema(aiInsights);

// server/db.ts
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
neonConfig.webSocketConstructor = ws;
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}
var pool = new Pool({ connectionString: process.env.DATABASE_URL });
var db = drizzle({ client: pool, schema: schema_exports });

// server/storage.ts
import { eq, desc, and, gte, lte, count, sum } from "drizzle-orm";
var DatabaseStorage = class {
  // User operations
  async getUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  async upsertUser(userData) {
    const [user] = await db.insert(users).values(userData).onConflictDoUpdate({
      target: users.id,
      set: {
        ...userData,
        updatedAt: /* @__PURE__ */ new Date()
      }
    }).returning();
    return user;
  }
  // Work session operations
  async createWorkSession(session2) {
    const [workSession] = await db.insert(workSessions).values(session2).returning();
    return workSession;
  }
  async updateWorkSession(id, data) {
    const [workSession] = await db.update(workSessions).set(data).where(eq(workSessions.id, id)).returning();
    return workSession;
  }
  async getUserWorkSessions(userId, startDate, endDate) {
    const conditions = [eq(workSessions.userId, userId)];
    if (startDate && endDate) {
      conditions.push(
        gte(workSessions.date, startDate),
        lte(workSessions.date, endDate)
      );
    }
    return await db.select().from(workSessions).where(and(...conditions)).orderBy(desc(workSessions.date));
  }
  async getTotalWorkTime(userId, date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    const result = await db.select({ total: sum(workSessions.totalMinutes) }).from(workSessions).where(
      and(
        eq(workSessions.userId, userId),
        gte(workSessions.date, startOfDay),
        lte(workSessions.date, endOfDay)
      )
    );
    return Number(result[0]?.total) || 0;
  }
  // Client operations
  async getClients(userId) {
    if (userId) {
      return await db.select().from(clients).where(eq(clients.assignedTo, userId)).orderBy(desc(clients.createdAt));
    } else {
      return await db.select().from(clients).orderBy(desc(clients.createdAt));
    }
  }
  async getClient(id) {
    const [client2] = await db.select().from(clients).where(eq(clients.id, id));
    return client2;
  }
  async createClient(client2) {
    const [newClient] = await db.insert(clients).values(client2).returning();
    return newClient;
  }
  async updateClient(id, data) {
    const [client2] = await db.update(clients).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq(clients.id, id)).returning();
    return client2;
  }
  async deleteClient(id) {
    await db.delete(clients).where(eq(clients.id, id));
  }
  // Deal operations
  async getDeals(userId) {
    if (userId) {
      return await db.select().from(deals).where(eq(deals.assignedTo, userId)).orderBy(desc(deals.createdAt));
    } else {
      return await db.select().from(deals).orderBy(desc(deals.createdAt));
    }
  }
  async getDeal(id) {
    const [deal] = await db.select().from(deals).where(eq(deals.id, id));
    return deal;
  }
  async createDeal(deal) {
    const [newDeal] = await db.insert(deals).values(deal).returning();
    return newDeal;
  }
  async updateDeal(id, data) {
    const [deal] = await db.update(deals).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq(deals.id, id)).returning();
    return deal;
  }
  async deleteDeal(id) {
    await db.delete(deals).where(eq(deals.id, id));
  }
  async getDealsByStage(stage, userId) {
    if (userId) {
      return await db.select().from(deals).where(and(eq(deals.stage, stage), eq(deals.assignedTo, userId))).orderBy(desc(deals.updatedAt));
    } else {
      return await db.select().from(deals).where(eq(deals.stage, stage)).orderBy(desc(deals.updatedAt));
    }
  }
  // Task operations
  async getTasks(userId) {
    if (userId) {
      return await db.select().from(tasks).where(eq(tasks.assignedTo, userId)).orderBy(desc(tasks.createdAt));
    } else {
      return await db.select().from(tasks).orderBy(desc(tasks.createdAt));
    }
  }
  async getTask(id) {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task;
  }
  async createTask(task) {
    const [newTask] = await db.insert(tasks).values(task).returning();
    return newTask;
  }
  async updateTask(id, data) {
    const [task] = await db.update(tasks).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq(tasks.id, id)).returning();
    return task;
  }
  async deleteTask(id) {
    await db.delete(tasks).where(eq(tasks.id, id));
  }
  async getTasksByStatus(status, userId) {
    if (userId) {
      return await db.select().from(tasks).where(and(eq(tasks.status, status), eq(tasks.assignedTo, userId))).orderBy(desc(tasks.dueDate));
    } else {
      return await db.select().from(tasks).where(eq(tasks.status, status)).orderBy(desc(tasks.dueDate));
    }
  }
  async getOverdueTasks(userId) {
    const now = /* @__PURE__ */ new Date();
    if (userId) {
      return await db.select().from(tasks).where(
        and(
          lte(tasks.dueDate, now),
          eq(tasks.status, "open"),
          eq(tasks.assignedTo, userId)
        )
      ).orderBy(tasks.dueDate);
    } else {
      return await db.select().from(tasks).where(
        and(
          lte(tasks.dueDate, now),
          eq(tasks.status, "open")
        )
      ).orderBy(tasks.dueDate);
    }
  }
  // Client interaction operations
  async createInteraction(interaction) {
    const [newInteraction] = await db.insert(clientInteractions).values(interaction).returning();
    return newInteraction;
  }
  async getClientInteractions(clientId) {
    return await db.select().from(clientInteractions).where(eq(clientInteractions.clientId, clientId)).orderBy(desc(clientInteractions.createdAt));
  }
  // Analytics operations
  async getUserKPIs(userId, startDate, endDate) {
    const [leadsResult] = await db.select({ count: count() }).from(clients).where(
      and(
        eq(clients.assignedTo, userId),
        gte(clients.createdAt, startDate),
        lte(clients.createdAt, endDate)
      )
    );
    const [dealsResult] = await db.select({
      count: count(),
      totalValue: sum(deals.value)
    }).from(deals).where(
      and(
        eq(deals.assignedTo, userId),
        gte(deals.createdAt, startDate),
        lte(deals.createdAt, endDate)
      )
    );
    const [wonDealsResult] = await db.select({ count: count() }).from(deals).where(
      and(
        eq(deals.assignedTo, userId),
        eq(deals.stage, "won"),
        gte(deals.actualCloseDate, startDate),
        lte(deals.actualCloseDate, endDate)
      )
    );
    const [workHoursResult] = await db.select({ totalMinutes: sum(workSessions.totalMinutes) }).from(workSessions).where(
      and(
        eq(workSessions.userId, userId),
        gte(workSessions.date, startDate),
        lte(workSessions.date, endDate)
      )
    );
    const leadsCount = leadsResult.count || 0;
    const dealsCount = dealsResult.count || 0;
    const dealsValue = Number(dealsResult.totalValue) || 0;
    const wonDealsCount = wonDealsResult.count || 0;
    const workMinutes = Number(workHoursResult.totalMinutes) || 0;
    return {
      leadsCount,
      dealsCount,
      dealsValue,
      conversionRate: dealsCount > 0 ? wonDealsCount / dealsCount * 100 : 0,
      workHours: workMinutes / 60
    };
  }
  async getLeadSourceStats() {
    const results = await db.select({
      source: clients.source,
      count: count()
    }).from(clients).groupBy(clients.source);
    const total = results.reduce((sum2, item) => sum2 + item.count, 0);
    return results.map((item) => ({
      source: item.source,
      count: item.count,
      percentage: total > 0 ? item.count / total * 100 : 0
    }));
  }
  // AI operations
  async createAiInsight(insight) {
    const [newInsight] = await db.insert(aiInsights).values(insight).returning();
    return newInsight;
  }
  async getAiInsights(entityId, entityType) {
    return await db.select().from(aiInsights).where(
      and(
        eq(aiInsights.entityId, entityId),
        eq(aiInsights.entityType, entityType)
      )
    ).orderBy(desc(aiInsights.createdAt));
  }
  // Lead source operations
  async getLeadSources() {
    return await db.select().from(leadSources).where(eq(leadSources.isActive, true)).orderBy(leadSources.name);
  }
  async createLeadSource(source) {
    const [newSource] = await db.insert(leadSources).values(source).returning();
    return newSource;
  }
  // Employee operations
  async getEmployees() {
    return await db.select().from(employees).orderBy(desc(employees.createdAt));
  }
  async getEmployee(id) {
    const [employee] = await db.select().from(employees).where(eq(employees.id, id));
    return employee;
  }
  async createEmployee(employeeData) {
    const [employee] = await db.insert(employees).values({
      ...employeeData,
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    }).returning();
    return employee;
  }
  async updateEmployee(id, employeeData) {
    const [employee] = await db.update(employees).set({
      ...employeeData,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(employees.id, id)).returning();
    return employee;
  }
  async deleteEmployee(id) {
    await db.delete(employees).where(eq(employees.id, id));
  }
};
var storage = new DatabaseStorage();

// server/replitAuth.ts
import * as client from "openid-client";
import { Strategy } from "openid-client/passport";
import passport from "passport";
import session from "express-session";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}
var getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID
    );
  },
  { maxAge: 3600 * 1e3 }
);
function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1e3;
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions"
  });
  return session({
    secret: process.env.SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: sessionTtl
    }
  });
}
function updateUserSession(user, tokens) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}
async function upsertUser(claims) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"]
  });
}
async function setupAuth(app2) {
  app2.set("trust proxy", 1);
  app2.use(getSession());
  app2.use(passport.initialize());
  app2.use(passport.session());
  const config = await getOidcConfig();
  const verify = async (tokens, verified) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };
  for (const domain of process.env.REPLIT_DOMAINS.split(",")) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`
      },
      verify
    );
    passport.use(strategy);
  }
  passport.serializeUser((user, cb) => cb(null, user));
  passport.deserializeUser((user, cb) => cb(null, user));
  app2.get("/api/login", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"]
    })(req, res, next);
  });
  app2.get("/api/callback", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login"
    })(req, res, next);
  });
  app2.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`
        }).href
      );
    });
  });
}
var isAuthenticated = async (req, res, next) => {
  const user = req.user;
  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const now = Math.floor(Date.now() / 1e3);
  if (now <= user.expires_at) {
    return next();
  }
  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};

// server/routes.ts
async function registerRoutes(app2) {
  await setupAuth(app2);
  app2.get("/api/auth/user", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
  app2.post("/api/work-sessions/start", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const now = /* @__PURE__ */ new Date();
      const session2 = await storage.createWorkSession({
        userId,
        loginTime: now,
        date: now
      });
      res.json(session2);
    } catch (error) {
      console.error("Error starting work session:", error);
      res.status(500).json({ message: "Failed to start work session" });
    }
  });
  app2.post("/api/work-sessions/:id/end", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const now = /* @__PURE__ */ new Date();
      const session2 = await storage.updateWorkSession(id, {
        logoutTime: now
      });
      if (session2.loginTime) {
        const totalMinutes = Math.floor((now.getTime() - session2.loginTime.getTime()) / 6e4);
        await storage.updateWorkSession(id, { totalMinutes });
      }
      res.json(session2);
    } catch (error) {
      console.error("Error ending work session:", error);
      res.status(500).json({ message: "Failed to end work session" });
    }
  });
  app2.get("/api/work-sessions", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const { startDate, endDate } = req.query;
      const sessions2 = await storage.getUserWorkSessions(
        userId,
        startDate ? new Date(startDate) : void 0,
        endDate ? new Date(endDate) : void 0
      );
      res.json(sessions2);
    } catch (error) {
      console.error("Error fetching work sessions:", error);
      res.status(500).json({ message: "Failed to fetch work sessions" });
    }
  });
  app2.get("/api/clients", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const clients2 = await storage.getClients(userId);
      res.json(clients2);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });
  app2.get("/api/clients/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const client2 = await storage.getClient(id);
      if (!client2) {
        return res.status(404).json({ message: "Client not found" });
      }
      res.json(client2);
    } catch (error) {
      console.error("Error fetching client:", error);
      res.status(500).json({ message: "Failed to fetch client" });
    }
  });
  app2.post("/api/clients", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const clientData = insertClientSchema.parse({
        ...req.body,
        assignedTo: userId
      });
      const client2 = await storage.createClient(clientData);
      try {
        await storage.createAiInsight({
          type: "lead_classification",
          entityId: client2.id,
          entityType: "client",
          confidence: "0.80",
          data: { classification: "warm", timestamp: (/* @__PURE__ */ new Date()).toISOString() },
          userId
        });
      } catch (aiError) {
        console.error("Error generating AI insight:", aiError);
      }
      res.json(client2);
    } catch (error) {
      console.error("Error creating client:", error);
      res.status(500).json({ message: "Failed to create client" });
    }
  });
  app2.patch("/api/clients/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const client2 = await storage.updateClient(id, updateData);
      res.json(client2);
    } catch (error) {
      console.error("Error updating client:", error);
      res.status(500).json({ message: "Failed to update client" });
    }
  });
  app2.delete("/api/clients/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteClient(id);
      res.json({ message: "Client deleted successfully" });
    } catch (error) {
      console.error("Error deleting client:", error);
      res.status(500).json({ message: "Failed to delete client" });
    }
  });
  app2.get("/api/deals", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const deals2 = await storage.getDeals(userId);
      res.json(deals2);
    } catch (error) {
      console.error("Error fetching deals:", error);
      res.status(500).json({ message: "Failed to fetch deals" });
    }
  });
  app2.get("/api/deals/by-stage/:stage", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const { stage } = req.params;
      const deals2 = await storage.getDealsByStage(stage, userId);
      res.json(deals2);
    } catch (error) {
      console.error("Error fetching deals by stage:", error);
      res.status(500).json({ message: "Failed to fetch deals by stage" });
    }
  });
  app2.post("/api/deals", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const dealData = {
        ...req.body,
        assignedTo: userId,
        value: req.body.value ? parseFloat(req.body.value) : null,
        expectedCloseDate: req.body.expectedCloseDate ? new Date(req.body.expectedCloseDate) : null
      };
      const deal = await storage.createDeal(dealData);
      try {
        await storage.createAiInsight({
          type: "deal_probability",
          entityId: deal.id,
          entityType: "deal",
          confidence: "0.80",
          data: { analysis: "Deal created", timestamp: (/* @__PURE__ */ new Date()).toISOString() },
          userId
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
  app2.patch("/api/deals/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = {
        ...req.body,
        value: req.body.value ? parseFloat(req.body.value) : void 0,
        expectedCloseDate: req.body.expectedCloseDate ? new Date(req.body.expectedCloseDate) : void 0
      };
      const deal = await storage.updateDeal(id, updateData);
      res.json(deal);
    } catch (error) {
      console.error("Error updating deal:", error);
      res.status(500).json({ message: "Failed to update deal" });
    }
  });
  app2.get("/api/tasks", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const { status } = req.query;
      let tasks2;
      if (status) {
        tasks2 = await storage.getTasksByStatus(status, userId);
      } else {
        tasks2 = await storage.getTasks(userId);
      }
      res.json(tasks2);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });
  app2.get("/api/tasks/overdue", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const tasks2 = await storage.getOverdueTasks(userId);
      res.json(tasks2);
    } catch (error) {
      console.error("Error fetching overdue tasks:", error);
      res.status(500).json({ message: "Failed to fetch overdue tasks" });
    }
  });
  app2.post("/api/tasks", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const taskData = insertTaskSchema.parse({
        ...req.body,
        assignedTo: userId
      });
      const task = await storage.createTask(taskData);
      res.json(task);
    } catch (error) {
      console.error("Error creating task:", error);
      res.status(500).json({ message: "Failed to create task" });
    }
  });
  app2.patch("/api/tasks/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      if (updateData.status === "completed") {
        updateData.completedAt = /* @__PURE__ */ new Date();
      }
      const task = await storage.updateTask(id, updateData);
      res.json(task);
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(500).json({ message: "Failed to update task" });
    }
  });
  app2.get("/api/analytics/kpis", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const { startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1e3);
      const end = endDate ? new Date(endDate) : /* @__PURE__ */ new Date();
      const kpis = await storage.getUserKPIs(userId, start, end);
      res.json(kpis);
    } catch (error) {
      console.error("Error fetching KPIs:", error);
      res.status(500).json({ message: "Failed to fetch KPIs" });
    }
  });
  app2.get("/api/analytics/lead-sources", isAuthenticated, async (req, res) => {
    try {
      const stats = await storage.getLeadSourceStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching lead source stats:", error);
      res.status(500).json({ message: "Failed to fetch lead source stats" });
    }
  });
  app2.get("/api/ai/insights/:entityId/:entityType", isAuthenticated, async (req, res) => {
    try {
      const { entityId, entityType } = req.params;
      const insights = await storage.getAiInsights(entityId, entityType);
      res.json(insights);
    } catch (error) {
      console.error("Error fetching AI insights:", error);
      res.status(500).json({ message: "Failed to fetch AI insights" });
    }
  });
  app2.post("/api/ai/recommendations", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const recommendations = [
        { type: "tip", message: "Follow up with new leads within 24 hours", priority: "high" },
        { type: "insight", message: "Your conversion rate is improving", priority: "medium" }
      ];
      res.json(recommendations);
    } catch (error) {
      console.error("Error generating recommendations:", error);
      res.status(500).json({ message: "Failed to generate recommendations" });
    }
  });
  app2.get("/api/work-sessions", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const { startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1e3);
      const end = endDate ? new Date(endDate) : /* @__PURE__ */ new Date();
      const workSessions2 = await storage.getUserWorkSessions(userId, start, end);
      res.json(workSessions2);
    } catch (error) {
      console.error("Error fetching work sessions:", error);
      res.status(500).json({ message: "Failed to fetch work sessions" });
    }
  });
  app2.post("/api/work-sessions", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const sessionData = insertWorkSessionSchema.parse({
        ...req.body,
        userId
      });
      const workSession = await storage.createWorkSession(sessionData);
      res.json(workSession);
    } catch (error) {
      console.error("Error creating work session:", error);
      res.status(500).json({ message: "Failed to create work session" });
    }
  });
  app2.patch("/api/work-sessions/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const workSession = await storage.updateWorkSession(id, updateData);
      res.json(workSession);
    } catch (error) {
      console.error("Error updating work session:", error);
      res.status(500).json({ message: "Failed to update work session" });
    }
  });
  app2.get("/api/employees", isAuthenticated, async (req, res) => {
    try {
      const employees2 = await storage.getEmployees();
      res.json(employees2);
    } catch (error) {
      console.error("Error fetching employees:", error);
      res.status(500).json({ message: "Failed to fetch employees" });
    }
  });
  app2.get("/api/employees/:id", isAuthenticated, async (req, res) => {
    try {
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
  app2.post("/api/employees", isAuthenticated, async (req, res) => {
    try {
      const employee = await storage.createEmployee(req.body);
      res.status(201).json(employee);
    } catch (error) {
      console.error("Error creating employee:", error);
      res.status(500).json({ message: "Failed to create employee" });
    }
  });
  app2.patch("/api/employees/:id", isAuthenticated, async (req, res) => {
    try {
      const employee = await storage.updateEmployee(req.params.id, req.body);
      res.json(employee);
    } catch (error) {
      console.error("Error updating employee:", error);
      res.status(500).json({ message: "Failed to update employee" });
    }
  });
  app2.delete("/api/employees/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteEmployee(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting employee:", error);
      res.status(500).json({ message: "Failed to delete employee" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
