-- Kolom status aktif untuk menonaktifkan akun (pengganti hapus akun yang butuh admin API)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Hitung jumlah sekolah (untuk layar inisialisasi), aman dipanggil tanpa login
CREATE OR REPLACE FUNCTION public.school_count()
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::int FROM public.schools
$$;

-- Inisialisasi sekali: buat sekolah pertama + profil & peran admin.
-- Hanya berjalan bila belum ada sekolah sama sekali.
CREATE OR REPLACE FUNCTION public.bootstrap_school(
  p_user_id uuid,
  p_school_name text,
  p_admin_name text,
  p_nomor_induk text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_school_id uuid;
BEGIN
  IF (SELECT count(*) FROM public.schools) > 0 THEN
    RAISE EXCEPTION 'Sistem sudah diinisialisasi.';
  END IF;

  INSERT INTO public.schools (name) VALUES (p_school_name) RETURNING id INTO v_school_id;

  INSERT INTO public.profiles (id, school_id, nomor_induk, full_name)
  VALUES (p_user_id, v_school_id, btrim(p_nomor_induk), p_admin_name);

  INSERT INTO public.user_roles (user_id, role, school_id)
  VALUES (p_user_id, 'admin', v_school_id);

  RETURN v_school_id;
END;
$$;

-- Admin membuat akun Guru/Siswa/Admin di sekolahnya sendiri.
-- Dipanggil oleh sesi admin yang login (auth.uid() = admin).
CREATE OR REPLACE FUNCTION public.admin_create_user(
  p_user_id uuid,
  p_full_name text,
  p_nomor_induk text,
  p_role app_role,
  p_disability disability_type DEFAULT 'none'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_school_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Hanya admin sekolah yang dapat membuat akun.';
  END IF;

  SELECT school_id INTO v_school_id FROM public.profiles WHERE id = auth.uid();
  IF v_school_id IS NULL THEN
    RAISE EXCEPTION 'Profil admin tidak ditemukan.';
  END IF;

  INSERT INTO public.profiles (id, school_id, nomor_induk, full_name, disability)
  VALUES (p_user_id, v_school_id, btrim(p_nomor_induk), p_full_name, p_disability);

  INSERT INTO public.user_roles (user_id, role, school_id)
  VALUES (p_user_id, p_role, v_school_id);
END;
$$;

-- Admin mengaktifkan / menonaktifkan akun di sekolahnya.
CREATE OR REPLACE FUNCTION public.admin_set_user_active(
  p_user_id uuid,
  p_active boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_school uuid;
  v_target_school uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Hanya admin sekolah yang dapat mengubah status akun.';
  END IF;
  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Anda tidak dapat menonaktifkan akun sendiri.';
  END IF;

  SELECT school_id INTO v_admin_school FROM public.profiles WHERE id = auth.uid();
  SELECT school_id INTO v_target_school FROM public.profiles WHERE id = p_user_id;

  IF v_target_school IS NULL OR v_admin_school IS DISTINCT FROM v_target_school THEN
    RAISE EXCEPTION 'Pengguna tidak ditemukan di sekolah Anda.';
  END IF;

  UPDATE public.profiles SET is_active = p_active WHERE id = p_user_id;
END;
$$;

-- Hak akses fungsi
REVOKE ALL ON FUNCTION public.school_count() FROM public;
REVOKE ALL ON FUNCTION public.bootstrap_school(uuid, text, text, text) FROM public;
REVOKE ALL ON FUNCTION public.admin_create_user(uuid, text, text, app_role, disability_type) FROM public;
REVOKE ALL ON FUNCTION public.admin_set_user_active(uuid, boolean) FROM public;

GRANT EXECUTE ON FUNCTION public.school_count() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bootstrap_school(uuid, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_user(uuid, text, text, app_role, disability_type) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_user_active(uuid, boolean) TO authenticated;