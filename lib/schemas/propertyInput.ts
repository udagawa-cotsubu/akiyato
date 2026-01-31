import { z } from "zod";
import type {
  PropertyInput,
  TargetSegments,
  ConstructionItems,
} from "@/lib/types/property";
import { SURROUNDING_ENV_OPTIONS } from "@/lib/types/property";

const surroundingEnvValues = ["", ...SURROUNDING_ENV_OPTIONS] as const;

/** 半角数値のみ許可（空可）。バリデーションメッセージ用 */
const HALF_WIDTH_DIGITS_MESSAGE = "半角数値のみ入力してください";

const halfWidthDigitsString = z
  .string()
  .refine((s) => /^[0-9]*$/.test(s), { message: HALF_WIDTH_DIGITS_MESSAGE });

const targetSegmentsSchema = z.object({
  single: z.boolean(),
  couple: z.boolean(),
  family: z.boolean(),
  investor: z.boolean(),
});

const constructionItemsSchema = z.object({
  water_system: z.boolean(),
  wallpaper_full: z.boolean(),
  floor_partial: z.boolean(),
  exterior_partial: z.boolean(),
});

export const propertyInputSchema = z.object({
  property_name: z.string(),
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
  ng_rebuild_not_allowed: z.boolean(),
  ng_road_access_fail: z.boolean(),
  ng_unknown_leak: z.boolean(),
  ng_structure_severe: z.boolean(),
  ng_retaining_wall_unfixable: z.boolean(),
  ng_neighbor_trouble: z.boolean(),
  building_legal_status: z.enum(["CONFIRMED", "LIKELY_OK", "UNCONFIRMED"]),
  inspection_available: z.boolean(),
  nonconformity_risk: z.enum(["LOW", "MEDIUM", "HIGH", "UNKNOWN"]),
  title_rights_risk: z.enum(["LOW", "MEDIUM", "HIGH", "UNKNOWN"]),
  built_year: halfWidthDigitsString,
  shin_taishin: z.boolean(),
  structure_type: z.enum(["WOOD", "LIGHT_STEEL", "RC", "OTHER"]),
  water_leak: z.boolean(),
  tilt: z.enum(["NONE", "SLIGHT", "YES", "NEED_CHECK"]),
  water: z.enum(["PUBLIC", "WELL", "OTHER"]),
  sewage: z.enum(["SEWER", "SEPTIC", "PIT", "OTHER"]),
  gas: z.enum(["CITY", "LP", "ALL_ELECTRIC", "OTHER"]),
  electricity: z.string(),
  condition_note: z.string(),
  expected_rent_yen: halfWidthDigitsString,
  pet_allowed: z.boolean(),
  pet_note: z.string().optional(),
  target_segments: targetSegmentsSchema,
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
    expected_rent_yen: toYen(values.expected_rent_yen) ?? undefined,
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
    expected_rent_yen: toYenStr(input.expected_rent_yen),
    estimated_renovation_yen: toYenStr(input.estimated_renovation_yen),
    desired_sale_price_yen: toYenStr(input.desired_sale_price_yen),
  };
}

export type PropertyInputSchema = z.infer<typeof propertyInputSchema>;

export const defaultTargetSegments: TargetSegments = {
  single: false,
  couple: false,
  family: false,
  investor: false,
};

export const defaultConstructionItems: ConstructionItems = {
  water_system: false,
  wallpaper_full: false,
  floor_partial: false,
  exterior_partial: false,
};

/** フォームの初期値（数値項目は空文字でデフォルト0なし） */
export const defaultPropertyInput: z.infer<typeof propertyInputSchema> = {
  property_name: "",
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
  ng_rebuild_not_allowed: false,
  ng_road_access_fail: false,
  ng_unknown_leak: false,
  ng_structure_severe: false,
  ng_retaining_wall_unfixable: false,
  ng_neighbor_trouble: false,
  building_legal_status: "UNCONFIRMED",
  inspection_available: false,
  nonconformity_risk: "UNKNOWN",
  title_rights_risk: "UNKNOWN",
  built_year: "",
  shin_taishin: false,
  structure_type: "WOOD",
  water_leak: false,
  tilt: "NONE",
  water: "PUBLIC",
  sewage: "SEWER",
  gas: "CITY",
  electricity: "",
  condition_note: "",
  expected_rent_yen: "",
  pet_allowed: false,
  pet_note: undefined,
  target_segments: defaultTargetSegments,
  estimated_renovation_yen: "",
  construction_items: defaultConstructionItems,
  desired_sale_price_yen: "",
  remarks: "",
};
