import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { FeatureExplain } from "@/components/gov/feature-explain";
import { ServiceCard } from "@/components/gov/service-card";

type FeatureMenuBlockProps = {
  explainTitle: string;
  explain: ReactNode;
  href: string;
  icon: LucideIcon;
  title: string;
  description?: string;
  variant?: "solid" | "glass" | "outline";
  iconClassName?: string;
};

export function FeatureMenuBlock({
  explainTitle,
  explain,
  ...card
}: FeatureMenuBlockProps) {
  return (
    <div className="space-y-2">
      <FeatureExplain title={explainTitle}>{explain}</FeatureExplain>
      <ServiceCard {...card} />
    </div>
  );
}
