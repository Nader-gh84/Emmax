import type { ComponentType } from "react";
import { ABOUT } from "@/lib/about-design-tokens";

type AboutFeatureCardProps = {
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
};

export default function AboutFeatureCard({
  title,
  description,
  icon: Icon,
}: AboutFeatureCardProps) {
  return (
    <article
      className="group flex h-full min-h-[165px] flex-col rounded-2xl border p-5 transition hover:-translate-y-0.5 hover:border-[rgba(65,105,225,0.28)] hover:shadow-md lg:min-h-[172px] lg:p-6"
      style={{
        backgroundColor: ABOUT.cardBg,
        borderColor: ABOUT.border,
        boxShadow: "0 8px 32px rgba(36,99,255,0.06)",
      }}
    >
      <div
        className="flex h-11 w-11 items-center justify-center rounded-full"
        style={{ backgroundColor: "rgba(126,168,255,0.18)" }}
      >
        <Icon className="text-[#2463FF]" />
      </div>
      <h3
        className="mt-4 text-[15px] font-semibold leading-snug"
        style={{ color: ABOUT.textPrimary }}
      >
        {title}
      </h3>
      <p
        className="mt-2 flex-1 text-[13px] leading-relaxed"
        style={{ color: ABOUT.textSecondary }}
      >
        {description}
      </p>
      <span
        aria-hidden
        className="mt-4 block h-0.5 w-7 rounded-full"
        style={{ backgroundColor: ABOUT.blue }}
      />
    </article>
  );
}
