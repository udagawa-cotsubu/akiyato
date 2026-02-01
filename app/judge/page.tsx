"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
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
import { normalizeHalfWidthDigits, getTaishinLabelFromBuiltYear } from "@/lib/utils";
import { runJudge } from "@/lib/actions/judge";
import { fetchAreaProfile, fetchPriceFeedback, fetchSurroundingRentMarket } from "@/lib/actions/ai";
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
      const [area_profile, price_feedback, surrounding_rent_market] = await Promise.all([
        fetchAreaProfile(input.address),
        fetchPriceFeedback(input.address, input.desired_sale_price_yen),
        fetchSurroundingRentMarket(input.address),
      ]);
      if (area_profile == null && price_feedback == null && input.address?.trim()) {
        toast.error(
          "希望価格の妥当性・住所の特徴を取得できませんでした。.env.local の OPENAI_API_KEY を確認し、開発サーバー（npm run dev）を再起動してください。"
        );
      }
      const { create: createJudgement } = await import("@/lib/repositories/judgementsRepository");
      const record = await createJudgement({
        input,
        output,
        prompt_snapshot,
        status: "COMPLETED",
        area_profile: area_profile ?? null,
        price_feedback: price_feedback ?? null,
        surrounding_rent_market: surrounding_rent_market ?? null,
      });
      router.push(`/judge/thanks/${record.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  }, [form, router]);

  const sectionClass = "rounded-lg border bg-card p-4";
  const sectionTitleClass = "text-sm font-semibold text-muted-foreground mb-3";
  const grid2 = "grid grid-cols-1 md:grid-cols-2 gap-3";
  const radioRow = "flex flex-row flex-wrap gap-4";

  return (
    <div className="min-h-screen bg-background">
      {isSubmitting && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background/90 backdrop-blur-sm">
          <Loader2 className="h-12 w-12 animate-spin text-primary" aria-hidden />
          <p className="text-lg font-medium">現在計算中です</p>
          <p className="text-muted-foreground text-sm">もうしばらくお待ちください</p>
        </div>
      )}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-[var(--background)]/98 px-4 py-2.5 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <Link href="/judge" className="flex items-center gap-2.5 shrink-0">
            <img
              src="/logo-bk.svg"
              alt=""
              className="h-9 w-auto"
              width={40}
              height={35}
            />
            <span className="text-lg font-semibold tracking-tight">物件判定AI</span>
          </Link>
          <Link
            href="/admin/judgements"
            className="text-muted-foreground text-sm underline shrink-0"
          >
            管理画面
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-24 pt-4 text-base">
        <Form {...form}>
          <div className="space-y-4">
            {/* A. 物件基本 */}
            <section className={sectionClass}>
              <h2 className={sectionTitleClass}>A. 物件基本</h2>
              <div className={grid2}>
                <FormField
                  control={form.control}
                  name="property_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>物件名</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="物件名" className="h-9" />
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
                        <Input {...field} placeholder="住所（町名まで）" className="h-9" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </section>

            {/* B. 面積・間取り */}
            <section className={sectionClass}>
              <h2 className={sectionTitleClass}>B. 面積・間取り</h2>
              <div className={grid2}>
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
                            className="h-9"
                            {...field}
                            onChange={(e) =>
                              field.onChange(
                                normalizeHalfWidthDigits(e.target.value)
                              )
                            }
                          />
                          <span className="text-muted-foreground text-sm">㎡</span>
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
                            className="h-9"
                            {...field}
                            onChange={(e) =>
                              field.onChange(
                                normalizeHalfWidthDigits(e.target.value)
                              )
                            }
                          />
                          <span className="text-muted-foreground text-sm">㎡</span>
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
                        <Input {...field} placeholder="例: 2LDK" className="h-9" />
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
                        <div className="flex items-center gap-2">
                          <Input
                            type="text"
                            inputMode="numeric"
                            placeholder="—"
                            className="h-9"
                            {...field}
                            onChange={(e) =>
                              field.onChange(
                                normalizeHalfWidthDigits(e.target.value)
                              )
                            }
                          />
                          <span className="text-muted-foreground text-sm">階</span>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </section>

            {/* C. 立地・駐車場 */}
            <section className={sectionClass}>
              <h2 className={sectionTitleClass}>C. 立地・駐車場</h2>
              <div className="space-y-3">
                <FormField
                  control={form.control}
                  name="nearest_access"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>最寄駅（徒歩何分か）</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="例: 〇〇駅 徒歩5分" className="h-9" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className={grid2}>
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
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="選択" />
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
                            className={radioRow}
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
                </div>
                <div className={grid2}>
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
                              className="h-9"
                              {...field}
                              onChange={(e) =>
                                field.onChange(
                                  normalizeHalfWidthDigits(e.target.value)
                                )
                              }
                            />
                            <span className="text-muted-foreground text-sm">円</span>
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
                          <Input {...field} placeholder="接道の状況" className="h-9" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </section>

            {/* D. 即NG判定 */}
            <section className={sectionClass}>
              <h2 className={sectionTitleClass}>D. 即NG判定（いずれかが「はい」だと再販見送り）</h2>
              <div className="space-y-3">
                <div className="space-y-2">
                  {(
                    [
                      ["ng_rebuild_or_road_fail", "再建築不可・接道未達"],
                      ["ng_structure_severe", "構造腐朽/傾き"],
                      ["ng_neighbor_trouble", "近隣トラブル"],
                    ] as const
                  ).map(([name, label]) => (
                    <FormField
                      key={name}
                      control={form.control}
                      name={name}
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-md border px-3 py-2">
                          <FormLabel className="cursor-pointer text-sm font-normal">{label}</FormLabel>
                          <FormControl>
                            <div className="flex items-center gap-1.5">
                              <span className="text-muted-foreground text-xs">いいえ</span>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                              <span className="text-muted-foreground text-xs">はい</span>
                            </div>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
                <div className={grid2}>
                  <FormField
                    control={form.control}
                    name="loan_residential"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>住宅ローン</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className={radioRow}
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="OK" id="loan-res-ok" />
                              <Label htmlFor="loan-res-ok">可</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="NG" id="loan-res-ng" />
                              <Label htmlFor="loan-res-ng">不可</Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="loan_investment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>投資ローン</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className={radioRow}
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="OK" id="loan-inv-ok" />
                              <Label htmlFor="loan-inv-ok">可</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="NG" id="loan-inv-ng" />
                              <Label htmlFor="loan-inv-ng">不可</Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </section>

            {/* E. 法務・権利関係 */}
            <section className={sectionClass}>
              <h2 className={sectionTitleClass}>E. 法務・権利関係</h2>
              <div className="space-y-3">
                <div className={grid2}>
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
                            className={radioRow}
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="YES" id="legal-yes" />
                              <Label htmlFor="legal-yes">あり</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="NO" id="legal-no" />
                              <Label htmlFor="legal-no">なし</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="UNKNOWN" id="legal-unk" />
                              <Label htmlFor="legal-unk">不明</Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="inspection_status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>インスペクション</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className={radioRow}
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="DONE" id="insp-done" />
                              <Label htmlFor="insp-done">済み</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="NONE" id="insp-none" />
                              <Label htmlFor="insp-none">無し</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="UNKNOWN" id="insp-unk" />
                              <Label htmlFor="insp-unk">不明</Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className={grid2}>
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
                            className={radioRow}
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="YES" id="noncon-yes" />
                              <Label htmlFor="noncon-yes">あり</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="NO" id="noncon-no" />
                              <Label htmlFor="noncon-no">なし</Label>
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
                        <FormLabel>権利関係の懸念</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className={radioRow}
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="YES" id="title-yes" />
                              <Label htmlFor="title-yes">あり</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="NO" id="title-no" />
                              <Label htmlFor="title-no">なし</Label>
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
                </div>
                <div className={grid2}>
                  <FormField
                    control={form.control}
                    name="nonconformity_note"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>違反建築コメント</FormLabel>
                        <FormControl>
                          <Textarea {...field} value={field.value ?? ""} placeholder="任意" className="min-h-[60px]" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="title_rights_note"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>権利関係コメント</FormLabel>
                        <FormControl>
                          <Textarea {...field} value={field.value ?? ""} placeholder="任意" className="min-h-[60px]" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </section>

            {/* F. 建物・インフラ */}
            <section className={sectionClass}>
              <h2 className={sectionTitleClass}>F. 建物・インフラ</h2>
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                            placeholder="西暦で入力"
                            className="h-9"
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
                    name="structure_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>構造</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-9">
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
                    name="foundation_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>基礎種別</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="選択" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="MAT">ベタ基礎</SelectItem>
                            <SelectItem value="STRIP">布基礎</SelectItem>
                            <SelectItem value="UNKNOWN">未確認</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <p className="text-muted-foreground text-xs">
                  耐震: {getTaishinLabelFromBuiltYear(form.watch("built_year") ? Number(form.watch("built_year")) : undefined)}
                </p>
                <div className={grid2}>
                  <FormField
                    control={form.control}
                    name="water_leak"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-md border px-3 py-2">
                        <FormLabel className="cursor-pointer text-sm font-normal">雨漏り有無</FormLabel>
                        <FormControl>
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground text-xs">無</span>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                            <span className="text-muted-foreground text-xs">有</span>
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="water_leak_note"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>雨漏りコメント</FormLabel>
                        <FormControl>
                          <Textarea {...field} value={field.value ?? ""} placeholder="任意" className="min-h-[52px]" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className={grid2}>
                  <FormField
                    control={form.control}
                    name="termite"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>シロアリ</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className={radioRow}
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="YES" id="termite-yes" />
                              <Label htmlFor="termite-yes">有り</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="NO" id="termite-no" />
                              <Label htmlFor="termite-no">なし</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="UNKNOWN" id="termite-unk" />
                              <Label htmlFor="termite-unk">不明</Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="termite_note"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>シロアリコメント</FormLabel>
                        <FormControl>
                          <Textarea {...field} value={field.value ?? ""} placeholder="任意" className="min-h-[52px]" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  <FormField
                    control={form.control}
                    name="tilt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>傾き</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-9">
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
                        <FormLabel>上水</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-9">
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
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-9">
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
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-9">
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
                </div>
                <div className={grid2}>
                  <FormField
                    control={form.control}
                    name="electricity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>電気</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="例: 関西電力" className="h-9" />
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
                          <Textarea {...field} placeholder="状態メモ" className="min-h-[52px]" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </section>

            {/* G. 工事・回転 */}
            <section className={sectionClass}>
              <h2 className={sectionTitleClass}>G. 工事・回転</h2>
              <div className="space-y-3">
                <div className={grid2}>
                  <FormField
                    control={form.control}
                    name="estimated_renovation_yen"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>想定リフォーム費（万円）</FormLabel>
                        <FormControl>
                          <div className="flex items-center gap-2">
                            <Input
                              type="text"
                              inputMode="numeric"
                              placeholder="300"
                              className="h-9"
                              {...field}
                              onChange={(e) =>
                                field.onChange(
                                  normalizeHalfWidthDigits(e.target.value)
                                )
                              }
                            />
                            <span className="text-muted-foreground text-sm">万円</span>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="desired_sale_price_yen"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>希望売却価格（万円）</FormLabel>
                        <FormControl>
                          <div className="flex items-center gap-2">
                            <Input
                              type="text"
                              inputMode="numeric"
                              placeholder="500"
                              className="h-9"
                              {...field}
                              onChange={(e) =>
                                field.onChange(
                                  normalizeHalfWidthDigits(e.target.value)
                                )
                              }
                            />
                            <span className="text-muted-foreground text-sm">万円</span>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">必要工事内容（不明の場合 なし）</p>
                  <div className="flex flex-wrap gap-x-6 gap-y-2">
                    {(
                      [
                        ["water_system", "水回り交換"],
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
                            <FormLabel className="!mt-0 cursor-pointer font-normal text-sm">
                              {label}
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* I. 補足 */}
            <section className={sectionClass}>
              <h2 className={sectionTitleClass}>I. 補足（事実のみ）</h2>
              <FormField
                control={form.control}
                name="remarks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>備考</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="事実のみ記入" className="min-h-[72px]" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </section>
          </div>
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
