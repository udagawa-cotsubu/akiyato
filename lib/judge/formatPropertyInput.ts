import type { PropertyInput } from "@/lib/types/property";

/** 判定用に PropertyInput を読みやすいテキストに整形する */
export function formatPropertyInputForPrompt(input: PropertyInput): string {
  const lines: string[] = [];
  const add = (label: string, value: unknown) => {
    if (value === undefined || value === null || value === "") return;
    lines.push(`${label}: ${value}`);
  };
  const addBool = (label: string, value: boolean) => {
    lines.push(`${label}: ${value ? "はい" : "いいえ"}`);
  };

  lines.push("## A. 物件基本");
  add("物件名", input.property_name);
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
  addBool("再建築不可", input.ng_rebuild_not_allowed);
  addBool("接道義務未達", input.ng_road_access_fail);
  addBool("雨漏り（原因不明）", input.ng_unknown_leak);
  addBool("重大な構造腐朽・傾き", input.ng_structure_severe);
  addBool("擁壁・崖条例で是正不可", input.ng_retaining_wall_unfixable);
  addBool("近隣トラブル・係争中", input.ng_neighbor_trouble);

  lines.push("\n## E. 法務・権利関係");
  add("建築確認・検査済", input.building_legal_status);
  addBool("インスペクション実施可能", input.inspection_available);
  add("違反建築・既存不適格の懸念", input.nonconformity_risk);
  add("権利関係の懸念", input.title_rights_risk);

  lines.push("\n## F. 建物・インフラ");
  add("築年", input.built_year);
  addBool("新耐震基準", input.shin_taishin);
  add("構造", input.structure_type);
  addBool("雨漏りあり", input.water_leak);
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

  lines.push("\n## H. 想定賃貸条件");
  add("想定賃料（万円）", input.expected_rent_yen != null ? input.expected_rent_yen / 10000 : "");
  addBool("ペット可", input.pet_allowed);
  add("ペット備考", input.pet_note);
  add("想定セグメント（単身・夫婦・ファミリー・投資家）", JSON.stringify(input.target_segments));

  lines.push("\n## I. 補足");
  add("備考", input.remarks);

  return lines.filter(Boolean).join("\n");
}
