export type PosisiTetangga = "kanan" | "kiri" | "depan" | "belakang";

export type PersetujuanTetanggaRow = {
  posisi: PosisiTetangga;
  slot: 1 | 2;
  namaWarga: string;
  nomorWhatsapp: string;
};

export const VISITRW3_TETANGGA_SLOTS: { posisi: PosisiTetangga; slot: 1 | 2; label: string }[] = [
  { posisi: "kanan", slot: 1, label: "Kanan — warga 1" },
  { posisi: "kanan", slot: 2, label: "Kanan — warga 2" },
  { posisi: "kiri", slot: 1, label: "Kiri — warga 1" },
  { posisi: "kiri", slot: 2, label: "Kiri — warga 2" },
  { posisi: "depan", slot: 1, label: "Depan — warga 1" },
  { posisi: "depan", slot: 2, label: "Depan — warga 2" },
  { posisi: "belakang", slot: 1, label: "Belakang — warga 1" },
  { posisi: "belakang", slot: 2, label: "Belakang — warga 2" },
];

export function emptyPersetujuanTetangga(): PersetujuanTetanggaRow[] {
  return VISITRW3_TETANGGA_SLOTS.map((s) => ({
    posisi: s.posisi,
    slot: s.slot,
    namaWarga: "",
    nomorWhatsapp: "",
  }));
}

export function slotKey(posisi: PosisiTetangga, slot: 1 | 2) {
  return `${posisi}-${slot}`;
}
