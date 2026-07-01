import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, X, GraduationCap } from "lucide-react";

const navLinks = [
  { label: "Fitur Utama", href: "#fitur" },
  { label: "Ekosistem", href: "#ekosistem" },
  { label: "Cara Kerja", href: "#cara-kerja" },
  { label: "Paket Sekolah", href: "#harga" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 border-b transition-colors ${
        scrolled ? "border-border bg-background/85 backdrop-blur-md" : "border-transparent bg-background"
      }`}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5" aria-label="Equora beranda">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground shadow-soft">
            <GraduationCap className="size-6" aria-hidden />
          </span>
          <span className="text-2xl font-bold tracking-tight text-primary">Equora</span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="font-medium text-foreground/80 transition-colors hover:text-accent"
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <a
            href="#masuk"
            className="rounded-full border-2 border-primary px-5 py-2 font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            Masuk
          </a>
          <a
            href="#harga"
            className="rounded-full bg-accent px-5 py-2 font-semibold text-accent-foreground shadow-soft transition-colors hover:bg-primary"
          >
            Daftar Sekolah
          </a>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Tutup menu" : "Buka menu"}
          className="grid size-11 place-items-center rounded-lg border border-border text-foreground md:hidden"
        >
          {open ? <X className="size-6" aria-hidden /> : <Menu className="size-6" aria-hidden />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-border bg-background px-4 py-4 md:hidden">
          <div className="flex flex-col gap-1">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-3 font-medium text-foreground hover:bg-muted"
              >
                {l.label}
              </a>
            ))}
            <div className="mt-2 grid grid-cols-2 gap-3">
              <a
                href="#masuk"
                onClick={() => setOpen(false)}
                className="rounded-full border-2 border-primary px-4 py-2.5 text-center font-semibold text-primary"
              >
                Masuk
              </a>
              <a
                href="#harga"
                onClick={() => setOpen(false)}
                className="rounded-full bg-accent px-4 py-2.5 text-center font-semibold text-accent-foreground"
              >
                Daftar
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
