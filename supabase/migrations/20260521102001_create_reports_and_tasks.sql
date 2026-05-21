-- MISSION PHASE 1: Supabase Database Schema for Reports & Tasks
-- Create the enumeration for task status
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');

-- Create the shift_reports table
CREATE TABLE
  "public"."shift_reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid (),
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "user_id" UUID NOT NULL DEFAULT auth.uid (),
    "project_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "location" GEOGRAPHY (POINT, 4326) NOT NULL,
    CONSTRAINT "shift_reports_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "shift_reports_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE,
    CONSTRAINT "shift_reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users" ("id") ON DELETE CASCADE
  ) TABLESPACE "pg_default";

-- Create the tasks table
CREATE TABLE
  "public"."tasks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid (),
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "assigned_by" UUID NOT NULL DEFAULT auth.uid (),
    "assigned_to" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" task_status NOT NULL DEFAULT 'pending',
    "due_date" DATE,
    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "tasks_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "auth"."users" ("id") ON DELETE CASCADE,
    CONSTRAINT "tasks_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "auth"."users" ("id") ON DELETE CASCADE,
    CONSTRAINT "tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE
  ) TABLESPACE "pg_default";

-- Enable Row Level Security for both tables
ALTER TABLE "public"."shift_reports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."tasks" ENABLE ROW LEVEL SECURITY;

-- RLS Policies for shift_reports
CREATE POLICY "Admins have full access to shift reports" ON "public"."shift_reports" FOR ALL
USING (get_my_claim('user_role') = 'admin'::text)
WITH CHECK (get_my_claim('user_role') = 'admin'::text);

CREATE POLICY "Engineers and Supervisors can create their own shift reports" ON "public"."shift_reports" FOR INSERT
WITH CHECK ((get_my_claim('user_role') = 'engineer'::text OR get_my_claim('user_role') = 'supervisor'::text) AND (user_id = auth.uid()));

CREATE POLICY "Engineers and Supervisors can view their own shift reports" ON "public"."shift_reports" FOR SELECT
USING ((get_my_claim('user_role') = 'engineer'::text OR get_my_claim('user_role') = 'supervisor'::text) AND (user_id = auth.uid()));

-- RLS Policies for tasks
CREATE POLICY "Admins have full access to tasks" ON "public"."tasks" FOR ALL
USING (get_my_claim('user_role') = 'admin'::text)
WITH CHECK (get_my_claim('user_role') = 'admin'::text);

CREATE POLICY "Supervisors can assign tasks" ON "public"."tasks" FOR INSERT
WITH CHECK (get_my_claim('user_role') = 'supervisor'::text AND assigned_by = auth.uid());

CREATE POLICY "Engineers and Supervisors can view tasks assigned to them" ON "public"."tasks" FOR SELECT
USING ((get_my_claim('user_role') = 'engineer'::text OR get_my_claim('user_role') = 'supervisor'::text) AND (assigned_to = auth.uid()));

CREATE POLICY "Supervisors can view tasks they assigned" ON "public"."tasks" FOR SELECT
USING (get_my_claim('user_role') = 'supervisor'::text AND assigned_by = auth.uid());
