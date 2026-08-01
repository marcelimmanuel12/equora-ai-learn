import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import {
  Hand,
  Volume2,
  Palette,
  Captions,
  GraduationCap,
  Users,
  School,
  Database,
  ArrowRight,
  Check,
  Sparkles,
  ShieldCheck,
  BookOpen,
  BarChart3,
} from "lucide-react";
import heroDashboard from "@/assets/hero-dashboard.jpg";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Equora — Platform E-Learning Inklusif Berbasis AI" },
      {
        name: "description",
        content:
          "Equora adalah platform e-learning berbasis AI & Computer Vision untuk sekolah inklusi — membantu siswa tunarungu, tunawicara, tunanetra, dan buta warna belajar setara.",
      },
      { property: "og:title", content: "Equora — Platform E-Learning Inklusif Berbasis AI" },
      {
        property: "og:description",
        content:
          "Satu ekosistem pembelajaran inklusif untuk siswa, guru, dan sekolah. Aksesibilitas WCAG 2.1 AA dengan bahasa isyarat AI, audio deskriptif, dan mode buta warna.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

const features = [
  {
    icon: Volume2,
    tint: "bg-blue-100 text-accent dark:bg-blue-950/50",
    title: "Audio Deskriptif Otomatis",
    audience: "Tunanetra",
    desc: "Deskripsi audio real-time untuk setiap gambar, diagram, dan video pada materi pelajaran.",
  },
  {
    icon: Hand,
    tint: "bg-indigo-100 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300",
    title: "Penerjemah Bahasa Isyarat",
    audience: "Tunarungu & Tunawicara",
    desc: "Computer Vision mengubah video guru menjadi bahasa isyarat dan menerjemahkan gerakan siswa menjadi teks.",
  },
  {
    icon: Palette,
    tint: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300",
    title: "Mode Ramah Buta Warna",
    audience: "Buta Warna",
    desc: "Palet warna adaptif yang menjaga kontras dan kejelasan bagi berbagai jenis defisiensi warna.",
  },
  {
    icon: Captions,
    tint: "bg-sky-100 text-sky-600 dark:bg-sky-950/50 dark:text-sky-300",
    title: "Caption & Transkrip Pintar",
    audience: "Semua Siswa",
    desc: "Transkripsi suara guru secara instan dengan ringkasan poin penting berbasis AI.",
  },
];

const roles = [
  {
    icon: GraduationCap,
    title: "Dashboard Siswa",
    desc: "Belajar interaktif, kerjakan kuis, dan pantau progres dengan alat bantu aksesibilitas yang dipersonalisasi.",
    points: ["Materi adaptif otomatis", "Kuis & tugas interaktif", "Progres & gamifikasi"],
  },
  {
    icon: Users,
    title: "Dashboard Guru",
    desc: "Buat materi dan kuis inklusif berbasis AI, lalu nilai siswa langsung dari satu tempat.",
    points: ["Buat materi & kuis", "Penilaian otomatis masuk", "Analitik kelas per siswa"],
    featured: true,
  },
  {
    icon: School,
    title: "Dashboard Sekolah",
    desc: "Pantau seluruh aktivitas guru & siswa, kelola langganan, dan lihat analitik menyeluruh.",
    points: ["Analitik sekolah menyeluruh", "Manajemen guru & kelas", "Kelola langganan SaaS"],
  },
];

const steps = [
  {
    icon: School,
    title: "Sekolah Berlangganan",
    desc: "Pilih paket sesuai jenjang (SD, SMP, atau SMA) dan aktifkan akun sekolah Anda.",
  },
  {
    icon: BookOpen,
    title: "Guru Membuat Materi",
    desc: "Guru menyusun materi & kuis yang otomatis diadaptasi ke profil disabilitas tiap siswa.",
  },
  {
    icon: Sparkles,
    title: "Siswa Belajar Setara",
    desc: "Siswa mengakses materi dengan bahasa isyarat, audio, atau caption sesuai kebutuhannya.",
  },
  {
    icon: BarChart3,
    title: "Sekolah Memantau",
    desc: "Nilai dan aktivitas langsung terhubung ke dashboard guru dan sekolah secara real-time.",
  },
];

const plans = [
  {
    level: "Jenjang Dasar",
    name: "Equora SD",
    grades: "Kelas 1–6",
    price: "Rp 2,5jt",
    features: [
      "Materi visual & audio interaktif",
      "Bahasa isyarat AI dasar",
      "Mode buta warna & kontras tinggi",
      "Laporan progres harian",
    ],
  },
  {
    level: "Jenjang Menengah",
    name: "Equora SMP",
    grades: "Kelas 7–9",
    price: "Rp 3,8jt",
    popular: true,
    features: [
      "Semua fitur paket SD",
      "Transkripsi bahasa isyarat lanjutan",
      "Dashboard analitik guru",
      "Kuis adaptif per disabilitas",
    ],
  },
  {
    level: "Jenjang Lanjut",
    name: "Equora SMA",
    grades: "Kelas 10–12",
    price: "Rp 5,2jt",
    features: [
      "Semua fitur paket SMP",
      "Persiapan ujian adaptif",
      "Database sekolah terpadu",
      "Dukungan prioritas 24/7",
    ],
  },
];

function LandingPage() {
  const [checkoutPlan, setCheckoutPlan] = useState<CheckoutPlan | null>(null);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main id="main-content">
        {/* Hero */}
        <section className="gradient-hero">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 md:grid-cols-2 md:py-24">
            <div className="space-y-7">
              <span className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-1.5 text-sm font-bold uppercase tracking-wide text-accent">
                <Sparkles className="size-4" aria-hidden />
                E-Learning Inklusif Berbasis AI
              </span>
              <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-primary sm:text-5xl md:text-6xl">
                Setiap Siswa <br className="hidden sm:block" />
                <span className="text-accent underline decoration-accent/30 decoration-8 underline-offset-8">
                  Punya Hak Belajar
                </span>
              </h1>
              <p className="max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
                Platform pendidikan inklusif yang menghubungkan siswa tunarungu, tunawicara, tunanetra,
                dan buta warna dengan guru dan sekolah dalam satu ekosistem berbasis AI & Computer Vision.
              </p>
              <div className="flex flex-wrap gap-4">
                <a
                  href="#harga"
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-7 py-4 text-lg font-bold text-primary-foreground shadow-soft transition-transform hover:scale-[1.02]"
                >
                  Coba Demo Gratis
                  <ArrowRight className="size-5" aria-hidden />
                </a>
                <a
                  href="#fitur"
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-7 py-4 text-lg font-bold text-foreground transition-colors hover:bg-muted"
                >
                  Lihat Fitur
                </a>
              </div>
              <dl className="flex flex-wrap gap-8 pt-2">
                {[
                  ["4", "Jenis disabilitas didukung"],
                  ["3", "Dashboard terhubung"],
                  ["AA", "Standar WCAG 2.1"],
                ].map(([n, l]) => (
                  <div key={l}>
                    <dt className="text-3xl font-bold text-primary">{n}</dt>
                    <dd className="text-sm text-muted-foreground">{l}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="relative">
              <img
                src={heroDashboard}
                width={1280}
                height={960}
                alt="Antarmuka dashboard Equora menampilkan pelajaran dengan jendela bahasa isyarat AI, caption langsung, dan panel kontrol aksesibilitas."
                className="w-full rounded-3xl border border-border shadow-elevated"
              />
              <div className="absolute -bottom-5 -left-3 flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-elevated sm:-left-6">
                <span className="grid size-12 shrink-0 place-items-center rounded-full bg-success font-bold text-success-foreground">
                  98%
                </span>
                <div>
                  <p className="text-sm font-bold text-card-foreground">Akurasi AI Vision</p>
                  <p className="text-xs text-muted-foreground">Terjemahan bahasa isyarat</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="fitur" className="bg-surface py-20 md:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="mx-auto mb-16 max-w-3xl text-center">
              <h2 className="text-3xl font-bold text-primary md:text-4xl">
                Didesain untuk Segala Kebutuhan
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Equora memakai Computer Vision dan model AI terkini agar setiap materi dapat diakses oleh
                siapa saja, dengan cara yang paling sesuai.
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((f) => (
                <div
                  key={f.title}
                  className="flex flex-col rounded-3xl border border-border bg-card p-7 transition-colors hover:border-accent/40"
                >
                  <span className={`mb-5 grid size-14 place-items-center rounded-2xl ${f.tint}`}>
                    <f.icon className="size-7" aria-hidden />
                  </span>
                  <span className="mb-2 text-xs font-bold uppercase tracking-wider text-accent">
                    {f.audience}
                  </span>
                  <h3 className="mb-3 text-xl font-bold text-card-foreground">{f.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Ecosystem */}
        <section id="ekosistem" className="py-20 md:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="rounded-[2.5rem] bg-primary p-8 text-primary-foreground sm:p-12 md:p-16">
              <div className="mx-auto mb-14 max-w-3xl text-center">
                <h2 className="text-3xl font-bold md:text-5xl">Satu Ekosistem, Tiga Pengalaman</h2>
                <p className="mt-4 text-lg text-primary-foreground/80">
                  Ketiga dashboard menggunakan satu database yang sama, sehingga seluruh data saling
                  terhubung secara otomatis dan real-time.
                </p>
              </div>

              <div className="grid gap-6 lg:grid-cols-3">
                {roles.map((r) => (
                  <div
                    key={r.title}
                    className={`rounded-3xl p-7 ${
                      r.featured
                        ? "bg-card text-card-foreground shadow-elevated ring-2 ring-accent"
                        : "bg-primary-foreground/5 ring-1 ring-primary-foreground/15"
                    }`}
                  >
                    <span
                      className={`mb-5 grid size-12 place-items-center rounded-2xl ${
                        r.featured ? "bg-accent text-accent-foreground" : "bg-primary-foreground/10"
                      }`}
                    >
                      <r.icon className="size-6" aria-hidden />
                    </span>
                    <h3 className={`text-xl font-bold ${r.featured ? "" : "text-primary-foreground"}`}>
                      {r.title}
                    </h3>
                    <p
                      className={`mt-3 text-sm leading-relaxed ${
                        r.featured ? "text-muted-foreground" : "text-primary-foreground/80"
                      }`}
                    >
                      {r.desc}
                    </p>
                    <ul className="mt-5 space-y-2.5">
                      {r.points.map((p) => (
                        <li key={p} className="flex items-center gap-2 text-sm">
                          <Check
                            className={`size-4 shrink-0 ${r.featured ? "text-accent" : "text-primary-foreground"}`}
                            aria-hidden
                          />
                          <span className={r.featured ? "text-card-foreground" : "text-primary-foreground/90"}>
                            {p}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              <div className="mt-10 flex items-center justify-center gap-3 rounded-2xl bg-primary-foreground/5 px-6 py-5 ring-1 ring-primary-foreground/15">
                <Database className="size-6 shrink-0 text-accent" aria-hidden />
                <p className="text-center text-sm text-primary-foreground/90 sm:text-base">
                  Guru membuat materi → muncul otomatis di akun siswa. Siswa mengerjakan kuis → nilai
                  langsung masuk ke dashboard guru & terpantau oleh sekolah.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="cara-kerja" className="bg-surface py-20 md:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="mx-auto mb-16 max-w-3xl text-center">
              <h2 className="text-3xl font-bold text-primary md:text-4xl">Cara Kerja Equora</h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Empat langkah sederhana untuk membangun kelas yang inklusif dan terhubung penuh.
              </p>
            </div>
            <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((s, i) => (
                <li key={s.title} className="rounded-3xl border border-border bg-card p-7">
                  <div className="mb-5 flex items-center justify-between">
                    <span className="grid size-12 place-items-center rounded-2xl bg-secondary text-secondary-foreground">
                      <s.icon className="size-6" aria-hidden />
                    </span>
                    <span className="text-4xl font-bold text-border">{i + 1}</span>
                  </div>
                  <h3 className="mb-2 text-lg font-bold text-card-foreground">{s.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Pricing */}
        <section id="harga" className="py-20 md:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="mx-auto mb-16 max-w-3xl text-center">
              <h2 className="text-3xl font-bold text-primary md:text-4xl">
                Paket Berlangganan per Jenjang
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Model langganan SaaS untuk sekolah. Satu harga transparan mencakup seluruh fitur
                aksesibilitas untuk semua siswa di jenjang tersebut.
              </p>
            </div>
            <div className="grid gap-6 lg:grid-cols-3">
              {plans.map((p) => (
                <div
                  key={p.name}
                  className={`flex flex-col rounded-3xl border bg-card p-8 ${
                    p.popular ? "border-primary shadow-elevated ring-1 ring-primary" : "border-border"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">{p.level}</span>
                    {p.popular && (
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
                        Populer
                      </span>
                    )}
                  </div>
                  <h3 className="mt-2 text-2xl font-bold text-primary">{p.name}</h3>
                  <p className="text-sm text-muted-foreground">{p.grades}</p>
                  <div className="mt-6 flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-card-foreground">{p.price}</span>
                    <span className="text-muted-foreground">/bulan</span>
                  </div>
                  <ul className="mt-8 flex-1 space-y-3.5">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                        <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <a
                    href="#masuk"
                    className={`mt-8 rounded-xl px-6 py-3 text-center font-bold transition-colors ${
                      p.popular
                        ? "bg-primary text-primary-foreground hover:bg-accent"
                        : "border border-border bg-surface text-foreground hover:bg-muted"
                    }`}
                  >
                    {p.popular ? "Pilih Paket" : "Hubungi Sales"}
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section id="masuk" className="pb-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="gradient-hero flex flex-col items-center gap-6 rounded-[2.5rem] border border-border bg-card px-6 py-16 text-center">
              <span className="grid size-14 place-items-center rounded-2xl bg-accent/10 text-accent">
                <ShieldCheck className="size-7" aria-hidden />
              </span>
              <h2 className="max-w-2xl text-3xl font-bold text-primary md:text-4xl">
                Siap menghadirkan pendidikan yang setara untuk semua siswa?
              </h2>
              <p className="max-w-xl text-lg text-muted-foreground">
                Jadwalkan demo untuk sekolah Anda dan lihat bagaimana Equora membuat belajar menjadi
                inklusif, interaktif, dan mudah diakses.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <a
                  href="#harga"
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-7 py-4 text-lg font-bold text-primary-foreground shadow-soft transition-transform hover:scale-[1.02]"
                >
                  Daftarkan Sekolah
                  <ArrowRight className="size-5" aria-hidden />
                </a>
                <a
                  href="#fitur"
                  className="inline-flex items-center rounded-xl border border-border bg-surface px-7 py-4 text-lg font-bold text-foreground transition-colors hover:bg-muted"
                >
                  Pelajari Lebih Lanjut
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
