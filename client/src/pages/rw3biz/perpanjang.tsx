import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Rw3bizShell } from "@/components/rw3biz-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getApiErrorMessage, readJsonSafely } from "@/lib/queryClient";
import { ChevronLeft, ChevronRight, Loader2, Plus, Trash2 } from "lucide-react";
import { SuccessPanel } from "@/components/gov/success-panel";
import { Visitrw3SyaratPanel } from "@/components/gov/visitrw3-syarat-panel";
import { FeatureExplain } from "@/components/gov/feature-explain";
import { FormStepper } from "@/components/gov/form-stepper";
import { settingsRowsToMap } from "@/lib/visitrw3-kontribusi";
import { RW3BIZ_ROUTES } from "@/lib/rw3biz-routes";
import { PilihTermin } from "@/components/gov/pilih-termin";
import {
  EstimasiKontribusiCard,
  JENIS_TEMPAT_BIZ_OPTIONS,
  OrangKontribusiFields,
  UsahaKontribusiFields,
  bizFormDariData,
  bizKontribusiPayload,
  validateBizKontribusi,
  validateOrangKontribusi,
  type BizKontribusiForm,
} from "@/components/rw3biz/kontribusi-form";
import {
  ASAL_ORANG_BIZ_LABEL,
  PERAN_ORANG_BIZ_LABEL,
  formatRp,
  type AsalOrangBiz,
  type PeranOrangBiz,
} from "@shared/rw3biz-kontribusi";

const TERMIN_OPTIONS = [
  { value: "1", label: "1 bulan" },
  { value: "3", label: "3 bulan" },
  { value: "6", label: "6 bulan" },
  { value: "12", label: "1 tahun" },
];

const LANGKAH = [
  { id: "cari", label: "Verifikasi" },
  { id: "usaha", label: "Data usaha" },
  { id: "pegawai", label: "Pegawai" },
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
  kontribusiBulanan: number | null;
  dataUsaha: Parameters<typeof bizFormDariData>[0] & { jenisTempatUsaha: string };
  orang: {
    id: number;
    namaLengkap: string;
    isAnak: boolean;
    isPenanggungJawab: boolean;
    peran: string | null;
    asal: string | null;
    domisili: string | null;
    cocokWarga: boolean;
    nikSamar: string | null;
  }[];
};

type OrangLamaForm = { id: number; tetap: boolean; peran: string; asal: string; domisili: string };

type OrangBaruForm = {
  namaLengkap: string;
  nik: string;
  tanggalLahir: string;
  jenisKelamin: string;
  nomorWhatsapp: string;
  peran: string;
  asal: string;
  domisili: string;
};

const orangBaruKosong = (): OrangBaruForm => ({
  namaLengkap: "",
  nik: "",
  tanggalLahir: "",
  jenisKelamin: "",
  nomorWhatsapp: "",
  peran: "pekerja_harian",
  asal: "",
  domisili: "",
});

