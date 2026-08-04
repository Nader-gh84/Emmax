import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ProfileData, QuoteDefaults } from "@/types/onboarding";
import { normalizeQuoteTemplate } from "@/lib/pdf/quote-templates";

interface SaveProfileBody extends Partial<ProfileData>, Partial<QuoteDefaults> {
  step?: "profile" | "defaults" | "template";
}

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as SaveProfileBody;
    const step = body.step ?? "profile";

    const payload: Record<string, string | number | boolean | null> = {
      user_id: user.id,
      updated_at: new Date().toISOString(),
    };

    if (body.fullName !== undefined) payload.full_name = body.fullName.trim();
    if (body.companyName !== undefined) {
      payload.company_name = body.companyName.trim();
    }
    if (body.trade !== undefined) payload.trade = body.trade.trim();
    if (body.country !== undefined) payload.country = body.country.trim();
    if (body.city !== undefined) payload.city = body.city.trim();
    if (body.email !== undefined) payload.email = body.email.trim();
    if (body.phone !== undefined) {
      payload.phone = body.phone.trim() || null;
    }
    if (body.tagline !== undefined) payload.tagline = body.tagline.trim();
    if (body.website !== undefined) payload.website = body.website.trim();
    if (body.address !== undefined) payload.address = body.address.trim();
    if (body.defaultTaxRate !== undefined) {
      payload.default_tax_rate = body.defaultTaxRate;
    }
    if (body.defaultValidityDays !== undefined) {
      payload.default_validity_days = body.defaultValidityDays;
    }
    if (body.quoteTemplate !== undefined) {
      payload.quote_template = normalizeQuoteTemplate(body.quoteTemplate);
    }
    if (step === "defaults" || step === "template") {
      // Complete onboarding on template step (final) or legacy defaults-only flow.
      if (step === "template") {
        payload.onboarding_completed = true;
      }
    }

    const { data, error } = await supabase
      .from("business_profiles")
      .upsert(payload, { onConflict: "user_id" })
      .select("id")
      .single();

    if (error) {
      console.error("Save profile error:", error.message);
      const hint =
        error.message?.includes("quote_template") ||
        error.message?.includes("tagline") ||
        error.code === "42703"
          ? " Run migration 027_quote_template_and_branding.sql in Supabase."
          : "";
      return NextResponse.json(
        {
          error: `Failed to save profile.${hint}`,
          details: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      id: data.id,
      step,
    });
  } catch (error) {
    console.error("Save profile error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to save profile",
      },
      { status: 500 }
    );
  }
}
