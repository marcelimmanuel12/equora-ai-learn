# Equora — Design Guide

Dokumen ini adalah **single source of truth** untuk desain visual & aksesibilitas Equora. Semua fitur baru (Meeting, Ujian, AI Vision, dsb.) wajib mengacu ke sini.

---

## 1. Identitas Produk

- **Nama:** Equora
- **Tagline:** E-Learning inklusif berbasis AI untuk sekolah inklusi.
- **Misi:** Menyediakan pengalaman belajar yang **setara** bagi siswa tunarungu, tunawicara, tunanetra, dan buta warna pada jenjang SD/SMP/SMA.
- **Model bisnis:** SaaS subscription per sekolah.
- **Bahasa UI:** 100% Bahasa Indonesia.

### Prinsip desain

1. **Inklusif** — setiap keputusan visual diuji di 4 mode: Light, Dark, High Contrast, Color Blind.
2. **Tenang** — hindari warna neon berlebih, gradient ramai, ilustrasi bising.
3. **Profesional** — mirip SaaS premium (Linear, Notion, Vercel), bukan produk anak sekolah.
4. **Konsisten** — token semantik, bukan warna hardcoded.
5. **WCAG 2.1 AA** minimum, target AAA untuk teks utama.

---

## 2. Design Language — "Soft-slate biru"

Palet inti tersimpan sebagai token semantik di [`src/styles.css`](src/styles.css). **Jangan pernah** menulis kelas warna literal (`text-white`, `bg-black`, `bg-[#1E3A8A]`) di komponen — selalu gunakan token.

### Warna kunci (mode terang)

| Token             | Nilai       | Peran                            |
| ----------------- | ----------- | -------------------------------- |
| `--primary`       | navy `#1E3A8A` | Aksi utama, brand                |
| `--accent`        | blue `#2563EB` | Highlight, link, fokus           |
| `--background`    | slate `#F8FAFC` | Latar halaman                    |
| `--foreground`    | slate-900   | Teks utama                       |
| `--muted`         | slate-100   | Latar sekunder                   |
| `--muted-foreground` | slate-500 | Teks sekunder                    |
| `--border`        | slate-200   | Garis pemisah                    |
| `--destructive`   | red-600     | Hapus / error                    |
| `--success`       | emerald-600 | Berhasil / lulus                 |
| `--warning`       | amber-500   | Peringatan                       |

Format token: `oklch(...)` di `:root`, dioverride oleh varian `.dark`, `.hc`, `.cb`.

### Gradient & shadow

- `--gradient-primary: linear-gradient(135deg, var(--primary), var(--accent))` — dipakai hemat, hanya untuk hero & CTA utama.
- `--shadow-elegant: 0 10px 30px -10px color-mix(in oklab, var(--primary) 30%, transparent)`.

### Aturan keras

- ❌ `className="text-white bg-black"`
- ❌ `style={{ color: "#1E3A8A" }}`
- ✅ `className="text-foreground bg-background"`
- ✅ `className="bg-primary text-primary-foreground"`

---

## 3. Tipografi

- **Font tunggal:** **Lexend** — dipilih karena riset menunjukkan keterbacaan tinggi untuk pembaca disleksia & anak-anak.
- Dimuat via `<link>` di `src/routes/__root.tsx`, **bukan** `@import` di CSS.
- Fallback: `system-ui, -apple-system, "Segoe UI", sans-serif`.

### Skala

| Level  | Ukuran   | Line-height | Pemakaian             |
| ------ | -------- | ----------- | --------------------- |
| h1     | 2.25rem  | 1.15        | Judul halaman         |
| h2     | 1.875rem | 1.2         | Judul seksi           |
| h3     | 1.5rem   | 1.25        | Judul kartu           |
| h4     | 1.25rem  | 1.3         | Sub-judul             |
| body   | 1rem     | 1.6         | Paragraf              |
| small  | 0.875rem | 1.5         | Meta, caption         |
| micro  | 0.75rem  | 1.4         | Badge, label ikon     |

### Text scaling dinamis

`AccessibilityToolbar` menulis `data-text-scale` di `<html>` dengan nilai `sm | md | lg | xl` → memperbesar seluruh skala 100/115/130/150%. Semua ukuran teks harus **relative** (`rem`), tidak boleh `px` di komponen.

---

## 4. Spacing, Radius, Motion

- **Spacing base:** 4px. Skala Tailwind default (`gap-2`, `p-4`, dst.).
- **Radius:** `--radius: 0.75rem` (12px). Kartu, tombol, input semua ikut ini. Modal & sheet boleh `1rem`.
- **Shadow:** `sm` untuk kartu, `md` untuk dropdown, `elegant` untuk hero & CTA.
- **Motion:**
  - Durasi: 150ms (mikro), 200ms (default), 300ms (transisi halaman).
  - Easing: `cubic-bezier(0.4, 0, 0.2, 1)`.
  - **Wajib** hormati `@media (prefers-reduced-motion: reduce)` — matikan animasi non-esensial.

---

## 5. Mode Aksesibilitas

Semua mode dikendalikan oleh [`AccessibilityToolbar`](src/components/AccessibilityToolbar.tsx) dengan menambahkan class di `<html>` dan disimpan di `localStorage`.

