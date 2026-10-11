import { useState } from "react";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";

const KUNCI = "rw3_persetujuan_cookie";

function sudahSetuju(): boolean {
  try {
    return localStorage.getItem(KUNCI) === "semua";
  } catch {
    return true;
  }
}

/** Situs hanya memakai cookie sesi login dan penyimpanan draf formulir; tidak ada pelacak iklan. */
export function PersetujuanCookie() {
  const [tampil, setTampil] = useState(() => !sudahSetuju());
  if (!tampil) return null;

  const terima = () => {
    try {
      localStorage.setItem(KUNCI, "semua");
    } catch {
      /* mode privat: cukup sembunyikan untuk sesi ini */
    }
    setTampil(false);
  };

  return (
    <div
      role="region"
      aria-label="Persetujuan cookie"
      className="fixed inset-x-0 bottom-0 z-[45] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] print:hidden sm:inset-x-auto sm:right-4 sm:bottom-4 sm:max-w-sm sm:p-0"
      data-testid="banner-cookie"
    >
      <div className="rounded-2xl border bg-card p-4 shadow-lg">
        <div className="flex gap-3">
          <Cookie className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden />
          <p className="text-sm leading-relaxed text-muted-foreground">
            Situs RW 03 memakai cookie untuk menjaga Anda tetap masuk dan menyimpan draf formulir di perangkat ini.
            Tidak ada iklan atau pelacakan.
          </p>
        </div>
        <Button className="mt-3 w-full" onClick={terima} data-testid="button-terima-cookie">
          Terima semua
        </Button>
      </div>
    </div>
  );
}
