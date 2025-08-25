import {
  users,
  employees,
  clients,
  deals,
  tasks,
  workSessions,
  clientInteractions,
  leadSources,
  aiInsights,
  dailyPayroll,
  monthlyPayroll,
  companySettings,
  knowledgeBase,
  services,
  faqItems,
  responseTemplates,
  type User,
  type UpsertUser,
  type Employee,
  type InsertEmployee,
  type Client,
  type InsertClient,
  type Deal,
  type InsertDeal,
  type Task,
  type InsertTask,
  type WorkSession,
  type InsertWorkSession,
  type ClientInteraction,
  type InsertClientInteraction,
  type LeadSource,
  type InsertLeadSource,
  type AiInsight,
  type InsertAiInsight,
  type DailyPayroll,
  type InsertDailyPayroll,
  type MonthlyPayroll,
  type InsertMonthlyPayroll,
  type CompanySettings,
  type InsertCompanySettings,
  type KnowledgeBase,
  type InsertKnowledgeBase,
  type Service,
  type InsertService,
  type FaqItem,
  type InsertFaqItem,
  type ResponseTemplate,
  type InsertResponseTemplate,
  instagramLeads,
  type InstagramLead,
  type InsertInstagramLead,
  insertInstagramLeadSchema,
  voiceLeads,
  type VoiceLead,
  type InsertVoiceLead,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, lt, count, sum, avg, isNotNull, sql } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(userData: any): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User>;

  upsertUser(user: UpsertUser): Promise<User>;
  
  // Work session operations
  createWorkSession(session: InsertWorkSession): Promise<WorkSession>;
  updateWorkSession(id: string, data: Partial<WorkSession>): Promise<WorkSession>;
  getUserWorkSessions(userId: string, startDate?: Date, endDate?: Date): Promise<WorkSession[]>;
  getTotalWorkTime(userId: string, date: Date): Promise<number>;
  
  // Client operations
  getClients(userId?: string): Promise<Client[]>;
  getClient(id: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, data: Partial<Client>): Promise<Client>;
  deleteClient(id: string): Promise<void>;
  
  // Deal operations
  getDeals(userId?: string): Promise<Deal[]>;
  getDeal(id: string): Promise<Deal | undefined>;
  createDeal(deal: InsertDeal): Promise<Deal>;
  updateDeal(id: string, data: Partial<Deal>): Promise<Deal>;
  deleteDeal(id: string): Promise<void>;
  getDealsByStage(stage: string, userId?: string): Promise<Deal[]>;
  
  // Task operations
  getTasks(userId?: string): Promise<Task[]>;
  getTask(id: string): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, data: Partial<Task>): Promise<Task>;
  deleteTask(id: string): Promise<void>;
  getTasksByStatus(status: string, userId?: string): Promise<Task[]>;
  getOverdueTasks(userId?: string): Promise<Task[]>;
  
  // Employee operations
  getEmployees(): Promise<Employee[]>;
  getEmployee(id: string): Promise<Employee | undefined>;
  getEmployeeByUserId(userId: string): Promise<Employee | undefined>;
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  updateEmployee(id: string, employee: Partial<InsertEmployee>): Promise<Employee>;
  deleteEmployee(id: string): Promise<void>;

  // Client interaction operations
  createInteraction(interaction: InsertClientInteraction): Promise<ClientInteraction>;
  getClientInteractions(clientId: string): Promise<ClientInteraction[]>;
  
  // Analytics operations
  getUserKPIs(userId: string, startDate: Date, endDate: Date): Promise<{
    leadsCount: number;
    dealsCount: number;
    dealsValue: number;
    conversionRate: number;
    workHours: number;
  }>;
  
  getCompanyKPIs(startDate: Date, endDate: Date): Promise<{
    leadsCount: number;
    dealsCount: number;
    dealsValue: number;
    conversionRate: number;
  }>;
  
  getLeadSourceStats(): Promise<{ source: string; count: number; percentage: number }[]>;
  
  // AI operations
  createAiInsight(insight: InsertAiInsight): Promise<AiInsight>;
  getAiInsights(entityId: string, entityType: string): Promise<AiInsight[]>;

  // Instagram Lead operations
  createInstagramLead(lead: InsertInstagramLead): Promise<InstagramLead>;
  getInstagramLeads(): Promise<InstagramLead[]>;
  getInstagramLead(id: string): Promise<InstagramLead | undefined>;
  updateInstagramLead(id: string, data: Partial<InstagramLead>): Promise<InstagramLead>;
  deleteInstagramLead(id: string): Promise<void>;
  
  // Lead source operations
  getLeadSources(): Promise<LeadSource[]>;
  createLeadSource(source: InsertLeadSource): Promise<LeadSource>;
  
  // Payroll operations
  getDailyPayroll(userId: string, date: Date): Promise<DailyPayroll | undefined>;
  getDailyPayrollByMonth(userId: string, month: number, year: number): Promise<DailyPayroll[]>;
  createDailyPayroll(payroll: InsertDailyPayroll): Promise<DailyPayroll>;
  updateDailyPayroll(id: string, data: Partial<DailyPayroll>): Promise<DailyPayroll>;
  deleteDailyPayroll(id: string): Promise<boolean>;
  
  getMonthlyPayroll(userId: string, month: number, year: number): Promise<MonthlyPayroll | undefined>;
  getMonthlyPayrollByPeriod(month: number, year: number): Promise<MonthlyPayroll[]>;
  createMonthlyPayroll(payroll: InsertMonthlyPayroll): Promise<MonthlyPayroll>;
  updateMonthlyPayroll(id: string, data: Partial<MonthlyPayroll>): Promise<MonthlyPayroll>;
  deleteMonthlyPayroll(month: number, year: number): Promise<void>;

  // Company settings operations
  getCompanySettings(): Promise<CompanySettings | undefined>;
  upsertCompanySettings(settings: InsertCompanySettings): Promise<CompanySettings>;
  
  // RAG / Knowledge Base operations
  searchKnowledge(searchTerms: string[], category?: string, limit?: number): Promise<KnowledgeBase[]>;
  searchFAQ(searchTerms: string[], limit?: number): Promise<FaqItem[]>;
  searchServices(searchTerms: string[], limit?: number): Promise<Service[]>;
  findResponseTemplate(question: string, context?: string): Promise<ResponseTemplate | undefined>;
  incrementTemplateUsage(templateId: string): Promise<void>;
  getKnowledgeBase(category?: string): Promise<KnowledgeBase[]>;
  createKnowledge(data: InsertKnowledgeBase): Promise<KnowledgeBase>;
  updateKnowledge(id: string, data: Partial<InsertKnowledgeBase>): Promise<KnowledgeBase>;
  deleteKnowledge(id: string): Promise<void>;
  getServices(category?: string, activeOnly?: boolean): Promise<Service[]>;
  createService(data: InsertService): Promise<Service>;
  updateService(id: string, data: Partial<InsertService>): Promise<Service>;
  deleteService(id: string): Promise<void>;
  getFAQ(category?: string): Promise<FaqItem[]>;
  createFAQ(data: InsertFaqItem): Promise<FaqItem>;
  updateFAQ(id: string, data: Partial<InsertFaqItem>): Promise<FaqItem>;
  deleteFAQ(id: string): Promise<void>;
  incrementFAQView(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(users.firstName);
  }

  async getUserById(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async createUser(userData: any): Promise<User> {
    const [newUser] = await db
      .insert(users)
      .values({
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role || 'employee',
        telegramUserId: userData.telegramUserId,
        telegramUsername: userData.telegramUsername,
        telegramFirstName: userData.telegramFirstName,
        telegramLastName: userData.telegramLastName,
        registrationStatus: userData.registrationStatus || 'pending',
        registrationSource: userData.registrationSource || 'telegram',
        isActive: userData.isActive !== undefined ? userData.isActive : false,
      })
      .returning();
    return newUser;
  }

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    
    if (!updatedUser) {
      throw new Error(`User with id ${id} not found`);
    }
    
    return updatedUser;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.email,
        set: {
          // НЕ обновляем ID для существующих пользователей!
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Work session operations
  async createWorkSession(session: InsertWorkSession): Promise<WorkSession> {
    const [workSession] = await db
      .insert(workSessions)
      .values(session)
      .returning();
    return workSession;
  }

  async updateWorkSession(id: string, data: Partial<WorkSession>): Promise<WorkSession> {
    const [workSession] = await db
      .update(workSessions)
      .set(data)
      .where(eq(workSessions.id, id))
      .returning();
    return workSession;
  }

  async getUserWorkSessions(userId: string, startDate?: Date, endDate?: Date): Promise<WorkSession[]> {
    const conditions = [eq(workSessions.userId, userId)];
    
    if (startDate && endDate) {
      conditions.push(
        gte(workSessions.date, startDate),
        lte(workSessions.date, endDate)
      );
    }
    
    return await db
      .select()
      .from(workSessions)
      .where(and(...conditions))
      .orderBy(desc(workSessions.date));
  }

  async getTotalWorkTime(userId: string, date: Date): Promise<number> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const result = await db
      .select({ total: sum(workSessions.totalMinutes) })
      .from(workSessions)
      .where(
        and(
          eq(workSessions.userId, userId),
          gte(workSessions.date, startOfDay),
          lte(workSessions.date, endOfDay)
        )
      );
    
    return Number(result[0]?.total) || 0;
  }

  // Client operations
  async getClients(userId?: string): Promise<Client[]> {
    if (userId) {
      return await db
        .select()
        .from(clients)
        .where(eq(clients.assignedTo, userId))
        .orderBy(desc(clients.createdAt));
    } else {
      return await db
        .select()
        .from(clients)
        .orderBy(desc(clients.createdAt));
    }
  }

  async getClient(id: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client;
  }

  async createClient(client: InsertClient): Promise<Client> {
    const [newClient] = await db
      .insert(clients)
      .values(client)
      .returning();
    return newClient;
  }

  async updateClient(id: string, data: Partial<Client>): Promise<Client> {
    const [client] = await db
      .update(clients)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(clients.id, id))
      .returning();
    return client;
  }

  async deleteClient(id: string): Promise<void> {
    await db.delete(clients).where(eq(clients.id, id));
  }

  // Deal operations
  async getDeals(userId?: string): Promise<Deal[]> {
    if (userId) {
      return await db
        .select()
        .from(deals)
        .where(eq(deals.assignedTo, userId))
        .orderBy(desc(deals.createdAt));
    } else {
      return await db
        .select()
        .from(deals)
        .orderBy(desc(deals.createdAt));
    }
  }

  async getDeal(id: string): Promise<Deal | undefined> {
    const [deal] = await db.select().from(deals).where(eq(deals.id, id));
    return deal;
  }

  async createDeal(deal: InsertDeal): Promise<Deal> {
    const [newDeal] = await db
      .insert(deals)
      .values(deal)
      .returning();
    return newDeal;
  }

  async updateDeal(id: string, data: Partial<Deal>): Promise<Deal> {
    const [deal] = await db
      .update(deals)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(deals.id, id))
      .returning();
    return deal;
  }

  async deleteDeal(id: string): Promise<void> {
    await db.delete(deals).where(eq(deals.id, id));
  }

  async getDealsByStage(stage: string, userId?: string): Promise<Deal[]> {
    if (userId) {
      return await db
        .select()
        .from(deals)
        .where(and(eq(deals.stage, stage as any), eq(deals.assignedTo, userId)))
        .orderBy(desc(deals.updatedAt));
    } else {
      return await db
        .select()
        .from(deals)
        .where(eq(deals.stage, stage as any))
        .orderBy(desc(deals.updatedAt));
    }
  }

  // Task operations
  async getTasks(userId?: string): Promise<Task[]> {
    if (userId) {
      return await db
        .select()
        .from(tasks)
        .where(eq(tasks.assignedTo, userId))
        .orderBy(desc(tasks.createdAt));
    } else {
      return await db
        .select()
        .from(tasks)
        .orderBy(desc(tasks.createdAt));
    }
  }

  async getTask(id: string): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task;
  }

  async createTask(task: InsertTask): Promise<Task> {
    const [newTask] = await db
      .insert(tasks)
      .values(task)
      .returning();
    return newTask;
  }

  async updateTask(id: string, data: Partial<Task>): Promise<Task> {
    const [task] = await db
      .update(tasks)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tasks.id, id))
      .returning();
    return task;
  }

  async deleteTask(id: string): Promise<void> {
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  async getTasksByStatus(status: string, userId?: string): Promise<Task[]> {
    if (userId) {
      return await db
        .select()
        .from(tasks)
        .where(and(eq(tasks.status, status as any), eq(tasks.assignedTo, userId)))
        .orderBy(desc(tasks.dueDate));
    } else {
      return await db
        .select()
        .from(tasks)
        .where(eq(tasks.status, status as any))
        .orderBy(desc(tasks.dueDate));
    }
  }

  async getOverdueTasks(userId?: string): Promise<Task[]> {
    const now = new Date();
    
    if (userId) {
      return await db
        .select()
        .from(tasks)
        .where(
          and(
            lte(tasks.dueDate, now),
            eq(tasks.status, 'open'),
            eq(tasks.assignedTo, userId)
          )
        )
        .orderBy(tasks.dueDate);
    } else {
      return await db
        .select()
        .from(tasks)
        .where(
          and(
            lte(tasks.dueDate, now),
            eq(tasks.status, 'open')
          )
        )
        .orderBy(tasks.dueDate);
    }
  }

  // Client interaction operations
  async createInteraction(interaction: InsertClientInteraction): Promise<ClientInteraction> {
    const [newInteraction] = await db
      .insert(clientInteractions)
      .values(interaction)
      .returning();
    return newInteraction;
  }

  async getClientInteractions(clientId: string): Promise<ClientInteraction[]> {
    return await db
      .select()
      .from(clientInteractions)
      .where(eq(clientInteractions.clientId, clientId))
      .orderBy(desc(clientInteractions.createdAt));
  }

  // Analytics operations
  async getUserKPIs(userId: string, startDate: Date, endDate: Date): Promise<{
    leadsCount: number;
    dealsCount: number;
    dealsValue: number;
    conversionRate: number;
    workHours: number;
  }> {
    // Get leads count (new clients)
    const [leadsResult] = await db
      .select({ count: count() })
      .from(clients)
      .where(
        and(
          eq(clients.assignedTo, userId),
          gte(clients.createdAt, startDate),
          lte(clients.createdAt, endDate)
        )
      );

    // Get deals count and value
    const [dealsResult] = await db
      .select({ 
        count: count(),
        totalValue: sum(deals.value)
      })
      .from(deals)
      .where(
        and(
          eq(deals.assignedTo, userId),
          gte(deals.createdAt, startDate),
          lte(deals.createdAt, endDate)
        )
      );

    // Get won deals count for conversion rate
    const [wonDealsResult] = await db
      .select({ count: count() })
      .from(deals)
      .where(
        and(
          eq(deals.assignedTo, userId),
          eq(deals.stage, 'won'),
          gte(deals.actualCloseDate, startDate),
          lte(deals.actualCloseDate, endDate)
        )
      );

    // Get work hours
    const [workHoursResult] = await db
      .select({ totalMinutes: sum(workSessions.totalMinutes) })
      .from(workSessions)
      .where(
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
      conversionRate: dealsCount > 0 ? (wonDealsCount / dealsCount) * 100 : 0,
      workHours: workMinutes / 60,
    };
  }

  async getLeadSourceStats(): Promise<{ source: string; count: number; percentage: number }[]> {
    const results = await db
      .select({
        source: clients.source,
        count: count()
      })
      .from(clients)
      .groupBy(clients.source);

    const total = results.reduce((sum, item) => sum + item.count, 0);

    return results.map(item => {
      const percentage = total > 0 ? (item.count / total) * 100 : 0;
      return {
        source: item.source,
        count: item.count,
        percentage: Math.round(percentage * 100) / 100  // Округляем до сотых долей
      };
    });
  }

  // AI operations
  async createAiInsight(insight: InsertAiInsight): Promise<AiInsight> {
    const [newInsight] = await db
      .insert(aiInsights)
      .values(insight)
      .returning();
    return newInsight;
  }

  async getAiInsights(entityId: string, entityType: string): Promise<AiInsight[]> {
    return await db
      .select()
      .from(aiInsights)
      .where(
        and(
          eq(aiInsights.entityId, entityId),
          eq(aiInsights.entityType, entityType)
        )
      )
      .orderBy(desc(aiInsights.createdAt));
  }

  // Lead source operations
  async getLeadSources(): Promise<LeadSource[]> {
    return await db
      .select()
      .from(leadSources)
      .where(eq(leadSources.isActive, true))
      .orderBy(leadSources.name);
  }

  async createLeadSource(source: InsertLeadSource): Promise<LeadSource> {
    const [newSource] = await db
      .insert(leadSources)
      .values(source)
      .returning();
    return newSource;
  }

  // Employee operations
  async getEmployees(): Promise<Employee[]> {
    return await db.select().from(employees).orderBy(desc(employees.createdAt));
  }

  async getEmployeeByUserId(userId: string): Promise<Employee | undefined> {
    // Find employee by direct user_id reference
    const [employee] = await db
      .select()
      .from(employees)
      .where(eq(employees.userId, userId));
    return employee;
  }

  async getCompanyKPIs(startDate: Date, endDate: Date): Promise<any> {
    // Get company-wide KPIs for admin/director view
    const dealsCountResult = await db
      .select({ count: count() })
      .from(deals)
      .where(and(
        gte(deals.createdAt, startDate),
        lte(deals.createdAt, endDate)
      ));
    
    const dealsValueResult = await db
      .select({ sum: sum(deals.value) })
      .from(deals)
      .where(and(
        gte(deals.createdAt, startDate),
        lte(deals.createdAt, endDate)
      ));
    
    const leadsCountResult = await db
      .select({ count: count() })
      .from(clients)
      .where(and(
        gte(clients.createdAt, startDate),
        lte(clients.createdAt, endDate)
      ));
    
    const dealsCount = Number(dealsCountResult[0]?.count) || 0;
    const dealsValue = Number(dealsValueResult[0]?.sum) || 0;
    const leadsCount = Number(leadsCountResult[0]?.count) || 0;
    
    // Calculate won deals for proper conversion
    const wonDealsResult = await db
      .select({ count: count() })
      .from(deals)
      .where(and(
        gte(deals.createdAt, startDate),
        lte(deals.createdAt, endDate),
        eq(deals.stage, 'won')
      ));
    
    const wonDealsCount = Number(wonDealsResult[0]?.count) || 0;
    
    return {
      leadsCount,
      dealsCount,
      dealsValue,
      conversionRate: dealsCount > 0 ? (wonDealsCount / dealsCount) * 100 : 0,
      workHours: 0
    };
  }

  async getEmployee(id: string): Promise<Employee | undefined> {
    const [employee] = await db.select().from(employees).where(eq(employees.id, id));
    return employee;
  }

  async createEmployee(employeeData: InsertEmployee): Promise<Employee> {
    const [employee] = await db
      .insert(employees)
      .values({
        ...employeeData,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return employee;
  }

  async updateEmployee(id: string, employeeData: Partial<InsertEmployee>): Promise<Employee> {
    const [employee] = await db
      .update(employees)
      .set({
        ...employeeData,
        updatedAt: new Date(),
      })
      .where(eq(employees.id, id))
      .returning();
    return employee;
  }

  async deleteEmployee(id: string): Promise<void> {
    await db.delete(employees).where(eq(employees.id, id));
  }

  // Payroll operations (consolidated)

  async createMonthlyPayroll(payroll: InsertMonthlyPayroll): Promise<MonthlyPayroll> {
    const [monthlyPayrollRecord] = await db.insert(monthlyPayroll).values(payroll).returning();
    return monthlyPayrollRecord;
  }

  async updateMonthlyPayroll(id: string, data: Partial<MonthlyPayroll>): Promise<MonthlyPayroll> {
    const [updated] = await db
      .update(monthlyPayroll)
      .set(data)
      .where(eq(monthlyPayroll.id, id))
      .returning();
    return updated;
  }

  async deleteMonthlyPayroll(month: number, year: number): Promise<void> {
    await db
      .delete(monthlyPayroll)
      .where(and(
        eq(monthlyPayroll.month, month),
        eq(monthlyPayroll.year, year)
      ));
  }

  // Daily payroll methods
  async getDailyPayroll(userId: string, date: Date): Promise<DailyPayroll | undefined> {
    const [payroll] = await db.select().from(dailyPayroll).where(and(
      eq(dailyPayroll.userId, userId),
      eq(dailyPayroll.date, date)
    ));
    return payroll;
  }

  async getDailyPayrollByMonth(userId: string, month: number, year: number): Promise<DailyPayroll[]> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    return await db.select().from(dailyPayroll).where(and(
      eq(dailyPayroll.userId, userId),
      gte(dailyPayroll.date, startDate),
      lte(dailyPayroll.date, endDate)
    ));
  }

  async createDailyPayroll(payroll: InsertDailyPayroll): Promise<DailyPayroll> {
    const [dailyPayrollRecord] = await db.insert(dailyPayroll).values(payroll).returning();
    
    // Auto-sync monthly payroll after creating daily record (with error handling)
    try {
      await this.syncMonthlyPayrollFromDaily(payroll.userId, payroll.employeeId, payroll.date);
    } catch (error) {
      console.error('Failed to auto-sync monthly payroll after daily creation:', error);
      // Don't throw - daily record was created successfully
    }
    
    return dailyPayrollRecord;
  }

  async updateDailyPayroll(id: string, data: Partial<DailyPayroll>): Promise<DailyPayroll> {
    const [updated] = await db
      .update(dailyPayroll)
      .set(data)
      .where(eq(dailyPayroll.id, id))
      .returning();
    
    // Auto-sync monthly payroll after updating daily record (with error handling)
    if (updated) {
      try {
        await this.syncMonthlyPayrollFromDaily(updated.userId, updated.employeeId, updated.date);
      } catch (error) {
        console.error('Failed to auto-sync monthly payroll after daily update:', error);
        // Don't throw - update was successful
      }
    }
    
    return updated;
  }

  async deleteDailyPayroll(id: string): Promise<boolean> {
    try {
      const result = await db
        .delete(dailyPayroll)
        .where(eq(dailyPayroll.id, id))
        .returning();
      
      return result.length > 0;
    } catch (error) {
      console.error('Error deleting daily payroll:', error);
      return false;
    }
  }

  async deleteDailyPayrollByEmployeeAndDate(employeeId: string, date: Date): Promise<boolean> {
    try {
      // First check if record exists
      const existing = await db
        .select()
        .from(dailyPayroll)
        .where(and(
          eq(dailyPayroll.employeeId, employeeId),
          eq(dailyPayroll.date, date)
        ))
        .limit(1);
      
      if (existing.length > 0) {
        const result = await db
          .delete(dailyPayroll)
          .where(and(
            eq(dailyPayroll.employeeId, employeeId),
            eq(dailyPayroll.date, date)
          ))
          .returning();
        
        return result.length > 0;
      } else {
        // If no record exists, consider it "deleted" (success)
        return true;
      }
    } catch (error) {
      console.error('Error deleting daily payroll by employee and date:', error);
      return false;
    }
  }

  async deleteWorkSessionsByEmployeeAndDate(employeeId: string, date: Date): Promise<boolean> {
    try {
      // First find the employee to get their userId
      const employee = await db
        .select()
        .from(employees)
        .where(eq(employees.id, employeeId))
        .limit(1);
      
      if (employee.length === 0) {
        console.log('Employee not found:', employeeId);
        return false;
      }

      const userId = employee[0].userId;
      if (!userId) {
        console.log('Employee has no userId:', employeeId);
        return false;
      }

      // Set date range for the entire day
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      console.log('Deleting work sessions for:', { employeeId, userId, startOfDay, endOfDay });

      // Delete work sessions for this user on this date
      const result = await db
        .delete(workSessions)
        .where(and(
          eq(workSessions.userId, userId),
          gte(workSessions.date, startOfDay),
          lte(workSessions.date, endOfDay)
        ))
        .returning();
      
      console.log('Deleted work sessions:', result.length);
      return true; // Return true even if no sessions found (considered success)
    } catch (error) {
      console.error('Error deleting work sessions by employee and date:', error);
      return false;
    }
  }

  async updateWorkSessionsByEmployeeAndDate(
    employeeId: string, 
    date: Date, 
    updateData: { actualHours?: number; plannedHours?: number; hourlyRate?: number }
  ): Promise<boolean> {
    try {
      // First find the employee to get their userId
      const employee = await db
        .select()
        .from(employees)
        .where(eq(employees.id, employeeId))
        .limit(1);
      
      if (employee.length === 0) {
        console.log('Employee not found for update:', employeeId);
        return false;
      }

      const userId = employee[0].userId;
      if (!userId) {
        console.log('Employee has no userId for update:', employeeId);
        return false;
      }

      // Set date range for the entire day
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      console.log('Updating work sessions for:', { employeeId, userId, startOfDay, endOfDay, updateData });

      // Find existing work sessions for this user on this date
      const existingSessions = await db
        .select()
        .from(workSessions)
        .where(and(
          eq(workSessions.userId, userId),
          gte(workSessions.date, startOfDay),
          lte(workSessions.date, endOfDay)
        ));

      if (existingSessions.length === 0 && updateData.actualHours) {
        // No existing sessions, create a new one based on the actualHours
        const totalMinutes = Math.round(updateData.actualHours * 60);
        const loginTime = new Date(startOfDay);
        loginTime.setHours(9, 0, 0, 0); // Default start at 9 AM
        
        const logoutTime = new Date(loginTime);
        logoutTime.setMinutes(logoutTime.getMinutes() + totalMinutes);
        
        await db.insert(workSessions).values({
          userId,
          loginTime,
          logoutTime,
          totalMinutes,
          date: startOfDay,
        });
        
        console.log('Created new work session with', totalMinutes, 'minutes');
      } else if (existingSessions.length > 0 && updateData.actualHours) {
        // Update existing sessions - modify the first session's logout time to match actualHours
        const session = existingSessions[0];
        const totalMinutes = Math.round(updateData.actualHours * 60);
        
        const newLogoutTime = new Date(session.loginTime);
        newLogoutTime.setMinutes(newLogoutTime.getMinutes() + totalMinutes);
        
        await db
          .update(workSessions)
          .set({
            logoutTime: newLogoutTime,
            totalMinutes,
          })
          .where(eq(workSessions.id, session.id));
        
        console.log('Updated work session to', totalMinutes, 'minutes');
      }

      return true;
    } catch (error) {
      console.error('Error updating work sessions by employee and date:', error);
      return false;
    }
  }

  // Calculate Turkish taxes according to 2025 progressive rates
  private calculateTurkishIncomeTax(monthlyGross: number): number {
    // Turkish income tax brackets for 2025 (monthly rates)
    let incomeTax = 0;
    
    if (monthlyGross <= 7000) {
      incomeTax = monthlyGross * 0.15; // 15%
    } else if (monthlyGross <= 25000) {
      incomeTax = 7000 * 0.15 + (monthlyGross - 7000) * 0.20; // 20%
    } else if (monthlyGross <= 55000) {
      incomeTax = 7000 * 0.15 + 18000 * 0.20 + (monthlyGross - 25000) * 0.27; // 27%
    } else {
      incomeTax = 7000 * 0.15 + 18000 * 0.20 + 30000 * 0.27 + (monthlyGross - 55000) * 0.35; // 35%
    }
    
    return incomeTax;
  }

  // Calculate all Turkish deductions for payroll
  private calculateTurkishDeductions(grossSalary: number) {
    return {
      incomeTax: this.calculateTurkishIncomeTax(grossSalary),
      stampTax: grossSalary * 0.00759, // 0.759%
      socialSecurityEmployee: grossSalary * 0.14, // 14%
      unemploymentInsuranceEmployee: grossSalary * 0.01, // 1%
      socialSecurityEmployer: grossSalary * 0.155, // 15.5%
      unemploymentInsuranceEmployer: grossSalary * 0.02, // 2%
    };
  }

  // Calculate working days in a month (excluding weekends)
  private calculateWorkingDays(month: number, year: number): number {
    const daysInMonth = new Date(year, month, 0).getDate();
    let workingDays = 0;
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const dayOfWeek = date.getDay();
      // Exclude Saturday (6) and Sunday (0)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workingDays++;
      }
    }
    
    return workingDays;
  }

  // Auto-calculate and update payroll when work session ends
  async autoCalculatePayrollFromWorkSession(userId: string, workDate: Date): Promise<void> {
    try {
      const user = await this.getUser(userId);
      if (!user) return;

      // Get employee data
      const employee = await this.getEmployeeByUserId(userId);
      if (!employee) return;

      // Calculate hourly rate from employee data
      let hourlyRate = parseFloat(employee.hourlyRate || "0");
      const plannedDailyHours = parseFloat(employee.dailyWorkingHours || "8");
      
      if (hourlyRate === 0 && employee.monthlySalary) {
        // Calculate from monthly salary: monthly / (22 working days * daily hours)
        const monthlyWorkingDays = 22;
        hourlyRate = parseFloat(employee.monthlySalary) / (monthlyWorkingDays * plannedDailyHours);
      }
      if (hourlyRate === 0) {
        hourlyRate = 50; // Default rate
      }

      // Get actual work time for the day
      const totalWorkMinutes = await this.getTotalWorkTime(userId, workDate);
      const actualHours = totalWorkMinutes / 60;
      
      // Calculate overtime
      const overtimeHours = Math.max(0, actualHours - plannedDailyHours);
      const regularHours = Math.min(actualHours, plannedDailyHours);
      
      // Calculate pay
      const basePay = regularHours * hourlyRate;
      const overtimePay = overtimeHours * hourlyRate * 1.5; // 1.5x for overtime
      const grossPay = basePay + overtimePay;
      
      // Calculate Turkish taxes (daily proportional)
      const deductions = this.calculateTurkishDeductions(grossPay);
      const totalDeductions = deductions.incomeTax + deductions.stampTax + 
                              deductions.socialSecurityEmployee + deductions.unemploymentInsuranceEmployee;
      const netPay = grossPay - totalDeductions;
      
      // Update or create daily payroll record
      const existingDaily = await this.getDailyPayroll(userId, workDate);
      if (existingDaily) {
        await this.updateDailyPayroll(existingDaily.id, {
          actualHours: actualHours.toString(),
          overtimeHours: overtimeHours.toString(),
          workHours: actualHours.toString(),
          hourlyRate: hourlyRate.toString(),
          basePay: basePay.toString(),
          actualPay: grossPay.toString(),
          overtimePay: overtimePay.toString(),
          grossPay: grossPay.toString(),
          incomeTax: deductions.incomeTax.toString(),
          socialSecurity: deductions.socialSecurityEmployee.toString(),
          unemploymentInsurance: deductions.unemploymentInsuranceEmployee.toString(),
          netPay: netPay.toString(),
        });
      } else {
        await this.createDailyPayroll({
          userId,
          employeeId: employee.id,
          date: workDate,
          plannedHours: plannedDailyHours.toString(),
          actualHours: actualHours.toString(),
          overtimeHours: overtimeHours.toString(),
          workHours: actualHours.toString(),
          hourlyRate: hourlyRate.toString(),
          basePay: basePay.toString(),
          actualPay: grossPay.toString(),
          overtimePay: overtimePay.toString(),
          grossPay: grossPay.toString(),
          incomeTax: deductions.incomeTax.toString(),
          socialSecurity: deductions.socialSecurityEmployee.toString(),
          unemploymentInsurance: deductions.unemploymentInsuranceEmployee.toString(),
          netPay: netPay.toString(),
        });
      }
      
      // Auto-sync monthly payroll
      await this.syncMonthlyPayrollFromDaily(userId, employee.id, workDate);
      
      console.log(`Auto-calculated payroll for ${employee.firstName} ${employee.lastName}: ${actualHours.toFixed(2)}h, ${netPay.toFixed(2)} TL net`);
    } catch (error) {
      console.error("Error auto-calculating payroll:", error);
    }
  }

  // Synchronize monthly payroll based on daily records
  async syncMonthlyPayrollFromDaily(userId: string, employeeId: string, targetDate: Date): Promise<void> {
    try {
      // Validate input date
      if (!targetDate || isNaN(targetDate.getTime())) {
        console.error('Invalid target date for sync:', targetDate);
        return;
      }
      
      const month = targetDate.getMonth() + 1;
      const year = targetDate.getFullYear();
      
      // Get employee for rate calculation
      const employee = await this.getEmployee(employeeId);
      if (!employee) return;
      
      // Get all daily records for this month
      const dailyRecords = await this.getDailyPayrollByMonth(userId, month, year);
      
      if (dailyRecords.length === 0) {
        return; // No daily records to sync
      }
      
      // Calculate working days for the month
      const workingDays = this.calculateWorkingDays(month, year);
      const plannedMonthlyHours = parseFloat(employee.dailyWorkingHours || "8") * workingDays;
      
      // Calculate aggregated values from daily records
      const totalActualHours = dailyRecords.reduce((sum, record) => sum + (Number(record.actualHours) || 0), 0);
      const totalOvertimeHours = dailyRecords.reduce((sum, record) => sum + (Number(record.overtimeHours) || 0), 0);
      const totalBasePay = dailyRecords.reduce((sum, record) => sum + (Number(record.basePay) || 0), 0);
      const totalOvertimePay = dailyRecords.reduce((sum, record) => sum + (Number(record.overtimePay) || 0), 0);
      const totalGrossPay = dailyRecords.reduce((sum, record) => sum + (Number(record.grossPay) || 0), 0);
      
      // Recalculate monthly taxes based on total gross pay
      const monthlyDeductions = this.calculateTurkishDeductions(totalGrossPay);
      const totalDeductions = monthlyDeductions.incomeTax + monthlyDeductions.stampTax + 
                              monthlyDeductions.socialSecurityEmployee + monthlyDeductions.unemploymentInsuranceEmployee;
      const netSalary = totalGrossPay - totalDeductions;
      const totalEmployerCost = totalGrossPay + monthlyDeductions.socialSecurityEmployer + monthlyDeductions.unemploymentInsuranceEmployer;
      
      // Get hourly rate
      let hourlyRate = parseFloat(employee.hourlyRate || "0");
      if (hourlyRate === 0 && employee.monthlySalary) {
        hourlyRate = parseFloat(employee.monthlySalary) / (22 * parseFloat(employee.dailyWorkingHours || "8"));
      }
      if (hourlyRate === 0) {
        hourlyRate = 50;
      }
      
      const monthlyPayrollData = {
        userId,
        employeeId,
        month,
        year,
        workingDays: dailyRecords.length, // Actual working days
        plannedHours: plannedMonthlyHours,
        actualHours: totalActualHours,
        overtimeHours: totalOvertimeHours,
        hourlyRate: hourlyRate.toString(),
        basePay: totalBasePay,
        overtimePay: totalOvertimePay,
        grossSalary: totalGrossPay,
        incomeTax: monthlyDeductions.incomeTax,
        stampTax: monthlyDeductions.stampTax,
        socialSecurityEmployee: monthlyDeductions.socialSecurityEmployee,
        unemploymentInsuranceEmployee: monthlyDeductions.unemploymentInsuranceEmployee,
        totalDeductions,
        netSalary,
        socialSecurityEmployer: monthlyDeductions.socialSecurityEmployer,
        unemploymentInsuranceEmployer: monthlyDeductions.unemploymentInsuranceEmployer,
        totalEmployerCost,
      };
      
      // Update or create monthly payroll
      const existingMonthly = await this.getMonthlyPayroll(userId, month, year);
      if (existingMonthly) {
        await this.updateMonthlyPayroll(existingMonthly.id, {...monthlyPayrollData, plannedHours: monthlyPayrollData.plannedHours.toString(), actualHours: monthlyPayrollData.actualHours.toString(), overtimeHours: monthlyPayrollData.overtimeHours.toString(), basePay: monthlyPayrollData.basePay.toString(), overtimePay: monthlyPayrollData.overtimePay.toString(), grossSalary: monthlyPayrollData.grossSalary.toString(), netSalary: monthlyPayrollData.netSalary.toString(), totalEmployerCost: monthlyPayrollData.totalEmployerCost.toString(), incomeTax: monthlyPayrollData.incomeTax.toString(), stampTax: monthlyPayrollData.stampTax.toString(), socialSecurityEmployee: monthlyPayrollData.socialSecurityEmployee.toString(), unemploymentInsuranceEmployee: monthlyPayrollData.unemploymentInsuranceEmployee.toString(), totalDeductions: monthlyPayrollData.totalDeductions.toString(), socialSecurityEmployer: monthlyPayrollData.socialSecurityEmployer.toString(), unemploymentInsuranceEmployer: monthlyPayrollData.unemploymentInsuranceEmployer.toString()});
      } else {
        await this.createMonthlyPayroll({...monthlyPayrollData, hourlyRate: monthlyPayrollData.hourlyRate.toString(), plannedHours: monthlyPayrollData.plannedHours.toString(), actualHours: monthlyPayrollData.actualHours.toString(), overtimeHours: monthlyPayrollData.overtimeHours.toString(), basePay: monthlyPayrollData.basePay.toString(), overtimePay: monthlyPayrollData.overtimePay.toString(), grossSalary: monthlyPayrollData.grossSalary.toString(), netSalary: monthlyPayrollData.netSalary.toString(), totalEmployerCost: monthlyPayrollData.totalEmployerCost.toString(), incomeTax: monthlyPayrollData.incomeTax.toString(), stampTax: monthlyPayrollData.stampTax.toString(), socialSecurityEmployee: monthlyPayrollData.socialSecurityEmployee.toString(), unemploymentInsuranceEmployee: monthlyPayrollData.unemploymentInsuranceEmployee.toString(), totalDeductions: monthlyPayrollData.totalDeductions.toString(), socialSecurityEmployer: monthlyPayrollData.socialSecurityEmployer.toString(), unemploymentInsuranceEmployer: monthlyPayrollData.unemploymentInsuranceEmployer.toString()});
      }
      
      console.log(`Synced monthly payroll for ${employee.firstName} ${employee.lastName}: ${totalActualHours.toFixed(2)}h, ${netSalary.toFixed(2)} TL`);
    } catch (error) {
      console.error('Error syncing monthly payroll:', error);
    }
  }

  async calculateAndCreateDailyPayroll(employeeId: string, date: Date) {
    // Get employee data
    const employee = await this.getEmployee(employeeId);
    if (!employee) throw new Error("Employee not found");

    // Get work sessions for this employee on this date
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);

    const sessions = await db
      .select()
      .from(workSessions)
      .leftJoin(employees, eq(workSessions.userId, employees.userId))
      .where(and(
        eq(employees.id, employeeId),
        gte(workSessions.date, startOfDay),
        lte(workSessions.date, endOfDay)
      ));

    // Calculate actual hours from work sessions
    const actualHours = sessions.reduce((total, session) => {
      return total + (session.work_sessions.totalMinutes || 0) / 60;
    }, 0);

    const plannedHours = parseFloat(employee.dailyWorkingHours || "8");
    const overtimeHours = Math.max(0, actualHours - plannedHours);
    const regularHours = Math.min(actualHours, plannedHours);

    // Get hourly rate from employee profile or calculate from monthly salary
    let hourlyRate = parseFloat(employee.hourlyRate || "0");
    if (hourlyRate === 0 && employee.monthlySalary) {
      const monthlyWorkingDays = 22; // Standard Turkish working days per month
      hourlyRate = parseFloat(employee.monthlySalary) / (monthlyWorkingDays * plannedHours);
    }
    if (hourlyRate === 0) {
      hourlyRate = 50; // fallback default rate
    }

    // Calculate pay
    const basePay = regularHours * hourlyRate;
    const overtimePay = overtimeHours * hourlyRate * 1.5;
    const actualPay = actualHours * hourlyRate; // Actual pay = all actual hours * hourly rate
    const grossPay = basePay + overtimePay;

    // Calculate Turkish taxes (daily proportional)
    const incomeTax = grossPay * 0.15; // 15%
    const stampTax = grossPay * 0.00759; // 0.759%
    const socialSecurityEmployee = grossPay * 0.14; // 14%
    const unemploymentInsuranceEmployee = grossPay * 0.01; // 1%
    const totalDeductions = incomeTax + stampTax + socialSecurityEmployee + unemploymentInsuranceEmployee;
    const netPay = grossPay - totalDeductions;

    return await this.createDailyPayroll({
      userId: employee.userId || '',
      employeeId,
      date: startOfDay,
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
    });
  }

  // Helper methods for payroll and work time calculation

  async getMonthlyPayroll(userId: string, month: number, year: number): Promise<MonthlyPayroll | undefined> {
    const [payroll] = await db.select().from(monthlyPayroll).where(and(
      eq(monthlyPayroll.userId, userId),
      eq(monthlyPayroll.month, month),
      eq(monthlyPayroll.year, year)
    ));
    return payroll;
  }

  async getMonthlyPayrollByPeriod(month: number, year: number): Promise<MonthlyPayroll[]> {
    return await db
      .select()
      .from(monthlyPayroll)
      .where(and(
        eq(monthlyPayroll.month, month),
        eq(monthlyPayroll.year, year)
      ));
  }


  // Helper methods for user and employee management
  async getUserByReplit(replitUserId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, replitUserId));
    return user;
  }



  // Company settings operations
  async getCompanySettings(): Promise<CompanySettings | undefined> {
    const [settings] = await db.select().from(companySettings).limit(1);
    return settings;
  }

  async upsertCompanySettings(settingsData: InsertCompanySettings): Promise<CompanySettings> {
    // First try to get existing settings
    const existing = await this.getCompanySettings();
    
    if (existing) {
      // Update existing settings
      const [updated] = await db
        .update(companySettings)
        .set({
          ...settingsData,
          updatedAt: new Date(),
        })
        .where(eq(companySettings.id, existing.id))
        .returning();
      return updated;
    } else {
      // Create new settings
      const [created] = await db
        .insert(companySettings)
        .values(settingsData)
        .returning();
      return created;
    }
  }

  // RAG / Knowledge Base operations
  async searchKnowledge(searchTerms: string[], category?: string, limit: number = 10): Promise<KnowledgeBase[]> {
    let query = db.select().from(knowledgeBase)
      .where(eq(knowledgeBase.isActive, true))
      .orderBy(knowledgeBase.priority);

    if (category) {
      query = query.where(and(
        eq(knowledgeBase.isActive, true),
        eq(knowledgeBase.category, category)
      ));
    }

    return await query.limit(limit);
  }

  async searchFAQ(searchTerms: string[], limit: number = 10): Promise<FaqItem[]> {
    return await db.select().from(faqItems)
      .where(eq(faqItems.isActive, true))
      .orderBy(faqItems.viewCount)
      .limit(limit);
  }

  async searchServices(searchTerms: string[], limit: number = 10): Promise<Service[]> {
    return await db.select().from(services)
      .where(eq(services.isActive, true))
      .limit(limit);
  }

  async findResponseTemplate(question: string, context?: string): Promise<ResponseTemplate | undefined> {
    const [template] = await db.select().from(responseTemplates)
      .where(eq(responseTemplates.isActive, true))
      .limit(1);
    return template;
  }

  async incrementTemplateUsage(templateId: string): Promise<void> {
    await db.update(responseTemplates)
      .set({ usageCount: sql`${responseTemplates.usageCount} + 1` })
      .where(eq(responseTemplates.id, templateId));
  }

  // CRUD operations for Knowledge Base
  async getKnowledgeBase(category?: string): Promise<KnowledgeBase[]> {
    let query = db.select().from(knowledgeBase).orderBy(knowledgeBase.priority);
    
    if (category) {
      query = query.where(eq(knowledgeBase.category, category));
    }
    
    return await query;
  }

  async createKnowledge(data: InsertKnowledgeBase): Promise<KnowledgeBase> {
    const [knowledge] = await db.insert(knowledgeBase).values(data).returning();
    return knowledge;
  }

  async updateKnowledge(id: string, data: Partial<InsertKnowledgeBase>): Promise<KnowledgeBase> {
    const [knowledge] = await db.update(knowledgeBase)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(knowledgeBase.id, id))
      .returning();
    return knowledge;
  }

  async deleteKnowledge(id: string): Promise<void> {
    await db.delete(knowledgeBase).where(eq(knowledgeBase.id, id));
  }

  // === VOICE LEADS OPERATIONS ===

  async getVoiceLeads(filters?: {
    status?: string;
    isQualified?: boolean;
    assignedTo?: string;
    limit?: number;
  }): Promise<VoiceLead[]> {
    let query = db.select().from(voiceLeads).orderBy(voiceLeads.createdAt);
    
    if (filters?.status) {
      query = query.where(eq(voiceLeads.status, filters.status));
    }
    if (filters?.isQualified !== undefined) {
      query = query.where(eq(voiceLeads.isQualifiedLead, filters.isQualified));
    }
    if (filters?.assignedTo) {
      query = query.where(eq(voiceLeads.assignedTo, filters.assignedTo));
    }
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    
    return await query;
  }

  async getVoiceLeadById(id: string): Promise<VoiceLead | undefined> {
    const [lead] = await db.select().from(voiceLeads).where(eq(voiceLeads.id, id));
    return lead;
  }

  async createVoiceLead(data: Partial<InsertVoiceLead>): Promise<VoiceLead> {
    const [lead] = await db.insert(voiceLeads).values(data).returning();
    return lead;
  }

  async updateVoiceLead(id: string, data: Partial<InsertVoiceLead>): Promise<VoiceLead> {
    const [lead] = await db.update(voiceLeads)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(voiceLeads.id, id))
      .returning();
    return lead;
  }

  async assignVoiceLead(leadId: string, userId: string): Promise<VoiceLead> {
    return this.updateVoiceLead(leadId, { 
      assignedTo: userId,
      status: 'contacted'
    });
  }

  async convertVoiceLeadToClient(leadId: string, clientData: Partial<InsertClient>): Promise<{ lead: VoiceLead; client: Client }> {
    const lead = await this.getVoiceLeadById(leadId);
    if (!lead) {
      throw new Error('Voice lead not found');
    }

    // Create client from lead data
    const enrichedClientData = {
      ...clientData,
      name: clientData.name || lead.clientName || 'Unknown',
      notes: clientData.notes || `Created from voice lead. Needs: ${lead.clientNeeds}`,
      source: 'other',
      contactInfo: lead.messengerContact ? {
        type: lead.messengerType,
        value: lead.messengerContact
      } : undefined
    };

    const client = await this.createClient(enrichedClientData);
    
    // Update lead to reference the client
    const updatedLead = await this.updateVoiceLead(leadId, {
      clientId: client.id,
      status: 'converted'
    });

    return { lead: updatedLead, client };
  }

  async deleteVoiceLead(id: string): Promise<void> {
    await db.delete(voiceLeads).where(eq(voiceLeads.id, id));
  }

  async getVoiceLeadStats(): Promise<{
    total: number;
    qualified: number;
    converted: number;
    pending: number;
  }> {
    const allLeads = await this.getVoiceLeads();
    
    return {
      total: allLeads.length,
      qualified: allLeads.filter(l => l.isQualifiedLead).length,
      converted: allLeads.filter(l => l.status === 'converted').length,
      pending: allLeads.filter(l => l.status === 'new').length
    };
  }

  // Services operations
  async getServices(category?: string, activeOnly: boolean = true): Promise<Service[]> {
    let query = db.select().from(services);
    
    if (activeOnly) {
      query = query.where(eq(services.isActive, true));
    }
    
    if (category) {
      query = query.where(and(
        activeOnly ? eq(services.isActive, true) : sql`true`,
        eq(services.category, category)
      ));
    }
    
    return await query;
  }

  async createService(data: InsertService): Promise<Service> {
    const [service] = await db.insert(services).values(data).returning();
    return service;
  }

  async updateService(id: string, data: Partial<InsertService>): Promise<Service> {
    const [service] = await db.update(services)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(services.id, id))
      .returning();
    return service;
  }

  async deleteService(id: string): Promise<void> {
    await db.delete(services).where(eq(services.id, id));
  }

  // FAQ operations
  async getFAQ(category?: string): Promise<FaqItem[]> {
    let query = db.select().from(faqItems)
      .where(eq(faqItems.isActive, true))
      .orderBy(faqItems.viewCount);
    
    if (category) {
      query = query.where(and(
        eq(faqItems.isActive, true),
        eq(faqItems.category, category)
      ));
    }
    
    return await query;
  }

  async createFAQ(data: InsertFaqItem): Promise<FaqItem> {
    const [faq] = await db.insert(faqItems).values(data).returning();
    return faq;
  }

  async updateFAQ(id: string, data: Partial<InsertFaqItem>): Promise<FaqItem> {
    const [faq] = await db.update(faqItems)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(faqItems.id, id))
      .returning();
    return faq;
  }

  async deleteFAQ(id: string): Promise<void> {
    await db.delete(faqItems).where(eq(faqItems.id, id));
  }

  async incrementFAQView(id: string): Promise<void> {
    await db.update(faqItems)
      .set({ viewCount: sql`${faqItems.viewCount} + 1` })
      .where(eq(faqItems.id, id));
  }

  // Instagram Lead operations implementation
  async createInstagramLead(lead: InsertInstagramLead): Promise<InstagramLead> {
    const [created] = await db.insert(instagramLeads).values(lead).returning();
    console.log(`✅ Instagram лид сохранен в БД: ${created.instagramUsername}`);
    return created;
  }

  async getInstagramLeads(): Promise<InstagramLead[]> {
    return await db
      .select()
      .from(instagramLeads)
      .orderBy(desc(instagramLeads.createdAt));
  }

  async getInstagramLead(id: string): Promise<InstagramLead | undefined> {
    const result = await db
      .select()
      .from(instagramLeads)
      .where(eq(instagramLeads.id, id))
      .limit(1);
    return result[0];
  }

  async updateInstagramLead(id: string, data: Partial<InstagramLead>): Promise<InstagramLead> {
    const [updated] = await db
      .update(instagramLeads)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(instagramLeads.id, id))
      .returning();
    return updated;
  }

  async deleteInstagramLead(id: string): Promise<void> {
    await db.delete(instagramLeads).where(eq(instagramLeads.id, id));
  }
}

export const storage = new DatabaseStorage();
