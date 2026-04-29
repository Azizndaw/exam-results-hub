
-- CLASSES
CREATE TABLE public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- SUBJECTS (per class)
CREATE TABLE public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  coefficient NUMERIC(4,2) NOT NULL DEFAULT 1,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_subjects_class ON public.subjects(class_id);

-- EXAM SESSIONS
CREATE TABLE public.exam_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sessions_class ON public.exam_sessions(class_id);

-- GRADES
CREATE TABLE public.grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.exam_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  score NUMERIC(5,2),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, student_id, subject_id)
);
CREATE INDEX idx_grades_session ON public.grades(session_id);
CREATE INDEX idx_grades_student ON public.grades(student_id);

-- ROOM CHECKLIST ITEMS
CREATE TABLE public.room_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  category TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ROOM CHECKLIST RECORDS (per class/room per day)
CREATE TABLE public.room_checklist_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_date DATE NOT NULL,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  room_label TEXT NOT NULL DEFAULT '',
  checks JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (record_date, class_id, room_label)
);
CREATE INDEX idx_room_records_date ON public.room_checklist_records(record_date);

-- Add class_id to students
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_students_class ON public.students(class_id);

-- updated_at triggers
CREATE TRIGGER trg_grades_touch BEFORE UPDATE ON public.grades
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_room_records_touch BEFORE UPDATE ON public.room_checklist_records
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- RLS — public open access (no auth, base partagée)
ALTER TABLE public.classes               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_sessions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_checklist_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_checklist_records ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['classes','subjects','exam_sessions','grades','room_checklist_items','room_checklist_records']
  LOOP
    EXECUTE format('CREATE POLICY "public read %1$s"   ON public.%1$I FOR SELECT USING (true)', t);
    EXECUTE format('CREATE POLICY "public write %1$s"  ON public.%1$I FOR INSERT WITH CHECK (true)', t);
    EXECUTE format('CREATE POLICY "public update %1$s" ON public.%1$I FOR UPDATE USING (true) WITH CHECK (true)', t);
    EXECUTE format('CREATE POLICY "public delete %1$s" ON public.%1$I FOR DELETE USING (true)', t);
  END LOOP;
END $$;

-- Realtime
ALTER TABLE public.classes               REPLICA IDENTITY FULL;
ALTER TABLE public.subjects              REPLICA IDENTITY FULL;
ALTER TABLE public.exam_sessions         REPLICA IDENTITY FULL;
ALTER TABLE public.grades                REPLICA IDENTITY FULL;
ALTER TABLE public.room_checklist_items  REPLICA IDENTITY FULL;
ALTER TABLE public.room_checklist_records REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.classes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.subjects;
ALTER PUBLICATION supabase_realtime ADD TABLE public.exam_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.grades;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_checklist_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_checklist_records;
