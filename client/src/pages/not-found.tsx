import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPinOff, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [location, setLocation] = useLocation();

  const isAdmin = location.startsWith("/admin");
  const homePath = isAdmin ? "/admin" : "/warga";
  const homeLabel = isAdmin ? "Dashboard Admin" : "Beranda";

  return (
    <div className="flex items-center justify-center py-16 px-4">
      <Card className="w-full max-w-sm text-center">
        <CardContent className="pt-8 pb-6 space-y-4">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
            <MapPinOff className="w-8 h-8 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <h1 className="text-lg font-bold" data-testid="text-404-title">Halaman Tidak Ditemukan</h1>
            <p className="text-sm text-muted-foreground">
              Maaf, halaman yang Anda cari tidak tersedia atau sudah dipindahkan.
            </p>
          </div>
          <Button
            className="gap-2"
            onClick={() => setLocation(homePath)}
            data-testid="button-back-home"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke {homeLabel}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
