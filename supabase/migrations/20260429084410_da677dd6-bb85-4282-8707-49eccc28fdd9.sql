
-- STUDENTS
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL DEFAULT '',
  birth_date DATE,
  birth_place TEXT NOT NULL DEFAULT '',
  school TEXT NOT NULL DEFAULT '',
  class_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- CHECKLIST ITEMS
CREATE TABLE public.checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  category TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- DAILY RECORDS (one row per student/day, JSONB map of itemId -> bool)
CREATE TABLE public.daily_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_date DATE NOT NULL,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  checks JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (record_date, student_id)
);

CREATE INDEX idx_daily_records_date ON public.daily_records(record_date);
CREATE INDEX idx_daily_records_student ON public.daily_records(student_id);

-- RLS — public open access (no auth)
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read students"   ON public.students       FOR SELECT USING (true);
CREATE POLICY "public write students"  ON public.students       FOR INSERT WITH CHECK (true);
CREATE POLICY "public update students" ON public.students       FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "public delete students" ON public.students       FOR DELETE USING (true);

CREATE POLICY "public read items"   ON public.checklist_items   FOR SELECT USING (true);
CREATE POLICY "public write items"  ON public.checklist_items   FOR INSERT WITH CHECK (true);
CREATE POLICY "public update items" ON public.checklist_items   FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "public delete items" ON public.checklist_items   FOR DELETE USING (true);

CREATE POLICY "public read records"   ON public.daily_records   FOR SELECT USING (true);
CREATE POLICY "public write records"  ON public.daily_records   FOR INSERT WITH CHECK (true);
CREATE POLICY "public update records" ON public.daily_records   FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "public delete records" ON public.daily_records   FOR DELETE USING (true);

-- updated_at trigger for daily_records
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER trg_daily_records_touch
BEFORE UPDATE ON public.daily_records
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Realtime
ALTER TABLE public.students        REPLICA IDENTITY FULL;
ALTER TABLE public.checklist_items REPLICA IDENTITY FULL;
ALTER TABLE public.daily_records   REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.students;
ALTER PUBLICATION supabase_realtime ADD TABLE public.checklist_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_records;
