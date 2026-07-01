
-- ========== ROLES ENUM ==========
CREATE TYPE public.app_role AS ENUM ('admin', 'guru', 'siswa');
CREATE TYPE public.disability_type AS ENUM ('none', 'tunarungu', 'tunawicara', 'tunanetra', 'buta_warna');
CREATE TYPE public.subscription_package AS ENUM ('basic', 'pro', 'enterprise');
CREATE TYPE public.assessment_type AS ENUM ('kuis', 'tugas', 'ujian', 'game');

-- ========== SCHOOLS ==========
CREATE TABLE public.schools (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  subscription subscription_package NOT NULL DEFAULT 'basic',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.schools TO authenticated;
GRANT ALL ON public.schools TO service_role;
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

-- ========== PROFILES ==========
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  nomor_induk TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  disability disability_type NOT NULL DEFAULT 'none',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ========== USER ROLES ==========
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ========== HELPER FUNCTIONS ==========
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.current_school_id()
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT school_id FROM public.profiles WHERE id = auth.uid()
$$;

-- ========== SUBJECTS (mata pelajaran) ==========
CREATE TABLE public.subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subjects TO authenticated;
GRANT ALL ON public.subjects TO service_role;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

-- ========== CLASSES (kelas) ==========
CREATE TABLE public.classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  grade_level INT,
  homeroom_teacher_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.classes TO authenticated;
GRANT ALL ON public.classes TO service_role;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- ========== CLASS ENROLLMENTS (siswa dalam kelas) ==========
CREATE TABLE public.class_enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (class_id, student_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_enrollments TO authenticated;
GRANT ALL ON public.class_enrollments TO service_role;
ALTER TABLE public.class_enrollments ENABLE ROW LEVEL SECURITY;

-- ========== CLASS TEACHERS (guru mengajar kelas + mapel) ==========
CREATE TABLE public.class_teachers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (class_id, subject_id, teacher_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_teachers TO authenticated;
GRANT ALL ON public.class_teachers TO service_role;
ALTER TABLE public.class_teachers ENABLE ROW LEVEL SECURITY;

-- helper: is user enrolled in class
CREATE OR REPLACE FUNCTION public.is_enrolled(_class_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.class_enrollments WHERE class_id = _class_id AND student_id = auth.uid())
$$;

-- helper: does user teach class
CREATE OR REPLACE FUNCTION public.teaches_class(_class_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.class_teachers WHERE class_id = _class_id AND teacher_id = auth.uid()
    UNION
    SELECT 1 FROM public.classes WHERE id = _class_id AND homeroom_teacher_id = auth.uid()
  )
$$;

-- ========== MATERIALS (materi) ==========
CREATE TABLE public.materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  file_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.materials TO authenticated;
GRANT ALL ON public.materials TO service_role;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

-- ========== ASSESSMENTS (kuis/tugas/ujian/game) ==========
CREATE TABLE public.assessments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  type assessment_type NOT NULL DEFAULT 'kuis',
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessments TO authenticated;
GRANT ALL ON public.assessments TO service_role;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;

-- ========== SUBMISSIONS (hasil pengerjaan siswa) ==========
CREATE TABLE public.submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  score NUMERIC,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (assessment_id, student_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.submissions TO authenticated;
GRANT ALL ON public.submissions TO service_role;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- ========== ATTENDANCE (absensi) ==========
CREATE TABLE public.attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'hadir',
  method TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (class_id, student_id, date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance TO authenticated;
GRANT ALL ON public.attendance TO service_role;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- ========================================================
-- RLS POLICIES
-- ========================================================

-- SCHOOLS
CREATE POLICY "school members view own school" ON public.schools FOR SELECT TO authenticated
  USING (id = public.current_school_id());
CREATE POLICY "admin updates own school" ON public.schools FOR UPDATE TO authenticated
  USING (id = public.current_school_id() AND public.has_role(auth.uid(), 'admin'));

-- PROFILES
CREATE POLICY "view profiles in same school" ON public.profiles FOR SELECT TO authenticated
  USING (school_id = public.current_school_id());
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid());
CREATE POLICY "admin manages profiles in school" ON public.profiles FOR ALL TO authenticated
  USING (school_id = public.current_school_id() AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (school_id = public.current_school_id() AND public.has_role(auth.uid(), 'admin'));

-- USER ROLES
CREATE POLICY "view roles in same school" ON public.user_roles FOR SELECT TO authenticated
  USING (school_id = public.current_school_id());

-- SUBJECTS
CREATE POLICY "view subjects in school" ON public.subjects FOR SELECT TO authenticated
  USING (school_id = public.current_school_id());
CREATE POLICY "admin manages subjects" ON public.subjects FOR ALL TO authenticated
  USING (school_id = public.current_school_id() AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (school_id = public.current_school_id() AND public.has_role(auth.uid(), 'admin'));

-- CLASSES
CREATE POLICY "view classes in school" ON public.classes FOR SELECT TO authenticated
  USING (school_id = public.current_school_id());
CREATE POLICY "admin manages classes" ON public.classes FOR ALL TO authenticated
  USING (school_id = public.current_school_id() AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (school_id = public.current_school_id() AND public.has_role(auth.uid(), 'admin'));

-- CLASS ENROLLMENTS
CREATE POLICY "view enrollments in school" ON public.class_enrollments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_id AND c.school_id = public.current_school_id()));
CREATE POLICY "admin manages enrollments" ON public.class_enrollments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_id AND c.school_id = public.current_school_id()))
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_id AND c.school_id = public.current_school_id()));

-- CLASS TEACHERS
CREATE POLICY "view class teachers in school" ON public.class_teachers FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_id AND c.school_id = public.current_school_id()));
CREATE POLICY "admin manages class teachers" ON public.class_teachers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_id AND c.school_id = public.current_school_id()))
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_id AND c.school_id = public.current_school_id()));

