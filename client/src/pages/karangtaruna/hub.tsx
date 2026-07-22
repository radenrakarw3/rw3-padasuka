import { UserPlus, Search, Sparkles } from "lucide-react";
import { KarangtarunaShell } from "@/components/karangtaruna-shell";
import { FeatureExplain } from "@/components/gov/feature-explain";
import { FeatureMenuBlock } from "@/components/gov/feature-menu-block";
import { KARANGTARUNA_ROUTES } from "@/lib/karangtaruna-routes";

export default function KarangtarunaHub() {
  return (
    <KarangtarunaShell title="Karang Taruna RW 03" backHref="/">
      <FeatureExplain title="Apa itu pendataan Karang Taruna?" className="mb-4">
        <p>
          Wadah <strong>pemuda RW 03 Padasuka</strong> untuk mendata diri, menceritakan{" "}
          <strong>skill & potensi</strong>, dan menyampaikan apa yang ingin{" "}
          <strong>difasilitasi oleh RW 03</strong>.
        </p>
        <p>
          Semakin lengkap & jujur datanya, semakin mudah pengurus RW mengenali potensimu dan
          menyalurkannya ke kegiatan yang tepat.
        </p>
      </FeatureExplain>
      <div className="space-y-4">
        <FeatureMenuBlock
          explainTitle="Daftar jadi anggota"
          explain={<>Isi identitas lengkap, ceritakan skill-mu, dan pilih bidang yang kamu minati.</>}
          href={KARANGTARUNA_ROUTES.daftar}
          icon={UserPlus}
          title="Daftar Karang Taruna"
          description="Data diri, skill, potensi, & harapan"
          variant="solid"
        />
        <FeatureMenuBlock
          explainTitle="Sudah mendaftar?"
          explain={<>Cek status keanggotaan dan catatan pengurus RW dengan nomor anggotamu.</>}
          href={KARANGTARUNA_ROUTES.status}
          icon={Search}
          title="Cek status keanggotaan"
          description="Lacak nomor KT- kamu"
          variant="outline"
        />
      </div>
      <div className="mt-6 rounded-xl border border-[hsl(190,55%,45%)]/25 bg-[hsl(190,55%,45%)]/5 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-brand">
          <Sparkles className="w-4 h-4" />
          Kenapa harus gabung?
        </p>
        <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground list-disc pl-4">
          <li>Skill-mu tercatat & bisa diberdayakan di kegiatan RW.</li>
          <li>Dapat prioritas info pelatihan, lomba, dan program pemuda.</li>
          <li>Jadi bagian dari perubahan lingkungan RW 03.</li>
        </ul>
      </div>
    </KarangtarunaShell>
  );
}
