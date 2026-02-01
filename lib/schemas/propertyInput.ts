import { z } from "zod";
import type { PropertyInput, ConstructionItems } from "@/lib/types/property";
import { SURROUNDING_ENV_OPTIONS } from "@/lib/types/property";

const surroundingEnvValues = ["", ...SURROUNDING_ENV_OPTIONS] as const;

/** 半角数値のみ許可（空可）。バリデーションメッセージ用 */
const HALF_WIDTH_DIGITS_MESSAGE = "半角数値のみ入力してください";

const halfWidthDigitsString = z
  .string()
  .refine((s) => /^[0-9]*$/.test(s), { message: HALF_WIDTH_DIGITS_MESSAGE });

const constructionItemsSchema = z.object({
  water_system: z.boolean(),
  wallpaper_full: z.boolean(),
  floor_partial: z.boolean(),
  exterior_partial: z.boolean(),
});

export const propertyInputSchema = z.object({
  property_name: z.string(),
  postal_code: z.string().optional(),
  address: z.string(),
  land_area_m2: halfWidthDigitsString,
  building_area_m2: halfWidthDigitsString,
  layout: z.string(),
  floors: halfWidthDigitsString,
  nearest_access: z.string(),
  surrounding_env: z.enum(surroundingEnvValues),
  parking: z.enum(["ON_SITE", "NONE"]),
  monthly_parking_fee_yen: halfWidthDigitsString,
  road_access: z.string(),
  // D. 即NG判定
  ng_rebuild_or_road_fail: z.boolean(),
  ng_structure_severe: z.boolean(),
  ng_neighbor_trouble: z.boolean(),
  loan_residential: z.enum(["OK", "NG"]),
  loan_investment: z.enum(["OK", "NG"]),
  // E. 法務・権利関係
  building_legal_status: z.enum(["YES", "NO", "UNKNOWN"]),
  inspection_status: z.enum(["DONE", "NONE", "UNKNOWN", "NEW_TAISHIN"]),
  nonconformity_risk: z.enum(["YES", "NO", "UNKNOWN"]),
  nonconformity_note: z.string().optional(),
  title_rights_risk: z.enum(["YES", "NO", "UNKNOWN"]),
  title_rights_note: z.string().optional(),
  // F. 建物・インフラ
  built_year: halfWidthDigitsString,
  structure_type: z.enum(["WOOD", "LIGHT_STEEL", "RC", "OTHER"]),
  water_leak: z.boolean(),
  water_leak_note: z.string().optional(),
  foundation_type: z.enum(["MAT", "STRIP", "UNKNOWN"]),
  termite: z.enum(["YES", "NO", "UNKNOWN"]),
  termite_note: z.string().optional(),
  tilt: z.enum(["NONE", "SLIGHT", "YES", "NEED_CHECK"]),
  water: z.enum(["PUBLIC", "WELL", "OTHER"]),
  sewage: z.enum(["SEWER", "SEPTIC", "PIT", "OTHER"]),
  gas: z.enum(["CITY", "LP", "ALL_ELECTRIC", "OTHER"]),
  electricity: z.string(),
  condition_note: z.string(),
  // G. 工事・回転
  estimated_renovation_yen: halfWidthDigitsString,
  construction_items: constructionItemsSchema,
  desired_sale_price_yen: halfWidthDigitsString,
  remarks: z.string(),
});

/** フォーム値（数値項目は文字列）を PropertyInput に変換する */
export function formValuesToPropertyInput(
  values: z.infer<typeof propertyInputSchema>
): PropertyInput {
  const toNum = (s: string): number | undefined =>
    s === "" ? undefined : Number(s);
  const toYen = (s: string): number | undefined => {
    if (s === "") return undefined;
    const n = Number(s);
    return Number.isNaN(n) ? undefined : n * 10000;
  };
  return {
    ...values,
    land_area_m2: toNum(values.land_area_m2) ?? 0,
    building_area_m2: toNum(values.building_area_m2) ?? 0,
    floors: toNum(values.floors) ?? 1,
    monthly_parking_fee_yen: toNum(values.monthly_parking_fee_yen) ?? undefined,
    built_year: toNum(values.built_year) ?? new Date().getFullYear(),
    estimated_renovation_yen: toYen(values.estimated_renovation_yen) ?? undefined,
    desired_sale_price_yen: toYen(values.desired_sale_price_yen) ?? undefined,
  };
}

/** PropertyInput をフォーム初期値（PropertyInputSchema）に変換する（もう一度判定する用） */
export function propertyInputToFormValues(
  input: PropertyInput
): z.infer<typeof propertyInputSchema> {
  const toStr = (n: number | undefined): string =>
    n === undefined ? "" : String(n);
  const toYenStr = (yen: number | undefined): string =>
    yen === undefined ? "" : String(Math.round(yen / 10000));
  return {
    ...input,
    land_area_m2: toStr(input.land_area_m2),
    building_area_m2: toStr(input.building_area_m2),
    floors: toStr(input.floors),
    monthly_parking_fee_yen: toStr(input.monthly_parking_fee_yen),
    built_year: toStr(input.built_year),
    estimated_renovation_yen: toYenStr(input.estimated_renovation_yen),
    desired_sale_price_yen: toYenStr(input.desired_sale_price_yen),
  } as z.infer<typeof propertyInputSchema>;
}

export type PropertyInputSchema = z.infer<typeof propertyInputSchema>;

export const defaultConstructionItems: ConstructionItems = {
  water_system: false,
  wallpaper_full: false,
  floor_partial: false,
  exterior_partial: false,
};

/** フォームの初期値（数値項目は空文字でデフォルト0なし） */
export const defaultPropertyInput: z.infer<typeof propertyInputSchema> = {
  property_name: "",
  postal_code: "",
  address: "",
  land_area_m2: "",
  building_area_m2: "",
  layout: "",
  floors: "",
  nearest_access: "",
  surrounding_env: "",
  parking: "NONE",
  monthly_parking_fee_yen: "",
  road_access: "",
  ng_rebuild_or_road_fail: false,
  ng_structure_severe: false,
  ng_neighbor_trouble: false,
  loan_residential: "OK",
  loan_investment: "OK",
  building_legal_status: "UNKNOWN",
  inspection_status: "UNKNOWN",
  nonconformity_risk: "UNKNOWN",
  nonconformity_note: undefined,
  title_rights_risk: "UNKNOWN",
  title_rights_note: undefined,
  built_year: "",
  structure_type: "WOOD",
  water_leak: false,
  water_leak_note: undefined,
  foundation_type: "UNKNOWN",
  termite: "UNKNOWN",
  termite_note: undefined,
  tilt: "NONE",
  water: "PUBLIC",
  sewage: "SEWER",
  gas: "CITY",
  electricity: "",
  condition_note: "",
  estimated_renovation_yen: "",
  construction_items: defaultConstructionItems,
  desired_sale_price_yen: "",
  remarks: "",
};
