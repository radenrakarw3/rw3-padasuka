import { useRtKelola } from "./konteks";
import { DaftarUsulan } from "./usulan";
import { DaftarPindah } from "./pindah";
import { useKotakMasuk } from "@/lib/kotak-masuk";
import { Judul } from "@/components/wilayah/ui";

function Bagian({ judul, jumlah, keterangan, children }: { judul: string; jumlah?: number; keterangan: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <div>
        <h2 className="flex items-center gap-2 text-base font-bold">
          {judul}
          {!!jumlah && <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">{jumlah} menunggu</span>}
        </h2>
        <p className="text-sm text-gray-600">{keterangan}</p>
      </div>
      {children}
    </section>
  );
}

/** Semua yang menunggu keputusan pengurus untuk RT terpilih: isian QR warga dan permintaan pindah RT. */
export default function KotakMasuk() {
  const rt = useRtKelola();
  const { data } = useKotakMasuk();
  const angka = data?.perRt.find((r) => r.rt === rt);
  return (
    <div className="space-y-6">
      <Judul sub="Periksa lalu terima atau tolak. Data baru berubah setelah diputuskan.">Kotak masuk</Judul>
      <Bagian judul="Isian QR & formulir warga" jumlah={angka?.usulan} keterangan="Perubahan data yang dikirim keluarga lewat QR atau dititipkan RW.">
        <DaftarUsulan />
      </Bagian>
      <Bagian judul="Pindah RT" jumlah={angka?.pindah} keterangan="Permintaan pindah dari RT lain yang perlu diterima, dan pengajuan keluar dari RT ini.">
        <DaftarPindah />
      </Bagian>
    </div>
  );
}
