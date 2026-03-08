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

function cleanText(text: string): string {
  let cleaned = text.replace(/\*\*/g, "").replace(/\*/g, "");
  cleaned = cleaned.replace(/^#{1,6}\s+/gm, "");
  cleaned = cleaned.replace(/\(Tanda Tangan\)/gi, "");
  cleaned = cleaned.replace(/\(Stempel RW\)/gi, "");
  cleaned = cleaned.replace(/\(Stempel RT\)/gi, "");
  return cleaned.trim();
}

function isSignatureSection(lines: string[], startIdx: number): boolean {
  const triggers = [
    /^(hormat\s+kami|mengetahui|yang\s+bertanda\s+tangan|tertanda|di\s*ketahui|yang\s+membuat)/i,
    /^ketua\s+(rt|rw)/i,
    /^(cimahi|bandung|jakarta),?\s+\d/i,
  ];
  const line = lines[startIdx].trim();
  if (triggers.some(r => r.test(line))) return true;

  const remaining = lines.slice(startIdx);
  const hasSignerName = remaining.some(l => /^\(.*\)$/.test(l.trim()));
  const hasKetuaRef = remaining.some(l => /ketua\s+(rt|rw)/i.test(l.trim()));
  if (hasSignerName && hasKetuaRef && remaining.length <= 20) return true;

  return false;
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
  const pageHeight = 297;
  const bottomMargin = 20;
  const lineHeight = 5.5;

  let img: HTMLImageElement | null = null;
  try {
    img = await loadImage(logoImg);
  } catch {}

  const drawKop = () => {
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

  drawKop();
  let y = 42;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - bottomMargin) {
      doc.addPage();
      drawKop();
      y = 42;
    }
  };

  const printLine = (text: string, opts?: { bold?: boolean; center?: boolean; fontSize?: number; indent?: number }) => {
    const fontSize = opts?.fontSize || 11;
    doc.setFontSize(fontSize);
    doc.setFont("helvetica", opts?.bold ? "bold" : "normal");
    const xPos = opts?.indent ? marginLeft + opts.indent : marginLeft;
    const maxW = contentWidth - (opts?.indent || 0);

    if (opts?.center) {
      ensureSpace(lineHeight);
      doc.text(text, pageWidth / 2, y, { align: "center" });
      y += lineHeight;
    } else {
      const wrapped = doc.splitTextToSize(text, maxW);
      for (const wl of wrapped) {
        ensureSpace(lineHeight);
        doc.text(wl, xPos, y);
        y += lineHeight;
      }
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
  };

  if (nomorSurat) {
    printLine(`Nomor    : ${nomorSurat}`);
  }

  let processedText = cleanText(isiSurat);

  processedText = processedText.replace(/^Nomor\s*:.*$/m, "").trim();

  const allLines = processedText.split("\n");

  let signatureStartIdx = -1;
  for (let i = allLines.length - 1; i >= Math.max(0, allLines.length - 25); i--) {
    if (isSignatureSection(allLines, i)) {
      signatureStartIdx = i;
    }
  }

  const bodyLines = signatureStartIdx >= 0 ? allLines.slice(0, signatureStartIdx) : allLines;
  const sigLines = signatureStartIdx >= 0 ? allLines.slice(signatureStartIdx) : [];

  for (let i = 0; i < bodyLines.length; i++) {
    const rawLine = bodyLines[i];

    if (rawLine.trim() === "") {
      y += lineHeight * 0.6;
      continue;
    }

    const isTitleLine = /^(SURAT KETERANGAN|SURAT PENGANTAR|SURAT UNDANGAN|SURAT PERNYATAAN)/i.test(rawLine.trim());
    if (isTitleLine) {
      y += lineHeight * 0.3;
      printLine(rawLine.trim(), { bold: true, center: true, fontSize: 12 });
      y += lineHeight * 0.3;
      continue;
    }

    const isUnderlinedTitle = /^(Perihal|Lampiran)\s*:/i.test(rawLine.trim()) && i < 5;
    if (isUnderlinedTitle) {
      printLine(rawLine.trim());
      continue;
    }

    printLine(rawLine);
  }

  if (sigLines.length > 0) {
    y += lineHeight;

    const cleanSigLines = sigLines.filter(l => l.trim() !== "");

    for (let i = 0; i < cleanSigLines.length; i++) {
      const line = cleanSigLines[i].trim();
      if (!line) continue;

      const isName = /^\(.*\)$/.test(line);
      const isPosition = /^(ketua\s+(rt|rw)|kelurahan|kecamatan|sekretaris)/i.test(line);
      const isClosing = /^(hormat\s+kami|mengetahui|tertanda|yang\s+bertanda|di\s*ketahui|yang\s+membuat)/i.test(line);
      const isDate = /^(cimahi|bandung|jakarta),?\s+\d/i.test(line);

      if (isDate) {
        ensureSpace(lineHeight);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.text(line, pageWidth - marginRight, y, { align: "right" });
        y += lineHeight * 1.5;
        continue;
      }

      if (isClosing) {
        ensureSpace(lineHeight);
        printLine(line);
        y += lineHeight * 0.3;
        continue;
      }

      if (isPosition) {
        ensureSpace(lineHeight);
        printLine(line);
        continue;
      }

      if (isName) {
        y += lineHeight * 3;
        ensureSpace(lineHeight);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        const underlinedName = line;
        doc.text(underlinedName, marginLeft, y);
        const nameWidth = doc.getTextWidth(underlinedName);
        doc.setLineWidth(0.3);
        doc.line(marginLeft, y + 1, marginLeft + nameWidth, y + 1);
        doc.setFont("helvetica", "normal");
        y += lineHeight * 1.5;
        continue;
      }

      printLine(line);
    }
  }

  const safeName = fileName || `${jenisSurat.replace(/\s+/g, "_")}${nomorSurat ? "_" + nomorSurat.replace(/\//g, "-") : ""}`;
  doc.save(`${safeName}.pdf`);
}
