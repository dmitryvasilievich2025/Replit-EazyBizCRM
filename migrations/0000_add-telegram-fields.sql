CREATE TYPE "public"."client_status" AS ENUM('new', 'contacted', 'qualified', 'opportunity', 'customer', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."deal_priority" AS ENUM('low', 'medium', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."deal_stage" AS ENUM('new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost');--> statement-breakpoint
CREATE TYPE "public"."interaction_type" AS ENUM('call', 'email', 'meeting', 'message', 'note', 'proposal');--> statement-breakpoint
CREATE TYPE "public"."lead_source" AS ENUM('instagram', 'website', 'referral', 'email', 'phone', 'other');--> statement-breakpoint
CREATE TYPE "public"."task_priority" AS ENUM('low', 'medium', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('open', 'in_progress', 'completed', 'overdue');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('demo', 'admin', 'director', 'manager', 'employee');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('pending', 'approved', 'rejected', 'active', 'inactive');--> statement-breakpoint
CREATE TABLE "ai_insights" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" varchar NOT NULL,
	"entity_id" varchar NOT NULL,
	"entity_type" varchar NOT NULL,
	"confidence" numeric(3, 2),
	"data" jsonb NOT NULL,
	"user_id" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "client_interactions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"deal_id" varchar,
	"type" "interaction_type" NOT NULL,
	"subject" varchar,
	"content" text,
	"duration" integer,
	"scheduled_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"email" varchar,
	"phone" varchar,
	"company" varchar,
	"instagram_username" varchar,
	"source" "lead_source" NOT NULL,
	"status" "client_status" DEFAULT 'new',
	"assigned_to" varchar NOT NULL,
	"created_by" varchar NOT NULL,
	"notes" text,
	"tags" text[],
	"last_contact_date" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "company_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_name" varchar,
	"website" varchar,
	"phone" varchar,
	"email" varchar,
	"address" text,
	"instagram" varchar,
	"facebook" varchar,
	"youtube" varchar,
	"twitter" varchar,
	"privacy_policy" text,
	"terms_of_service" text,
	"data_processing" text,
	"cookie_policy" text,
	"email_notifications" boolean DEFAULT true,
	"auto_save" boolean DEFAULT true,
	"dark_theme" boolean DEFAULT false,
	"analytics" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "daily_payroll" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"employee_id" varchar NOT NULL,
	"date" timestamp NOT NULL,
	"planned_hours" numeric(4, 2) NOT NULL,
	"actual_hours" numeric(4, 2) DEFAULT '0.00',
	"overtime_hours" numeric(4, 2) DEFAULT '0.00',
	"work_hours" numeric(4, 2) DEFAULT '0.00',
	"hourly_rate" numeric(8, 2) NOT NULL,
	"base_pay" numeric(10, 2) NOT NULL,
	"actual_pay" numeric(10, 2) DEFAULT '0.00',
	"overtime_pay" numeric(10, 2) DEFAULT '0.00',
	"gross_pay" numeric(10, 2) NOT NULL,
	"income_tax" numeric(10, 2) DEFAULT '0.00',
	"social_security" numeric(10, 2) DEFAULT '0.00',
	"unemployment_insurance" numeric(10, 2) DEFAULT '0.00',
	"net_pay" numeric(10, 2) NOT NULL,
	"is_workday" boolean DEFAULT true,
	"is_holiday" boolean DEFAULT false,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "deals" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar NOT NULL,
	"description" text,
	"client_id" varchar NOT NULL,
	"assigned_to" varchar NOT NULL,
	"created_by" varchar NOT NULL,
	"value" numeric(10, 2),
	"stage" "deal_stage" DEFAULT 'new',
	"priority" "deal_priority" DEFAULT 'medium',
	"probability" integer DEFAULT 0,
	"expected_close_date" timestamp,
	"actual_close_date" timestamp,
	"tags" text[],
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"first_name" varchar NOT NULL,
	"last_name" varchar NOT NULL,
	"email" varchar NOT NULL,
	"phone" varchar,
	"date_of_birth" timestamp,
	"role" "user_role" DEFAULT 'employee' NOT NULL,
	"profile_image_url" varchar,
	"hire_date" timestamp DEFAULT now(),
	"termination_date" timestamp,
	"is_active" boolean DEFAULT true,
	"monthly_salary" numeric(10, 2),
	"hourly_rate" numeric(8, 2),
	"daily_working_hours" numeric(4, 2) DEFAULT '8.00',
	"planned_daily_hours" numeric(4, 2) DEFAULT '8.00',
	"overtime_rate" numeric(4, 2) DEFAULT '1.50',
	"weekend_rate" numeric(4, 2) DEFAULT '1.25',
	"holiday_rate" numeric(4, 2) DEFAULT '2.00',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "employees_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "employees_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "faq_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"short_answer" text,
	"category" varchar,
	"service_id" varchar,
	"view_count" integer DEFAULT 0,
	"helpful_count" integer DEFAULT 0,
	"keywords" text[] DEFAULT '{}',
	"related_questions" text[] DEFAULT '{}',
	"is_active" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "instagram_analytics" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date_period" date NOT NULL,
	"period_type" varchar DEFAULT 'daily' NOT NULL,
	"new_messages_count" integer DEFAULT 0,
	"new_leads_count" integer DEFAULT 0,
	"converted_leads_count" integer DEFAULT 0,
	"response_rate" numeric(5, 2) DEFAULT '0.00',
	"avg_response_time_minutes" integer DEFAULT 0,
	"total_conversations" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "instagram_leads" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"instagram_user_id" varchar NOT NULL,
	"instagram_username" varchar NOT NULL,
	"full_name" varchar,
	"profile_picture_url" varchar,
	"source_type" varchar NOT NULL,
	"source_post_id" varchar,
	"source_comment_id" varchar,
	"message" text NOT NULL,
	"timestamp" timestamp with time zone NOT NULL,
	"status" varchar DEFAULT 'new' NOT NULL,
	"assigned_to" varchar,
	"client_id" varchar,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "instagram_messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"instagram_message_id" varchar,
	"sender_username" varchar NOT NULL,
	"sender_id" varchar,
	"message_content" text,
	"message_type" varchar DEFAULT 'text',
	"is_processed" boolean DEFAULT false,
	"client_id" varchar,
	"conversation_id" varchar,
	"received_at" timestamp DEFAULT now(),
	"processed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "instagram_messages_instagram_message_id_unique" UNIQUE("instagram_message_id")
);
--> statement-breakpoint
CREATE TABLE "knowledge_base" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar NOT NULL,
	"content" text NOT NULL,
	"category" varchar NOT NULL,
	"summary" text,
	"tags" text[] DEFAULT '{}',
	"is_active" boolean DEFAULT true,
	"is_public" boolean DEFAULT true,
	"priority" integer DEFAULT 0,
	"use_in_bot" boolean DEFAULT true,
	"auto_response" text,
	"created_by" varchar,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "lead_sources" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"type" "lead_source" NOT NULL,
	"is_active" boolean DEFAULT true,
	"api_config" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "message_templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_name" varchar NOT NULL,
	"template_content" text NOT NULL,
	"category" varchar DEFAULT 'general',
	"usage_count" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "monthly_payroll" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"employee_id" varchar NOT NULL,
	"month" integer NOT NULL,
	"year" integer NOT NULL,
	"working_days" integer NOT NULL,
	"planned_hours" numeric(6, 2) NOT NULL,
	"actual_hours" numeric(6, 2) DEFAULT '0.00',
	"overtime_hours" numeric(6, 2) DEFAULT '0.00',
	"hourly_rate" numeric(8, 2) NOT NULL,
	"base_pay" numeric(12, 2) NOT NULL,
	"overtime_pay" numeric(12, 2) DEFAULT '0.00',
	"gross_salary" numeric(12, 2) NOT NULL,
	"income_tax" numeric(10, 2) DEFAULT '0.00',
	"stamp_tax" numeric(10, 2) DEFAULT '0.00',
	"social_security_employee" numeric(10, 2) DEFAULT '0.00',
	"unemployment_insurance_employee" numeric(10, 2) DEFAULT '0.00',
	"total_deductions" numeric(10, 2) DEFAULT '0.00',
	"net_salary" numeric(12, 2) NOT NULL,
	"social_security_employer" numeric(10, 2) DEFAULT '0.00',
	"unemployment_insurance_employer" numeric(10, 2) DEFAULT '0.00',
	"total_employer_cost" numeric(12, 2) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "response_templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"trigger" text NOT NULL,
	"response" text NOT NULL,
	"type" varchar NOT NULL,
	"service_id" varchar,
	"context" varchar,
	"usage_count" integer DEFAULT 0,
	"success_rate" numeric(5, 2) DEFAULT '0.00',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"detailed_description" text,
	"price_from" numeric(10, 2),
	"price_to" numeric(10, 2),
	"price_description" text,
	"duration" integer,
	"category" varchar,
	"images" text[] DEFAULT '{}',
	"video_url" varchar,
	"keywords" text[] DEFAULT '{}',
	"search_terms" text[] DEFAULT '{}',
	"is_active" boolean DEFAULT true,
	"is_popular" boolean DEFAULT false,
	"is_new" boolean DEFAULT false,
	"is_bookable" boolean DEFAULT true,
	"requires_consultation" boolean DEFAULT false,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar NOT NULL,
	"description" text,
	"assigned_to" varchar NOT NULL,
	"created_by" varchar NOT NULL,
	"client_id" varchar,
	"deal_id" varchar,
	"status" "task_status" DEFAULT 'open',
	"priority" "task_priority" DEFAULT 'medium',
	"due_date" timestamp,
	"completed_at" timestamp,
	"reminder_date" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "turkish_holidays" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" timestamp NOT NULL,
	"name" varchar NOT NULL,
	"type" varchar NOT NULL,
	"is_workday" boolean DEFAULT false,
	"pay_multiplier" numeric(3, 2) DEFAULT '2.00',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"role" "user_role" DEFAULT 'demo',
	"is_active" boolean DEFAULT true,
	"start_date" timestamp DEFAULT now(),
	"telegram_user_id" varchar,
	"telegram_username" varchar,
	"telegram_first_name" varchar,
	"telegram_last_name" varchar,
	"registration_status" "user_status" DEFAULT 'pending',
	"approved_by" varchar,
	"approved_at" timestamp,
	"registration_source" varchar DEFAULT 'telegram',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_telegram_user_id_unique" UNIQUE("telegram_user_id")
);
--> statement-breakpoint
CREATE TABLE "work_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"login_time" timestamp NOT NULL,
	"logout_time" timestamp,
	"total_minutes" integer,
	"date" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "ai_insights" ADD CONSTRAINT "ai_insights_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_interactions" ADD CONSTRAINT "client_interactions_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_interactions" ADD CONSTRAINT "client_interactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_interactions" ADD CONSTRAINT "client_interactions_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_payroll" ADD CONSTRAINT "daily_payroll_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_payroll" ADD CONSTRAINT "daily_payroll_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_assigned_to_employees_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faq_items" ADD CONSTRAINT "faq_items_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instagram_leads" ADD CONSTRAINT "instagram_leads_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instagram_leads" ADD CONSTRAINT "instagram_leads_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instagram_messages" ADD CONSTRAINT "instagram_messages_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_base" ADD CONSTRAINT "knowledge_base_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_payroll" ADD CONSTRAINT "monthly_payroll_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_payroll" ADD CONSTRAINT "monthly_payroll_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "response_templates" ADD CONSTRAINT "response_templates_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigned_to_employees_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_sessions" ADD CONSTRAINT "work_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");