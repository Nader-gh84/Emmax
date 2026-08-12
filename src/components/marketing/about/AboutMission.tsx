import { ABOUT } from "@/lib/about-design-tokens";

export default function AboutMission() {
  return (
    <section
      className="px-5 py-14 md:px-8 lg:px-[72px] lg:py-16"
      style={{ backgroundColor: ABOUT.bgSoft }}
    >
      <div className="mx-auto max-w-[720px] text-center">
        <p
          className="text-[11px] tracking-[0.2em]"
          style={{ color: ABOUT.blueLight }}
        >
          ✦
        </p>
        <p
          className="mt-3 text-lg leading-relaxed sm:text-xl"
          style={{ color: ABOUT.textSecondary }}
        >
          I combine AI power with real-world trade experience
        </p>
        <p
          className="mt-2 text-lg leading-relaxed sm:text-xl"
          style={{ color: ABOUT.textPrimary }}
        >
          to{" "}
          <span style={{ color: ABOUT.blue, fontWeight: 500 }}>
            save you time, reduce mistakes
          </span>{" "}
          and{" "}
          <span style={{ color: ABOUT.blue, fontWeight: 500 }}>
            grow your business.
          </span>
        </p>
      </div>
    </section>
  );
}
