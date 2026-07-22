import { PublicKioskLayout } from "@/components/public-kiosk-layout";
import { RW3BIZ_ROUTES } from "@/lib/rw3biz-routes";

export function Rw3bizShell({
  title,
  backHref = RW3BIZ_ROUTES.hub,
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
