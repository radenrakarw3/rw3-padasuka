import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, ScrollText, Eye, Download, Loader2 } from "lucide-react";
import type { SuratRw } from "@shared/schema";
import KopSurat from "@/components/kop-surat";
import { generateSuratPDF } from "@/lib/pdf-surat";

type FormField = {
  key: string;
  label: string;
  placeholder: string;
  type?: "text" | "date" | "time" | "textarea";
  required?: boolean;
};

type JenisSuratConfig = {
  value: string;
  label: string;
  perihalLabel: string;
  perihalPlaceholder: string;
  fields: FormField[];
};

const jenisSuratConfigs: JenisSuratConfig[] = [
  {
    value: "Surat Undangan",
    label: "Surat Undangan",
    perihalLabel: "Perihal / Tema Undangan",
    perihalPlaceholder: "Contoh: Rapat Koordinasi RT/RW, Musyawarah Warga",
    fields: [
      { key: "tujuan", label: "Ditujukan Kepada", placeholder: "Contoh: Ketua RT 01-07, Seluruh Warga RW 03", required: true },
      { key: "tanggalAcara", label: "Hari/Tanggal Acara", placeholder: "Contoh: Sabtu, 15 Maret 2026", required: true },
      { key: "waktuAcara", label: "Waktu Acara", placeholder: "Contoh: 19.30 WIB (Ba'da Isya)", required: true },
      { key: "tempatAcara", label: "Tempat Acara", placeholder: "Contoh: Balai RW 03, Musholla Al-Ikhlas", required: true },
      { key: "acara", label: "Agenda / Acara", placeholder: "Contoh: 1. Pembahasan iuran, 2. Laporan keuangan", type: "textarea" },
      { key: "tanggalSurat", label: "Tanggal Surat", placeholder: "", type: "date" },
    ],
  },
  {
    value: "Surat Undangan Klarifikasi",
    label: "Surat Undangan Klarifikasi",
    perihalLabel: "Perihal Klarifikasi",
    perihalPlaceholder: "Contoh: Klarifikasi Pelanggaran Tata Tertib, Klarifikasi Laporan Warga",
    fields: [
      { key: "tujuan", label: "Ditujukan Kepada (Nama/Pihak)", placeholder: "Contoh: Bapak/Ibu Ahmad, Warga RT 04", required: true },
      { key: "masalah", label: "Permasalahan yang Diklarifikasi", placeholder: "Jelaskan singkat masalah yang perlu diklarifikasi", type: "textarea", required: true },
      { key: "tanggalAcara", label: "Hari/Tanggal Klarifikasi", placeholder: "Contoh: Senin, 17 Maret 2026", required: true },
      { key: "waktuAcara", label: "Waktu", placeholder: "Contoh: 10.00 WIB", required: true },
      { key: "tempatAcara", label: "Tempat", placeholder: "Contoh: Sekretariat RW 03", required: true },
      { key: "tanggalSurat", label: "Tanggal Surat", placeholder: "", type: "date" },
    ],
  },
  {
    value: "Surat Tugas",
    label: "Surat Tugas",
    perihalLabel: "Perihal Tugas",
    perihalPlaceholder: "Contoh: Penugasan Panitia HUT RI, Tugas Pengawasan Pembangunan",
    fields: [
      { key: "namaDitugaskan", label: "Nama yang Ditugaskan", placeholder: "Contoh: Ahmad Sudrajat", required: true },
      { key: "jabatan", label: "Jabatan/Kedudukan", placeholder: "Contoh: Ketua RT 03, Sekretaris RW 03", required: true },
      { key: "tugasDetail", label: "Uraian Tugas", placeholder: "Jelaskan tugas yang diberikan secara detail", type: "textarea", required: true },
      { key: "tanggalTugas", label: "Tanggal Pelaksanaan Tugas", placeholder: "Contoh: 20 Maret s.d. 25 Maret 2026" },
      { key: "tempatTugas", label: "Tempat/Lokasi Tugas", placeholder: "Contoh: Kelurahan Padasuka" },
      { key: "tanggalSurat", label: "Tanggal Surat", placeholder: "", type: "date" },
    ],
  },
  {
    value: "Surat Permohonan Audiensi",
    label: "Surat Permohonan Audiensi",
    perihalLabel: "Topik Audiensi",
    perihalPlaceholder: "Contoh: Permohonan Perbaikan Jalan, Peningkatan Keamanan Lingkungan",
    fields: [
      { key: "tujuan", label: "Ditujukan Kepada (Instansi/Pejabat)", placeholder: "Contoh: Lurah Padasuka, Camat Cimahi Tengah, Dinas PU", required: true },
      { key: "latarBelakang", label: "Latar Belakang / Alasan Audiensi", placeholder: "Jelaskan alasan dan tujuan audiensi", type: "textarea", required: true },
      { key: "tanggalDimohon", label: "Tanggal yang Dimohonkan", placeholder: "Contoh: Rabu, 19 Maret 2026" },
      { key: "waktuDimohon", label: "Waktu yang Dimohonkan", placeholder: "Contoh: 09.00 WIB" },
      { key: "tanggalSurat", label: "Tanggal Surat", placeholder: "", type: "date" },
    ],
  },
  {
    value: "Surat Pengajuan Perbaikan",
    label: "Surat Pengajuan Perbaikan",
    perihalLabel: "Jenis Perbaikan",
    perihalPlaceholder: "Contoh: Perbaikan Jalan, Perbaikan Saluran Air, Perbaikan Lampu Jalan",
    fields: [
      { key: "tujuan", label: "Ditujukan Kepada (Instansi)", placeholder: "Contoh: Dinas Pekerjaan Umum Kota Cimahi", required: true },
      { key: "lokasiPerbaikan", label: "Lokasi yang Perlu Diperbaiki", placeholder: "Contoh: Jl. KH Usman Dhomiri depan RT 04", required: true },
      { key: "deskripsiKerusakan", label: "Deskripsi Kerusakan / Masalah", placeholder: "Jelaskan kondisi kerusakan secara detail", type: "textarea", required: true },
      { key: "dampak", label: "Dampak bagi Warga", placeholder: "Contoh: Mengganggu akses jalan, rawan banjir", type: "textarea" },
      { key: "tanggalSurat", label: "Tanggal Surat", placeholder: "", type: "date" },
    ],
  },
  {
    value: "Surat Pengajuan",
    label: "Surat Pengajuan",
    perihalLabel: "Perihal Pengajuan",
    perihalPlaceholder: "Contoh: Pengajuan Dana Kegiatan, Pengajuan Alat Kebersihan",
    fields: [
      { key: "tujuan", label: "Ditujukan Kepada (Instansi/Pihak)", placeholder: "Contoh: Kelurahan Padasuka, Dinas Sosial", required: true },
      { key: "deskripsiPengajuan", label: "Deskripsi Pengajuan", placeholder: "Jelaskan apa yang diajukan dan alasannya", type: "textarea", required: true },
      { key: "rincian", label: "Rincian / Item yang Diajukan (opsional)", placeholder: "Contoh: 1. Sapu lidi 20 buah, 2. Tong sampah 5 unit", type: "textarea" },
      { key: "tanggalSurat", label: "Tanggal Surat", placeholder: "", type: "date" },
    ],
  },
  {
    value: "Surat Permohonan Bantuan",
    label: "Surat Permohonan Bantuan",
    perihalLabel: "Jenis Bantuan yang Dimohon",
    perihalPlaceholder: "Contoh: Bantuan Material Bangunan, Bantuan Sosial, Bantuan Bencana",
    fields: [
      { key: "tujuan", label: "Ditujukan Kepada (Instansi/Donatur)", placeholder: "Contoh: Dinas Sosial Kota Cimahi, BAZNAS", required: true },
      { key: "latarBelakang", label: "Latar Belakang / Alasan Permohonan", placeholder: "Jelaskan kondisi dan alasan membutuhkan bantuan", type: "textarea", required: true },
      { key: "rincianBantuan", label: "Rincian Bantuan yang Dimohon", placeholder: "Contoh: 50 sak semen, 100 batang besi", type: "textarea" },
      { key: "jumlahPenerima", label: "Jumlah Penerima Manfaat", placeholder: "Contoh: 150 KK di RW 03" },
      { key: "tanggalSurat", label: "Tanggal Surat", placeholder: "", type: "date" },
    ],
  },
  {
    value: "Surat Edaran",
    label: "Surat Edaran",
    perihalLabel: "Perihal Edaran",
    perihalPlaceholder: "Contoh: Jadwal Kerja Bakti, Himbauan Keamanan, Info Pembayaran Iuran",
    fields: [
      { key: "tujuan", label: "Ditujukan Kepada", placeholder: "Contoh: Seluruh Warga RW 03, Ketua RT 01-07", required: true },
      { key: "isiEdaran", label: "Isi / Pesan Edaran", placeholder: "Jelaskan informasi yang ingin diedarkan", type: "textarea", required: true },
      { key: "tanggalBerlaku", label: "Tanggal Berlaku / Pelaksanaan (opsional)", placeholder: "Contoh: Mulai 1 April 2026" },
      { key: "tanggalSurat", label: "Tanggal Surat", placeholder: "", type: "date" },
    ],
  },
];

