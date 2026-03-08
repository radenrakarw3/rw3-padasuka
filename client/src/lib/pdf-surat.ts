import { jsPDF } from "jspdf";
import logoImg from "@assets/Untitled_design_(24)_1772993886433.png";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function generateSuratPDF(options: {
  nomorSurat?: string | null;
  isiSurat: string;
  jenisSurat: string;
  fileName?: string;
}) {
  const { nomorSurat, isiSurat, jenisSurat, fileName } = options;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = 210;
  const marginLeft = 25;
  const marginRight = 25;
  const contentWidth = pageWidth - marginLeft - marginRight;

  let img: HTMLImageElement | null = null;
  try {
    img = await loadImage(logoImg);
  } catch {}

  const drawKop = (doc: jsPDF) => {
    if (img) {
      doc.addImage(img, "PNG", marginLeft, 12, 18, 18);
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("RUKUN WARGA 03", pageWidth / 2, 16, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("KELURAHAN PADASUKA", pageWidth / 2, 22, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("KECAMATAN CIMAHI TENGAH - KOTA CIMAHI", pageWidth / 2, 27, { align: "center" });
    doc.setFontSize(7.5);
    doc.text("Jln. K.H. Usman Dhomiri, Kel. Padasuka, Kec. Cimahi Tengah, Kota Cimahi 40526", pageWidth / 2, 31, { align: "center" });
    doc.setLineWidth(0.8);
    doc.line(marginLeft, 34, pageWidth - marginRight, 34);
    doc.setLineWidth(0.3);
    doc.line(marginLeft, 35, pageWidth - marginRight, 35);
  };

  drawKop(doc);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);

  const lines = doc.splitTextToSize(isiSurat, contentWidth);
  let y = 42;
  const pageHeight = 297;
  const bottomMargin = 20;

  for (let i = 0; i < lines.length; i++) {
    if (y > pageHeight - bottomMargin) {
      doc.addPage();
      drawKop(doc);
      y = 42;
    }
    doc.text(lines[i], marginLeft, y);
    y += 5.5;
  }

  const safeName = fileName || `${jenisSurat.replace(/\s+/g, "_")}${nomorSurat ? "_" + nomorSurat.replace(/\//g, "-") : ""}`;
  doc.save(`${safeName}.pdf`);
}
