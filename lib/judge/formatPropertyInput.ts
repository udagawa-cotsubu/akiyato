import type { PropertyInput } from "@/lib/types/property";
import { getTaishinLabelFromBuiltYear } from "@/lib/utils";

/** 旧フォーマットの input 用（再判定時に DB の古いレコードを渡す場合） */
type InputWithLegacy = PropertyInput & {
  ng_rebuild_not_allowed?: boolean;
  ng_road_access_fail?: boolean;
  loan_residential?: "OK" | "NG";
  loan_investment?: "OK" | "NG";
  inspection_available?: boolean;
  inspection_status?: string;
  building_legal_status?: string;
  nonconformity_risk?: string;
  title_rights_risk?: string;
  foundation_type?: string;
  termite?: string;
  termite_note?: string;
};

/** 判定用に PropertyInput を読みやすいテキストに整形する（旧フォーマットの input も受け付ける） */
export function formatPropertyInputForPrompt(input: InputWithLegacy): string {
  const lines: string[] = [];
  const add = (label: string, value: unknown) => {
    if (value === undefined || value === null || value === "") return;
    lines.push(`${label}: ${value}`);
  };
  const addBool = (label: string, value: boolean) => {
    lines.push(`${label}: ${value ? "はい" : "いいえ"}`);
  };

  const ngRebuildOrRoad =
    input.ng_rebuild_or_road_fail ??
    (input.ng_rebuild_not_allowed || input.ng_road_access_fail);
  const loanRes = input.loan_residential ?? "OK";
  const loanInv = input.loan_investment ?? "OK";

  lines.push("## A. 物件基本");
  add("物件名", input.property_name);
  if ((input as { postal_code?: string }).postal_code) {
    add("郵便番号", (input as { postal_code?: string }).postal_code);
  }
  add("住所", input.address);

  lines.push("\n## B. 面積・間取り");
  add("土地面積（m²）", input.land_area_m2);
  add("建物面積（m²）", input.building_area_m2);
  add("間取り", input.layout);
  add("階数", input.floors);

  lines.push("\n## C. 立地・駐車場");
  add("最寄駅・アクセス", input.nearest_access);
  add("周辺環境", input.surrounding_env || "（未選択）");
  add("駐車場", input.parking === "ON_SITE" ? "敷地内あり" : "なし");
  add("月額駐車料金（円）", input.monthly_parking_fee_yen);
  add("接道", input.road_access);

  lines.push("\n## D. 即NG判定");
  addBool("再建築不可・接道義務未達", ngRebuildOrRoad ?? false);
  addBool("重大な構造腐朽・傾き", input.ng_structure_severe);
  addBool("近隣トラブル・係争中", input.ng_neighbor_trouble);
  add("住宅ローン", loanRes === "OK" ? "可" : "不可");
  add("投資ローン", loanInv === "OK" ? "可" : "不可");

  const bLegal = input.building_legal_status;
  const insp = input.inspection_status ?? (input.inspection_available === true ? "DONE" : input.inspection_available === false ? "NONE" : "UNKNOWN");
  const noncon = input.nonconformity_risk;
  const titleR = input.title_rights_risk;
  lines.push("\n## E. 法務・権利関係");
  add("建築確認・検査済", bLegal === "YES" ? "あり" : bLegal === "NO" ? "なし" : "不明");
  add(
    "インスペクション",
    insp === "DONE"
      ? "済み"
      : insp === "NONE"
        ? "無し"
        : insp === "NEW_TAISHIN"
          ? "新耐震（インスペ未実施でも可）"
          : "不明"
  );
  const taishinLabel = getTaishinLabelFromBuiltYear(input.built_year);
  if (taishinLabel !== "不明") {
    add(
      "※インスペクションの扱い",
      taishinLabel === "新耐震"
        ? "新耐震のため判定理由でインスペに言及不要"
        : "旧耐震のためインスペの有無・結果を重視すること"
    );
  }
  add("違反建築・既存不適格の懸念", noncon === "YES" ? "あり" : noncon === "NO" ? "なし" : "不明");
  add("違反建築・既存不適格（コメント）", input.nonconformity_note);
  add("権利関係の懸念", titleR === "YES" ? "あり" : titleR === "NO" ? "なし" : "不明");
  add("権利関係（コメント）", input.title_rights_note);

  lines.push("\n## F. 建物・インフラ");
  add("築年", input.built_year);
  add("耐震区分", getTaishinLabelFromBuiltYear(input.built_year));
  add("構造", input.structure_type);
  addBool("雨漏りあり", input.water_leak);
  add("雨漏り（コメント）", input.water_leak_note);
  const foundation = input.foundation_type ?? "UNKNOWN";
  const termite = input.termite ?? "UNKNOWN";
  add("基礎種別", foundation === "MAT" ? "ベタ基礎" : foundation === "STRIP" ? "布基礎" : "未確認");
  add("シロアリ", termite === "YES" ? "有り" : termite === "NO" ? "なし" : "不明");
  add("シロアリ（コメント）", input.termite_note);
  add("傾き", input.tilt);
  add("上水", input.water);
  add("下水", input.sewage);
  add("ガス", input.gas);
  add("電気", input.electricity);
  add("現状備考", input.condition_note);

  lines.push("\n## G. 工事・回転");
  add("想定リフォーム費（万円）", input.estimated_renovation_yen != null ? input.estimated_renovation_yen / 10000 : "");
  addBool("水回り交換", input.construction_items.water_system);
  addBool("内装クロス全面", input.construction_items.wallpaper_full);
  addBool("床一部張替え", input.construction_items.floor_partial);
  addBool("外壁部分補修", input.construction_items.exterior_partial);
  add("希望売却価格（万円）", input.desired_sale_price_yen != null ? input.desired_sale_price_yen / 10000 : "");

  lines.push("\n## I. 補足");
  add("備考", input.remarks);

  return lines.filter(Boolean).join("\n");
}
