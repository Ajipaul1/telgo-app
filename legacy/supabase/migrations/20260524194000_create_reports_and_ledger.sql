-- Create pending_daily_reports table
CREATE TABLE IF NOT EXISTS public.pending_daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date DATE NOT NULL,
  project_id TEXT NOT NULL,
  supervisor_id UUID NOT NULL,
  supervisor_name TEXT NOT NULL,
  labor_count INT NOT NULL DEFAULT 0,
  ot_hours INT NOT NULL DEFAULT 0,
  calculated_wages DECIMAL(12,2) NOT NULL DEFAULT 0,
  fuel_expenses DECIMAL(12,2) NOT NULL DEFAULT 0,
  travel_expenses DECIMAL(12,2) NOT NULL DEFAULT 0,
  room_rent DECIMAL(12,2) NOT NULL DEFAULT 0,
  room_rent_receipt TEXT,
  tool_rent DECIMAL(12,2) NOT NULL DEFAULT 0,
  tool_rent_receipt TEXT,
  excavation_length DECIMAL(10,2) NOT NULL DEFAULT 0,
  hdd_length DECIMAL(10,2) NOT NULL DEFAULT 0,
  cable_laying_length DECIMAL(10,2) NOT NULL DEFAULT 0,
  cable_mounding_length DECIMAL(10,2) NOT NULL DEFAULT 0,
  joining_links_completed INT NOT NULL DEFAULT 0,
  rmu_foundation_status INT NOT NULL DEFAULT 0,
  termination_endpoints INT NOT NULL DEFAULT 0,
  termination_gps_lat DECIMAL(9,6),
  termination_gps_lng DECIMAL(9,6),
  stock_available JSONB DEFAULT '{}'::jsonb,
  clearances JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  approved_at TIMESTAMP WITH TIME ZONE
);

-- Create master_project_ledger table
CREATE TABLE IF NOT EXISTS public.master_project_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ledger_date DATE NOT NULL,
  project_id TEXT NOT NULL,
  total_labor_count INT NOT NULL DEFAULT 0,
  total_ot_hours INT NOT NULL DEFAULT 0,
  total_wages DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_fuel DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_travel DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_room_rent DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_tool_rent DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_excavation DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_hdd DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_cable_laying DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_cable_mounding DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_joining_links INT NOT NULL DEFAULT 0,
  total_rmu_foundations INT NOT NULL DEFAULT 0,
  total_terminations INT NOT NULL DEFAULT 0,
  approved_reports_count INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT unique_ledger_date_project UNIQUE (ledger_date, project_id)
);

-- Disable Row Level Security to let server-side Next.js API route handle access logic cleanly
ALTER TABLE public.pending_daily_reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_project_ledger DISABLE ROW LEVEL SECURITY;

-- Grant permissions to anon, authenticated and service_role
GRANT ALL ON public.pending_daily_reports TO anon, authenticated, service_role;
GRANT ALL ON public.master_project_ledger TO anon, authenticated, service_role;
