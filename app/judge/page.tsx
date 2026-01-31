"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { toast } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  propertyInputSchema,
  defaultPropertyInput,
  formValuesToPropertyInput,
  type PropertyInputSchema,
} from "@/lib/schemas/propertyInput";

const JUDGE_PREFILL_KEY = "judge-prefill";
import type { PropertyInput } from "@/lib/types/property";
import { SURROUNDING_ENV_OPTIONS } from "@/lib/types/property";
import { normalizeHalfWidthDigits } from "@/lib/utils";
import { runJudge } from "@/lib/actions/judge";
import { fetchAreaProfile, fetchPriceFeedback } from "@/lib/actions/ai";
import { create as createJudgement } from "@/lib/repositories/judgementsRepository";
import { get as getGptSettings } from "@/lib/repositories/gptSettingsRepository";
import { OPENAI_LATEST_MODEL } from "@/lib/types/gptSettings";
import type { PromptSnapshot } from "@/lib/types/judgement";

export default function JudgePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<PropertyInputSchema>({
    resolver: zodResolver(propertyInputSchema),
    defaultValues: defaultPropertyInput,
  });

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(JUDGE_PREFILL_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as PropertyInputSchema;
      sessionStorage.removeItem(JUDGE_PREFILL_KEY);
      form.reset(parsed);
    } catch {
      // ignore invalid or missing prefill
    }
  }, [form]);

  const handleJudge = useCallback(async () => {
    const values = form.getValues();
    const input = formValuesToPropertyInput(values);
    setIsSubmitting(true);
    try {
      const output = await runJudge(input);
      const settings = await getGptSettings();
      const prompt_snapshot: PromptSnapshot = {
        name: settings.prompt_name,
        version: settings.prompt_version,
        content: settings.prompt_content,
        model: OPENAI_LATEST_MODEL,
        temperature: settings.temperature,
      };
      const [area_profile, price_feedback] = await Promise.all([
        fetchAreaProfile(input.address),
        fetchPriceFeedback(input.address, input.desired_sale_price_yen),
      ]);
      if (area_profile == null && price_feedback == null && input.address?.trim()) {
        toast.error(
          "希望価格の妥当性・住所の特徴を取得できませんでした。.env.local の OPENAI_API_KEY を確認し、開発サーバー（npm run dev）を再起動してください。"
        );
      }
      const record = await createJudgement({
        input,
        output,
        prompt_snapshot,
        status: "COMPLETED",
        area_profile: area_profile ?? null,
        price_feedback: price_feedback ?? null,
      });
      router.push(`/judge/thanks/${record.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  }, [form, router]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-[var(--background)]/98 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight">物件判定</h1>
          <Link
            href="/admin/judgements"
            className="text-muted-foreground text-base underline"
          >
            管理画面
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 pb-28 pt-5 text-base">
        <Form {...form}>
          <Accordion type="multiple" defaultValue={["A"]} className="w-full">
            {/* A. 物件基本 */}
            <AccordionItem value="A">
              <AccordionTrigger>A. 物件基本</AccordionTrigger>
              <AccordionContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="property_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>物件名</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="物件名" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>住所（町名まで可）</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="住所（町名まで）" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </AccordionContent>
            </AccordionItem>

            {/* B. 面積・間取り */}
            <AccordionItem value="B">
              <AccordionTrigger>B. 面積・間取り</AccordionTrigger>
              <AccordionContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="land_area_m2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>土地面積</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-2">
                          <Input
                            type="text"
                            inputMode="numeric"
                            placeholder="—"
                            {...field}
                            onChange={(e) =>
                              field.onChange(
                                normalizeHalfWidthDigits(e.target.value)
                              )
                            }
                          />
                          <span className="text-muted-foreground text-sm">
                            ㎡
                          </span>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="building_area_m2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>建物面積</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-2">
                          <Input
                            type="text"
                            inputMode="numeric"
                            placeholder="—"
                            {...field}
                            onChange={(e) =>
                              field.onChange(
                                normalizeHalfWidthDigits(e.target.value)
                              )
                            }
                          />
                          <span className="text-muted-foreground text-sm">
                            ㎡
                          </span>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="layout"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>間取り</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="例: 2LDK" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="floors"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>階数</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          inputMode="numeric"
                          placeholder="—"
                          {...field}
                          onChange={(e) =>
                            field.onChange(
                              normalizeHalfWidthDigits(e.target.value)
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </AccordionContent>
            </AccordionItem>

            {/* C. 立地・駐車場 */}
            <AccordionItem value="C">
              <AccordionTrigger>C. 立地・駐車場</AccordionTrigger>
              <AccordionContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="nearest_access"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>最寄駅（徒歩何分か）</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="例: 〇〇駅 徒歩5分" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="surrounding_env"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>周辺環境</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value === "" ? undefined : field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="選択してください" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {SURROUNDING_ENV_OPTIONS.map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              {opt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="parking"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>駐車場</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex gap-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="ON_SITE" id="park-on" />
                            <Label htmlFor="park-on">敷地内あり</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="NONE" id="park-none" />
                            <Label htmlFor="park-none">なし</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="monthly_parking_fee_yen"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>月額駐車料金（任意）</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-2">
                          <Input
                            type="text"
                            inputMode="numeric"
                            placeholder="未入力可"
                            {...field}
                            onChange={(e) =>
                              field.onChange(
                                normalizeHalfWidthDigits(e.target.value)
                              )
                            }
                          />
                          <span className="text-muted-foreground text-sm">
                            円
                          </span>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="road_access"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>接道</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="接道の状況" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </AccordionContent>
            </AccordionItem>

            {/* D. 即NG判定 */}
            <AccordionItem value="D">
              <AccordionTrigger>D. 即NG判定（いずれかが「はい」だと再販見送り）</AccordionTrigger>
              <AccordionContent className="space-y-4">
                {(
                  [
                    ["ng_rebuild_not_allowed", "再建築不可"],
                    ["ng_road_access_fail", "接道義務未達"],
                    ["ng_unknown_leak", "雨漏り（原因不明）"],
                    ["ng_structure_severe", "重大な構造腐朽/傾き"],
                    ["ng_retaining_wall_unfixable", "擁壁/崖条例で是正不可"],
                    ["ng_neighbor_trouble", "近隣トラブル/係争中"],
                  ] as const
                ).map(([name, label]) => (
                  <FormField
                    key={name}
                    control={form.control}
                    name={name}
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <FormLabel className="cursor-pointer">{label}</FormLabel>
                        <FormControl>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground text-sm">
                              いいえ
                            </span>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                            <span className="text-muted-foreground text-sm">
                              はい
                            </span>
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                ))}
              </AccordionContent>
            </AccordionItem>

            {/* E. 法務・権利関係 */}
            <AccordionItem value="E">
              <AccordionTrigger>E. 法務・権利関係</AccordionTrigger>
              <AccordionContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="building_legal_status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>建築確認・検査済</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex flex-col gap-2"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="CONFIRMED" id="legal-confirmed" />
                            <Label htmlFor="legal-confirmed">建築確認・検査済が確認できた</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="LIKELY_OK" id="legal-likely" />
                            <Label htmlFor="legal-likely">たぶん問題なさそう（未確認）</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="UNCONFIRMED" id="legal-unconfirmed" />
                            <Label htmlFor="legal-unconfirmed">不明</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="inspection_available"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <FormLabel className="cursor-pointer">
                        インスペクション（建物状況調査）実施可能
                      </FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground text-sm">できない</span>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                          <span className="text-muted-foreground text-sm">できる</span>
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="nonconformity_risk"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>違反建築/既存不適格の懸念</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex flex-col gap-2"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="LOW" id="noncon-low" />
                            <Label htmlFor="noncon-low">低</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="MEDIUM" id="noncon-medium" />
                            <Label htmlFor="noncon-medium">中</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="HIGH" id="noncon-high" />
                            <Label htmlFor="noncon-high">高</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="UNKNOWN" id="noncon-unk" />
                            <Label htmlFor="noncon-unk">不明</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="title_rights_risk"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>権利関係（相続未了・抵当権抹消未了など）の懸念</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex flex-col gap-2"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="LOW" id="title-low" />
                            <Label htmlFor="title-low">低</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="MEDIUM" id="title-medium" />
                            <Label htmlFor="title-medium">中</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="HIGH" id="title-high" />
                            <Label htmlFor="title-high">高</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="UNKNOWN" id="title-unk" />
                            <Label htmlFor="title-unk">不明</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </AccordionContent>
            </AccordionItem>

            {/* F. 建物・インフラ */}
            <AccordionItem value="F">
              <AccordionTrigger>F. 建物・インフラ</AccordionTrigger>
              <AccordionContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="built_year"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>築年</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          inputMode="numeric"
                          placeholder="—"
                          {...field}
                          onChange={(e) =>
                            field.onChange(
                              normalizeHalfWidthDigits(e.target.value)
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="shin_taishin"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <FormLabel>新耐震</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                {Number(form.watch("built_year")) >= 1982 && !form.watch("shin_taishin") && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/30">
                    築年が1982年以降の場合、新耐震に該当する場合がほとんどです。整合性を確認してください。
                  </div>
                )}
                <FormField
                  control={form.control}
                  name="structure_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>構造</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="WOOD">木造</SelectItem>
                          <SelectItem value="LIGHT_STEEL">軽量鉄骨</SelectItem>
                          <SelectItem value="RC">RC</SelectItem>
                          <SelectItem value="OTHER">その他</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="water_leak"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <FormLabel className="cursor-pointer">雨漏り有無</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground text-sm">
                            無
                          </span>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                          <span className="text-muted-foreground text-sm">
                            有
                          </span>
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tilt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>傾き</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="選択" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="NONE">なし</SelectItem>
                          <SelectItem value="SLIGHT">軽微</SelectItem>
                          <SelectItem value="YES">あり</SelectItem>
                          <SelectItem value="NEED_CHECK">要調査</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="water"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>上水道</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="PUBLIC">水道</SelectItem>
                          <SelectItem value="WELL">井戸</SelectItem>
                          <SelectItem value="OTHER">その他</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sewage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>下水</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="SEWER">下水道</SelectItem>
                          <SelectItem value="SEPTIC">浄化槽</SelectItem>
                          <SelectItem value="PIT">汲み取り</SelectItem>
                          <SelectItem value="OTHER">その他</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="gas"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ガス</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="CITY">都市ガス</SelectItem>
                          <SelectItem value="LP">LP</SelectItem>
                          <SelectItem value="ALL_ELECTRIC">オール電化</SelectItem>
                          <SelectItem value="OTHER">その他</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="electricity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>電気</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="例: 関西電力" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="condition_note"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>構造状態メモ</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="状態メモ" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </AccordionContent>
            </AccordionItem>

            {/* G. 工事・回転 */}
            <AccordionItem value="G">
              <AccordionTrigger>G. 工事・回転</AccordionTrigger>
              <AccordionContent className="space-y-6">
                <div className="space-y-2">
                  <p className="text-sm font-medium">◯想定リフォーム費</p>
                  <FormField
                    control={form.control}
                    name="estimated_renovation_yen"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="flex items-center gap-2">
                            <Input
                              type="text"
                              inputMode="numeric"
                              placeholder="300"
                              {...field}
                              onChange={(e) =>
                                field.onChange(
                                  normalizeHalfWidthDigits(e.target.value)
                                )
                              }
                            />
                            <span className="text-muted-foreground text-sm">
                              万円
                            </span>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">◯工事内容（チェックボックス）</p>
                  <div className="rounded-md border p-4 space-y-3">
                    {(
                      [
                        [
                          "water_system",
                          "水回り交換（キッチン・浴室・トイレ）",
                        ],
                        ["wallpaper_full", "内装クロス全面"],
                        ["floor_partial", "床一部張替え"],
                        ["exterior_partial", "外壁部分補修"],
                      ] as const
                    ).map(([key, label]) => (
                      <FormField
                        key={key}
                        control={form.control}
                        name={`construction_items.${key}`}
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="!mt-0 cursor-pointer font-normal">
                              {label}
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">◯希望売却価格</p>
                  <FormField
                    control={form.control}
                    name="desired_sale_price_yen"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="flex items-center gap-2">
                            <Input
                              type="text"
                              inputMode="numeric"
                              placeholder="500"
                              {...field}
                              onChange={(e) =>
                                field.onChange(
                                  normalizeHalfWidthDigits(e.target.value)
                                )
                              }
                            />
                            <span className="text-muted-foreground text-sm">
                              万円
                            </span>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* H. 想定賃貸条件 */}
            <AccordionItem value="H">
              <AccordionTrigger>H. 想定賃貸条件</AccordionTrigger>
              <AccordionContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="expected_rent_yen"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>想定賃料（任意・万円）</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-2">
                          <Input
                            type="text"
                            inputMode="numeric"
                            placeholder="未入力可"
                            {...field}
                            onChange={(e) =>
                              field.onChange(
                                normalizeHalfWidthDigits(e.target.value)
                              )
                            }
                          />
                          <span className="text-muted-foreground text-sm">
                            万円
                          </span>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="pet_allowed"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <FormLabel>ペット可</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="pet_note"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ペット備考（任意）</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="space-y-2">
                  <Label>想定ターゲット</Label>
                  <div className="flex flex-wrap gap-4">
                    {(
                      [
                        ["single", "単身"],
                        ["couple", "カップル"],
                        ["family", "ファミリー"],
                        ["investor", "投資家"],
                      ] as const
                    ).map(([key, label]) => (
                      <FormField
                        key={key}
                        control={form.control}
                        name={`target_segments.${key}`}
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="!mt-0 font-normal">
                              {label}
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* I. 補足 */}
            <AccordionItem value="I">
              <AccordionTrigger>I. 補足（事実のみ）</AccordionTrigger>
              <AccordionContent>
                <FormField
                  control={form.control}
                  name="remarks"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>備考</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="事実のみ記入" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Form>

      </main>

      {/* Sticky 判定する */}
      <div className="fixed bottom-0 left-0 right-0 z-10 border-t bg-background/95 p-4 backdrop-blur">
        <div className="mx-auto max-w-2xl">
          <Button
            onClick={handleJudge}
            disabled={isSubmitting}
            className="w-full"
            size="lg"
          >
            {isSubmitting ? "保存中…" : "判定する"}
          </Button>
        </div>
      </div>
    </div>
  );
}