function validasiOrangBaru(o: OrangBaruForm): string | null {
  if (o.namaLengkap.trim().length < 2) return "Isi nama lengkap";
  if (o.nik.length !== 16) return "NIK harus 16 digit";
  if (!o.tanggalLahir) return "Isi tanggal lahir";
  if (!o.jenisKelamin) return "Pilih jenis kelamin";
  const pj = o.peran === "pemilik" || o.peran === "penanggung_jawab";
  if (pj && o.nomorWhatsapp.replace(/\D/g, "").length < 10) return "Pemilik / PJ wajib mengisi nomor WhatsApp";
  return validateOrangKontribusi(o);
}

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
  const [orangLama, setOrangLama] = useState<OrangLamaForm[]>([]);
  const [orangBaru, setOrangBaru] = useState<OrangBaruForm[]>([]);
  const [terminBulan, setTerminBulan] = useState("6");
  const [catatan, setCatatan] = useState("");
  const [setuju, setSetuju] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [hasil, setHasil] = useState<{ nomorBiz: string; nomorInduk: string | null } | null>(null);

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
      setOrangLama(
        d.orang
          .filter((o) => !o.isAnak)
          .map((o) => ({
            id: o.id,
            tetap: true,
            peran: o.peran ?? "",
            asal: o.asal ?? (o.cocokWarga ? "rw3" : ""),
            domisili: o.domisili ?? "",
          })),
      );
      if (d.terminBulan && TERMIN_OPTIONS.some((t) => t.value === String(d.terminBulan))) setTerminBulan(String(d.terminBulan));
      setGalat(null);
      setLangkah(1);
    },
    onError: (e: unknown) => setGalat(getApiErrorMessage(e)),
  });

  const ubahLama = (id: number, patch: Partial<OrangLamaForm>) =>
    setOrangLama((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  const ubahBaru = (i: number, patch: Partial<OrangBaruForm>) =>
    setOrangBaru((prev) => prev.map((o, j) => (j === i ? { ...o, ...patch } : o)));

  const previewPayload = useMemo(() => {
    if (!biz || !jenisTempat || validateBizKontribusi(biz, jenisTempat)) return null;
    const orang = [
      ...orangLama.filter((o) => o.tetap && o.peran && o.asal).map((o) => ({ isAnak: false, peran: o.peran, asal: o.asal, domisili: null })),
      ...orangBaru.filter((o) => o.peran && o.asal).map((o) => ({ isAnak: false, peran: o.peran, asal: o.asal, domisili: null })),
    ];
    if (!orang.length) return null;
    return { jenisTempatUsaha: jenisTempat, ...bizKontribusiPayload(biz, jamBuka, jamTutup), jamBuka, jamTutup, orang };
  }, [biz, jenisTempat, jamBuka, jamTutup, orangLama, orangBaru]);

  const kunciKontribusi = `${terminBulan}|${JSON.stringify(previewPayload)}`;
  useEffect(() => {
    setSetuju(false);
  }, [kunciKontribusi]);

  function cekPegawai(): string | null {
    if (!lama) return "Muat data usaha dulu";
    for (const o of orangLama.filter((x) => x.tetap)) {
      const err = validateOrangKontribusi(o);
      const nama = lama.orang.find((x) => x.id === o.id)?.namaLengkap ?? "Orang";
      if (err) return `${nama}: ${err}`;
    }
    for (let i = 0; i < orangBaru.length; i++) {
      const err = validasiOrangBaru(orangBaru[i]);
      if (err) return `Pegawai baru ${i + 1}: ${err}`;
    }
    const total = orangLama.filter((o) => o.tetap).length + orangBaru.length;
    if (!total) return "Minimal satu orang (pemilik / PJ) harus tetap terdata";
    return null;
  }

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
        orangLama: orangLama.map((o) => ({
          id: o.id,
          tetap: o.tetap,
          peran: o.peran || undefined,
          asal: o.asal || undefined,
          domisili: o.asal === "luar" ? o.domisili.trim() || null : null,
        })),
        orangBaru: orangBaru.map((o) => ({
          namaLengkap: o.namaLengkap.trim(),
          tanggalLahir: o.tanggalLahir,
          isAnak: false,
          isPenanggungJawab: false,
          nik: o.nik,
          nomorWhatsapp: o.nomorWhatsapp.trim() || null,
          jenisKelamin: o.jenisKelamin,
          namaTempatKerja: lama.namaUsaha,
          punyaKendaraan: false,
          peran: o.peran,
          asal: o.asal,
          domisili: o.asal === "luar" ? o.domisili.trim() || null : null,
        })),
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
            "Pengurus memeriksa data baru (bisa survey ulang), lalu menetapkan kontribusi.",
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
                memperbarui, cek ulang data pegawai dan kendaraan operasional — keduanya ikut menentukan kontribusi.
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
                RT {String(lama.rt).padStart(2, "0")} · {lama.alamat} · izin habis {lama.tanggalHabis}
                {lama.kontribusiBulanan != null ? ` · kontribusi sekarang ${formatRp(lama.kontribusiBulanan)}/bulan` : ""}
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
            <EstimasiKontribusiCard payload={previewPayload} sementara="Dihitung dengan data pegawai periode lalu; ikut berubah di langkah berikutnya." />
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
            <div>
              <p className="font-semibold">Pemilik & pegawai</p>
              <p className="text-xs text-muted-foreground">
                Semua yang bekerja di usaha wajib terdata. Hapus centang bagi yang sudah berhenti; tambahkan pegawai baru di bawah.
              </p>
            </div>
            <div className="space-y-3">
              {orangLama.map((o) => {
                const info = lama.orang.find((x) => x.id === o.id);
                return (
                  <div key={o.id} className={`rounded-xl border p-3 space-y-2 ${o.tetap ? "bg-card" : "bg-muted/30 opacity-70"}`}>
                    <label className="flex items-start gap-2">
                      <Checkbox checked={o.tetap} onCheckedChange={(v) => ubahLama(o.id, { tetap: v === true })} className="mt-0.5" />
                      <span className="min-w-0">
                        <span className="block font-medium text-sm">
                          {info?.namaLengkap}
                          {info?.isPenanggungJawab ? " · PJ" : ""}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {info?.nikSamar ?? "-"} · {o.tetap ? "masih bekerja" : "sudah berhenti"}
                          {info?.cocokWarga ? " · terdata warga RW 03" : ""}
                        </span>
                      </span>
                    </label>
                    {o.tetap &&
                      (info?.cocokWarga && o.peran ? (
                        <p className="text-xs text-muted-foreground">
                          {PERAN_ORANG_BIZ_LABEL[o.peran as PeranOrangBiz] ?? o.peran} · {ASAL_ORANG_BIZ_LABEL.rw3}
                        </p>
                      ) : (
                        <OrangKontribusiFields peran={o.peran} asal={o.asal} domisili={o.domisili} onChange={(p) => ubahLama(o.id, p)} />
                      ))}
                  </div>
                );
              })}
              {orangBaru.map((o, i) => (
                <div key={i} className="rounded-xl border-2 border-brand/30 bg-card p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">Pegawai baru {i + 1}</p>
                    <Button variant="ghost" size="sm" onClick={() => setOrangBaru((p) => p.filter((_, j) => j !== i))}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <OrangKontribusiFields peran={o.peran} asal={o.asal} domisili={o.domisili} onChange={(p) => ubahBaru(i, p)} />
                  <Input className="h-11" placeholder="Nama lengkap sesuai KTP" value={o.namaLengkap} onChange={(e) => ubahBaru(i, { namaLengkap: e.target.value })} />
                  <Input
                    className="h-11 tracking-wider"
                    inputMode="numeric"
                    placeholder="NIK 16 digit"
                    value={o.nik}
                    onChange={(e) => ubahBaru(i, { nik: e.target.value.replace(/\D/g, "").slice(0, 16) })}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input type="date" className="h-11" value={o.tanggalLahir} onChange={(e) => ubahBaru(i, { tanggalLahir: e.target.value })} />
                    <Select value={o.jenisKelamin || undefined} onValueChange={(v) => ubahBaru(i, { jenisKelamin: v })}>
                      <SelectTrigger className="h-11"><SelectValue placeholder="Jenis kelamin" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Laki-laki">Laki-laki</SelectItem>
                        <SelectItem value="Perempuan">Perempuan</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Input
                    className="h-11"
                    type="tel"
                    inputMode="tel"
                    placeholder={o.peran === "pemilik" || o.peran === "penanggung_jawab" ? "Nomor WhatsApp (wajib)" : "Nomor WhatsApp (opsional)"}
                    value={o.nomorWhatsapp}
                    onChange={(e) => ubahBaru(i, { nomorWhatsapp: e.target.value.replace(/[^\d+\s-]/g, "") })}
                  />
                </div>
              ))}
              <Button variant="outline" className="w-full gap-1.5" onClick={() => setOrangBaru((p) => [...p, orangBaruKosong()])}>
                <Plus className="w-4 h-4" /> Tambah pegawai baru
              </Button>
            </div>
            <EstimasiKontribusiCard payload={previewPayload} sementara="Ikut berubah saat pegawai ditambah, dihapus, atau asalnya diubah." />
            {galat && <p className="text-sm text-destructive">{galat}</p>}
            <Navigasi
              lanjut={() => {
                const err = cekPegawai();
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
            <Visitrw3SyaratPanel
              tataMasyarakat={settingsMap.tata_tertib_masyarakat ?? ""}
              tataKhusus={settingsMap.tata_tertib_penyewa ?? ""}
              kontribusi={<EstimasiKontribusiCard payload={previewPayload} terminBulan={parseInt(terminBulan, 10)} />}
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
