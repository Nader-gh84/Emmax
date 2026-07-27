"use client";

import { useMemo } from "react";
import { touchInput } from "@/components/quotes/ui";
import { SearchableSelect } from "@/components/profile/searchable-select";
import {
  ALL_COUNTRIES,
  getCitiesForCountry,
  getPhoneCode,
} from "@/lib/location";
import {
  PROFILE_FIELDS,
  TRADE_OPTIONS,
  type ProfileData,
  type ProfileFieldKey,
} from "@/types/onboarding";

interface ProfileFormFieldsProps {
  profile: ProfileData;
  phoneLocal: string;
  idPrefix: string;
  onFieldChange: (key: ProfileFieldKey, value: string) => void;
  onPhoneLocalChange: (value: string) => void;
  onCountryChange: (country: string) => void;
}

export function ProfileFormFields({
  profile,
  phoneLocal,
  idPrefix,
  onFieldChange,
  onPhoneLocalChange,
  onCountryChange,
}: ProfileFormFieldsProps) {
  const countryOptions = useMemo(
    () =>
      ALL_COUNTRIES.map((country) => ({
        value: country.name,
        label: `${country.flag} ${country.name}`,
        hint: country.isoCode,
      })),
    []
  );

  const cityOptions = useMemo(() => {
    if (!profile.country) return [];

    return getCitiesForCountry(profile.country).map((city) => ({
      value: city.name,
      label: city.name,
      hint: city.stateCode,
    }));
  }, [profile.country]);

  const phonePrefix = profile.country ? `+${getPhoneCode(profile.country)}` : "+";

  return (
    <>
      {PROFILE_FIELDS.map((field) => {
        if (field.key === "country") {
          return (
            <div key={field.key}>
              <label
                htmlFor={`${idPrefix}-country`}
                className="block text-base font-medium text-slate-300"
              >
                Country
                <span className="text-accent"> *</span>
              </label>
              <SearchableSelect
                id={`${idPrefix}-country`}
                value={profile.country}
                onChange={onCountryChange}
                options={countryOptions}
                placeholder="Search or select country"
                required
                maxResults={50}
              />
            </div>
          );
        }

        if (field.key === "city") {
          return (
            <div key={field.key}>
              <label
                htmlFor={`${idPrefix}-city`}
                className="block text-base font-medium text-slate-300"
              >
                City
                <span className="text-accent"> *</span>
              </label>
              <SearchableSelect
                id={`${idPrefix}-city`}
                value={profile.city}
                onChange={(value) => onFieldChange("city", value)}
                options={cityOptions}
                placeholder={
                  profile.country
                    ? "Search or select city"
                    : "Select a country first"
                }
                disabled={!profile.country}
                required
                maxResults={80}
              />
            </div>
          );
        }

        if (field.key === "phone") {
          return (
            <div key={field.key}>
              <label
                htmlFor={`${idPrefix}-phone`}
                className="block text-base font-medium text-slate-300"
              >
                Phone
              </label>
              <div className="mt-1.5 flex">
                <span
                  className={`${touchInput} flex min-w-[4.5rem] shrink-0 items-center justify-center rounded-r-none border-r-0 bg-white/10 px-3 text-slate-300`}
                  aria-hidden="true"
                >
                  {phonePrefix}
                </span>
                <input
                  id={`${idPrefix}-phone`}
                  type="tel"
                  value={phoneLocal}
                  onChange={(event) =>
                    onPhoneLocalChange(
                      event.target.value.replace(/[^\d\s()-]/g, "")
                    )
                  }
                  className={`${touchInput} rounded-l-none`}
                  placeholder="Optional"
                  autoComplete="tel-national"
                />
              </div>
            </div>
          );
        }

        return (
          <div key={field.key}>
            <label
              htmlFor={`${idPrefix}-${field.key}`}
              className="block text-base font-medium text-slate-300"
            >
              {field.label}
              {!field.optional && <span className="text-accent"> *</span>}
            </label>

            {field.key === "trade" ? (
              <select
                id={`${idPrefix}-${field.key}`}
                value={profile.trade}
                onChange={(event) => onFieldChange("trade", event.target.value)}
                className={`${touchInput} mt-1.5 appearance-none`}
                required
              >
                <option value="" disabled>
                  Select your trade
                </option>
                {TRADE_OPTIONS.map((option) => (
                  <option
                    key={option}
                    value={option}
                    className="bg-navy text-white"
                  >
                    {option}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id={`${idPrefix}-${field.key}`}
                type={field.key === "email" ? "email" : "text"}
                value={profile[field.key]}
                onChange={(event) =>
                  onFieldChange(field.key, event.target.value)
                }
                className={`${touchInput} mt-1.5`}
                placeholder={field.optional ? "Optional" : field.label}
                required={!field.optional}
                autoComplete={
                  field.key === "fullName"
                    ? "name"
                    : field.key === "email"
                      ? "email"
                      : field.key === "companyName"
                        ? "organization"
                        : undefined
                }
              />
            )}
          </div>
        );
      })}
    </>
  );
}
