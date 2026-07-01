import { GraduationCap } from "lucide-react";

const columns = [
  {
    title: "Produk",
    links: ["Fitur Utama", "Ekosistem", "Cara Kerja", "Paket Sekolah"],
  },
  {
    title: "Aksesibilitas",
    links: ["Panduan Inklusi", "Standar WCAG", "Bahasa Isyarat AI", "Audio Deskriptif"],
  },
  {
    title: "Perusahaan",
    links: ["Tentang Kami", "Kontak", "Bantuan", "Karier"],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="grid size-9 place-items-center rounded-lg bg-accent text-accent-foreground">
                <GraduationCap className="size-5" aria-hidden />
              </span>
              <span className="text-xl font-bold tracking-tight text-primary">Equora</span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Mewujudkan kesetaraan pendidikan melalui AI dan Computer Vision yang humanis, ramah, dan
              dapat diakses oleh semua siswa.
            </p>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">{col.title}</h3>
              <ul className="mt-4 space-y-3">
                {col.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm text-muted-foreground transition-colors hover:text-accent"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 text-sm text-muted-foreground sm:flex-row">
          <p>&copy; {new Date().getFullYear()} Equora Inklusi Indonesia. Seluruh hak dilindungi.</p>
          <p className="font-medium">Memenuhi standar aksesibilitas WCAG 2.1 AA</p>
        </div>
      </div>
    </footer>
  );
}
