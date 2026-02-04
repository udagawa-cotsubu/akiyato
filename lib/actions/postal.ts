"use server";

const ZIPCLOUD_URL = "https://zipcloud.ibsnet.co.jp/api/search";

export interface AddressParts {
  /** 都道府県（address1） */
  prefecture: string;
  /** 市区町村（address2） */
  city: string;
  /** 町域（address3） */
  town?: string;
}

/**
 * 郵便番号（7桁）で住所を取得（zipcloud API）。
 * 複数結果の場合は先頭を結合して返す（町域まで）。
 */
export async function getAddressFromPostalCode(
  postalCode: string
): Promise<string | null> {
  const parts = await getAddressPartsFromPostalCode(postalCode);
  if (!parts) return null;
  const arr = [parts.prefecture, parts.city, parts.town].filter(Boolean) as string[];
  return arr.length > 0 ? arr.join("") : null;
}

/**
 * 郵便番号（7桁）で都道府県・市区町村・町域を取得（zipcloud API）。
 * 国交省APIの area / city 解決に利用する。
 */
export async function getAddressPartsFromPostalCode(
  postalCode: string
): Promise<AddressParts | null> {
  const normalized = String(postalCode).replace(/\D/g, "");
  if (normalized.length !== 7) return null;
  try {
    const res = await fetch(
      `${ZIPCLOUD_URL}?zipcode=${encodeURIComponent(normalized)}`,
      { next: { revalidate: 86400 } }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      status?: number;
      results?: Array<{ address1?: string; address2?: string; address3?: string }>;
    };
    const results = data.results;
    if (!Array.isArray(results) || results.length === 0) return null;
    const first = results[0]!;
    const prefecture = (first.address1 ?? "").trim();
    const city = (first.address2 ?? "").trim();
    const town = (first.address3 ?? "").trim();
    if (!prefecture) return null;
    return { prefecture, city, town: town || undefined };
  } catch {
    return null;
  }
}