| Mode          | Class         | Karakter visual                                          |
| ------------- | ------------- | -------------------------------------------------------- |
| Dark          | `.dark`       | Latar slate-950, teks slate-50, aksen tetap biru.        |
| High Contrast | `.hc`         | Latar hitam, teks kuning `#FFEB3B`, border tebal 2px.    |
| Color Blind   | `.cb`         | Palet biru/oranye aman Deuteranopia & Protanopia.        |
| Text scale    | `data-text-scale="sm\|md\|lg\|xl"` | Skala teks 100/115/130/150%. |

Kombinasi diperbolehkan (mis. `.dark.hc`) — token harus tetap kontras AA di kombinasi apa pun.

### Fitur aksesibilitas fungsional

- **Text-to-Speech** — Web Speech API, bahasa `id-ID`, tombol "Baca Halaman" di toolbar + per-pesan di chatbot.
- **Speech-to-Text** — Web Speech API, indikator merah saat merekam.
- **Keyboard nav** — semua elemen interaktif fokusable, `Tab` order logis, `Esc` menutup modal.
- **Screen reader** — landmark ARIA (`<header>`, `<nav>`, `<main>`, `<footer>`), `aria-label` pada ikon-button, `aria-live` untuk toast.
- **Skip-link** — "Lompat ke konten" di top, muncul saat fokus.
- **Subtitle/Caption** — otomatis di video pembelajaran & Meeting (Web Speech API di host).

---

## 6. Komponen Inti

Basis: **shadcn/ui** + variant custom.

- **Button** — variant: `default`, `secondary`, `outline`, `ghost`, `destructive`, `premium` (gradient primary→accent + shadow-elegant).
- **Card** — radius `--radius`, border `--border`, shadow-sm.
- **Dialog / Sheet** — overlay `bg-background/80 backdrop-blur-sm`.
- **Toast** — `sonner`, posisi top-right, durasi 4s.
- **SidebarShell** — layout dashboard (sidebar kiri desktop, drawer mobile).
- **AccessibilityToolbar** — floating top-right, persistent di semua route.

---

## 7. Pola Layout

### Landing (`/`)
Hero → Fitur unggulan → Ekosistem (RBAC visual) → Cara kerja → Pricing (SD/SMP/SMA) → Footer.

### Dashboard (Siswa/Guru/Admin)
- **Desktop:** sidebar kiri 260px + konten fleksibel.
- **Mobile:** header sticky + drawer sidebar + tab horizontal scrollable.
- Setiap tab = satu komponen mandiri; state global via TanStack Query.

### Form
- Label di atas input, teks 0.875rem, warna `--foreground`.
- Error di bawah, warna `--destructive`, prefix ikon `AlertCircle`.
- Tombol submit full-width di mobile, auto di desktop.

---

## 8. Ikon & Ilustrasi

- **Ikon:** `lucide-react` sebagai ikon utama. Ukuran 16 / 20 / 24. Ikon dekoratif wajib `aria-hidden`.
- **Ilustrasi:** flat, garis lembut, palet mengikuti token brand. Hindari 3D render & clip-art.
- **Emoji:** dilarang sebagai elemen UI (tombol, judul). Diperbolehkan hanya di konten user-generated.

---

## 9. Aksesibilitas Teknis (WCAG 2.1 AA)

- Kontras minimum **4.5:1** untuk body, **3:1** untuk UI & teks besar (18px+).
- Fokus terlihat: `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`.
- Target sentuh minimum **44×44px** di mobile.
- `alt` wajib pada semua `<img>` (kosongkan `alt=""` hanya jika dekoratif).
- `<label htmlFor>` wajib pada input.
- Judul halaman unik per route (`head()` di TanStack Start).

---

## 10. Bahasa & Nada

- **Bahasa:** Indonesia baku, ramah, tidak kaku.
- **Persona:** guru yang sabar & tenang, bukan tech-bro.
- **Istilah baku:**
  - Sekolah, Guru, Siswa, Kelas, Mata Pelajaran, Materi, Kuis, Ujian, Tugas, Meeting, Absensi, Prestasi.
- **Hindari:** singkatan gaul, istilah Inggris tanpa perlu ("dashboard" boleh, "onboarding" → "pengenalan awal").

---

## 11. Do & Don't

### ✅ Do
- Pakai token semantik untuk **semua** warna, radius, shadow.
- Uji tiap layar di 4 mode aksesibilitas + 4 skala teks.
- Gunakan semantic HTML (`<button>`, bukan `<div onClick>`).
- Beri `aria-label` pada icon-button.
- Hormati `prefers-reduced-motion`.

### ❌ Don't
- Warna hardcoded (`text-white`, `bg-[#...]`, `style={{ color }}`).
- Gradient ungu-indigo generik atau "AI aesthetic".
- Font default Inter/Poppins.
- Ikon dekoratif tanpa `aria-hidden`.
- Animasi > 400ms untuk interaksi biasa.
- Placeholder sebagai pengganti label.

---

## 12. Referensi File

| Peran                    | File                                                     |
| ------------------------ | -------------------------------------------------------- |
| Token warna & tema       | `src/styles.css`                                         |
| Toolbar aksesibilitas    | `src/components/AccessibilityToolbar.tsx`                |
| Hook TTS / STT           | `src/hooks/use-speech.tsx`                               |
| Shell dashboard          | `src/components/dashboard/SidebarShell.tsx`              |
| Navbar & Footer publik   | `src/components/site/Navbar.tsx`, `Footer.tsx`           |
| Landing page             | `src/routes/index.tsx`                                   |
| Root layout & metadata   | `src/routes/__root.tsx`                                  |

---

_Dokumen ini hidup. Perbarui setiap ada keputusan desain baru yang berdampak lintas fitur._
