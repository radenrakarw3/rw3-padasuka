import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { LogIn, Eye, EyeOff, Shield } from "lucide-react";
import logoImg from "@assets/2f80aef4-6f16-4fd8-8801-982a3e49dd03_1772991075891.JPG";

export default function LoginPage() {
  const { login } = useAuth();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast({ title: "Mohon isi semua kolom", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await login(username, password);
      toast({ title: "Login berhasil!" });
    } catch (error: any) {
      const msg = error.message.includes(":")
        ? error.message.split(":").slice(1).join(":").trim()
        : error.message;
      toast({ title: "Login Gagal", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-[hsl(163,55%,22%)] to-[hsl(163,55%,14%)]">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-24 h-24 rounded-2xl overflow-hidden bg-[hsl(40,45%,55%)] flex items-center justify-center shadow-lg">
            <img
              src={logoImg}
              alt="Logo RW 03"
              className="w-full h-full object-cover"
              data-testid="img-logo"
            />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white" data-testid="text-app-title">
              RW 03 Padasuka
            </h1>
            <p className="text-[hsl(40,30%,80%)] text-base mt-1">
              Sistem Informasi Warga Digital
            </p>
            <p className="text-[hsl(40,30%,70%)] text-sm">
              Kecamatan Cimahi Tengah, Kota Cimahi
            </p>
          </div>
        </div>

        <Card className="border-0 shadow-xl">
          <CardHeader className="pb-2 pt-5 px-5">
            <div className="flex items-center gap-2 justify-center">
              <button
                type="button"
                onClick={() => setIsAdmin(false)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  !isAdmin
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
                data-testid="button-login-warga"
              >
                Warga
              </button>
              <button
                type="button"
                onClick={() => setIsAdmin(true)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  isAdmin
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
                data-testid="button-login-admin"
              >
                <Shield className="w-4 h-4" />
                Admin
              </button>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5 pt-3">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-base font-medium">
                  {isAdmin ? "Username" : "Nomor Kartu Keluarga"}
                </Label>
                <Input
                  id="username"
                  type="text"
                  placeholder={isAdmin ? "Masukkan username" : "Contoh: 3277022211060211"}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-12 text-base"
                  data-testid="input-username"
                />
                {!isAdmin && (
                  <p className="text-xs text-muted-foreground">
                    Masukkan 16 digit nomor KK Anda
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-base font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={isAdmin ? "Masukkan password" : "4 digit terakhir No. KK"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 text-base pr-12"
                    data-testid="input-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    data-testid="button-toggle-password"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {!isAdmin && (
                  <p className="text-xs text-muted-foreground">
                    Password = 4 digit terakhir nomor KK
                  </p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold"
                disabled={loading}
                data-testid="button-submit-login"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Masuk...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <LogIn className="w-5 h-5" />
                    Masuk
                  </span>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-[hsl(40,20%,65%)] text-xs">
          Satu akun per Kartu Keluarga
        </p>
      </div>
    </div>
  );
}
