import { Building2, Users, BookOpen, UtensilsCrossed } from "lucide-react";
import { Visitrw3Shell } from "@/components/visitrw3-shell";
import { FeatureExplain } from "@/components/gov/feature-explain";
import { FeatureMenuBlock } from "@/components/gov/feature-menu-block";
import { VISITRW3_ROUTES } from "@/lib/visitrw3-routes";

export default function Visitrw3Hub() {
  return (
    <Visitrw3Shell title="Visit RW3" backHref="/">
      <FeatureExplain title="Apa itu Visit RW3?" className="mb-4">
        <p>
          Izin administrasi bagi yang tinggal atau berusaha di wilayah RW 03 Padasuka — penyewa
          kost, penghuni kontrakan, pengusaha lapak/kiosk, atau usaha di rumah sendiri.
        </p>
        <p>
          <strong>Pemilik kost/kiosk</strong> daftar properti untuk orang lain (PROP-…).{" "}
          <strong>Penyewa</strong> ajukan izin (VRW3-…).{" "}
          <strong>Usaha rumahan</strong>? Anda satu orang — ada menu khusus.
        </p>
      </FeatureExplain>
      <div className="space-y-4">
        <FeatureMenuBlock
          explainTitle="Usaha di rumah milik sendiri"
          explain={
            <>
              Catering rumahan, warung di rumah sendiri — <strong>Anda pemilik sekaligus pengaju</strong>,
              bukan penyewa. Dua tahap administrasi, satu orang yang isi.
            </>
          }
          href={VISITRW3_ROUTES.usahaRumahan.hub}
          icon={UtensilsCrossed}
          title="Usaha di rumah sendiri"
          description="Menu khusus — bukan pemilik & penyewa terpisah"
          variant="solid"
        />
        <FeatureMenuBlock
          explainTitle="Saya pemilik kost/kontrakan/kiosk/lapak"
          explain={
            <>
              Daftarkan properti untuk <strong>disewa atau dipakai orang lain</strong>. Setelah
              admin memverifikasi, penyewa bisa memilih properti Anda.
            </>
          }
          href={VISITRW3_ROUTES.pemilikDisewa.hub}
          icon={Building2}
          title="Pemilik properti (disewakan)"
          description="Kost, kontrakan, kiosk, lapak"
          variant="outline"
        />
        <FeatureMenuBlock
          explainTitle="Saya penyewa, penghuni, atau pengusaha"
          explain={
            <>
              Tinggal atau berusaha di properti <strong>milik orang lain</strong>. Ngekost +
              berusaha? Pilih &quot;Tinggal sekaligus usaha&quot; — cukup satu kali isi.
            </>
          }
          href={VISITRW3_ROUTES.penyewa.hub}
          icon={Users}
          title="Penyewa / penghuni"
          description="Pengajuan baru, perpanjang, cek status"
          variant="outline"
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
          href={VISITRW3_ROUTES.panduan}
          icon={BookOpen}
          title="Panduan & tanya jawab"
          description="Alur lengkap langkah demi langkah"
          variant="outline"
        />
      </div>
    </Visitrw3Shell>
  );
}
