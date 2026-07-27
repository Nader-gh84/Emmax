import { City, Country, type ICountry } from "country-state-city";

export const DEFAULT_COUNTRY = "Canada";

export const ALL_COUNTRIES: ICountry[] = Country.getAllCountries().sort((a, b) =>
  a.name.localeCompare(b.name)
);

export function getCountryByName(name: string): ICountry | undefined {
  return ALL_COUNTRIES.find((country) => country.name === name);
}

export function getCountryIsoCode(countryName: string): string {
  return getCountryByName(countryName)?.isoCode ?? "CA";
}

export function getPhoneCode(countryName: string): string {
  return getCountryByName(countryName)?.phonecode ?? "1";
}

export function getCitiesForCountry(countryName: string) {
  const isoCode = getCountryIsoCode(countryName);
  if (!isoCode) return [];

  return (City.getCitiesOfCountry(isoCode) ?? []).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}

/** Use a native select when the city list is small enough to browse. */
export const CITY_NATIVE_SELECT_THRESHOLD = 500;

export function formatPhoneForStorage(
  countryName: string,
  localNumber: string
): string {
  const digits = localNumber.replace(/\D/g, "");
  if (!digits) return "";

  const code = getPhoneCode(countryName);
  return `+${code}${digits}`;
}

export function parsePhoneFromStorage(
  stored: string | null | undefined,
  countryName: string
): string {
  if (!stored) return "";

  const digits = stored.replace(/\D/g, "");
  if (!digits) return "";

  const code = getPhoneCode(countryName);
  if (digits.startsWith(code)) {
    return digits.slice(code.length);
  }

  return digits;
}
