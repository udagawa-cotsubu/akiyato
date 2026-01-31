/**
 * 判定フォーム入力（PropertyInput）
 * セクション A〜H の全フィールド
 */

export type ParkingType = "ON_SITE" | "NONE";

export type LoanImpossibleBoth = "YES" | "NO" | "UNKNOWN";

export type StructureType = "WOOD" | "LIGHT_STEEL" | "RC" | "OTHER";

export type WaterType = "PUBLIC" | "WELL" | "OTHER";

export type SewageType = "SEWER" | "SEPTIC" | "PIT" | "OTHER";

export type GasType = "CITY" | "LP" | "ALL_ELECTRIC" | "OTHER";

export interface TargetSegments {
  single: boolean;
  couple: boolean;
  family: boolean;
  investor: boolean;
}

export interface PropertyInput {
  // A. 物件基本
  property_name: string;
  address: string;
  area: string;

  // B. 面積
  land_area_m2: number;
  building_area_m2: number;

  // C. 立地・駐車場
  nearest_access: string;
  parking: ParkingType;
  monthly_parking_fee_yen?: number;

  // D. 即NG判定
  ng_rebuild_not_allowed: boolean;
  ng_road_access_fail: boolean;
  ng_unknown_leak: boolean;
  ng_structure_severe: boolean;
  ng_retaining_wall_unfixable: boolean;
  ng_neighbor_trouble: boolean;
  loan_impossible_both: LoanImpossibleBoth;

  // E. 建物・インフラ
  built_year: number;
  shin_taishin: boolean;
  structure_type: StructureType;
  foundation: string;
  water: WaterType;
  sewage: SewageType;
  gas: GasType;
  condition_note: string;

  // F. 想定賃貸条件
  expected_rent_yen?: number;
  pet_allowed: boolean;
  pet_note?: string;
  target_segments: TargetSegments;

  // G. 工事・回転
  within_90_days: boolean;
  min_spec_ok: boolean;
  s_plus_partial_ok: boolean;
  can_restore_no_explain: boolean;

  // H. 補足
  remarks: string;
}
