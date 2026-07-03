CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.schedules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  teacher_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  title text,
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  start_time time NOT NULL,
  end_time time NOT NULL,
  location text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.schedules TO authenticated;
GRANT ALL ON public.schedules TO service_role;

ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "School members can view schedules"
  ON public.schedules FOR SELECT
  TO authenticated
  USING (school_id = public.current_school_id());

CREATE POLICY "Teachers and admins can insert schedules"
  ON public.schedules FOR INSERT
  TO authenticated
  WITH CHECK (
    school_id = public.current_school_id()
    AND (public.has_role(auth.uid(), 'admin') OR public.teaches_class(class_id))
  );

CREATE POLICY "Teachers and admins can update schedules"
  ON public.schedules FOR UPDATE
  TO authenticated
  USING (
    school_id = public.current_school_id()
    AND (public.has_role(auth.uid(), 'admin') OR public.teaches_class(class_id))
  )
  WITH CHECK (
    school_id = public.current_school_id()
    AND (public.has_role(auth.uid(), 'admin') OR public.teaches_class(class_id))
  );

CREATE POLICY "Teachers and admins can delete schedules"
  ON public.schedules FOR DELETE
  TO authenticated
  USING (
    school_id = public.current_school_id()
    AND (public.has_role(auth.uid(), 'admin') OR public.teaches_class(class_id))
  );

CREATE TRIGGER update_schedules_updated_at
  BEFORE UPDATE ON public.schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();