export default function AdminSuratRw() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewSurat, setPreviewSurat] = useState<SuratRw | null>(null);
  const [jenisSurat, setJenisSurat] = useState("");
  const [perihal, setPerihal] = useState("");
  const [extraFields, setExtraFields] = useState<Record<string, string>>({});

  const selectedConfig = useMemo(() => jenisSuratConfigs.find(c => c.value === jenisSurat), [jenisSurat]);

  const { data: suratList, isLoading } = useQuery<SuratRw[]>({ queryKey: ["/api/surat-rw"] });

  const resetForm = () => {
    setJenisSurat("");
    setPerihal("");
    setExtraFields({});
  };

  const isFormValid = useMemo(() => {
    if (!jenisSurat || !perihal) return false;
    if (!selectedConfig) return false;
    return selectedConfig.fields
      .filter(f => f.required)
      .every(f => (extraFields[f.key] || "").trim() !== "");
  }, [jenisSurat, perihal, selectedConfig, extraFields]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const tujuan = extraFields.tujuan || "";
      const tanggalSurat = extraFields.tanggalSurat || "";

      const contextParts: string[] = [];
      if (selectedConfig) {
        for (const field of selectedConfig.fields) {
          const val = extraFields[field.key];
          if (val && field.key !== "tujuan" && field.key !== "tanggalSurat") {
            contextParts.push(`${field.label}: ${val}`);
          }
        }
      }
      const konteks = contextParts.join("\n");

      const res = await apiRequest("POST", "/api/surat-rw", {
        jenisSurat,
        perihal,
        tujuan: tujuan || undefined,
        tanggalSurat: tanggalSurat || undefined,
        konteks: konteks || undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Surat RW berhasil dibuat!" });
      setDialogOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["/api/surat-rw"] });
    },
    onError: (err: any) => toast({ title: "Gagal", description: err.message, variant: "destructive" }),
  });

  const handleDownload = async (surat: SuratRw) => {
    if (!surat.isiSurat) return;
    try {
      await generateSuratPDF({
        nomorSurat: surat.nomorSurat,
        isiSurat: surat.isiSurat,
        jenisSurat: surat.jenisSurat,
        fileName: `${surat.jenisSurat.replace(/\s/g, "_")}_${surat.nomorSurat?.replace(/\//g, "-") || surat.id}`,
      });
    } catch {
      toast({ title: "Gagal membuat PDF", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold" data-testid="text-surat-rw-title">Surat Sakti RW</h2>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-1.5" data-testid="button-buat-surat-rw">
              <Plus className="w-4 h-4" /> Buat Surat
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Buat Surat RW</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-sm font-medium">Jenis Surat</Label>
                <Select value={jenisSurat} onValueChange={v => { setJenisSurat(v); setExtraFields({}); setPerihal(""); }}>
                  <SelectTrigger className="h-10" data-testid="select-jenis-surat-rw"><SelectValue placeholder="Pilih jenis surat" /></SelectTrigger>
                  <SelectContent>
                    {jenisSuratConfigs.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {selectedConfig && (
                <>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">
                      {selectedConfig.perihalLabel} <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={perihal}
                      onChange={e => setPerihal(e.target.value)}
                      placeholder={selectedConfig.perihalPlaceholder}
                      className="h-10"
                      data-testid="input-perihal-surat-rw"
                    />
                  </div>

                  {selectedConfig.fields.map(field => (
                    <div key={field.key} className="space-y-1">
                      <Label className="text-sm font-medium">
                        {field.label} {field.required && <span className="text-red-500">*</span>}
                      </Label>
                      {field.type === "textarea" ? (
                        <Textarea
                          value={extraFields[field.key] || ""}
                          onChange={e => setExtraFields({ ...extraFields, [field.key]: e.target.value })}
                          placeholder={field.placeholder}
                          rows={3}
                          className="text-sm"
                          data-testid={`input-${field.key}`}
                        />
                      ) : (
                        <Input
                          type={field.type || "text"}
                          value={extraFields[field.key] || ""}
                          onChange={e => setExtraFields({ ...extraFields, [field.key]: e.target.value })}
                          placeholder={field.placeholder}
                          className="h-10"
                          data-testid={`input-${field.key}`}
                        />
                      )}
                    </div>
                  ))}

                  <Button
                    className="w-full h-10"
                    onClick={() => createMutation.mutate()}
                    disabled={createMutation.isPending || !isFormValid}
                    data-testid="button-generate-surat-rw"
                  >
                    {createMutation.isPending ? (
                      <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Membuat surat...</>
                    ) : (
                      "Generate Surat dengan AI"
                    )}
                  </Button>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      ) : suratList?.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <ScrollText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Belum ada surat RW</p>
          </CardContent>
        </Card>
      ) : (
        suratList?.map(s => (
          <Card key={s.id} data-testid={`card-surat-rw-${s.id}`}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-sm">{s.jenisSurat}</p>
                  <p className="text-xs text-muted-foreground">{s.perihal}</p>
                  {s.tujuan && <p className="text-xs text-muted-foreground">Kepada: {s.tujuan}</p>}
                  {s.nomorSurat && <p className="text-xs font-medium text-primary">No: {s.nomorSurat}</p>}
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="gap-1" onClick={() => setPreviewSurat(s)} data-testid={`button-preview-rw-${s.id}`}>
                  <Eye className="w-3 h-3" /> Lihat
                </Button>
                <Button size="sm" variant="outline" className="gap-1" onClick={() => handleDownload(s)} data-testid={`button-download-rw-${s.id}`}>
                  <Download className="w-3 h-3" /> Download
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                {s.createdAt ? new Date(s.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : ""}
              </p>
            </CardContent>
          </Card>
        ))
      )}

      <Dialog open={!!previewSurat} onOpenChange={() => setPreviewSurat(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewSurat?.jenisSurat}</DialogTitle>
          </DialogHeader>
          <div className="bg-white p-6 rounded-md border shadow-sm">
            <KopSurat />
            {previewSurat?.nomorSurat && (
              <p className="text-xs font-mono mb-1">Nomor    : {previewSurat.nomorSurat}</p>
            )}
            <pre className="text-xs whitespace-pre-wrap font-mono" data-testid="text-surat-rw-preview">
              {previewSurat?.isiSurat?.replace(/^Nomor\s*:.*\n?/m, "").trim()}
            </pre>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
