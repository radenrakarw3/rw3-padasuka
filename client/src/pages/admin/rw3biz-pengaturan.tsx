import { Visitrw3AdminNav } from "@/components/admin/visitrw3-admin-nav";
import { Visitrw3AdminShell } from "@/components/admin/visitrw3-admin-ui";
import { FeatureExplain } from "@/components/gov/feature-explain";
import { Link } from "wouter";
import { RW3BIZ_ROUTES } from "@/lib/rw3biz-routes";

/**
 * Pengaturan khusus RW3BIZ — untuk sementara tata tertib masih di-proxy dari Visit.
 * Halaman tetap di namespace /admin/rw3biz agar tidak bentrok / nyelonong ke Visit.
 */
export default function AdminRw3bizPengaturan() {
  return (
    <Visitrw3AdminShell>
      <Visitrw3AdminNav
        product="rw3biz"
        title="Pengaturan RW3BIZ"
        description="Konfigurasi layanan izin usaha (terpisah dari Visit RW3)."
      />
      <FeatureExplain title="Status saat ini">
        <p>
          Teks tata tertib publik RW3BIZ masih memakai sumber bersama (proxy API{" "}
          <code className="text-xs">/api/public/rw3biz/settings</code>). Edit isi teks lewat menu
          Visit RW3 → Pengaturan bila perlu disamakan.
        </p>
        <p>
          Blast WA ke penanggung jawab usaha memakai StarSender (nomor dari{" "}
          <code className="text-xs">rw3biz_usaha.pj_nomor_whatsapp</code>). Buka menu{" "}
          <Link href={RW3BIZ_ROUTES.admin.blast} className="text-brand font-medium underline">
            WA Blast
          </Link>{" "}
          untuk kirim pengumuman massal.
        </p>
        <p>
          <Link href={RW3BIZ_ROUTES.admin.dashboard} className="text-brand font-medium underline">
            Buka statistik RW3BIZ
          </Link>
          {" · "}
          <Link href="/admin/visitrw3/pengaturan" className="text-brand font-medium underline">
            Edit tata tertib (Visit)
          </Link>
        </p>
      </FeatureExplain>
    </Visitrw3AdminShell>
  );
}
