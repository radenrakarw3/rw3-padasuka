import { jsPDF } from "jspdf";
import logoGreen from "@assets/RW3-Cimahi-Logo-Green@16x_1772999415502.png";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function isMobileDevice(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    (window.innerWidth <= 768);
}

async function savePdfMobileFriendly(doc: jsPDF, fileName: string) {
  const safeName = `${fileName}.pdf`;
  const blob = doc.output("blob");

  if (isMobileDevice()) {
    try {
      const formData = new FormData();
      formData.append("file", new File([blob], safeName, { type: "application/pdf" }));
      formData.append("fileName", safeName);
      const res = await fetch("/api/pdf/temp", { method: "POST", body: formData, credentials: "include" });
      if (res.ok) {
        const { url } = await res.json();
        window.location.href = url;
        return;
      }
    } catch {}
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = safeName;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    setTimeout(() => { document.body.removeChild(link); URL.revokeObjectURL(blobUrl); }, 5000);
  } else {
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = safeName;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => { document.body.removeChild(link); URL.revokeObjectURL(blobUrl); }, 1000);
  }
}

function cleanText(text: string): string {
  let cleaned = text.replace(/\*\*/g, "").replace(/\*/g, "");
  cleaned = cleaned.replace(/^#{1,6}\s+/gm, "");
  cleaned = cleaned.replace(/\(Tanda Tangan\)/gi, "");
  cleaned = cleaned.replace(/\(Stempel RW\)/gi, "");
  cleaned = cleaned.replace(/\(Stempel RT\)/gi, "");
  return cleaned.trim();
}

function isBiodataLine(line: string): boolean {
  const trimmed = line.trim();
  const colonIdx = trimmed.indexOf(":");
  if (colonIdx < 0) return false;
  const label = trimmed.substring(0, colonIdx).trim();
  if (label.length < 2 || label.length > 35) return false;
  const labels = [
    /^nama/i, /^nik/i, /^tempat/i, /^tanggal\s*lahir/i, /^alamat/i,
    /^rt\s*\/?\s*rw/i, /^rt\b/i, /^rw\b/i, /^kelurahan/i, /^kecamatan/i,
    /^kota/i, /^kabupaten/i, /^provinsi/i,
    /^agama/i, /^pekerjaan/i, /^jenis\s*kelamin/i, /^status/i,
    /^no\.?\s*(kk|telp|hp)/i, /^kewarganegaraan/i, /^golongan\s*darah/i,
    /^pendidikan/i, /^hubungan/i, /^jabatan/i,
    /^nomor/i, /^perihal/i, /^lampiran/i, /^sifat/i, /^hal\b/i,
    /^hari/i, /^waktu/i, /^acara/i, /^tempat/i,
  ];
  return labels.some(r => r.test(label));
}

function isTitleLine(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length > 60 || trimmed.length < 5) return false;
  if (/^SURAT\s+[A-Z]/.test(trimmed) && trimmed === trimmed.toUpperCase()) return true;
  if (/^(UNDANGAN|PENGUMUMAN|PEMBERITAHUAN|BERITA ACARA|LAPORAN)\b/.test(trimmed) && trimmed === trimmed.toUpperCase()) return true;
  return false;
}

function splitTwoColumns(line: string): { left: string; right: string } | null {
  if (line.includes("|")) {
    const parts = line.split("|");
    return { left: (parts[0] || "").trim(), right: (parts[1] || "").trim() };
  }
  const match = line.match(/^(.+?)\s{6,}(.+)$/);
  if (match) return { left: match[1].trim(), right: match[2].trim() };
  return null;
}

function isDateLine(line: string): boolean {
  return /^(kota\s+)?(cimahi|bandung|jakarta),?\s+\d/i.test(line.trim());
}

