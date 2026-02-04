"use server";

import { getAddressPartsFromPostalCode } from "@/lib/actions/postal";
import {
  extractPrefectureFromAddress,
  extractPrefectureContainedInAddress,
  extractLeadingWardOrCity,
  getPrefectureFromWardOrCityName,
  prefectureNameToCode,
} from "@/lib/reinfolib/prefecture";
import { getCities, matchCityCode } from "@/lib/reinfolib/client";
import { reinfolibLogResolve } from "@/lib/reinfolib/log";

export interface ResolvedAreaCity {
  areaCode: string;
  cityCode: string | null;
}

/**
 * 住所とオプションの郵便番号から、都道府県コード（area）と市区町村コード（city）を解決する。
 * 国交省 XIT001 のパラメータ取得に使用。
 */
export async function resolveAreaAndCity(
  address: string,
  postalCode?: string | null
): Promise<ResolvedAreaCity | null> {
  let prefecture: string;
  let cityName: string;

  if (postalCode?.trim()) {
    const parts = await getAddressPartsFromPostalCode(postalCode.trim());
    if (!parts) return null;
    prefecture = parts.prefecture;
    cityName = parts.city;
  } else {
    let pref = extractPrefectureFromAddress(address ?? "");
    cityName = "";
    if (!pref) {
      pref = extractPrefectureContainedInAddress(address ?? "");
    }
    if (!pref) {
      const leading = extractLeadingWardOrCity(address ?? "");
      if (leading) {
        pref = getPrefectureFromWardOrCityName(leading);
        if (pref) cityName = leading;
      }
    }
    if (!pref) return null;
    prefecture = pref;
  }

  const areaCode = prefectureNameToCode(prefecture);
  if (!areaCode) return null;

  const cities = await getCities(areaCode);
  if (cities.length === 0) return { areaCode, cityCode: null };

  let cityCode: string | null = null;
  if (cityName) {
    cityCode = matchCityCode(cities, cityName);
  }
  if (!cityCode && address) {
    const addr = (address ?? "").trim();
    const matched = cities.filter((c) => addr.includes(c.name));
    if (matched.length > 0) {
      const longest = matched.reduce((a, b) => (a.name.length >= b.name.length ? a : b));
      cityCode = longest.id;
    }
  }
  reinfolibLogResolve({
    address: address ?? "",
    postalCode: postalCode ?? null,
    areaCode,
    cityCode,
    prefecture,
    cityNameFromInput: cityName || undefined,
  });
  return { areaCode, cityCode };
}
