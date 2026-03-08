import logoGreen from "@assets/RW3-Cimahi-Logo-Green@16x_1772999415502.png";

export default function KopSurat() {
  return (
    <div className="border-b-2 border-black pb-3 mb-4" data-testid="kop-surat">
      <div className="flex items-center gap-3">
        <img src={logoGreen} alt="Logo RW 03" className="w-16 h-16 object-contain" data-testid="img-kop-logo" />
        <div className="flex-1 text-center">
          <p className="text-[10px] font-medium uppercase tracking-wide">Rukun Warga 03</p>
          <p className="text-sm font-bold uppercase tracking-wide">Kelurahan Padasuka</p>
          <p className="text-[10px] font-medium uppercase tracking-wide">Kecamatan Cimahi Tengah - Kota Cimahi</p>
          <p className="text-[9px] mt-0.5">Jln. K.H. Usman Dhomiri, Kel. Padasuka, Kec. Cimahi Tengah, Kota Cimahi 40526</p>
        </div>
        <div className="w-16" />
      </div>
    </div>
  );
}
