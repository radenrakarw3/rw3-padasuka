import logoBlack from "@assets/RW03-Cimahi-Logo-Black.svg";

export default function KopSurat() {
  return (
    <div className="mb-6 pb-4" data-testid="kop-surat">
      <div className="flex items-center gap-4">
        <div className="flex w-20 justify-center">
          <img src={logoBlack} alt="Logo RW 03" className="h-[76px] w-[52px] object-contain" data-testid="img-kop-logo" />
        </div>
        <div className="flex-1 text-center text-black">
          <p className="text-[10px] font-semibold uppercase tracking-[0.35em]">Pemerintah Kota Cimahi</p>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em]">Kecamatan Cimahi Tengah</p>
          <p className="text-[18px] font-black uppercase tracking-[0.22em]">Rukun Warga 03 Padasuka</p>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em]">Sekretariat Pengurus RW 03 Kelurahan Padasuka</p>
          <p className="mt-1 text-[10px] leading-4">
            Jl. K.H. Usman Dhomiri, Kelurahan Padasuka, Kecamatan Cimahi Tengah, Kota Cimahi 40526
          </p>
          <p className="mt-1 text-[9px] uppercase tracking-[0.24em]">Tertib Administrasi | Pelayanan Warga | Kolaborasi Lingkungan</p>
        </div>
        <div className="w-20" />
      </div>
      <div className="mt-4 space-y-1">
        <div className="h-[2px] bg-black" />
        <div className="h-[0.5px] bg-black/80" />
      </div>
    </div>
  );
}
