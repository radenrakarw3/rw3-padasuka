import { useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Briefcase,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Edit2,
  FileCheck2,
  HeartPulse,
  Home,
  IdCard,
  MapPin,
  Phone,
  RefreshCw,
  Shield,
  UserRound,
  Wallet,
  X,
} from "lucide-react";
import type { KartuKeluarga, Warga, ProfileEditRequest } from "@shared/schema";
import {
  pekerjaanOptions,
  pendidikanOptions,
  agamaOptions,
  jenisKelaminOptions,
  statusPerkawinanOptions,
  kedudukanKeluargaOptions,
  statusKependudukanOptions,
  statusDisabilitasOptions,
  kondisiKesehatanOptions,
  penghasilanBulananOptions,
  kategoriEkonomiOptions,
  golonganDarahOptions,
  hubunganKontakDaruratOptions,
  jenjangSekolahOptions,
  semesterOptions,
  statusPekerjaanOptions,
  bidangPartisipasiOptions,
} from "@/lib/constants";
import {
  REQUIRED_KK_FIELDS,
  REQUIRED_WARGA_FIELDS,
  useProfileCompleteness,
} from "@/lib/useProfileCompleteness";
import { wargaAnggotaQueryOptions, wargaKkQueryOptions } from "@/lib/warga-prefetch";

const fieldLabels: Record<string, string> = {
  namaLengkap: "Nama Lengkap",
  nik: "NIK",
  nomorWhatsapp: "No. WhatsApp",
  jenisKelamin: "Jenis Kelamin",
  statusPerkawinan: "Status Kawin",
  agama: "Agama",
  kedudukanKeluarga: "Kedudukan",
  tempatLahir: "Tempat Lahir",
  tanggalLahir: "Tanggal Lahir",
  pekerjaan: "Pekerjaan",
  pendidikan: "Pendidikan",
  statusKependudukan: "Status",
  kondisiKesehatan: "Kondisi Kesehatan",
  statusDisabilitas: "Status Disabilitas",
  ibuHamil: "Status Kehamilan",
  nomorWhatsappAlternatif: "No. WhatsApp Alternatif",
  email: "Email",
  alamatDomisili: "Alamat Domisili",
  namaKontakDarurat: "Nama Kontak Darurat",
  hubunganKontakDarurat: "Hubungan Kontak Darurat",
  nomorKontakDarurat: "Nomor Kontak Darurat",
  golonganDarah: "Golongan Darah",
  statusEktp: "Status e-KTP",
  namaSekolah: "Nama Sekolah",
  jenjangSekolah: "Jenjang Sekolah",
  kelas: "Kelas",
  jurusan: "Jurusan",
  namaKampus: "Nama Kampus",
  semester: "Semester",
  keahlian: "Keahlian",
  statusPekerjaan: "Status Pekerjaan",
  namaTempatKerja: "Nama Tempat Kerja",
  alamatTempatKerja: "Alamat Tempat Kerja",
  penghasilanPribadi: "Penghasilan Pribadi",
  sumberPenghasilan: "Sumber Penghasilan",
  punyaBpjsKesehatan: "BPJS Kesehatan",
  nomorBpjsKesehatan: "Nomor BPJS",
  punyaPenyakitKronis: "Punya Penyakit Kronis",
  penyakitKronis: "Penyakit Kronis",
  alergi: "Alergi",
  riwayatRawatInap: "Riwayat Rawat Inap",
  butuhPendampinganKesehatan: "Butuh Pendampingan Kesehatan",
  aktifKegiatanRw: "Aktif Kegiatan RW",
  bidangPartisipasi: "Bidang Partisipasi",
  jabatanKomunitas: "Jabatan Komunitas",
  penghasilanBulanan: "Penghasilan Bulanan Keluarga",
  kategoriEkonomi: "Kategori Ekonomi",
};

const sectionMeta = {
  contact: { label: "Kontak & identitas", icon: IdCard },
  personal: { label: "Status pribadi", icon: UserRound },
  work: { label: "Pekerjaan & pendidikan", icon: Briefcase },
  health: { label: "Kesehatan & kondisi khusus", icon: HeartPulse },
  participation: { label: "Partisipasi warga", icon: Home },
} as const;

type EditSection = keyof typeof sectionMeta;

function maskNik(nik: string | null): string {
  if (!nik || nik.length < 6) return "••••••••••••••••";
  return nik.slice(0, 4) + "••••••••" + nik.slice(-4);
}

function maskKk(nomorKk: string | null | undefined): string {
  if (!nomorKk || nomorKk.length < 6) return "••••••••••••••••";
  return nomorKk.slice(0, 4) + "••••••••" + nomorKk.slice(-4);
}

function getInitials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

