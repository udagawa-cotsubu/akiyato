"use client";

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import Link from "next/link";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  type PropertyInputSchema,
} from "@/lib/schemas/propertyInput";
import type { JudgementResult } from "@/lib/types/judgement";
import type { PropertyInput } from "@/lib/types/property";
import { judgeWithStub } from "@/lib/judge/judgeWithStub";
import { create as createJudgement } from "@/lib/repositories/judgementsRepository";
import { get as getGptSettings } from "@/lib/repositories/gptSettingsRepository";
import type { PromptSnapshot } from "@/lib/types/judgement";

function JudgeResultCard({ result }: { result: JudgementResult }) {
  const verdictVariant =
    result.verdict === "OK"
      ? "default"
      : result.verdict === "NG"
        ? "destructive"
        : "secondary";
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-lg">判定結果</CardTitle>
          <Badge variant={verdictVariant} className="text-base">
            {result.verdict}
          </Badge>
          <span className="text-muted-foreground text-sm">
            信頼度 {result.confidence}%
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {result.reasons.length > 0 && (
          <div>
            <h4 className="mb-1 text-sm font-medium">判定理由</h4>
            <ul className="list-inside list-disc space-y-0.5 text-sm">
              {result.reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        )}
        {result.missing_checks.length > 0 && (
          <div>
            <h4 className="mb-1 text-sm font-medium">未確認項目</h4>
            <ul className="list-inside list-disc space-y-0.5 text-sm">
              {result.missing_checks.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </div>
        )}
        {result.risks.length > 0 && (
          <div>
            <h4 className="mb-1 text-sm font-medium">リスク</h4>
            <ul className="space-y-2 text-sm">
              {result.risks.map((risk, i) => (
                <li key={i}>
                  <span className="font-medium">{risk.title}:</span>{" "}
                  {risk.impact}
                </li>
              ))}
            </ul>
          </div>
        )}
        {result.recommended_next_actions.length > 0 && (
          <div>
            <h4 className="mb-1 text-sm font-medium">推奨アクション</h4>
            <ul className="list-inside list-disc space-y-0.5 text-sm">
              {result.recommended_next_actions.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function defaultPromptSnapshot(): PromptSnapshot {
  return {
    name: "",
    version: "",
    content: "",
    model: "",
    temperature: 0,
  };
}

export default function JudgePage() {
  const [result, setResult] = useState<JudgementResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<PropertyInputSchema>({
    resolver: zodResolver(propertyInputSchema),
    defaultValues: defaultPropertyInput,
  });

  const handleJudge = useCallback(() => {
    const values = form.getValues();
    const input: PropertyInput = { ...values };
    const res = judgeWithStub(input);
    setResult(res);
  }, [form]);

  const handleSave = useCallback(async () => {
    const input = form.getValues() as PropertyInput;
    const output = result;
    if (!output) return;
    setIsSaving(true);
    try {
      const settings = await getGptSettings();
      const prompt_snapshot: PromptSnapshot = settings
        ? {
            name: settings.prompt_name,
            version: settings.prompt_version,
            content: settings.prompt_content,
            model: settings.model,
            temperature: settings.temperature,
          }
        : defaultPromptSnapshot();
      await createJudgement({
        input,
        output,
        prompt_snapshot,
        status: "COMPLETED",
      });
      toast.success("保存しました");
    } finally {
      setIsSaving(false);
    }
  }, [form, result]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <h1 className="text-lg font-semibold">物件判定</h1>
          <Link
            href="/admin/judgements"
            className="text-muted-foreground text-sm underline"
          >
            管理画面
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 pb-28 pt-4">
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
                        <Input {...field} placeholder="住所" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="area"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>エリア（市区町村）</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="市区町村" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </AccordionContent>
            </AccordionItem>

            {/* B. 面積 */}
            <AccordionItem value="B">
              <AccordionTrigger>B. 面積</AccordionTrigger>
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
                            type="number"
                            {...field}
                            onChange={(e) =>
                              field.onChange(Number(e.target.value) || 0)
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
                            type="number"
                            {...field}
                            onChange={(e) =>
                              field.onChange(Number(e.target.value) || 0)
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
                      <FormLabel>最寄駅/主要施設</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="最寄駅など" />
                      </FormControl>
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
                            type="number"
                            placeholder="未入力可"
                            value={field.value ?? ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              field.onChange(v === "" ? undefined : Number(v));
                            }}
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
              </AccordionContent>
            </AccordionItem>

            {/* D. 即NG判定 */}
            <AccordionItem value="D">
              <AccordionTrigger>D. 即NG判定（YESが1つでもあれば再販見送り）</AccordionTrigger>
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
                              NO
                            </span>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                            <span className="text-muted-foreground text-sm">
                              YES
                            </span>
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                ))}
                <FormField
                  control={form.control}
                  name="loan_impossible_both"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>住宅ローン不可かつ投資ローン不可</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex flex-col gap-2"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="YES" id="loan-yes" />
                            <Label htmlFor="loan-yes">YES</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="NO" id="loan-no" />
                            <Label htmlFor="loan-no">NO</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="UNKNOWN" id="loan-unk" />
                            <Label htmlFor="loan-unk">UNKNOWN</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </AccordionContent>
            </AccordionItem>

            {/* E. 建物・インフラ */}
            <AccordionItem value="E">
              <AccordionTrigger>E. 建物・インフラ</AccordionTrigger>
              <AccordionContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="built_year"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>築年</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value) || 0)
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
                  name="foundation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>基礎</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="基礎" />
                      </FormControl>
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

            {/* F. 想定賃貸条件 */}
            <AccordionItem value="F">
              <AccordionTrigger>F. 想定賃貸条件</AccordionTrigger>
              <AccordionContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="expected_rent_yen"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>想定賃料（任意）</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            placeholder="未入力可"
                            value={field.value ?? ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              field.onChange(v === "" ? undefined : Number(v));
                            }}
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

            {/* G. 工事・回転 */}
            <AccordionItem value="G">
              <AccordionTrigger>G. 工事・回転</AccordionTrigger>
              <AccordionContent className="space-y-4">
                {(
                  [
                    ["within_90_days", "工期90日以内"],
                    ["min_spec_ok", "MIN仕様で成立"],
                    ["s_plus_partial_ok", "S+一部可能"],
                    ["can_restore_no_explain", "説明不要な状態まで再生可能"],
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
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                ))}
              </AccordionContent>
            </AccordionItem>

            {/* H. 補足 */}
            <AccordionItem value="H">
              <AccordionTrigger>H. 補足（事実のみ）</AccordionTrigger>
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

        {result && (
          <div className="mt-6">
            <JudgeResultCard result={result} />
            <div className="mt-4">
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full"
              >
                {isSaving ? "保存中…" : "問い合わせとして保存"}
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* Sticky 判定する */}
      <div className="fixed bottom-0 left-0 right-0 z-10 border-t bg-background/95 p-4 backdrop-blur">
        <div className="mx-auto max-w-2xl">
          <Button onClick={handleJudge} className="w-full" size="lg">
            判定する
          </Button>
        </div>
      </div>
    </div>
  );
}
