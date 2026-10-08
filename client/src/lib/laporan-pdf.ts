import { jsPDF } from "jspdf";

export interface DataEksporKlien {
  judul: string;
  scope: string;
  tahun: number;
  kolomBulan: string[];
  bulanFinal: boolean[];
  bagian: { kode: string; judul: string }[];
  baris: { no: number; bagian: string; kode: string; label: string; nilai: (number | null)[]; total: number | null }[];
  dibuat: string;
}

/** PDF agregat (tanpa identitas) dengan kolom NO, SUB, INDIKATOR, bulan, TOTAL. Header tabel diulang tiap halaman. */
export function eksporPdfLaporan(d: DataEksporKlien) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const kiri = 10;
  const lebarHal = 210 - 20;
  const wNo = 9;
  const wSub = 11;
  const wBulan = 13;
  const wTotal = 14;
  const wInd = lebarHal - wNo - wSub - wBulan * d.kolomBulan.length - wTotal;
  const kolom = [wNo, wSub, wInd, ...d.kolomBulan.map(() => wBulan), wTotal];
  const header = ["NO", "SUB", "INDIKATOR", ...d.kolomBulan.map((k, i) => (d.bulanFinal[i] ? k : `${k}*`)), "TOTAL"];
  const bawah = 287;
  let y = 12;

  const judul = () => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(d.judul, 105, y, { align: "center" });
    y += 5;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(d.scope, 105, y, { align: "center" });
    y += 4;
    doc.setFontSize(7);
    doc.text("* = belum final · sel kosong = belum diketahui (bukan 0)", 105, y, { align: "center" });
    y += 4;
  };

  const barisHeader = () => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setFillColor(230, 240, 236);
    let x = kiri;
    kolom.forEach((w, i) => {
      doc.rect(x, y, w, 7, "FD");
      doc.text(header[i], x + w / 2, y + 4.7, { align: "center" });
      x += w;
    });
    y += 7;
    doc.setFont("helvetica", "normal");
  };

  const pastikan = (tinggi: number) => {
    if (y + tinggi > bawah) {
      doc.addPage();
      y = 12;
      barisHeader();
    }
  };

  judul();
  barisHeader();
  for (const b of d.bagian) {
    pastikan(6);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setFillColor(245, 245, 245);
    doc.rect(kiri, y, lebarHal, 6, "FD");
    doc.text(`${b.kode}. ${b.judul}`, kiri + 2, y + 4.2);
    y += 6;
    doc.setFont("helvetica", "normal");
    for (const r of d.baris.filter((x) => x.bagian === b.kode)) {
      doc.setFontSize(7.5);
      const teks = doc.splitTextToSize(r.label, wInd - 2) as string[];
      const h = Math.max(5.5, teks.length * 3.4 + 2);
      pastikan(h);
      const sel = [String(r.no), r.kode, "", ...r.nilai.map((v) => (v == null ? "" : String(v))), r.total == null ? "" : String(r.total)];
      let x = kiri;
      kolom.forEach((w, i) => {
        doc.rect(x, y, w, h);
        if (i === 2) doc.text(teks, x + 1, y + 3.6);
        else doc.text(sel[i], x + w / 2, y + h / 2 + 1.2, { align: "center" });
        x += w;
      });
      y += h;
    }
  }
  const halaman = doc.getNumberOfPages();
  for (let i = 1; i <= halaman; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.text(`Dicetak ${new Date(d.dibuat).toLocaleString("id-ID")} · Halaman ${i}/${halaman}`, 105, 293, { align: "center" });
  }
  const scope = d.scope.startsWith("RT") ? d.scope.slice(0, 5).replace(" ", "") : "RekapRW03";
  doc.save(`Laporan-${scope}-${d.tahun}-${d.kolomBulan.join("-")}.pdf`);
}
