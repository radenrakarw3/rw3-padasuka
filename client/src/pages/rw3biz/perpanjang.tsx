import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Rw3bizShell } from "@/components/rw3biz-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getApiErrorMessage, readJsonSafely } from "@/lib/queryClient";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { SuccessPanel } from "@/components/gov/success-panel";
import { PernyataanSumbangsihPanel } from "@/components/rw3biz/pernyataan";
import { FeatureExplain } from "@/components/gov/feature-explain";
import { FormStepper } from "@/components/gov/form-stepper";
import { settingsRowsToMap } from "@/lib/visitrw3-kontribusi";
import { RW3BIZ_ROUTES } from "@/lib/rw3biz-routes";
import { PilihTermin } from "@/components/gov/pilih-termin";
import {
  JENIS_TEMPAT_BIZ_OPTIONS,
  RingkasanSumbangsih,
  SumbangsihFields,
  UsahaKontribusiFields,
  bizFormDariData,
  bizKontribusiPayload,
  ringkasIsianSumbangsih,
  sumbangsihPayload,
  useProgramRw3,
  validateBizKontribusi,
  validateSumbangsih,
  type BizKontribusiForm,
  type IsianSumbangsih,
} from "@/components/rw3biz/kontribusi-form";
import { formatRp, type SumbangsihProgram } from "@shared/rw3biz-kontribusi";

const TERMIN_OPTIONS = ["1", "3", "6", "12"];

const LANGKAH = [
  { id: "cari", label: "Verifikasi" },
  { id: "usaha", label: "Data usaha" },
  { id: "sumbangsih", label: "Sumbangsih" },
  { id: "berlaku", label: "Berlaku" },
];

type DataLama = {
  nomorInduk: string | null;
  nomorBiz: string;
  namaUsaha: string;
  rt: number;
  alamat: string;
  tanggalHabis: string;
  terminBulan: number | null;
  jamBuka: string | null;
  jamTutup: string | null;
  pjNama: string;
  kontribusiBulanan: number | null;
  sumbangsih: SumbangsihProgram[] | null;
  dataUsaha: Parameters<typeof bizFormDariData>[0] & { jenisTempatUsaha: string };
};

