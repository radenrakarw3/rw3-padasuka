/** Model & konversi isi peraturan RW3LAW — form terpisah per menimbang / pasal / ayat. */

export type Rw3lawAyat = { id: string; teks: string };
export type Rw3lawPasal = { id: string; judul: string; ayat: Rw3lawAyat[] };
export type Rw3lawMenimbang = { id: string; teks: string };

export type Rw3lawStructuredIsi = {
  menimbang: Rw3lawMenimbang[];
  pasal: Rw3lawPasal[];
};

let idSeq = 0;
export function newRw3lawPartId(prefix: string): string {
  idSeq += 1;
  return `${prefix}-${idSeq}-${Date.now().toString(36)}`;
}

export function createEmptyStructuredIsi(): Rw3lawStructuredIsi {
  return {
    menimbang: [{ id: newRw3lawPartId("m"), teks: "" }],
    pasal: [
      {
        id: newRw3lawPartId("p"),
        judul: "Ketentuan Umum",
        ayat: [{ id: newRw3lawPartId("a"), teks: "" }],
      },
    ],
  };
}

function normalizeTeks(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function stripMenimbangPrefix(line: string): string {
  return line
    .replace(/^MENIMBANG\s+/i, "")
    .replace(/;\s*dan\s*$/i, "")
    .replace(/\.\s*$/, "")
    .trim();
}

const AYAT_LINE_RE = /^([1-9]\d{0,2})\.\s+([\s\S]+)$/;
/** Nomor ayat di tengah kalimat (bukan desimal seperti 22.00). */
const AYAT_INLINE_RE = /(?:^|\s)([1-9]\d{0,2})\.\s+/g;

function stripAyatNumberPrefix(teks: string): string {
  return teks.replace(/^[1-9]\d{0,2}\.\s+/, "").replace(/\.\s*$/, "").trim();
}

/** Pecah satu blok teks yang berisi beberapa nomor ayat (1. … 2. …) menjadi array. */
export function splitAyatTeks(teks: string): string[] {
  const normalized = teks.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const fromLines: string[] = [];
  for (const line of normalized.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const m = trimmed.match(AYAT_LINE_RE);
    if (m) fromLines.push(stripAyatNumberPrefix(m[2]));
    else if (fromLines.length > 0) fromLines[fromLines.length - 1] = `${fromLines[fromLines.length - 1]} ${trimmed}`.trim();
    else fromLines.push(trimmed);
  }

  if (fromLines.length > 1) return fromLines.filter(Boolean);

  const single = fromLines[0] ?? normalized;
  const markers = [...single.matchAll(AYAT_INLINE_RE)];
  if (markers.length <= 1) {
    const one = stripAyatNumberPrefix(single);
    return one ? [one] : [];
  }

  const chunks: string[] = [];
  for (let i = 0; i < markers.length; i++) {
    const start = (markers[i].index ?? 0) + markers[i][0].length;
    const end = i + 1 < markers.length ? (markers[i + 1].index ?? single.length) : single.length;
    const body = single.slice(start, end).trim();
    if (body) chunks.push(stripAyatNumberPrefix(body));
  }
  return chunks.filter(Boolean);
}

function expandStructuredAyat(data: Rw3lawStructuredIsi): Rw3lawStructuredIsi {
  return {
    menimbang: data.menimbang,
    pasal: data.pasal.map((p) => {
      const ayat = p.ayat.flatMap((a) =>
        splitAyatTeks(a.teks).map((teks) => ({
          id: newRw3lawPartId("a"),
          teks,
        })),
      );
      return {
        ...p,
        ayat: ayat.length > 0 ? ayat : [{ id: newRw3lawPartId("a"), teks: "" }],
      };
    }),
  };
}

/** Ubah teks isi (database) menjadi form terstruktur. */
export function parseIsiToStructured(isi: string): Rw3lawStructuredIsi {
  const trimmed = isi.trim();
  if (!trimmed) return createEmptyStructuredIsi();

  const menimbang: Rw3lawMenimbang[] = [];
  const pasal: Rw3lawPasal[] = [];
  let current: Rw3lawPasal | null = null;

  for (const raw of trimmed.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;

    if (/^MENIMBANG\b/i.test(line)) {
      menimbang.push({ id: newRw3lawPartId("m"), teks: stripMenimbangPrefix(line) });
      continue;
    }

    const pasalMatch = line.match(/^PASAL\s+\d+(?:\.\d+)?\s*(?:[-–:]\s*(.+))?$/i);
    if (pasalMatch) {
      current = {
        id: newRw3lawPartId("p"),
        judul: pasalMatch[1]?.trim() ?? "",
        ayat: [],
      };
      pasal.push(current);
      continue;
    }

    const ayatMatch = line.match(AYAT_LINE_RE);
    if (ayatMatch && current) {
      for (const teks of splitAyatTeks(line)) {
        current.ayat.push({ id: newRw3lawPartId("a"), teks });
      }
      continue;
    }

    if (current && current.ayat.length > 0) {
      if (AYAT_LINE_RE.test(line)) {
        for (const teks of splitAyatTeks(line)) {
          current.ayat.push({ id: newRw3lawPartId("a"), teks });
        }
        continue;
      }
      const last = current.ayat[current.ayat.length - 1];
      last.teks = `${last.teks} ${line}`.trim();
    } else if (menimbang.length > 0) {
      const last = menimbang[menimbang.length - 1];
      last.teks = `${last.teks} ${line}`.trim();
    }
  }

  if (menimbang.length === 0) menimbang.push({ id: newRw3lawPartId("m"), teks: "" });
  if (pasal.length === 0) {
    pasal.push({
      id: newRw3lawPartId("p"),
      judul: "",
      ayat: splitAyatTeks(trimmed).map((teks) => ({
        id: newRw3lawPartId("a"),
        teks,
      })),
    });
    if (pasal[0].ayat.length === 0) {
      pasal[0].ayat.push({ id: newRw3lawPartId("a"), teks: trimmed });
    }
  } else {
    for (const p of pasal) {
      if (p.ayat.length === 0) p.ayat.push({ id: newRw3lawPartId("a"), teks: "" });
    }
  }

  return expandStructuredAyat({ menimbang, pasal });
}

/** Susun teks isi untuk disimpan ke database. */
export function structuredToIsi(data: Rw3lawStructuredIsi): string {
  const parts: string[] = [];

  const menimbangTeks = data.menimbang.map((m) => normalizeTeks(m.teks)).filter(Boolean);
  menimbangTeks.forEach((t, i) => {
    const isLast = i === menimbangTeks.length - 1;
    const body = t.replace(/\.\s*$/, "").replace(/;\s*dan\s*$/i, "").trim();
    if (!isLast) {
      parts.push(`MENIMBANG ${body}; dan`);
    } else {
      parts.push(`MENIMBANG ${body}.`);
    }
  });

  data.pasal.forEach((p, pasalIdx) => {
    const judul = normalizeTeks(p.judul);
    const header = judul
      ? `PASAL ${pasalIdx + 1} — ${judul}`
      : `PASAL ${pasalIdx + 1}`;
    parts.push("");
    parts.push(header);
    parts.push("");

    p.ayat
      .map((a) => normalizeTeks(a.teks))
      .filter(Boolean)
      .forEach((t, ayatIdx) => {
        const body = t.endsWith(".") ? t : `${t}.`;
        parts.push(`${ayatIdx + 1}. ${body}`);
      });
  });

  return parts.join("\n").trim();
}

/** Normalisasi teks isi agar konsisten dengan form terstruktur (menimbang / pasal / ayat). */
export function canonicalizeRw3lawIsi(isi: string): string {
  return structuredToIsi(parseIsiToStructured(isi));
}

export function validateStructuredIsi(data: Rw3lawStructuredIsi): string | null {
  const hasMenimbang = data.menimbang.some((m) => normalizeTeks(m.teks).length >= 5);
  if (!hasMenimbang) return "Isi minimal satu baris MENIMBANG (min. 5 karakter)";

  const hasAyat = data.pasal.some((p) => p.ayat.some((a) => normalizeTeks(a.teks).length >= 3));
  if (!hasAyat) return "Isi minimal satu pasal dengan satu ayat";

  const isi = structuredToIsi(data);
  if (isi.length < 20) return "Isi peraturan terlalu pendek";

  return null;
}
