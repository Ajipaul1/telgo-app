-- Add HDD configuration columns to projects table
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS hdd_default_machine_name TEXT,
ADD COLUMN IF NOT EXISTS hdd_default_vendor_name TEXT,
ADD COLUMN IF NOT EXISTS hdd_default_tracker_name TEXT,
ADD COLUMN IF NOT EXISTS hdd_default_operator_name TEXT,
ADD COLUMN IF NOT EXISTS hdd_default_ducts_info TEXT,
ADD COLUMN IF NOT EXISTS hdd_default_rod_length_m NUMERIC DEFAULT 3.0;

-- Add HDD logs and metadata columns to pending_daily_reports table
ALTER TABLE public.pending_daily_reports 
ADD COLUMN IF NOT EXISTS hdd_drilling_logs JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS hdd_metadata JSONB DEFAULT '{}'::jsonb;