export default function Rw3bizPerpanjang() {
  const { toast } = useToast();
  const awal = useMemo(() => (new URLSearchParams(window.location.search).get("nomor") ?? "").trim().toUpperCase(), []);
  const [langkah, setLangkah] = useState(0);
  const [nomor, setNomor] = useState(awal);
  const [wa, setWa] = useState("");
  const [lama, setLama] = useState<DataLama | null>(null);
  const [jenisTempat, setJenisTempat] = useState("");
  const [jamBuka, setJamBuka] = useState("");
  const [jamTutup, setJamTutup] = useState("");
  const [biz, setBiz] = useState<BizKontribusiForm | null>(null);
  const [sumbangsih, setSumbangsih] = useState<IsianSumbangsih>({});
  const [terminBulan, setTerminBulan] = useState("6");
  const [catatan, setCatatan] = useState("");
  const [setuju, setSetuju] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [hasil, setHasil] = useState<{ nomorBiz: string; nomorInduk: string | null } | null>(null);
  const { program } = useProgramRw3();
  const ringkas = useMemo(() => ringkasIsianSumbangsih(sumbangsih, program), [sumbangsih, program]);

  const { data: settingsRows = [], isLoading: settingsLoading } = useQuery({
    queryKey: ["/api/public/rw3biz/settings"],
    queryFn: async () => {
      const res = await fetch("/api/public/rw3biz/settings");
      if (!res.ok) throw new Error("Gagal memuat pengaturan");
      return readJsonSafely<{ key: string; value: string }[]>(res);
    },
  });
  const settingsMap = useMemo(() => settingsRowsToMap(settingsRows), [settingsRows]);

  const muat = useMutation({
    mutationFn: async () =>
      readJsonSafely<DataLama>(await apiRequest("POST", "/api/public/rw3biz/perpanjang/data", { nomor: nomor.trim(), nomorWhatsapp: wa })),
    onSuccess: (d) => {
      setLama(d);
      setJenisTempat(d.dataUsaha.jenisTempatUsaha);
      setJamBuka(d.jamBuka ?? "");
      setJamTutup(d.jamTutup ?? "");
      setBiz(bizFormDariData(d.dataUsaha));
      setSumbangsih(Object.fromEntries((d.sumbangsih ?? []).map((s) => [s.posId, s.nominal])));
      if (d.terminBulan && TERMIN_OPTIONS.includes(String(d.terminBulan))) setTerminBulan(String(d.terminBulan));
      setGalat(null);
      setLangkah(1);
    },
    onError: (e: unknown) => setGalat(getApiErrorMessage(e)),
  });

  const kunciKontribusi = `${terminBulan}|${JSON.stringify(ringkas)}`;
  useEffect(() => {
    setSetuju(false);
  }, [kunciKontribusi]);

  const kirim = useMutation({
    mutationFn: async () => {
      if (!biz || !lama) throw new Error("Data belum lengkap");
      const res = await apiRequest("POST", "/api/public/rw3biz/perpanjang", {
        nomorBiz: lama.nomorInduk ?? lama.nomorBiz,
        nomorWhatsapp: wa,
        terminBulan: parseInt(terminBulan, 10),
        catatanPemohon: catatan.trim() || null,
        setujuTataTertib: true as const,
        jamBuka: jamBuka || undefined,
        jamTutup: jamTutup || undefined,
        dataUsaha: { jenisTempatUsaha: jenisTempat, ...bizKontribusiPayload(biz, jamBuka, jamTutup) },
        sumbangsih: sumbangsihPayload(Object.fromEntries(program.map((p) => [p.id, sumbangsih[p.id] ?? 0]))),
        setujuPernyataan: true as const,
      });
      return readJsonSafely<{ nomorBiz: string; nomorInduk: string | null }>(res);
    },
    onSuccess: (d) => {
      setHasil(d);
      window.scrollTo({ top: 0 });
    },
    onError: (e: unknown) => {
      const pesan = getApiErrorMessage(e);
      setGalat(pesan);
      toast({ title: "Gagal", description: pesan, variant: "destructive" });
    },
  });

  if (hasil) {
    return (
      <Rw3bizShell title="Perbarui izin" backHref={RW3BIZ_ROUTES.hub}>
        <SuccessPanel
          title="Pembaruan terkirim"
          referenceLabel={hasil.nomorInduk ? "Nomor Induk Usaha (tetap)" : "Nomor pengajuan"}
          referenceValue={hasil.nomorInduk ?? hasil.nomorBiz}
          nextSteps={[
            `Nomor pengajuan pembaruan: ${hasil.nomorBiz}.`,
            "Ketua RW 03 memeriksa data baru dan menyetujui sumbangsih Anda.",
            "Setelah disetujui, surat izin baru bisa dicetak dari halaman cek status.",
          ]}
          primaryAction={{ label: "Cek status", href: `${RW3BIZ_ROUTES.status}?nomor=${encodeURIComponent(hasil.nomorInduk ?? hasil.nomorBiz)}` }}
          secondaryAction={{ label: "Kembali ke RW3BIZ", href: RW3BIZ_ROUTES.hub }}
        />
      </Rw3bizShell>
    );
  }

  const Navigasi = ({ lanjut, label = "Lanjut" }: { lanjut: () => void; label?: string }) => (
    <div className="flex gap-2">
      <Button variant="outline" className="touch-target" onClick={() => { setGalat(null); setLangkah((l) => l - 1); }}>
        <ChevronLeft className="w-4 h-4" />
      </Button>
      <Button className="flex-1 touch-target" onClick={lanjut}>
        {label} <ChevronRight className="w-4 h-4 ml-1" />
      </Button>
    </div>
  );

  return (
    <Rw3bizShell title="Perbarui izin usaha" backHref={RW3BIZ_ROUTES.hub}>
      <div className="space-y-4">
        <FormStepper steps={LANGKAH} currentStep={langkah} />

        {langkah === 0 && (
          <>
            <FeatureExplain title="Perbarui izin sekaligus data usaha">
              <p>
                Surat izin usaha berlaku sesuai masa yang dipilih (1, 3, 6, atau 12 bulan) dan wajib diperbarui sebelum habis. Saat
                memperbarui, cek ulang data kendaraan operasional dan sumbangsih Anda untuk program RW 03.
              </p>
              <p>Nomor Induk Usaha tetap sama; yang berganti hanya nomor surat.</p>
            </FeatureExplain>
            <div className="space-y-2">
              <Label>Nomor Induk Usaha (atau nomor BIZ terakhir)</Label>
              <Input className="font-mono h-12" value={nomor} onChange={(e) => setNomor(e.target.value.toUpperCase())} placeholder="NIU-RW3-0001" />
            </div>
            <div className="space-y-2">
              <Label>Nomor WhatsApp penanggung jawab</Label>
              <Input className="h-12" type="tel" inputMode="tel" value={wa} onChange={(e) => setWa(e.target.value)} placeholder="08xxxxxxxxxx" />
              <p className="text-xs text-muted-foreground">Dipakai untuk memastikan yang memperbarui adalah penanggung jawab usaha.</p>
            </div>
            {galat && <p className="text-sm text-destructive">{galat}</p>}
            <Button
              className="w-full touch-target"
              disabled={muat.isPending || nomor.trim().length < 8 || wa.replace(/\D/g, "").length < 8}
              onClick={() => muat.mutate()}
            >
              {muat.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Muat data usaha"}
            </Button>
          </>
        )}

        {langkah === 1 && lama && biz && (
          <>
            <div className="rounded-xl border bg-card p-4 text-sm">
              <p className="font-semibold">{lama.namaUsaha}</p>
              <p className="font-mono text-xs text-muted-foreground">{lama.nomorInduk ?? lama.nomorBiz}</p>
              <p className="text-xs text-muted-foreground">
                RT {String(lama.rt).padStart(2, "0")} · {lama.alamat} · PJ {lama.pjNama} · izin habis {lama.tanggalHabis}
                {lama.kontribusiBulanan != null ? ` · sekarang ${formatRp(lama.kontribusiBulanan)}/bulan` : ""}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Jenis tempat usaha *</Label>
              <Select value={jenisTempat} onValueChange={setJenisTempat}>
                <SelectTrigger className="h-12"><SelectValue placeholder="Pilih" /></SelectTrigger>
                <SelectContent>
                  {JENIS_TEMPAT_BIZ_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Jam buka</Label>
                <Input type="time" className="h-12" value={jamBuka} onChange={(e) => setJamBuka(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Jam tutup</Label>
                <Input type="time" className="h-12" value={jamTutup} onChange={(e) => setJamTutup(e.target.value)} />
              </div>
            </div>
            <UsahaKontribusiFields
              value={biz}
              onChange={(p) => setBiz((b) => (b ? { ...b, ...p } : b))}
              jenisTempat={jenisTempat}
              jamBuka={jamBuka}
              jamTutup={jamTutup}
            />
            {galat && <p className="text-sm text-destructive">{galat}</p>}
            <Navigasi
              lanjut={() => {
                const err = !jenisTempat ? "Pilih jenis tempat usaha" : validateBizKontribusi(biz, jenisTempat);
                if (err) return setGalat(err);
                setGalat(null);
                setLangkah(2);
              }}
            />
          </>
        )}

        {langkah === 2 && lama && (
          <>
            <SumbangsihFields value={sumbangsih} onChange={setSumbangsih} />
            {galat && <p className="text-sm text-destructive">{galat}</p>}
            <Navigasi
              lanjut={() => {
                const err = validateSumbangsih(sumbangsih, program);
                if (err) return setGalat(err);
                setGalat(null);
                setLangkah(3);
              }}
            />
          </>
        )}

        {langkah === 3 && lama && (
          <>
            <PilihTermin value={terminBulan} onChange={setTerminBulan} />
            <div className="space-y-2">
              <Label>Catatan (opsional)</Label>
              <Textarea rows={2} maxLength={900} value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Misalnya: tambah 1 kolbak sejak bulan lalu" />
            </div>
            <RingkasanSumbangsih items={ringkas} catatan="Disetor tiap bulan ke Kas RW 03 dengan kwitansi, boleh dicicil." />
            <p className="text-sm font-semibold">Surat Pernyataan Sumbangsih (diperbarui)</p>
            <PernyataanSumbangsihPanel
              key={kunciKontribusi}
              items={ringkas}
              terminBulan={parseInt(terminBulan, 10)}
              identitas={{ nama: lama.pjNama, namaUsaha: lama.namaUsaha, alamat: lama.alamat }}
              tataMasyarakat={settingsMap.tata_tertib_masyarakat ?? ""}
              tataKhusus={settingsMap.tata_tertib_penyewa ?? ""}
              setuju={setuju}
              onSetuju={setSetuju}
              loading={settingsLoading}
            />
            {galat && <p className="text-sm text-destructive">{galat}</p>}
            <div className="flex gap-2">
              <Button variant="outline" className="touch-target" onClick={() => setLangkah(2)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button className="flex-1 touch-target" disabled={kirim.isPending || !setuju} onClick={() => kirim.mutate()}>
                {kirim.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Kirim pembaruan"}
              </Button>
            </div>
          </>
        )}
      </div>
    </Rw3bizShell>
  );
}
