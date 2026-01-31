/**
 * 判定フォーム入力（PropertyInput）
 * セクション A〜I の全フィールド
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

/** 建築確認・検査済の有無 */
export type BuildingLegalStatus = "CONFIRMED" | "LIKELY_OK" | "UNCONFIRMED";

/** リスクレベル */
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";

export interface TargetSegments {
  single: boolean;
  couple: boolean;
  family: boolean;
  investor: boolean;
}

/** G. 工事内容（チェックボックス） */
export interface ConstructionItems {
  water_system: boolean; // 水回り交換（キッチン・浴室・トイレ）
  wallpaper_full: boolean; // 内装クロス全面
  floor_partial: boolean; // 床一部張替え
  exterior_partial: boolean; // 外壁部分補修
}

export interface PropertyInput {
  // A. 物件基本
  property_name: string;
  address: string; // 住所（町名まで可）

  // B. 面積・間取り
  land_area_m2: number;
  building_area_m2: number;
  layout: string; // 間取り（例: 2LDK）
  floors: number; // 階数

  // C. 立地・駐車場
  nearest_access: string; // 最寄駅(徒歩何分か)
  surrounding_env: string; // 周辺環境（SURROUNDING_ENV_OPTIONS のいずれか、または空文字）
  parking: ParkingType;
  monthly_parking_fee_yen?: number;
  road_access: string; // 接道

  // D. 即NG判定
  ng_rebuild_not_allowed: boolean;
  ng_road_access_fail: boolean;
  ng_unknown_leak: boolean;
  ng_structure_severe: boolean;
  ng_retaining_wall_unfixable: boolean;
  ng_neighbor_trouble: boolean;

  // E. 法務・権利関係（物件のパワー評価用。ローン可否は自社で組むため不要）
  building_legal_status: BuildingLegalStatus; // 建築確認・検査済の存在
  inspection_available: boolean; // インスペクション実施可能か
  nonconformity_risk: RiskLevel; // 違反建築/既存不適格の懸念
  title_rights_risk: RiskLevel; // 権利関係の懸念

  // F. 建物・インフラ
  built_year: number;
  shin_taishin: boolean;
  structure_type: StructureType;
  water_leak: boolean; // 雨漏り有無（true=有）
  tilt: TiltType; // 傾き
  water: WaterType;
  sewage: SewageType;
  gas: GasType;
  electricity: string; // 電気
  condition_note: string;

  // G. 工事・回転
  estimated_renovation_yen?: number; // 想定リフォーム費（円）。表示は万円
  construction_items: ConstructionItems; // 工事内容
  desired_sale_price_yen?: number; // 希望売却価格（円）。表示は万円

  // H. 想定賃貸条件
  expected_rent_yen?: number;
  pet_allowed: boolean;
  pet_note?: string;
  target_segments: TargetSegments;

  // I. 補足
  remarks: string;
}