function isSignatureTrigger(line: string): boolean {
  const trimmed = line.trim();
  const triggers = [
    /^(hormat\s+kami|mengetahui|yang\s+bertanda\s+tangan|tertanda|di\s*ketahui|yang\s+membuat)/i,
    /^ketua\s+(rt|rw)/i,
  ];
  if (triggers.some(r => r.test(trimmed))) return true;
  if (isDateLine(trimmed)) return true;
  const split = splitTwoColumns(line);
  if (split && triggers.some(r => r.test(split.left) || r.test(split.right))) return true;
  return false;
}

function findSignatureStart(lines: string[]): number {
  for (let i = lines.length - 1; i >= Math.max(0, lines.length - 25); i--) {
    if (isSignatureTrigger(lines[i])) {
      const remaining = lines.slice(i);
      const hasName = remaining.some(l => {
        const t = l.trim();
        if (/^\(.*\)$/.test(t)) return true;
        const s = splitTwoColumns(l);
        return s ? (/^\(.*\)$/.test(s.left) || /^\(.*\)$/.test(s.right)) : false;
      });
      if (hasName) return i;
    }
  }
  return -1;
}

function hasTwoColumnSig(sigLines: string[]): boolean {
  let count = 0;
  for (const l of sigLines) {
    if (!l.trim()) continue;
    const s = splitTwoColumns(l);
    if (s && s.left && s.right) count++;
  }
  return count >= 2;
}