function getAgeValue(tanggalLahir: string | null | undefined): number | null {
  if (!tanggalLahir) return null;
  const birth = new Date(tanggalLahir);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  if (today.getMonth() - birth.getMonth() < 0 || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

function getAgeLabel(tanggalLahir: string | null | undefined): string {
  const age = getAgeValue(tanggalLahir);
  return age == null ? "" : `${age} thn`;
}

function formatDateId(value?: string | null): string {
  if (!value) return "Belum diisi";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

function defaultFieldFilled(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (typeof value === "boolean") return true;
  return true;
}

function isFieldFilled(obj: Record<string, unknown>, field: { key: string; check?: (value: unknown) => boolean }) {
  const checker = field.check ?? defaultFieldFilled;
  return checker(obj[field.key]);
}

function getRequiredMemberFields(member: Warga) {
  const isKepala = member.kedudukanKeluarga === "Kepala Keluarga";
  if (isKepala) return REQUIRED_WARGA_FIELDS;
  const age = getAgeValue(member.tanggalLahir);
  if (age !== null && age < 16) return [];
  if (member.statusKependudukan !== "Aktif") return [];
  return REQUIRED_WARGA_FIELDS.filter((field) => field.key === "nomorWhatsapp" || field.key === "tanggalLahir");
}

function getMissingKeysForMember(member: Warga) {
  return getRequiredMemberFields(member)
    .filter((field) => !isFieldFilled(member as unknown as Record<string, unknown>, field))
    .map((field) => field.key);
}

function getMemberStatus(member: Warga, pendingEdit: ProfileEditRequest | undefined, missingKeys: string[]) {
  if (pendingEdit) {
    return { label: "Menunggu review", tone: "amber" as const };
  }
  if (missingKeys.length > 0) {
    return { label: "Perlu dilengkapi", tone: "red" as const };
  }
  return { label: "Lengkap", tone: "green" as const };
}

function getSectionFields(section: EditSection) {
  if (section === "contact") return ["namaLengkap", "nomorWhatsapp", "nomorWhatsappAlternatif", "email", "tempatLahir", "tanggalLahir", "golonganDarah", "alamatDomisili", "namaKontakDarurat", "hubunganKontakDarurat", "nomorKontakDarurat"];
  if (section === "personal") return ["jenisKelamin", "agama", "statusPerkawinan", "kedudukanKeluarga", "statusKependudukan", "statusEktp"];
  if (section === "work") return ["pekerjaan", "pendidikan", "namaSekolah", "jenjangSekolah", "kelas", "jurusan", "namaKampus", "semester", "keahlian", "statusPekerjaan", "namaTempatKerja", "alamatTempatKerja", "penghasilanPribadi", "sumberPenghasilan"];
  if (section === "participation") return ["aktifKegiatanRw", "bidangPartisipasi", "jabatanKomunitas"];
  return ["kondisiKesehatan", "statusDisabilitas", "ibuHamil", "punyaBpjsKesehatan", "nomorBpjsKesehatan", "punyaPenyakitKronis", "penyakitKronis", "alergi", "riwayatRawatInap", "butuhPendampinganKesehatan"];
}

export default function WargaProfil() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingSection, setEditingSection] = useState<EditSection | null>(null);
  const [editData, setEditData] = useState<Record<string, string>>({});
  const [editingEkonomi, setEditingEkonomi] = useState(false);
  const [ekonomiForm, setEkonomiForm] = useState({ penghasilanBulanan: "", kategoriEkonomi: "" });

  const anggotaRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const statusSectionRef = useRef<HTMLDivElement | null>(null);
  const ekonomiSectionRef = useRef<HTMLDivElement | null>(null);

  const { data: kk, isLoading: kkLoading } = useQuery(wargaKkQueryOptions(user?.kkId));
  const { data: anggota, isLoading: wargaLoading } = useQuery(wargaAnggotaQueryOptions(user?.kkId));
  const { data: editRequests = [] } = useQuery<ProfileEditRequest[]>({
    queryKey: ["/api/profile-edits"],
  });

  const rawCompleteness = useProfileCompleteness(anggota, kk ?? undefined);

  const kepalaKeluarga = useMemo(
    () => anggota?.find((item) => item.kedudukanKeluarga === "Kepala Keluarga") ?? anggota?.[0],
    [anggota],
  );

  const pendingEdits = useMemo(
    () => editRequests.filter((item) => item.status === "pending"),
    [editRequests],
  );

  const pendingByWargaId = useMemo(() => {
    const map = new Map<number, ProfileEditRequest>();
    for (const item of pendingEdits) {
      if (!map.has(item.wargaId)) map.set(item.wargaId, item);
    }
    return map;
  }, [pendingEdits]);

  const kkFieldsForProfile = useMemo(
    () => REQUIRED_KK_FIELDS.filter((field) => field.key !== "fotoKk"),
    [],
  );

  const kkMissingKeys = useMemo(() => {
    if (!kk) return [];
    return kkFieldsForProfile
      .filter((field) => !isFieldFilled(kk as unknown as Record<string, unknown>, field))
      .map((field) => field.key);
  }, [kk, kkFieldsForProfile]);

  const memberMissingMap = useMemo(() => {
    const map = new Map<number, string[]>();
    for (const member of anggota ?? []) {
      map.set(member.id, getMissingKeysForMember(member));
    }
    return map;
  }, [anggota]);

  const completeness = useMemo(() => {
    const fotoKkMissing = rawCompleteness.missingFields.filter((item) => item.key === "fotoKk").length;
    const totalRequired = Math.max(0, rawCompleteness.totalRequired - 1);
    const totalFilled = Math.max(0, rawCompleteness.totalFilled - (fotoKkMissing ? 0 : 1));
    const missingFields = rawCompleteness.missingFields.filter((item) => item.key !== "fotoKk");
    const completionPercent = totalRequired === 0 ? 100 : Math.round((totalFilled / totalRequired) * 100);
    return {
      ...rawCompleteness,
      missingFields,
      totalRequired,
      totalFilled,
      completionPercent,
      isComplete: missingFields.length === 0,
    };
  }, [rawCompleteness]);

  const priorityTasks = useMemo(() => {
    const tasks: Array<{
      key: string;
      label: string;
      description: string;
      target: "status" | "ekonomi" | "anggota";
      wargaId?: number;
      section?: EditSection;
    }> = [];

    if (kkMissingKeys.includes("penghasilanBulanan")) {
      tasks.push({
        key: "kk-penghasilan",
        label: "Isi penghasilan keluarga",
        description: "Data ekonomi membantu pemetaan sosial keluarga di level RW.",
        target: "ekonomi",
      });
    }

    for (const member of anggota ?? []) {
      if (pendingByWargaId.has(member.id)) continue;
      const missingKeys = memberMissingMap.get(member.id) ?? [];
      for (const key of missingKeys) {
        const section = key === "pekerjaan" || key === "pendidikan"
          ? "work"
          : key === "kondisiKesehatan" || key === "statusDisabilitas" || key === "ibuHamil"
            ? "health"
            : key === "jenisKelamin" || key === "agama" || key === "statusPerkawinan" || key === "kedudukanKeluarga" || key === "statusKependudukan"
              ? "personal"
              : "contact";
        tasks.push({
          key: `${member.id}-${key}`,
          label: `${fieldLabels[key] || key} untuk ${member.namaLengkap.split(" ")[0]}`,
          description: `${member.namaLengkap} masih perlu melengkapi ${fieldLabels[key] || key}.`,
          target: "anggota",
          wargaId: member.id,
          section,
        });
      }
    }
    return tasks.slice(0, 3);
  }, [anggota, kkMissingKeys, memberMissingMap, pendingByWargaId]);

  const updateEkonomi = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", "/api/kk/self", {
        penghasilanBulanan: ekonomiForm.penghasilanBulanan || null,
        kategoriEkonomi: ekonomiForm.kategoriEkonomi || null,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Data ekonomi disimpan" });
      setEditingEkonomi(false);
      queryClient.invalidateQueries({ queryKey: ["/api/kk", user?.kkId] });
    },
    onError: (err: any) => {
      toast({ title: "Gagal menyimpan", description: err.message, variant: "destructive" });
    },
  });

  const submitEdit = useMutation({
    mutationFn: async (data: { wargaId: number; kkId: number; changes: Record<string, string> }) => {
      await apiRequest("POST", "/api/profile-edits", {
        wargaId: data.wargaId,
        kkId: data.kkId,
        fieldChanges: data.changes,
      });
    },
    onSuccess: () => {
      toast({ title: "Perubahan diajukan", description: "Menunggu persetujuan admin" });
      setEditingId(null);
      setEditingSection(null);
      setEditData({});
      queryClient.invalidateQueries({ queryKey: ["/api/profile-edits"] });
    },
    onError: (err: any) => {
      const msg = err.message.includes(":") ? err.message.split(":").slice(1).join(":").trim() : err.message;
      let parsed = msg;
      try {
        parsed = JSON.parse(msg).message;
      } catch {
        parsed = msg;
      }
      toast({ title: "Gagal mengajukan", description: parsed, variant: "destructive" });
    },
  });

  if (kkLoading || wargaLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full rounded-3xl" />
        <Skeleton className="h-28 w-full rounded-3xl" />
        <Skeleton className="h-80 w-full rounded-3xl" />
      </div>
    );
  }

  if (!kk || !anggota || anggota.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-8 text-center space-y-2">
          <UserRound className="w-10 h-10 mx-auto text-muted-foreground" />
          <h2 className="text-lg font-bold">Profil keluarga belum tersedia</h2>
          <p className="text-sm text-muted-foreground">Data warga belum ditemukan. Hubungi pengurus RW untuk bantuan.</p>
        </CardContent>
      </Card>
    );
  }

  function scrollToMember(wargaId: number) {
    const el = anggotaRefs.current[wargaId];
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function openMemberAction(member: Warga, section?: EditSection) {
    setExpandedId(member.id);
    if (section) {
      if (pendingByWargaId.has(member.id)) return;
      setEditingId(member.id);
      setEditingSection(section);
      setEditData({
        namaLengkap: member.namaLengkap || "",
        nik: member.nik || "",
        nomorWhatsapp: member.nomorWhatsapp || "",
        nomorWhatsappAlternatif: (member as any).nomorWhatsappAlternatif || "",
        email: (member as any).email || "",
        jenisKelamin: member.jenisKelamin || "",
        statusPerkawinan: member.statusPerkawinan || "",
        agama: member.agama || "",
        kedudukanKeluarga: member.kedudukanKeluarga || "",
        tempatLahir: member.tempatLahir || "",
        tanggalLahir: member.tanggalLahir || "",
        golonganDarah: (member as any).golonganDarah || "",
        alamatDomisili: (member as any).alamatDomisili || "",
        namaKontakDarurat: (member as any).namaKontakDarurat || "",
        hubunganKontakDarurat: (member as any).hubunganKontakDarurat || "",
        nomorKontakDarurat: (member as any).nomorKontakDarurat || "",
        statusEktp: (member as any).statusEktp || "",
        pekerjaan: member.pekerjaan || "",
        pendidikan: member.pendidikan || "",
        namaSekolah: (member as any).namaSekolah || "",
        jenjangSekolah: (member as any).jenjangSekolah || "",
        kelas: (member as any).kelas || "",
        jurusan: (member as any).jurusan || "",
        namaKampus: (member as any).namaKampus || "",
        semester: (member as any).semester || "",
        keahlian: (member as any).keahlian || "",
        statusPekerjaan: (member as any).statusPekerjaan || "",
        namaTempatKerja: (member as any).namaTempatKerja || "",
        alamatTempatKerja: (member as any).alamatTempatKerja || "",
        penghasilanPribadi: (member as any).penghasilanPribadi || "",
        sumberPenghasilan: (member as any).sumberPenghasilan || "",
        statusKependudukan: member.statusKependudukan || "",
        kondisiKesehatan: member.kondisiKesehatan || "Sehat",
        statusDisabilitas: member.statusDisabilitas || "Tidak Ada",
        ibuHamil: member.ibuHamil ? "true" : "false",
        punyaBpjsKesehatan: (member as any).punyaBpjsKesehatan ? "true" : "false",
        nomorBpjsKesehatan: (member as any).nomorBpjsKesehatan || "",
        punyaPenyakitKronis: (member as any).punyaPenyakitKronis ? "true" : "false",
        penyakitKronis: (member as any).penyakitKronis || "",
        alergi: (member as any).alergi || "",
        riwayatRawatInap: (member as any).riwayatRawatInap || "",
        butuhPendampinganKesehatan: (member as any).butuhPendampinganKesehatan ? "true" : "false",
        aktifKegiatanRw: (member as any).aktifKegiatanRw ? "true" : "false",
        bidangPartisipasi: (member as any).bidangPartisipasi || "",
        jabatanKomunitas: (member as any).jabatanKomunitas || "",
      });
    } else {
      setEditingId(null);
      setEditingSection(null);
    }
    setTimeout(() => scrollToMember(member.id), 100);
  }

  function handlePrimaryAction() {
    if (priorityTasks.length > 0) {
      const firstTask = priorityTasks[0];
      if (firstTask.target === "ekonomi") {
        setEditingEkonomi(true);
        setEkonomiForm({
          penghasilanBulanan: kk?.penghasilanBulanan || "",
          kategoriEkonomi: kk?.kategoriEkonomi || "",
        });
        ekonomiSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      if (firstTask.target === "status") {
        statusSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      const member = anggota?.find((item) => item.id === firstTask.wargaId);
      if (member) openMemberAction(member, firstTask.section);
      return;
    }

    if (pendingEdits.length > 0) {
      statusSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    if (kepalaKeluarga) {
      openMemberAction(kepalaKeluarga);
    }
  }

  function handleCancelEdit() {
    setEditingId(null);
    setEditingSection(null);
    setEditData({});
  }

  function handleSaveSection(member: Warga, section: EditSection) {
    const fields = getSectionFields(section);
    const changes: Record<string, string> = {};
    for (const key of fields) {
      const nextValue = editData[key] ?? "";
      const currentValue = key === "ibuHamil"
        ? (member.ibuHamil ? "true" : "false")
        : String((member as any)[key] ?? (key === "kondisiKesehatan" ? "Sehat" : key === "statusDisabilitas" ? "Tidak Ada" : ""));
      if (nextValue !== currentValue) {
        changes[key] = nextValue;
      }
    }

    if (Object.keys(changes).length === 0) {
      toast({ title: "Tidak ada perubahan" });
      handleCancelEdit();
      return;
    }

    submitEdit.mutate({ wargaId: member.id, kkId: member.kkId, changes });
  }

  function setField(key: string, value: string) {
    setEditData((prev) => ({ ...prev, [key]: value }));
  }

  const heroActionLabel = priorityTasks.length > 0
    ? "Lengkapi data sekarang"
    : pendingEdits.length > 0
      ? "Lihat perubahan yang menunggu"
      : "Tinjau data keluarga";

  return (
    <div className="space-y-4">
      <Card
        className="overflow-hidden border-0 shadow-md text-white relative"
        style={{ background: "linear-gradient(160deg, hsl(163,55%,22%) 0%, hsl(163,45%,28%) 58%, hsl(40,45%,38%) 140%)" }}
      >
        <div className="pointer-events-none absolute -top-16 right-[-40px] h-44 w-44 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-[-48px] left-[-16px] h-32 w-32 rounded-full bg-[hsl(40,75%,67%)]/15 blur-3xl" />
        <CardContent className="relative p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/65">Dashboard Keluarga</p>
              <h2 className="text-2xl font-black leading-tight mt-1">Profil {completeness.completionPercent}% lengkap</h2>
              <p className="text-sm text-white/75 mt-1">
                {kepalaKeluarga?.namaLengkap || "Kepala keluarga"} · {anggota.length} anggota keluarga
              </p>
            </div>
            <div className="rounded-2xl bg-white/12 px-3 py-2 text-right backdrop-blur-sm">
              <p className="text-[10px] uppercase tracking-wide text-white/60">Status</p>
              <p className="text-sm font-semibold">{completeness.isComplete ? "Siap" : "Perlu aksi"}</p>
            </div>
          </div>

          <div className="rounded-3xl bg-white/10 p-4 backdrop-blur-sm space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5 text-[hsl(40,55%,72%)]" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-snug">{kk.alamat}</p>
                <p className="text-xs text-white/70 mt-1">
                  RT {String(kk.rt).padStart(2, "0")} / RW 03 · {kk.statusRumah} · {kk.jumlahPenghuni} penghuni
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-white/70">
                <span>Progress data inti keluarga</span>
                <span>{completeness.totalFilled}/{completeness.totalRequired} terisi</span>
              </div>
              <div className="h-2 rounded-full bg-white/15 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[hsl(40,75%,67%)] transition-all"
                  style={{ width: `${completeness.completionPercent}%` }}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2 text-[11px]">
              <span className="rounded-full bg-white/12 px-2.5 py-1 flex items-center gap-1">
                <Shield className="w-3 h-3" />
                KK {maskKk(kk.nomorKk)}
              </span>
              <span className="rounded-full bg-white/12 px-2.5 py-1">{kk.layakBansos ? "Layak bansos" : "Belum tercatat bansos"}</span>
              <span className="rounded-full bg-white/12 px-2.5 py-1">
                {pendingEdits.length > 0 ? `${pendingEdits.length} perubahan menunggu` : "Belum ada pengajuan tertunda"}
              </span>
            </div>

            <Button
              onClick={handlePrimaryAction}
              className="w-full h-12 rounded-2xl text-sm font-semibold bg-white text-[hsl(163,55%,22%)] hover:bg-white/95"
            >
              {heroActionLabel}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold">Prioritas hari ini</p>
              <p className="text-xs text-muted-foreground">Lakukan langkah paling penting tanpa membuka form panjang.</p>
            </div>
            {!completeness.isComplete && (
              <Badge className="bg-amber-100 text-amber-700 border-amber-200">{priorityTasks.length} aksi</Badge>
            )}
          </div>

          {priorityTasks.length > 0 ? (
            <div className="space-y-2">
              {priorityTasks.map((task, index) => (
                <button
                  key={task.key}
                  type="button"
                  onClick={() => {
                    if (task.target === "ekonomi") {
                      setEditingEkonomi(true);
                      setEkonomiForm({
                        penghasilanBulanan: kk.penghasilanBulanan || "",
                        kategoriEkonomi: kk.kategoriEkonomi || "",
                      });
                      ekonomiSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                      return;
                    }
                    if (task.target === "status") {
                      statusSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                      return;
                    }
                    const member = anggota.find((item) => item.id === task.wargaId);
                    if (member) openMemberAction(member, task.section);
                  }}
                  className="w-full rounded-2xl border border-gray-200 px-3.5 py-3 text-left hover:bg-[hsl(163,55%,98%)] transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-[hsl(163,55%,96%)] text-[hsl(163,55%,22%)] font-bold text-sm flex items-center justify-center flex-shrink-0">
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{task.label}</p>
                      <p className="text-xs text-muted-foreground mt-1">{task.description}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-green-200 bg-green-50 p-4 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-green-700">Semua data inti keluarga sudah lengkap</p>
                <p className="text-xs text-green-700/80 mt-1">Halaman ini sekarang jadi ringkasan keluarga dan tempat memantau perubahan data.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div ref={statusSectionRef} className="grid grid-cols-1 gap-3">
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Pengajuan</p>
              <p className="text-2xl font-black mt-1">{pendingEdits.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Menunggu review admin</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Bansos</p>
              <p className="text-sm font-bold mt-2">{kk.layakBansos ? "Layak" : "Belum"}</p>
              <p className="text-xs text-muted-foreground mt-1">{kk.kategoriEkonomi || "Belum diklasifikasi"}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Ekonomi</p>
              <p className="text-sm font-bold mt-2">{kk.penghasilanBulanan || "Belum diisi"}</p>
              <p className="text-xs text-muted-foreground mt-1">Ringkasan keluarga</p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-bold">Status & pengajuan terbaru</h3>
            </div>

            {pendingEdits.length > 0 ? (
              <div className="space-y-2">
                {pendingEdits.slice(0, 3).map((item) => {
                  const member = anggota.find((w) => w.id === item.wargaId);
                  const fields = Object.keys(item.fieldChanges as Record<string, string>);
                  return (
                    <div key={item.id} className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold">{member?.namaLengkap || "Anggota keluarga"}</p>
                        <Badge className="bg-amber-100 text-amber-700 border-amber-200">Menunggu</Badge>
                      </div>
                      <p className="text-xs text-amber-800 mt-1">
                        {fields.map((field) => fieldLabels[field] || field).join(", ")}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-200 p-4 text-sm text-muted-foreground">
                Belum ada perubahan data yang menunggu persetujuan.
              </div>
            )}

          </CardContent>
        </Card>
      </div>

      <div ref={ekonomiSectionRef}>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            <button
              type="button"
              onClick={() => {
                const nextOpen = !editingEkonomi;
                setEditingEkonomi(nextOpen);
                if (nextOpen) {
                  setEkonomiForm({
                    penghasilanBulanan: kk.penghasilanBulanan || "",
                    kategoriEkonomi: kk.kategoriEkonomi || "",
                  });
                }
              }}
              className="w-full p-4 flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[hsl(163,55%,96%)] text-[hsl(163,55%,22%)] flex items-center justify-center">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold">Ekonomi keluarga</p>
                  <p className="text-xs text-muted-foreground">{kk.penghasilanBulanan || "Belum diisi"} · {kk.kategoriEkonomi || "Belum ada kategori"}</p>
                </div>
              </div>
              {editingEkonomi ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>

            {editingEkonomi ? (
              <div className="border-t px-4 pb-4 pt-4 space-y-3">
                <p className="text-xs text-muted-foreground">Data ini dipakai untuk pemetaan sosial keluarga dan dapat diperbarui langsung oleh warga.</p>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Penghasilan bulanan keluarga</Label>
                  <Select value={ekonomiForm.penghasilanBulanan} onValueChange={(value) => setEkonomiForm((prev) => ({ ...prev, penghasilanBulanan: value }))}>
                    <SelectTrigger className="h-10 text-sm">
                      <SelectValue placeholder="Pilih kisaran penghasilan" />
                    </SelectTrigger>
                    <SelectContent>
                      {penghasilanBulananOptions.map((option) => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Kategori ekonomi</Label>
                  <Select value={ekonomiForm.kategoriEkonomi} onValueChange={(value) => setEkonomiForm((prev) => ({ ...prev, kategoriEkonomi: value }))}>
                    <SelectTrigger className="h-10 text-sm">
                      <SelectValue placeholder="Pilih kategori ekonomi" />
                    </SelectTrigger>
                    <SelectContent>
                      {kategoriEkonomiOptions.map((option) => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    disabled={!ekonomiForm.penghasilanBulanan || updateEkonomi.isPending}
                    onClick={() => updateEkonomi.mutate()}
                  >
                    {updateEkonomi.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4 mr-1" />Simpan ekonomi</>}
                  </Button>
                  <Button variant="outline" onClick={() => setEditingEkonomi(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="border-t px-4 pb-4 pt-3 text-xs space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Penghasilan</span>
                  <span className="font-medium text-right">{kk.penghasilanBulanan || "Perlu dilengkapi"}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Kategori ekonomi</span>
                  <span className="font-medium text-right">{kk.kategoriEkonomi || "Belum diisi"}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Bansos</span>
                  <span className="font-medium text-right">{kk.layakBansos ? "Layak bansos" : "Belum tercatat"}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold">Anggota keluarga</h3>
            <p className="text-xs text-muted-foreground">{anggota.length} anggota terdaftar. Buka kartu untuk detail dan aksi edit cepat.</p>
          </div>
          <Badge variant="outline">{anggota.length} orang</Badge>
        </div>

        {anggota.map((member) => {
          const pendingEdit = pendingByWargaId.get(member.id);
          const missingKeys = memberMissingMap.get(member.id) ?? [];
          const status = getMemberStatus(member, pendingEdit, missingKeys);
          const isExpanded = expandedId === member.id;
          const isEditing = editingId === member.id;

          return (
            <Card
              key={member.id}
              ref={(node) => { anggotaRefs.current[member.id] = node; }}
              className="border-0 shadow-sm scroll-mt-24"
            >
              <CardContent className="p-4 space-y-3">
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => {
                    if (isExpanded) {
                      setExpandedId(null);
                      handleCancelEdit();
                    } else {
                      setExpandedId(member.id);
                      setEditingId(null);
                      setEditingSection(null);
                    }
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold flex-shrink-0 ${member.jenisKelamin === "Perempuan" ? "bg-rose-500" : "bg-[hsl(163,55%,22%)]"}`}>
                      {getInitials(member.namaLengkap)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-bold truncate">{member.namaLengkap}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {member.kedudukanKeluarga} {getAgeLabel(member.tanggalLahir) ? `· ${getAgeLabel(member.tanggalLahir)}` : ""}
                          </p>
                        </div>
                        <Badge className={
                          status.tone === "green"
                            ? "bg-green-100 text-green-700 border-green-200"
                            : status.tone === "amber"
                              ? "bg-amber-100 text-amber-700 border-amber-200"
                              : "bg-red-100 text-red-700 border-red-200"
                        }>
                          {status.label}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Phone className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                          <span className="truncate">{member.nomorWhatsapp || "Perlu dilengkapi"}</span>
                        </div>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Briefcase className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                          <span className="truncate">{member.pekerjaan || "Belum diisi"}</span>
                        </div>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <BookOpen className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                          <span className="truncate">{member.pendidikan || "Belum diisi"}</span>
                        </div>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Home className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                          <span className="truncate">{member.statusKependudukan}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </button>

                <div className="flex flex-wrap gap-1.5">
                  {member.kondisiKesehatan && member.kondisiKesehatan !== "Sehat" && (
                    <Badge variant="outline">{member.kondisiKesehatan}</Badge>
                  )}
                  {member.statusDisabilitas && member.statusDisabilitas !== "Tidak Ada" && (
                    <Badge variant="outline">{member.statusDisabilitas}</Badge>
                  )}
                  {member.ibuHamil && (
                    <Badge className="bg-pink-100 text-pink-700 border-pink-200">Ibu hamil</Badge>
                  )}
                  {missingKeys.length > 0 && !pendingEdit && (
                    <Badge className="bg-red-100 text-red-700 border-red-200">{missingKeys.length} data perlu dilengkapi</Badge>
                  )}
                </div>

                {pendingEdit && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs">
                    <p className="font-semibold text-amber-700">Perubahan masih menunggu persetujuan admin.</p>
                    <p className="text-amber-700/90 mt-1">
                      {Object.keys(pendingEdit.fieldChanges as Record<string, string>).map((field) => fieldLabels[field] || field).join(", ")}
                    </p>
                  </div>
                )}

                {isExpanded && (
                  <div className="space-y-3 border-t pt-3">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="text-muted-foreground">Tanggal lahir</p>
                        <p className="font-medium mt-1">{formatDateId(member.tanggalLahir)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Tempat lahir</p>
                        <p className="font-medium mt-1">{member.tempatLahir || "Belum diisi"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Agama</p>
                        <p className="font-medium mt-1">{member.agama || "Belum diisi"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Status kawin</p>
                        <p className="font-medium mt-1">{member.statusPerkawinan || "Belum diisi"}</p>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-gray-50 border border-gray-200 p-3">
                      <p className="text-[11px] text-muted-foreground">NIK tercatat</p>
                      <p className="text-sm font-mono tracking-wide mt-1">{maskNik(member.nik)}</p>
                      <p className="text-[11px] text-muted-foreground mt-2">Perubahan NIK tetap harus melalui admin RW.</p>
                    </div>

                    {!isEditing && (
                      <div className="grid grid-cols-2 gap-2">
                        {(Object.keys(sectionMeta) as EditSection[]).map((section) => {
                          const SectionIcon = sectionMeta[section].icon;
                          return (
                            <button
                              key={section}
                              type="button"
                              disabled={Boolean(pendingEdit)}
                              onClick={() => openMemberAction(member, section)}
                              className="rounded-2xl border border-gray-200 bg-white p-3 text-left disabled:opacity-50"
                            >
                              <SectionIcon className="w-4 h-4 text-[hsl(163,55%,22%)]" />
                              <p className="text-sm font-semibold mt-2">{sectionMeta[section].label}</p>
                              <p className="text-[11px] text-muted-foreground mt-1">Edit per blok tanpa membuka form panjang.</p>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {isEditing && editingSection && (
                      <div className="rounded-3xl border-2 border-[hsl(163,55%,22%)]/15 bg-[hsl(163,55%,98%)] p-4 space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-bold">{sectionMeta[editingSection].label}</p>
                            <p className="text-xs text-muted-foreground mt-1">Simpan hanya perubahan pada blok ini.</p>
                          </div>
                          <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                            <X className="w-4 h-4 mr-1" />
                            Tutup
                          </Button>
                        </div>

                        {editingSection === "contact" && (
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Nama lengkap</Label>
                                <Input value={editData.namaLengkap} onChange={(e) => setField("namaLengkap", e.target.value)} />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs font-medium">No. WhatsApp</Label>
                                <Input value={editData.nomorWhatsapp} onChange={(e) => setField("nomorWhatsapp", e.target.value)} placeholder="08xxxxxxxxxx" />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <Label className="text-xs font-medium">No. WA alternatif</Label>
                                <Input value={editData.nomorWhatsappAlternatif} onChange={(e) => setField("nomorWhatsappAlternatif", e.target.value)} placeholder="08xxxxxxxxxx" />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Email</Label>
                                <Input value={editData.email} onChange={(e) => setField("email", e.target.value)} placeholder="nama@email.com" />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Tempat lahir</Label>
                                <Input value={editData.tempatLahir} onChange={(e) => setField("tempatLahir", e.target.value)} />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Tanggal lahir</Label>
                                <Input type="date" value={editData.tanggalLahir} onChange={(e) => setField("tanggalLahir", e.target.value)} />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Golongan darah</Label>
                                <Select value={editData.golonganDarah} onValueChange={(value) => setField("golonganDarah", value)}>
                                  <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                                  <SelectContent>{golonganDarahOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs font-medium">No. kontak darurat</Label>
                                <Input value={editData.nomorKontakDarurat} onChange={(e) => setField("nomorKontakDarurat", e.target.value)} placeholder="08xxxxxxxxxx" />
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium">Alamat domisili</Label>
                              <Textarea value={editData.alamatDomisili} onChange={(e) => setField("alamatDomisili", e.target.value)} rows={3} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Nama kontak darurat</Label>
                                <Input value={editData.namaKontakDarurat} onChange={(e) => setField("namaKontakDarurat", e.target.value)} />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Hubungan</Label>
                                <Select value={editData.hubunganKontakDarurat} onValueChange={(value) => setField("hubunganKontakDarurat", value)}>
                                  <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                                  <SelectContent>{hubunganKontakDaruratOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                        )}

                        {editingSection === "personal" && (
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Jenis kelamin</Label>
                                <Select value={editData.jenisKelamin} onValueChange={(value) => setField("jenisKelamin", value)}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>{jenisKelaminOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Agama</Label>
                                <Select value={editData.agama} onValueChange={(value) => setField("agama", value)}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>{agamaOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Status kawin</Label>
                                <Select value={editData.statusPerkawinan} onValueChange={(value) => setField("statusPerkawinan", value)}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>{statusPerkawinanOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Kedudukan keluarga</Label>
                                <Select value={editData.kedudukanKeluarga} onValueChange={(value) => setField("kedudukanKeluarga", value)}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>{kedudukanKeluargaOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium">Status kependudukan</Label>
                              <Select value={editData.statusKependudukan} onValueChange={(value) => setField("statusKependudukan", value)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>{statusKependudukanOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium">Status e-KTP</Label>
                              <Input value={editData.statusEktp} onChange={(e) => setField("statusEktp", e.target.value)} />
                            </div>
                          </div>
                        )}

                        {editingSection === "work" && (
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Pekerjaan</Label>
                                <Select value={editData.pekerjaan} onValueChange={(value) => setField("pekerjaan", value)}>
                                  <SelectTrigger><SelectValue placeholder="Pilih pekerjaan" /></SelectTrigger>
                                  <SelectContent>{pekerjaanOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Pendidikan</Label>
                                <Select value={editData.pendidikan} onValueChange={(value) => setField("pendidikan", value)}>
                                  <SelectTrigger><SelectValue placeholder="Pilih pendidikan" /></SelectTrigger>
                                  <SelectContent>{pendidikanOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Status pekerjaan</Label>
                                <Select value={editData.statusPekerjaan} onValueChange={(value) => setField("statusPekerjaan", value)}>
                                  <SelectTrigger><SelectValue placeholder="Pilih status" /></SelectTrigger>
                                  <SelectContent>{statusPekerjaanOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Keahlian</Label>
                                <Input value={editData.keahlian} onChange={(e) => setField("keahlian", e.target.value)} />
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium">Nama tempat kerja</Label>
                              <Input value={editData.namaTempatKerja} onChange={(e) => setField("namaTempatKerja", e.target.value)} />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium">Alamat tempat kerja</Label>
                              <Textarea value={editData.alamatTempatKerja} onChange={(e) => setField("alamatTempatKerja", e.target.value)} rows={2} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Nama sekolah</Label>
                                <Input value={editData.namaSekolah} onChange={(e) => setField("namaSekolah", e.target.value)} />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Jenjang sekolah</Label>
                                <Select value={editData.jenjangSekolah} onValueChange={(value) => setField("jenjangSekolah", value)}>
                                  <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                                  <SelectContent>{jenjangSekolahOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Nama kampus</Label>
                                <Input value={editData.namaKampus} onChange={(e) => setField("namaKampus", e.target.value)} />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Semester</Label>
                                <Select value={editData.semester} onValueChange={(value) => setField("semester", value)}>
                                  <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                                  <SelectContent>{semesterOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                        )}

                        {editingSection === "health" && (
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Kondisi kesehatan</Label>
                                <Select value={editData.kondisiKesehatan} onValueChange={(value) => setField("kondisiKesehatan", value)}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>{kondisiKesehatanOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Status disabilitas</Label>
                                <Select value={editData.statusDisabilitas} onValueChange={(value) => setField("statusDisabilitas", value)}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>{statusDisabilitasOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
                                </Select>
                              </div>
                            </div>
                            {editData.jenisKelamin === "Perempuan" && (
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  id={`ibu-hamil-${member.id}`}
                                  checked={editData.ibuHamil === "true"}
                                  onCheckedChange={(checked) => setField("ibuHamil", checked ? "true" : "false")}
                                />
                                <Label htmlFor={`ibu-hamil-${member.id}`} className="text-sm">Sedang hamil</Label>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id={`bpjs-${member.id}`}
                                checked={editData.punyaBpjsKesehatan === "true"}
                                onCheckedChange={(checked) => setField("punyaBpjsKesehatan", checked ? "true" : "false")}
                              />
                              <Label htmlFor={`bpjs-${member.id}`} className="text-sm">Punya BPJS Kesehatan</Label>
                            </div>
                            {editData.punyaBpjsKesehatan === "true" && (
                              <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Nomor BPJS</Label>
                                <Input value={editData.nomorBpjsKesehatan} onChange={(e) => setField("nomorBpjsKesehatan", e.target.value)} />
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id={`kronis-${member.id}`}
                                checked={editData.punyaPenyakitKronis === "true"}
                                onCheckedChange={(checked) => setField("punyaPenyakitKronis", checked ? "true" : "false")}
                              />
                              <Label htmlFor={`kronis-${member.id}`} className="text-sm">Punya penyakit kronis</Label>
                            </div>
                            {editData.punyaPenyakitKronis === "true" && (
                              <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Penyakit kronis</Label>
                                <Input value={editData.penyakitKronis} onChange={(e) => setField("penyakitKronis", e.target.value)} />
                              </div>
                            )}
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Alergi</Label>
                                <Input value={editData.alergi} onChange={(e) => setField("alergi", e.target.value)} />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Riwayat rawat inap</Label>
                                <Input value={editData.riwayatRawatInap} onChange={(e) => setField("riwayatRawatInap", e.target.value)} />
                              </div>
                            </div>
                          </div>
                        )}

                        {editingSection === "participation" && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id={`aktif-rw-${member.id}`}
                                checked={editData.aktifKegiatanRw === "true"}
                                onCheckedChange={(checked) => setField("aktifKegiatanRw", checked ? "true" : "false")}
                              />
                              <Label htmlFor={`aktif-rw-${member.id}`} className="text-sm">Aktif kegiatan RW</Label>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium">Bidang partisipasi</Label>
                              <Select value={editData.bidangPartisipasi} onValueChange={(value) => setField("bidangPartisipasi", value)}>
                                <SelectTrigger><SelectValue placeholder="Pilih bidang" /></SelectTrigger>
                                <SelectContent>{bidangPartisipasiOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium">Jabatan komunitas</Label>
                              <Input value={editData.jabatanKomunitas} onChange={(e) => setField("jabatanKomunitas", e.target.value)} />
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2 pt-1">
                          <Button
                            className="flex-1"
                            disabled={submitEdit.isPending}
                            onClick={() => handleSaveSection(member, editingSection)}
                          >
                            {submitEdit.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4 mr-1" />Simpan perubahan</>}
                          </Button>
                          <Button variant="outline" onClick={handleCancelEdit}>
                            Batal
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
