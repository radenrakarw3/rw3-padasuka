import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, GripVertical } from "lucide-react";
import {
  type Rw3lawStructuredIsi,
  type Rw3lawPasal,
  newRw3lawPartId,
} from "@shared/rw3law-structured";

type Props = {
  value: Rw3lawStructuredIsi;
  onChange: (value: Rw3lawStructuredIsi) => void;
};

export function Rw3lawIsiEditor({ value, onChange }: Props) {
  const updateMenimbang = (id: string, teks: string) => {
    onChange({
      ...value,
      menimbang: value.menimbang.map((m) => (m.id === id ? { ...m, teks } : m)),
    });
  };

  const addMenimbang = () => {
    onChange({
      ...value,
      menimbang: [...value.menimbang, { id: newRw3lawPartId("m"), teks: "" }],
    });
  };

  const removeMenimbang = (id: string) => {
    if (value.menimbang.length <= 1) return;
    onChange({ ...value, menimbang: value.menimbang.filter((m) => m.id !== id) });
  };

  const updatePasal = (id: string, patch: Partial<Rw3lawPasal>) => {
    onChange({
      ...value,
      pasal: value.pasal.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    });
  };

  const addPasal = () => {
    onChange({
      ...value,
      pasal: [
        ...value.pasal,
        {
          id: newRw3lawPartId("p"),
          judul: "",
          ayat: [{ id: newRw3lawPartId("a"), teks: "" }],
        },
      ],
    });
  };

  const removePasal = (id: string) => {
    if (value.pasal.length <= 1) return;
    onChange({ ...value, pasal: value.pasal.filter((p) => p.id !== id) });
  };

  const updateAyat = (pasalId: string, ayatId: string, teks: string) => {
    onChange({
      ...value,
      pasal: value.pasal.map((p) =>
        p.id !== pasalId
          ? p
          : {
              ...p,
              ayat: p.ayat.map((a) => (a.id === ayatId ? { ...a, teks } : a)),
            },
      ),
    });
  };

  const addAyat = (pasalId: string) => {
    onChange({
      ...value,
      pasal: value.pasal.map((p) =>
        p.id !== pasalId
          ? p
          : { ...p, ayat: [...p.ayat, { id: newRw3lawPartId("a"), teks: "" }] },
      ),
    });
  };

  const removeAyat = (pasalId: string, ayatId: string) => {
    onChange({
      ...value,
      pasal: value.pasal.map((p) => {
        if (p.id !== pasalId || p.ayat.length <= 1) return p;
        return { ...p, ayat: p.ayat.filter((a) => a.id !== ayatId) };
      }),
    });
  };

  return (
    <div className="space-y-4" data-testid="rw3law-isi-editor">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-sm font-semibold">Menimbang</Label>
          <Button type="button" variant="outline" size="sm" onClick={addMenimbang}>
            <Plus className="w-3 h-3 mr-1" />
            Tambah menimbang
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Alasan atau latar belakang peraturan. Tulis bahasa biasa — kata &quot;MENIMBANG&quot; ditambahkan otomatis.
        </p>
        {value.menimbang.map((m, i) => (
          <div key={m.id} className="flex gap-2 items-start">
            <span className="text-xs text-muted-foreground pt-2.5 w-5 shrink-0">{i + 1}.</span>
            <Textarea
              rows={3}
              className="flex-1 min-h-[72px]"
              placeholder="Misal: ketertiban parkir perlu diatur demi akses darurat"
              value={m.teks}
              onChange={(e) => updateMenimbang(m.id, e.target.value)}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 text-muted-foreground hover:text-destructive"
              disabled={value.menimbang.length <= 1}
              onClick={() => removeMenimbang(m.id)}
              aria-label="Hapus menimbang"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-sm font-semibold">Pasal & ayat</Label>
          <Button type="button" variant="outline" size="sm" onClick={addPasal}>
            <Plus className="w-3 h-3 mr-1" />
            Tambah pasal
          </Button>
        </div>

        {value.pasal.map((p, pasalIdx) => (
          <Card key={p.id} className="border-dashed">
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between gap-2 space-y-0">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
                Pasal {pasalIdx + 1}
              </CardTitle>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-muted-foreground hover:text-destructive"
                disabled={value.pasal.length <= 1}
                onClick={() => removePasal(p.id)}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                Hapus pasal
              </Button>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Judul pasal (opsional)</Label>
                <Input
                  placeholder="Misal: Ketentuan Umum"
                  value={p.judul}
                  onChange={(e) => updatePasal(p.id, { judul: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Ayat</Label>
                {p.ayat.map((a, ayatIdx) => (
                  <div key={a.id} className="flex gap-2 items-start">
                    <span className="text-xs font-medium text-[hsl(163,55%,22%)] pt-2.5 w-6 shrink-0 text-right">
                      {ayatIdx + 1}.
                    </span>
                    <Textarea
                      rows={3}
                      className="flex-1 min-h-[72px]"
                      placeholder="Isi ketentuan / larangan / kewajiban"
                      value={a.teks}
                      onChange={(e) => updateAyat(p.id, a.id, e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      disabled={p.ayat.length <= 1}
                      onClick={() => removeAyat(p.id, a.id)}
                      aria-label="Hapus ayat"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  onClick={() => addAyat(p.id)}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Tambah ayat
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