export async function generateSuratPDF(options: {
  nomorSurat?: string | null;
  isiSurat: string;
  jenisSurat: string;
  fileName?: string;
  returnBlob?: boolean;
}): Promise<Blob | void> {
  const { nomorSurat, isiSurat, jenisSurat, fileName, returnBlob } = options;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = 210;
  const marginLeft = 20;
  const marginRight = 20;
  const contentWidth = pageWidth - marginLeft - marginRight;
  const pageHeight = 297;
  const startY = 42;
  const bottomMargin = 12;
  const availableHeight = pageHeight - startY - bottomMargin;
  const colonMM = 35;

  let img: HTMLImageElement | null = null;
  try { img = await loadImage(logoGreen); } catch {}

  let processedText = cleanText(isiSurat);
  processedText = processedText.replace(/Nomor Induk Kependudukan\s*/gi, "NIK");
  processedText = processedText.replace(/^Nomor\s*:.*$/m, "").trim();
  const allLines = processedText.split("\n");

  const sigStart = findSignatureStart(allLines);
  const bodyLines = sigStart >= 0 ? allLines.slice(0, sigStart) : [...allLines];
  const sigLines = sigStart >= 0 ? allLines.slice(sigStart) : [];

  let dateLine: string | null = null;
  const dateIdxSig = sigLines.findIndex(l => isDateLine(l));
  if (dateIdxSig >= 0) {
    dateLine = sigLines[dateIdxSig].trim();
    sigLines.splice(dateIdxSig, 1);
  }

  let titleIdx = -1;
  for (let i = 0; i < Math.min(bodyLines.length, 10); i++) {
    if (isTitleLine(bodyLines[i])) {
      titleIdx = i;
      break;
    }
  }

  if (titleIdx > 0) {
    const beforeTitle: string[] = [];
    const perihalGroup: string[] = [];
    for (let i = 0; i < titleIdx; i++) {
      const t = bodyLines[i].trim();
      if (/^(perihal|lampiran|hal|sifat)\s*[:\-]/i.test(t)) {
        perihalGroup.push(bodyLines[i]);
      } else if (t !== "") {
        beforeTitle.push(bodyLines[i]);
      }
    }
    if (perihalGroup.length > 0) {
      const titleLine = bodyLines[titleIdx];
      const afterTitle = bodyLines.slice(titleIdx + 1);
      bodyLines.length = 0;
      bodyLines.push(...beforeTitle);
      bodyLines.push(titleLine);
      bodyLines.push(...perihalGroup);
      bodyLines.push(...afterTitle);

      titleIdx = beforeTitle.length;
    }
  }

  let hasTitle = titleIdx >= 0;

  const isTwoCol = hasTwoColumnSig(sigLines);

  let sigEstLines = 0;
  if (dateLine) sigEstLines += 1.5;
  for (const l of sigLines) {
    const t = l.trim();
    if (!t) { sigEstLines += 0.5; continue; }
    const s = splitTwoColumns(l);
    const left = s ? s.left : t;
    if (/^\(.*\)$/.test(left)) { sigEstLines += 4; continue; }
    sigEstLines += 1;
  }

  const fixedFs = 10;
  const fixedLh = 4.8;
  const titleFs = 12;

  let bodyLineCount = 0;
  let fixedLineCount = 0;
  for (const l of bodyLines) {
    const t = l.trim();
    if (!t) { fixedLineCount += 0.4; continue; }
    if (isTitleLine(t)) { fixedLineCount += 2.5; continue; }
    doc.setFontSize(fixedFs);
    if (isBiodataLine(l)) {
      const ci = l.indexOf(":");
      const val = l.substring(ci + 1).trim();
      const valMaxW = contentWidth - colonMM - 3;
      const w = doc.splitTextToSize(val, Math.max(valMaxW, 20));
      fixedLineCount += Math.max(1, w.length);
    } else if (/^\s{4,}/.test(l) && !isBiodataLine(l)) {
      fixedLineCount += 1;
    } else {
      const w = doc.splitTextToSize(t, contentWidth);
      bodyLineCount += w.length;
    }
  }
  if (nomorSurat && !hasTitle) fixedLineCount += 1;

  const fixedHeight = (fixedLineCount + sigEstLines) * fixedLh;
  const bodyAvailable = availableHeight - fixedHeight;
  const bodyNeeded = bodyLineCount * fixedLh;

  let bodyScale = 1;
  if (bodyNeeded > bodyAvailable && bodyAvailable > 0) {
    bodyScale = bodyAvailable / bodyNeeded;
    if (bodyScale < 0.55) bodyScale = 0.55;
  }

  const bodyFs = Math.max(7, Math.round(fixedFs * bodyScale * 10) / 10);
  const bodyLh = fixedLh * bodyScale;

  const drawKop = () => {
    if (img) doc.addImage(img, "PNG", marginLeft + 2, 12, 18, 18);
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
    doc.text("Sekretariat: Jln. K.H. Usman Dhomiri, Padasuka, Kota Cimahi, 40526", pageWidth / 2, 31, { align: "center" });
    doc.setLineWidth(0.8);
    doc.line(marginLeft, 34, pageWidth - marginRight, 34);
    doc.setLineWidth(0.3);
    doc.line(marginLeft, 35, pageWidth - marginRight, 35);
  };

  drawKop();
  let y = startY;

  const printBody = (text: string) => {
    doc.setFontSize(bodyFs);
    doc.setFont("helvetica", "normal");
    const wrapped = doc.splitTextToSize(text, contentWidth);
    for (const wl of wrapped) {
      doc.text(wl, marginLeft, y);
      y += bodyLh;
    }
  };

  const printCentered = (text: string, bold?: boolean, size?: number) => {
    doc.setFontSize(size || fixedFs);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.text(text, pageWidth / 2, y, { align: "center" });
    y += fixedLh;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(fixedFs);
  };

  const printBiodata = (line: string) => {
    const ci = line.indexOf(":");
    const label = line.substring(0, ci).trim();
    const value = line.substring(ci + 1).trim();
    doc.setFontSize(fixedFs);
    doc.setFont("helvetica", "normal");
    const colonX = marginLeft + colonMM;
    doc.text(label, marginLeft, y);
    doc.text(":", colonX, y);
    const valueX = colonX + 3;
    const maxW = contentWidth - colonMM - 3;
    const wrapped = doc.splitTextToSize(value, maxW);
    for (let j = 0; j < wrapped.length; j++) {
      doc.text(wrapped[j], valueX, y);
      y += fixedLh;
    }
  };

  if (nomorSurat && !hasTitle) {
    printBiodata(`Nomor : ${nomorSurat}`);
  }

  let nomorDone = false;
  let prevWasBiodata = false;

  for (let i = 0; i < bodyLines.length; i++) {
    const raw = bodyLines[i];
    const trimmed = raw.trim();

    if (trimmed === "") {
      prevWasBiodata = false;
      y += fixedLh * 0.4;
      continue;
    }

    if (isTitleLine(trimmed)) {
      prevWasBiodata = false;
      y += fixedLh * 0.3;
      const spaced = trimmed.split("").join(" ").replace(/\s{3,}/g, "   ");
      printCentered(spaced, true, titleFs);
      if (nomorSurat && !nomorDone) {
        printCentered(`Nomor: ${nomorSurat}`, false, fixedFs);
        nomorDone = true;
      }
      y += fixedLh * 0.3;
      continue;
    }

    if (prevWasBiodata && /^\s{4,}/.test(raw) && !isBiodataLine(raw)) {
      doc.setFontSize(fixedFs);
      doc.setFont("helvetica", "normal");
      const contX = marginLeft + colonMM + 3;
      const contW = contentWidth - colonMM - 3;
      const wrapped = doc.splitTextToSize(trimmed, contW);
      for (const wl of wrapped) {
        doc.text(wl, contX, y);
        y += fixedLh;
      }
      continue;
    }

    if (isBiodataLine(raw)) {
      prevWasBiodata = true;
      printBiodata(raw);
      continue;
    }

    prevWasBiodata = false;
    printBody(trimmed);
  }

  if (dateLine || sigLines.length > 0) {
    y += fixedLh * 0.5;
  }

  if (dateLine) {
    doc.setFontSize(fixedFs);
    doc.setFont("helvetica", "normal");
    doc.text(dateLine, pageWidth - marginRight, y, { align: "right" });
    y += fixedLh * 1.2;
  }

  if (sigLines.length > 0) {
    if (isTwoCol) {
      const leftCenter = marginLeft + contentWidth * 0.25;
      const rightCenter = marginLeft + contentWidth * 0.75;

      for (const rawLine of sigLines) {
        const trimmed = rawLine.trim();
        if (!trimmed) { y += fixedLh; continue; }

        const split = splitTwoColumns(rawLine);
        const left = split ? split.left : trimmed;
        const right = split ? split.right : "";

        const leftIsName = /^\(.*\)$/.test(left);
        const rightIsName = /^\(.*\)$/.test(right);

        if (leftIsName || rightIsName) {
          y += fixedLh * 2.5;
        }

        doc.setFontSize(fixedFs);

        if (left) {
          doc.setFont("helvetica", leftIsName ? "bold" : "normal");
          const w = doc.getTextWidth(left);
          doc.text(left, leftCenter - w / 2, y);
          if (leftIsName) {
            doc.setLineWidth(0.3);
            doc.line(leftCenter - w / 2, y + 1, leftCenter + w / 2, y + 1);
          }
        }
        if (right) {
          doc.setFont("helvetica", rightIsName ? "bold" : "normal");
          const w = doc.getTextWidth(right);
          doc.text(right, rightCenter - w / 2, y);
          if (rightIsName) {
            doc.setLineWidth(0.3);
            doc.line(rightCenter - w / 2, y + 1, rightCenter + w / 2, y + 1);
          }
        }
        doc.setFont("helvetica", "normal");
        y += fixedLh;
      }
    } else {
      const sigCenter = marginLeft + contentWidth * 0.75;
      const sigW = contentWidth * 0.45;

      for (const rawLine of sigLines) {
        const line = rawLine.trim();
        if (!line) { y += fixedLh * 0.3; continue; }

        const isName = /^\(.*\)$/.test(line);
        if (isName) {
          y += fixedLh * 2.5;
          doc.setFont("helvetica", "bold");
          doc.setFontSize(fixedFs);
          const w = doc.getTextWidth(line);
          doc.text(line, sigCenter - w / 2, y);
          doc.setLineWidth(0.3);
          doc.line(sigCenter - w / 2, y + 1, sigCenter + w / 2, y + 1);
          doc.setFont("helvetica", "normal");
          y += fixedLh;
          continue;
        }

        doc.setFont("helvetica", "normal");
        doc.setFontSize(fixedFs);
        const tw = doc.getTextWidth(line);
        if (tw <= sigW) {
          doc.text(line, sigCenter - tw / 2, y);
        } else {
          const wrapped = doc.splitTextToSize(line, sigW);
          for (const wl of wrapped) {
            doc.text(wl, sigCenter - sigW / 2, y);
            y += fixedLh;
          }
          continue;
        }
        y += fixedLh;
      }
    }
  }

  const safeName = fileName || `${jenisSurat.replace(/\s+/g, "_")}${nomorSurat ? "_" + nomorSurat.replace(/\//g, "-") : ""}`;
  if (returnBlob) {
    return doc.output("blob");
  }
  await savePdfMobileFriendly(doc, safeName);
}

