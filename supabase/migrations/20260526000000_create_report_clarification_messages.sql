-- Create report_clarification_messages table to support Admin-Supervisor communication
CREATE TABLE IF NOT EXISTS public.report_clarification_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.pending_daily_reports(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_name TEXT NOT NULL,
  sender_role TEXT NOT NULL, -- 'admin' or 'supervisor'
  message TEXT NOT NULL,
  item_type TEXT, -- e.g., 'fuel_expenses', 'travel_expenses', 'room_rent', 'tool_rent', 'other_expenses', 'wip_progress'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Disable Row Level Security to conform with other daily report tables
ALTER TABLE public.report_clarification_messages DISABLE ROW LEVEL SECURITY;

-- Grant permissions to anonymous, authenticated, and service roles
GRANT ALL ON public.report_clarification_messages TO anon, authenticated, service_role;
