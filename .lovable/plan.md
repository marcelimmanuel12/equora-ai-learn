# Rencana: Buat `design.md`

Dokumen ini akan menjadi single-source-of-truth desain visual & aksesibilitas Equora, ditaruh di root repo (`design.md`) supaya mudah dirujuk saat membangun fitur baru (Meeting, Ujian, Vision, dsb).

## Struktur dokumen

1. **Identitas Produk**
   - Nama, tagline, misi (E-Learning inklusif berbasis AI untuk sekolah inklusi SD/SMP/SMA).
   - Prinsip desain: Inklusif, Tenang, Profesional, Konsisten, WCAG 2.1 AA.

2. **Design Language — "Soft-slate biru"**
   - Palet warna semantik (token dari `src/styles.css`): primary navy `#1E3A8A`, accent blue `#2563EB`, background slate `#F8FAFC`, plus foreground/muted/border/destructive/success/warning.
   - Format token: `oklch(...)` di `:root`, dengan varian `.dark`, `.hc`, `.cb`.
   - Aturan keras: **tidak ada** kelas warna hardcoded (`text-white`, `bg-black`, `bg-[#...]`) di komponen.

3. **Tipografi**
   - Font: **Lexend** (heading + body) via `<link>` di `__root.tsx`.
   - Skala: h1 2.25rem / h2 1.875rem / h3 1.5rem / body 1rem / small 0.875rem.
   - Line-height & tracking untuk keterbacaan disleksia.
   - Skala teks dinamis via `data-text-scale` (sm/md/lg/xl) dari AccessibilityToolbar.

4. **Spacing, Radius, Shadow, Motion**
   - Skala spacing 4px base, radius `--radius: 0.75rem`, shadow lembut ber-token.
   - Motion: durasi 150–250ms, easing standar, respek `prefers-reduced-motion`.

5. **Mode Aksesibilitas**
   - **Dark** (`.dark`): warna gelap tenang, kontras tetap AA.
   - **High Contrast** (`.hc`): hitam/kuning maksimum legibilitas, border tebal.
   - **Color Blind** (`.cb`): palet biru/oranye aman Deuteranopia/Protanopia.
   - **Text scale** (`data-text-scale`): 100/115/130/150%.
   - Semua disimpan di `localStorage`, diterapkan sebagai class di `<html>`.

6. **Komponen Inti**
   - shadcn/ui + variant custom (Button `premium`, Card, Dialog, Sidebar, Toast).
   - Pola: `SidebarShell` untuk dashboard, `AccessibilityToolbar` tetap ada di semua route.

7. **Pola Layout**
   - Landing: hero + fitur + ekosistem + pricing.
   - Dashboard: sidebar kiri (desktop) / drawer + tab horizontal (mobile).
   - Form: label di atas, error di bawah, ikon status jelas.

8. **Ikon & Ilustrasi**
   - `lucide-react` sebagai ikon utama, ukuran 16/20/24.
   - Ilustrasi: gaya flat lembut, tanpa emoji dekoratif di UI.

9. **Aksesibilitas Teknis (WCAG 2.1 AA)**
   - Kontras minimum 4.5:1 (teks) / 3:1 (UI).
   - Fokus terlihat (`focus-visible` ring 2px accent).
   - Skip-link, landmark ARIA, alt text wajib.
   - TTS bahasa `id-ID`, STT dengan indikator visual.

10. **Bahasa & Nada**
    - UI 100% Bahasa Indonesia, netral, ramah.
    - Istilah baku: "Sekolah", "Guru", "Siswa", "Kelas", "Mata Pelajaran", "Materi", "Ujian", "Meeting".

11. **Do & Don't**
    - Do: token semantik, semantic HTML, uji di 4 mode aksesibilitas.
    - Don't: warna hardcoded, generic AI aesthetic (ungu-indigo gradient default), font default Inter/Poppins, ikon dekoratif tanpa aria-hidden.

12. **Referensi File**
    - Token: `src/styles.css`
    - Toolbar: `src/components/AccessibilityToolbar.tsx`
    - Shell: `src/components/dashboard/SidebarShell.tsx`
    - Landing: `src/routes/index.tsx`

## Deliverable
Satu file `design.md` di root repo, ±250 baris, tanpa kode berat — cukup contoh token & aturan.
