import { PublicKioskLayout } from "@/components/public-kiosk-layout";

export function Visitrw3Shell({
  title,
  backHref = "/visitrw3",
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
