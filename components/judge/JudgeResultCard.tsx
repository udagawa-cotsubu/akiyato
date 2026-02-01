import ReactMarkdown from "react-markdown";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  JudgementResult,
  AreaProfile,
  PriceFeedback,
} from "@/lib/types/judgement";

const mdComponents = {
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="mb-2 mt-4 text-base font-semibold first:mt-0">{children}</h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="mb-1.5 mt-3 text-sm font-medium">{children}</h3>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="list-inside list-disc space-y-0.5 text-sm">{children}</ul>
  ),
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="mb-1 text-sm">{children}</p>
  ),
};

export function JudgeResultCard({
  result,
  area_profile,
  price_feedback,
  surrounding_rent_market,
}: {
  result: JudgementResult;
  area_profile?: AreaProfile | null;
  price_feedback?: PriceFeedback | null;
  /** 周辺家賃相場・参考賃料（GPT+Web取得） */
  surrounding_rent_market?: string | null;
}) {
  const verdictVariant =
    result.verdict === "GO"
      ? "default"
      : result.verdict === "NO_GO"
        ? "destructive"
        : "secondary";
  const verdictLabel = result.verdict === "NO_GO" ? "NO-GO" : result.verdict;
  const reasonsMd = result.reasons.join("\n");
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-lg">判定結果</CardTitle>
            <Badge variant={verdictVariant} className="text-base">
              {verdictLabel}
            </Badge>
            <span className="text-muted-foreground text-sm">
              信頼度 {result.confidence}%
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {result.reasons.length > 0 && (
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown components={mdComponents}>
              {reasonsMd}
            </ReactMarkdown>
          </div>
        )}
        {(result.low_points?.length ?? 0) > 0 && (
          <div>
            <h4 className="mb-1 text-sm font-medium">低評価ポイント</h4>
            <ul className="list-inside list-disc space-y-0.5 text-sm">
              {(result.low_points ?? []).map((p, i) => (
                <li key={i}>{p}</li>
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
        {surrounding_rent_market && (
          <div>
            <h4 className="mb-1 text-sm font-medium">周辺家賃相場（参考）</h4>
            <p className="text-sm">{surrounding_rent_market}</p>
          </div>
        )}
        {price_feedback && (
          <div>
            <h4 className="mb-1 text-sm font-medium">希望価格の妥当性</h4>
            <p className="mb-1 font-medium text-sm">{price_feedback.verdict}</p>
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown components={mdComponents}>
                {price_feedback.reasoning}
              </ReactMarkdown>
            </div>
          </div>
        )}
        </CardContent>
      </Card>

      {area_profile && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              住所の特徴
              {area_profile.used_web_search
                ? "（Web検索 + AI により要約）"
                : "（AI により生成）"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown components={mdComponents}>
                {area_profile.content}
              </ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
