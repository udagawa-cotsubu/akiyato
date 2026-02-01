/**
 * 判定フォーム入力（PropertyInput）
 * セクション A〜G + I（H 想定賃貸条件は削除、周辺家賃は結果画面で Web 取得表示）
 */

export type ParkingType = "ON_SITE" | "NONE";

/** 周辺環境（プルダウン選択） */
export const SURROUNDING_ENV_OPTIONS = [
  "住宅街（戸建中心）",
  "住宅街（戸建・集合住宅混在）",
  "団地・ニュータウン",
  "農地混在エリア（田畑あり）",
  "郊外住宅地",
  "市街地周縁部",
  "商店・事業所混在エリア",
  "幹線道路沿い",
  "工業・倉庫エリア周辺",
  "山間部・集落",
  "海沿いエリア",
] as const;

export type SurroundingEnv = (typeof SURROUNDING_ENV_OPTIONS)[number];

export type StructureType = "WOOD" | "LIGHT_STEEL" | "RC" | "OTHER";

export type WaterType = "PUBLIC" | "WELL" | "OTHER";

export type SewageType = "SEWER" | "SEPTIC" | "PIT" | "OTHER";

export type GasType = "CITY" | "LP" | "ALL_ELECTRIC" | "OTHER";

/** 傾き（建物の傾き有無・程度） */
export type TiltType = "NONE" | "SLIGHT" | "YES" | "NEED_CHECK";

/** 建築確認・検査済: あり／なし／不明 */
export type BuildingLegalStatus = "YES" | "NO" | "UNKNOWN";

/** インスペクション: 済み／無し／不明 */
export type InspectionStatus = "DONE" | "NONE" | "UNKNOWN";

/** あり／なし／不明（違反建築・権利関係など） */
export type YesNoUnknown = "YES" | "NO" | "UNKNOWN";

/** 住宅ローン・投資ローン: 可／不可 */
export type LoanOkNg = "OK" | "NG";

/** 基礎種別: ベタ基礎／布基礎／未確認 */
export type FoundationType = "MAT" | "STRIP" | "UNKNOWN";

/** シロアリ: 有り／なし／不明 */
export type TermiteStatus = "YES" | "NO" | "UNKNOWN";

/** G. 工事内容（チェックボックス） */
export interface ConstructionItems {
  water_system: boolean;
  wallpaper_full: boolean;
  floor_partial: boolean;
  exterior_partial: boolean;
}

export interface PropertyInput {
  // A. 物件基本
  property_name: string;
  address: string;

  // B. 面積・間取り
  land_area_m2: number;
  building_area_m2: number;
  layout: string;
  floors: number;

  // C. 立地・駐車場
  nearest_access: string;
  surrounding_env: string;
  parking: ParkingType;
  monthly_parking_fee_yen?: number;
  road_access: string;

  // D. 即NG判定
  ng_rebuild_or_road_fail: boolean; // 再建築不可・接道義務未達（統合）
  ng_structure_severe: boolean;
  ng_neighbor_trouble: boolean;
  loan_residential: LoanOkNg; // 住宅ローン 可/不可
  loan_investment: LoanOkNg; // 投資ローン 可/不可

  // E. 法務・権利関係
  building_legal_status: BuildingLegalStatus;
  inspection_status: InspectionStatus;
  nonconformity_risk: YesNoUnknown;
  nonconformity_note?: string;
  title_rights_risk: YesNoUnknown;
  title_rights_note?: string;

  // F. 建物・インフラ（耐震は築年数から自動判定のため入力なし）
  built_year: number;
  structure_type: StructureType;
  water_leak: boolean;
  water_leak_note?: string;
  foundation_type: FoundationType;
  termite: TermiteStatus;
  termite_note?: string;
  tilt: TiltType;
  water: WaterType;
  sewage: SewageType;
  gas: GasType;
  electricity: string;
  condition_note: string;

  // G. 工事・回転
  estimated_renovation_yen?: number;
  construction_items: ConstructionItems;
  desired_sale_price_yen?: number;

  // I. 補足
  remarks: string;
}
