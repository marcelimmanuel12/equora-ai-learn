
CREATE TABLE public.meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL,
  code text NOT NULL UNIQUE,
  title text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX meetings_class_idx ON public.meetings(class_id);
CREATE INDEX meetings_code_idx ON public.meetings(code);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.meetings TO authenticated;
GRANT ALL ON public.meetings TO service_role;

ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers manage class meetings"
ON public.meetings FOR ALL
TO authenticated
USING (public.teaches_class(class_id))
WITH CHECK (public.teaches_class(class_id) AND teacher_id = auth.uid());

CREATE POLICY "Enrolled students view meetings"
ON public.meetings FOR SELECT
TO authenticated
USING (public.is_enrolled(class_id) OR public.teaches_class(class_id));

CREATE TRIGGER update_meetings_updated_at
BEFORE UPDATE ON public.meetings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
