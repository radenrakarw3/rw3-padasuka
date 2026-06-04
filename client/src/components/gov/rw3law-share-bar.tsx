import { Copy, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  getRw3lawPublicUrl,
  getRw3lawWhatsAppShareUrl,
} from "@/lib/rw3law-share";
import { cn } from "@/lib/utils";

type Rw3lawShareBarProps = {
  judul: string;
  slug: string;
  className?: string;
};

export function Rw3lawShareBar({ judul, slug, className }: Rw3lawShareBarProps) {
  const { toast } = useToast();
  const shareUrl = getRw3lawPublicUrl(slug);
  const waUrl = getRw3lawWhatsAppShareUrl(judul, slug);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Tautan disalin",
        description: shareUrl,
      });
    } catch {
      toast({
        title: "Gagal menyalin",
        description: "Salin manual dari kotak tautan di bawah.",
        variant: "destructive",
      });
    }
  };

  const shareWa = () => {
    window.open(waUrl, "_blank", "noopener,noreferrer");
  };

  const shareNative = async () => {
    if (!navigator.share) return false;
    try {
      await navigator.share({
        title: judul,
        text: `Peraturan RW 03 Padasuka: ${judul}`,
        url: shareUrl,
      });
      return true;
    } catch {
      return false;
    }
  };

  return (
    <div
      className={cn(
        "rounded-lg border border-[#d4cfc4] bg-[#fffef9] px-4 py-4 font-serif",
        className,
      )}
      data-testid="rw3law-share-bar"
    >
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <Share2 className="w-4 h-4 text-[#1a2744]" aria-hidden />
        <p className="text-sm font-semibold text-[#1a2744]">Bagikan peraturan ini</p>
      </div>
      <p className="text-xs text-[#6b6b6b] mb-3 break-all leading-relaxed">{shareUrl}</p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="font-serif border-[#1a2744] text-[#1a2744]"
          onClick={() => void copyLink()}
          data-testid="button-copy-rw3law-link"
        >
          <Copy className="w-4 h-4 mr-1.5" />
          Salin tautan
        </Button>
        <Button
          type="button"
          size="sm"
          className="font-serif bg-[#25D366] hover:bg-[#1da851] text-white"
          onClick={shareWa}
          data-testid="button-share-rw3law-wa"
        >
          Bagikan via WhatsApp
        </Button>
        {"share" in navigator && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="font-serif"
            onClick={() => void shareNative()}
            data-testid="button-share-rw3law-native"
          >
            Bagikan…
          </Button>
        )}
      </div>
    </div>
  );
}
