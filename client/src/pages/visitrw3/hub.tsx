import { Building2, Users, BookOpen } from "lucide-react";
import { Visitrw3Shell } from "@/components/visitrw3-shell";
import { FeatureExplain } from "@/components/gov/feature-explain";
import { FeatureMenuBlock } from "@/components/gov/feature-menu-block";

export default function Visitrw3Hub() {
  return (
    <Visitrw3Shell title="Visit RW3" backHref="/">
      <FeatureExplain title="Apa itu Visit RW3?" className="mb-4">
        <p>
          Izin administrasi bagi penyewa kost, penghuni kontrakan, dan pengusaha (lapak/kiosk) di
          wilayah RW 03 Padasuka. Mirip nomor identitas wilayah — wajib untuk yang tinggal atau
          berusaha di sini.
        </p>
        <p>
          <strong>Pemilik properti</strong> daftar bangunan dulu (nomor PROP-…).{" "}
          <strong>Penyewa/penghuni</strong> ajukan izin setelah properti aktif (nomor VRW3-…).
        </p>
      </FeatureExplain>
      <div className="space-y-4">
        <FeatureMenuBlock
          explainTitle="Saya pemilik kost/kontrakan/lapak"
          explain={
            <>
              Daftarkan properti Anda ke RW 03 agar bisa dipilih penyewa saat mengajukan izin.
              Setelah admin memverifikasi, status properti menjadi aktif.
            </>
          }
          href="/visitrw3/pemilik"
          icon={Building2}
          title="Pemilik properti"
          description="Daftar kost, kontrakan, kiosk, atau lapak"
          variant="solid"
        />
        <FeatureMenuBlock
          explainTitle="Saya penyewa, penghuni, atau pengusaha"
          explain={
            <>
              Ajukan izin tinggal dan/atau bisnis. Ngekost sekaligus berusaha? Cukup{" "}
              <strong>satu pengajuan</strong> — pilih &quot;Tinggal sekaligus usaha&quot;, jangan
              isi dua kali.
            </>
          }
          href="/visitrw3/penyewa"
          icon={Users}
          title="Penyewa / penghuni"
          description="Pengajuan baru, perpanjang, dan cek status izin"
          variant="solid"
          iconClassName="bg-accent"
        />
        <FeatureMenuBlock
          explainTitle="Masih bingung alurnya?"
          explain={
            <>
              Baca panduan lengkap: siapa daftar dulu, dokumen apa yang disiapkan, beda nomor PROP
              dan VRW3, serta perkiraan biaya kontribusi.
            </>
          }
          href="/visitrw3/panduan"
          icon={BookOpen}
          title="Panduan & tanya jawab"
          description="Alur lengkap langkah demi langkah"
          variant="outline"
        />
      </div>
    </Visitrw3Shell>
  );
}