-- MATERIALS
CREATE POLICY "view materials by enrolled or teacher or admin" ON public.materials FOR SELECT TO authenticated
  USING (
    public.is_enrolled(class_id) OR public.teaches_class(class_id)
    OR (public.has_role(auth.uid(), 'admin') AND EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_id AND c.school_id = public.current_school_id()))
  );
CREATE POLICY "teacher manages own materials" ON public.materials FOR ALL TO authenticated
  USING (teaches_class(class_id) AND teacher_id = auth.uid())
  WITH CHECK (teaches_class(class_id) AND teacher_id = auth.uid());

-- ASSESSMENTS
CREATE POLICY "view assessments by enrolled or teacher or admin" ON public.assessments FOR SELECT TO authenticated
  USING (
    public.is_enrolled(class_id) OR public.teaches_class(class_id)
    OR (public.has_role(auth.uid(), 'admin') AND EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_id AND c.school_id = public.current_school_id()))
  );
CREATE POLICY "teacher manages own assessments" ON public.assessments FOR ALL TO authenticated
  USING (teaches_class(class_id) AND teacher_id = auth.uid())
  WITH CHECK (teaches_class(class_id) AND teacher_id = auth.uid());

-- SUBMISSIONS
CREATE POLICY "student manages own submissions" ON public.submissions FOR ALL TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid() AND public.is_enrolled((SELECT class_id FROM public.assessments WHERE id = assessment_id)));
CREATE POLICY "teacher views submissions for their assessments" ON public.submissions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.assessments a WHERE a.id = assessment_id AND public.teaches_class(a.class_id)));
CREATE POLICY "teacher grades submissions" ON public.submissions FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.assessments a WHERE a.id = assessment_id AND public.teaches_class(a.class_id)));
CREATE POLICY "admin views submissions in school" ON public.submissions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND EXISTS (
    SELECT 1 FROM public.assessments a JOIN public.classes c ON c.id = a.class_id
    WHERE a.id = assessment_id AND c.school_id = public.current_school_id()));

-- ATTENDANCE
CREATE POLICY "student views own attendance" ON public.attendance FOR SELECT TO authenticated
  USING (student_id = auth.uid());
CREATE POLICY "student marks own attendance" ON public.attendance FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid() AND public.is_enrolled(class_id));
CREATE POLICY "teacher manages attendance" ON public.attendance FOR ALL TO authenticated
  USING (public.teaches_class(class_id))
  WITH CHECK (public.teaches_class(class_id));
CREATE POLICY "admin views attendance in school" ON public.attendance FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_id AND c.school_id = public.current_school_id()));