export async function generateSuratRekomendasiBansosPDF(options: {
  jenisPengajuan: string;
  jenisBansos: string;
  kepalaKeluarga: string;
  nomorKk: string;
  alamat: string;
  rt: number;
  alasan: string;
  ketuaRt: string;
}) {
  const { jenisPengajuan, jenisBansos, kepalaKeluarga, nomorKk, alamat, rt, alasan, ketuaRt } = options;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = 210;
  const marginLeft = 20;
  const marginRight = 20;
  const contentWidth = pageWidth - marginLeft - marginRight;
  const colonMM = 45;
  const fixedFs = 10;
  const fixedLh = 5.5;

  let img: HTMLImageElement | null = null;
  try { img = await loadImage(logoGreen); } catch {}

  function drawKop(page: number) {
    if (img) {
      doc.addImage(img, "PNG", marginLeft, 5, 18, 18);
    }
    const kopX = marginLeft + 22;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("RUKUN WARGA 03", kopX, 12);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("KELURAHAN PADASUKA, KEC. CIMAHI TENGAH, KOTA CIMAHI", kopX, 17);
    doc.setFontSize(8);
    doc.text("Jln. K.H. Usman Dhomiri, Padasuka, Kota Cimahi, 40526", kopX, 21.5);
    doc.setLineWidth(0.5);
    doc.line(marginLeft, 25, pageWidth - marginRight, 25);
    doc.setLineWidth(0.2);
    doc.line(marginLeft, 26, pageWidth - marginRight, 26);
  }

  drawKop(1);

  let y = 35;

  const isCoret = jenisPengajuan === "rekomendasi_coret";
  const title = isCoret ? "SURAT REKOMENDASI PENCORETAN PENERIMA BANSOS" : "SURAT REKOMENDASI CALON PENERIMA BANSOS";

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  const titleW = doc.getTextWidth(title);
  doc.text(title, (pageWidth - titleW) / 2, y);
  y += fixedLh;
  doc.setLineWidth(0.3);
  doc.line((pageWidth - titleW) / 2, y, (pageWidth + titleW) / 2, y);
  y += fixedLh * 2;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(fixedFs);

  const now = new Date();
  const bulanNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const dateStr = `${now.getDate()} ${bulanNames[now.getMonth()]} ${now.getFullYear()}`;

  doc.text("Kepada Yth.", marginLeft, y);
  y += fixedLh;
  doc.setFont("helvetica", "bold");
  doc.text("Lurah Padasuka", marginLeft, y);
  doc.setFont("helvetica", "normal");
  y += fixedLh;
  doc.text("di tempat", marginLeft, y);
  y += fixedLh * 2;

  doc.text("Dengan hormat,", marginLeft, y);
  y += fixedLh * 1.5;

  const intro = `Yang bertanda tangan di bawah ini, Ketua RW 03 Kelurahan Padasuka, Kecamatan Cimahi Tengah, Kota Cimahi, dengan ini menyampaikan surat rekomendasi ${isCoret ? "pencoretan" : "calon penerima"} bantuan sosial sebagai berikut:`;
  const introLines = doc.splitTextToSize(intro, contentWidth);
  for (const line of introLines) {
    doc.text(line, marginLeft, y);
    y += fixedLh;
  }
  y += fixedLh * 0.5;

  function drawBioLine(label: string, value: string) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(fixedFs);
    doc.text(label, marginLeft, y);
    doc.text(":", marginLeft + colonMM, y);
    const valLines = doc.splitTextToSize(value, contentWidth - colonMM - 5);
    for (let i = 0; i < valLines.length; i++) {
      doc.text(valLines[i], marginLeft + colonMM + 3, y);
      if (i < valLines.length - 1) y += fixedLh;
    }
    y += fixedLh;
  }

  drawBioLine("Nama Kepala Keluarga", kepalaKeluarga);
  drawBioLine("Nomor Kartu Keluarga", nomorKk);
  drawBioLine("Alamat", `${alamat}, RT ${rt.toString().padStart(2, "0")} / RW 03`);
  drawBioLine("Kelurahan", "Padasuka");
  drawBioLine("Kecamatan", "Cimahi Tengah");
  drawBioLine("Kota", "Cimahi");
  drawBioLine("Jenis Bansos", jenisBansos);
  drawBioLine("Jenis Pengajuan", isCoret ? "Rekomendasi Pencoretan" : "Rekomendasi Penerima Baru");
  y += fixedLh * 0.3;

  doc.setFont("helvetica", "bold");
  doc.text("Alasan:", marginLeft, y);
  y += fixedLh;
  doc.setFont("helvetica", "normal");
  const alasanLines = doc.splitTextToSize(alasan, contentWidth);
  for (const line of alasanLines) {
    doc.text(line, marginLeft, y);
    y += fixedLh;
  }
  y += fixedLh;

  const closing = `Demikian surat rekomendasi ini kami buat dengan sebenarnya untuk dapat ditindaklanjuti sebagaimana mestinya. Atas perhatian dan kerjasamanya, kami ucapkan terima kasih.`;
  const closingLines = doc.splitTextToSize(closing, contentWidth);
  for (const line of closingLines) {
    doc.text(line, marginLeft, y);
    y += fixedLh;
  }
  y += fixedLh * 2;

  const sigColW = contentWidth / 2;
  const leftSigX = marginLeft + sigColW / 2;
  const rightSigX = marginLeft + sigColW + sigColW / 2;

  doc.text(`Cimahi, ${dateStr}`, marginLeft + sigColW, y);
  y += fixedLh * 1.5;

  doc.text("Mengetahui,", leftSigX - doc.getTextWidth("Mengetahui,") / 2, y);
  doc.text("Hormat kami,", rightSigX - doc.getTextWidth("Hormat kami,") / 2, y);
  y += fixedLh;

  const rtLabel = `Ketua RT ${rt.toString().padStart(2, "0")}`;
  doc.text(rtLabel, leftSigX - doc.getTextWidth(rtLabel) / 2, y);
  doc.text("Ketua RW 03", rightSigX - doc.getTextWidth("Ketua RW 03") / 2, y);
  y += fixedLh;

  doc.text("Kelurahan Padasuka", leftSigX - doc.getTextWidth("Kelurahan Padasuka") / 2, y);
  doc.text("Kelurahan Padasuka", rightSigX - doc.getTextWidth("Kelurahan Padasuka") / 2, y);
  y += fixedLh * 5;

  doc.setFont("helvetica", "bold");
  const rtName = `(${ketuaRt})`;
  const rwName = "(Raden Raka)";
  doc.text(rtName, leftSigX - doc.getTextWidth(rtName) / 2, y);
  doc.text(rwName, rightSigX - doc.getTextWidth(rwName) / 2, y);
  doc.setLineWidth(0.3);
  const rtNameW = doc.getTextWidth(rtName);
  const rwNameW = doc.getTextWidth(rwName);
  doc.line(leftSigX - rtNameW / 2, y + 1, leftSigX + rtNameW / 2, y + 1);
  doc.line(rightSigX - rwNameW / 2, y + 1, rightSigX + rwNameW / 2, y + 1);

  const safeName = `Surat_Rekomendasi_Bansos_${kepalaKeluarga.replace(/\s+/g, "_")}`;
  await savePdfMobileFriendly(doc, safeName);
}
