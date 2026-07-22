import { PublicKioskLayout } from "@/components/public-kiosk-layout";
import { KARANGTARUNA_ROUTES } from "@/lib/karangtaruna-routes";

export function KarangtarunaShell({
  title,
  backHref = KARANGTARUNA_ROUTES.hub,
  children,
}: {
  title: string;
  backHref?: string;
  children: React.ReactNode;
}) {
  return (
    <PublicKioskLayout title={title} backHref={backHref} variant="service">
      {children}
    </PublicKioskLayout>
  );
}
