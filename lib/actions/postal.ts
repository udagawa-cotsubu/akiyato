"use server";

const ZIPCLOUD_URL = "https://zipcloud.ibsnet.co.jp/api/search";

/**
 * 郵便番号（7桁）で住所を取得（zipcloud API）。
 * 複数結果の場合は先頭を結合して返す（町域まで）。
 */
export async function getAddressFromPostalCode(
  postalCode: string
): Promise<string | null> {
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
    const first = results[0];
    const parts = [
      first.address1,
      first.address2,
      first.address3,
    ].filter(Boolean) as string[];
    return parts.length > 0 ? parts.join("") : null;
  } catch {
    return null;
  }
}
