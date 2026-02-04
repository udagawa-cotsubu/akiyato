/**
 * 都道府県名 → 都道府県コード（01〜47）のマッピング。
 * 不動産情報ライブラリ API マニュアルの都道府県コード一覧に準拠。
 */
export const PREFECTURE_NAME_TO_CODE: Record<string, string> = {
  "北海道": "01",
  "青森県": "02",
  "岩手県": "03",
  "宮城県": "04",
  "秋田県": "05",
  "山形県": "06",
  "福島県": "07",
  "茨城県": "08",
  "栃木県": "09",
  "群馬県": "10",
  "埼玉県": "11",
  "千葉県": "12",
  "東京都": "13",
  "神奈川県": "14",
  "新潟県": "15",
  "富山県": "16",
  "石川県": "17",
  "福井県": "18",
  "山梨県": "19",
  "長野県": "20",
  "岐阜県": "21",
  "静岡県": "22",
  "愛知県": "23",
  "三重県": "24",
  "滋賀県": "25",
  "京都府": "26",
  "大阪府": "27",
  "兵庫県": "28",
  "奈良県": "29",
  "和歌山県": "30",
  "鳥取県": "31",
  "島根県": "32",
  "岡山県": "33",
  "広島県": "34",
  "山口県": "35",
  "徳島県": "36",
  "香川県": "37",
  "愛媛県": "38",
  "高知県": "39",
  "福岡県": "40",
  "佐賀県": "41",
  "長崎県": "42",
  "熊本県": "43",
  "大分県": "44",
  "宮崎県": "45",
  "鹿児島県": "46",
  "沖縄県": "47",
};

/** 住所先頭から都道府県名を抽出する際、都・道・府を優先（長い一致を取るため） */
const PREFECTURE_NAMES_ORDERED = [
  "北海道",
  "東京都",
  "京都府",
  "大阪府",
  "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
  "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "神奈川県", "新潟県",
  "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県", "静岡県",
  "愛知県", "三重県", "滋賀県", "兵庫県", "奈良県", "和歌山県",
  "鳥取県", "島根県", "岡山県", "広島県", "山口県", "徳島県", "香川県",
  "愛媛県", "高知県", "福岡県", "佐賀県", "長崎県", "熊本県", "大分県",
  "宮崎県", "鹿児島県", "沖縄県",
];

/**
 * 住所文字列の先頭から都道府県名を推定する。
 * @returns 都道府県名（見つからなければ null）
 */
export function extractPrefectureFromAddress(address: string): string | null {
  const s = (address ?? "").trim();
  if (!s) return null;
  for (const name of PREFECTURE_NAMES_ORDERED) {
    if (s.startsWith(name)) return name;
  }
  return null;
}

/**
 * 住所文字列のどこかに都道府県名が含まれていればそれを返す。
 * 先頭以外（例: 「葛飾区…」のあとに「東京都」が含まれる場合）用。
 * 複数候補がある場合は PREFECTURE_NAMES_ORDERED の先に現れるものを採用。
 */
export function extractPrefectureContainedInAddress(address: string): string | null {
  const s = (address ?? "").trim();
  if (!s) return null;
  for (const name of PREFECTURE_NAMES_ORDERED) {
    if (s.includes(name)) return name;
  }
  return null;
}

/**
 * 区名・政令指定都市の区など → 都道府県名。
 * 住所が都道府県から始まらない場合のフォールバック用（XIT002 の市区町村名と整合）。
 */
export const WARD_OR_CITY_TO_PREFECTURE: Record<string, string> = {
  "千代田区": "東京都", "中央区": "東京都", "港区": "東京都", "新宿区": "東京都", "文京区": "東京都",
  "台東区": "東京都", "墨田区": "東京都", "江東区": "東京都", "品川区": "東京都", "目黒区": "東京都",
  "大田区": "東京都", "世田谷区": "東京都", "渋谷区": "東京都", "中野区": "東京都", "杉並区": "東京都",
  "豊島区": "東京都", "北区": "東京都", "荒川区": "東京都", "板橋区": "東京都", "練馬区": "東京都",
  "足立区": "東京都", "葛飾区": "東京都", "江戸川区": "東京都",
  "八王子市": "東京都", "町田市": "東京都", "府中市": "東京都", "調布市": "東京都", "三鷹市": "東京都",
  "横浜市": "神奈川県", "川崎市": "神奈川県", "相模原市": "神奈川県", "札幌市": "北海道", "仙台市": "宮城県",
  "さいたま市": "埼玉県", "千葉市": "千葉県", "新潟市": "新潟県", "浜松市": "静岡県", "名古屋市": "愛知県",
  "京都市": "京都府", "大阪市": "大阪府", "堺市": "大阪府", "神戸市": "兵庫県", "広島市": "広島県",
  "北九州市": "福岡県", "福岡市": "福岡県", "熊本市": "熊本県",
};

/**
 * 先頭の「〇〇区」「〇〇市」「〇〇町」「〇〇村」を抽出する正規表現（1文字以上、区/市/町/村で終わる）
 */
const LEADING_WARD_OR_CITY_REGEX = /^(.+?[区市町村])/u;

/**
 * 区名・市名などから都道府県名を返す。不明なら null。
 */
export function getPrefectureFromWardOrCityName(wardOrCity: string): string | null {
  const key = (wardOrCity ?? "").trim();
  return key ? (WARD_OR_CITY_TO_PREFECTURE[key] ?? null) : null;
}

/**
 * 住所の先頭から区・市・町・村名（1つ）を抽出する。
 * 例: 「葛飾区亀有3-12-11」→「葛飾区」、「横浜市西区みなとみらい」→「横浜市」
 */
export function extractLeadingWardOrCity(address: string): string | null {
  const s = (address ?? "").trim();
  if (!s) return null;
  const m = s.match(LEADING_WARD_OR_CITY_REGEX);
  return m ? m[1]! : null;
}

/**
 * 都道府県名から都道府県コード（2桁）を返す。
 */
export function prefectureNameToCode(name: string): string | null {
  const n = (name ?? "").trim();
  return PREFECTURE_NAME_TO_CODE[n] ?? null;
}

/** 都道府県コード（2桁）→ 都道府県名（表示用） */
const CODE_TO_PREFECTURE_NAME: Record<string, string> = Object.fromEntries(
  Object.entries(PREFECTURE_NAME_TO_CODE).map(([name, code]) => [code, name])
);

/**
 * 都道府県コード（01〜47）から都道府県名を返す。
 */
export function prefectureCodeToName(areaCode: string): string | null {
  const code = String(areaCode).padStart(2, "0").slice(0, 2);
  return CODE_TO_PREFECTURE_NAME[code] ?? null;
}
