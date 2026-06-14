import { Link } from "wouter";
import { Building2, FilePlus, Search, BookOpen, UtensilsCrossed } from "lucide-react";
import { Visitrw3Shell } from "@/components/visitrw3-shell";
import { FeatureExplain } from "@/components/gov/feature-explain";
import { FeatureMenuBlock } from "@/components/gov/feature-menu-block";
import { VISITRW3_ROUTES } from "@/lib/visitrw3-routes";

export default function Visitrw3HubUsahaRumahan() {
  return (
    <Visitrw3Shell title="Usaha di rumah sendiri" backHref={VISITRW3_ROUTES.hub}>
      <FeatureExplain title="Anda pemilik sekaligus pengaju — bukan penyewa" className="mb-4">
        <p>
          Usaha rumahan (catering, warung di rumah sendiri, jasa dari rumah) berbeda dari kost atau
          kiosk milik orang lain. <strong>Anda satu orang</strong> — bukan pemilik dan penyewa
          terpisah.
        </p>
        <p>
          Sistem butuh <strong>dua tahap administrasi</strong>, keduanya Anda yang isi: (1) daftar
          lokasi usaha → nomor <strong>PROP-…</strong>; (2) ajukan izin Visit RW3 → nomor{" "}
          <strong>VRW3-…</strong>.
        </p>
      </FeatureExplain>

      <ol className="mb-4 space-y-2 text-sm rounded-xl border bg-card p-4">
        <li className="flex gap-3">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand text-brand-foreground text-xs font-bold flex items-center justify-center">
            1
          </span>
          <span>
            <strong>Daftar lokasi usaha</strong> — jenis Usaha rumahan, alamat rumah/tempat usaha
            Anda.
          </span>
        </li>
        <li className="flex gap-3">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand/20 text-brand text-xs font-bold flex items-center justify-center">
            2
          </span>
          <span>
            <strong>Tunggu verifikasi</strong> admin RW sampai status properti aktif.
          </span>
        </li>
        <li className="flex gap-3">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand/20 text-brand text-xs font-bold flex items-center justify-center">
            3
          </span>
          <span>
            <strong>Ajukan Visit RW3</strong> — pakai nomor PROP Anda sendiri, isi data penghuni
            rumah.
          </span>
        </li>
      </ol>

      <Link
        href={`${VISITRW3_ROUTES.panduan}#usaha-rumahan`}
        className="inline-flex items-center gap-1.5 text-sm text-brand font-medium mb-4 hover:underline"
      >
        <BookOpen className="w-4 h-4" />
        Baca tanya jawab usaha rumahan
      </Link>

      <div className="space-y-4">
        <FeatureMenuBlock
          explainTitle="Tahap 1 — Daftar lokasi usaha"
          explain={
            <>
              Form khusus jenis <strong>Usaha rumahan</strong>. Isi nama usaha, alamat rumah, RT,
              dan data Anda sebagai pemilik. Setelah kirim, simpan nomor <strong>PROP-…</strong>.
            </>
          }
          href={VISITRW3_ROUTES.usahaRumahan.daftarProperti}
          icon={Building2}
          title="Daftar usaha rumahan"
          description="Langkah pertama — nomor PROP-…"
          variant="solid"
        />
        <FeatureMenuBlock
          explainTitle="Tahap 2 — Ajukan Visit RW3"
          explain={
            <>
              Setelah properti <strong>aktif</strong>, lanjut pengajuan dengan nomor PROP Anda —
              tidak perlu pilih dari daftar seperti penyewa kost.
            </>
          }
          href={VISITRW3_ROUTES.usahaRumahan.pengajuan}
          icon={FilePlus}
          title="Ajukan Visit RW3"
          description="Langkah kedua — nomor VRW3-…"
          variant="solid"
          iconClassName="bg-accent"
        />
        <FeatureMenuBlock
          explainTitle="Cek status pendaftaran PROP"
          explain={<>Lacak apakah usaha rumahan Anda sudah diverifikasi admin dan statusnya aktif.</>}
          href={VISITRW3_ROUTES.usahaRumahan.statusProperti}
          icon={Search}
          title="Cek status PROP-…"
          description="Sebelum lanjut ke pengajuan"
          variant="outline"
        />
      </div>

      <p className="mt-4 text-xs text-muted-foreground leading-relaxed">
        <UtensilsCrossed className="w-3.5 h-3.5 inline mr-1 opacity-70" />
        Modul <strong>Pendataan Usaha</strong> (stiker usaha RW) terpisah. Visit RW3 tetap wajib
        untuk izin administrasi di wilayah RW 03.
      </p>
    </Visitrw3Shell>
  );
}
