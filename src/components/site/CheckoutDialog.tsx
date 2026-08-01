import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  CreditCard,
  Loader2,
  CheckCircle2,
  Copy,
  ShieldCheck,
  KeyRound,
  School,
  ArrowRight,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export type CheckoutPlan = {
  name: string;
  price: string;
  grades: string;
};

type Step = "form" | "processing" | "done";

function generateAccount(schoolName: string) {
  const slug =
    schoolName
      .replace(/[^a-zA-Z]/g, "")
      .toUpperCase()
      .slice(0, 3) || "EQR";
  const num = Math.floor(1000 + Math.random() * 9000);
  const pass = `Equora${Math.floor(100 + Math.random() * 900)}!`;
  return { nia: `${slug}${num}`, password: pass };
}

export function CheckoutDialog({
  plan,
  open,
  onOpenChange,
}: {
  plan: CheckoutPlan | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [step, setStep] = useState<Step>("form");
  const [schoolName, setSchoolName] = useState("");
  const [email, setEmail] = useState("");
  const [card, setCard] = useState("");
  const [account, setAccount] = useState<{ nia: string; password: string } | null>(null);

  useEffect(() => {
    if (open) {
      setStep("form");
      setAccount(null);
    }
  }, [open]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep("processing");
    const acc = generateAccount(schoolName);
    window.setTimeout(() => {
      setAccount(acc);
      setStep("done");
    }, 2000);
  };

  const copyAll = async () => {
    if (!account) return;
    try {
      await navigator.clipboard.writeText(
        `Nomor Induk Admin (NIA): ${account.nia}\nPassword: ${account.password}`,
      );
      toast.success("Data akun disalin ke papan klip");
    } catch {
      toast.error("Gagal menyalin, silakan catat manual");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {step === "form" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CreditCard className="size-5 text-accent" aria-hidden />
                Pembayaran Langganan
              </DialogTitle>
              <DialogDescription>
                {plan?.name} · {plan?.grades} — {plan?.price}/bulan. Ini simulasi pembayaran
                (dummy), tidak ada dana yang benar-benar ditagih.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="co-school">Nama Sekolah</Label>
                <Input
                  id="co-school"
                  required
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder="SMP Inklusi Nusantara"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="co-email">Email Penanggung Jawab</Label>
                <Input
                  id="co-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@sekolah.sch.id"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="co-card">Nomor Kartu (dummy)</Label>
                <Input
                  id="co-card"
                  required
                  inputMode="numeric"
                  value={card}
                  onChange={(e) =>
                    setCard(
                      e.target.value
                        .replace(/\D/g, "")
                        .slice(0, 16)
                        .replace(/(.{4})/g, "$1 ")
                        .trim(),
                    )
                  }
                  placeholder="4242 4242 4242 4242"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="co-exp">Masa Berlaku</Label>
                  <Input id="co-exp" required placeholder="12/29" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="co-cvc">CVC</Label>
                  <Input id="co-cvc" required placeholder="123" />
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-xl bg-muted p-3 text-sm text-muted-foreground">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                <span>
                  Mode demo. Gunakan data apa pun — sistem akan langsung menerbitkan akun admin
                  sekolah setelah pembayaran.
                </span>
              </div>

              <Button type="submit" className="w-full" size="lg">
                Bayar {plan?.price}
              </Button>
            </form>
          </>
        )}

        {step === "processing" && (
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <Loader2 className="size-10 animate-spin text-accent" aria-hidden />
            <DialogTitle className="text-lg">Memproses pembayaran…</DialogTitle>
            <DialogDescription>Mohon tunggu, jangan tutup jendela ini.</DialogDescription>
          </div>
        )}

        {step === "done" && account && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="size-5 text-success" aria-hidden />
                Pembayaran Berhasil
              </DialogTitle>
              <DialogDescription>
                Akun Sekolah (Admin) untuk {schoolName || "sekolah Anda"} telah diterbitkan oleh
                admin Equora. Simpan data berikut dan segera ganti password setelah masuk.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 rounded-2xl border border-border bg-surface p-5">
              <div className="flex items-center gap-3">
                <School className="size-5 text-primary" aria-hidden />
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Nomor Induk Admin (NIA)
                  </p>
                  <p className="font-mono text-lg font-bold text-foreground">{account.nia}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <KeyRound className="size-5 text-primary" aria-hidden />
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Password Sementara
                  </p>
                  <p className="font-mono text-lg font-bold text-foreground">{account.password}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Paket aktif: {plan?.name} ({plan?.grades}) — {plan?.price}/bulan.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="outline" className="sm:flex-1" onClick={copyAll}>
                <Copy className="size-4" aria-hidden />
                Salin Data Akun
              </Button>
              <Button asChild className="sm:flex-1">
                <Link to="/masuk">
                  Masuk Sekarang
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
