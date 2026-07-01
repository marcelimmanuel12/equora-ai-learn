import { useEffect, useState } from "react";
import { Moon, Sun, Contrast, Eye, Type, Check } from "lucide-react";

type TextScale = "base" | "lg" | "xl";

const STORAGE_KEY = "equora-a11y";

interface A11yState {
  dark: boolean;
  hc: boolean;
  cb: boolean;
  scale: TextScale;
}

const defaultState: A11yState = { dark: false, hc: false, cb: false, scale: "base" };

function applyState(s: A11yState) {
  const root = document.documentElement;
  root.classList.toggle("dark", s.dark);
  root.classList.toggle("hc", s.hc);
  root.classList.toggle("cb", s.cb);
  root.setAttribute("data-text-scale", s.scale);
}

export function AccessibilityToolbar() {
  const [state, setState] = useState<A11yState>(defaultState);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let next = defaultState;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) next = { ...defaultState, ...JSON.parse(raw) };
      else if (window.matchMedia("(prefers-color-scheme: dark)").matches)
        next = { ...defaultState, dark: true };
    } catch {
      /* ignore */
    }
    setState(next);
    applyState(next);
    setReady(true);
  }, []);

  const update = (patch: Partial<A11yState>) => {
    setState((prev) => {
      const next = { ...prev, ...patch };
      applyState(next);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const cycleScale = () =>
    update({ scale: state.scale === "base" ? "lg" : state.scale === "lg" ? "xl" : "base" });

  const scaleLabel =
    state.scale === "base" ? "Normal" : state.scale === "lg" ? "Besar" : "Ekstra Besar";

  return (
    <div className="border-b border-primary/20 bg-primary text-primary-foreground">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm sm:px-6">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 hidden font-semibold sm:inline">Aksesibilitas:</span>
          <ToolbarButton
            onClick={cycleScale}
            active={state.scale !== "base"}
            icon={<Type className="size-4" aria-hidden />}
            label={`Ukuran Teks: ${scaleLabel}`}
          />
          <ToolbarButton
            onClick={() => update({ hc: !state.hc })}
            active={state.hc}
            icon={<Contrast className="size-4" aria-hidden />}
            label="Kontras Tinggi"
            pressed={state.hc}
          />
          <ToolbarButton
            onClick={() => update({ cb: !state.cb })}
            active={state.cb}
            icon={<Eye className="size-4" aria-hidden />}
            label="Mode Buta Warna"
            pressed={state.cb}
          />
          <ToolbarButton
            onClick={() => update({ dark: !state.dark })}
            active={state.dark}
            icon={
              state.dark ? <Sun className="size-4" aria-hidden /> : <Moon className="size-4" aria-hidden />
            }
            label={state.dark ? "Mode Terang" : "Mode Gelap"}
            pressed={state.dark}
          />
        </div>
        <p className="hidden text-xs text-primary-foreground/80 md:block">
          {ready ? "Preferensi tersimpan otomatis · WCAG 2.1 AA" : "Memuat pengaturan…"}
        </p>
      </div>
    </div>
  );
}

function ToolbarButton({
  onClick,
  active,
  pressed,
  icon,
  label,
}: {
  onClick: () => void;
  active: boolean;
  pressed?: boolean;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 py-1 font-medium transition-colors ${
        active
          ? "border-primary-foreground bg-primary-foreground text-primary"
          : "border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10"
      }`}
    >
      {icon}
      <span>{label}</span>
      {active && <Check className="size-3.5" aria-hidden />}
    </button>
  );
}
