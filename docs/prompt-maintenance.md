# プロンプト設定の管理

## 単一ソース

プロンプト設定（temperature・名称・バージョン・本文）は **管理画面では編集しません**。

- **コード上の単一ソース**: `lib/prompt/defaultPrompt.ts`
- **人間用の参照用**: `content/prompt.md`（上記と内容を同期すること）

アプリは `gptSettingsRepository.get()` 経由で常に `defaultPrompt.ts` の内容を参照します。将来DB化した場合は、このファイル（または `content/prompt.md`）の内容をDBに投入する想定です。

## 保守ルール：データ構造とプロンプトの整合

**JudgementResult / PropertyInput などの型や項目を変更した場合は、プロンプト本文も必ず合わせて更新すること。**

- 判定結果のJSON形式（`lib/types/judgement.ts` の `JudgementResult`）を変えた場合  
  → `lib/prompt/defaultPrompt.ts` 内の「出力は必ず以下のJSON形式のみで返してください」以降のJSON例を、同じ構造に書き換える。
- 入力項目（`PropertyInput` やフォームのセクション）を増減・変更した場合  
  → プロンプト内の「判断の際は、以下の観点を必ず考慮してください」や、入力の渡し方の説明が必要なら追記・修正する。

これにより、AIの出力をそのまま `JudgementResult` にパースでき、型とプロンプトの食い違いを防げます。

## 将来のDB投入

- 現在: `lib/repositories/gptSettingsRepository.ts` の `get()` は `defaultPromptSettings` を返すのみ（localStorage は使わない）。
- 将来: DBにプロンプト設定テーブルを用意し、`get()` でDBを参照する。初回投入・更新は、`defaultPrompt.ts` または `content/prompt.md` の内容を流し込むスクリプトやマイグレーションで行う想定。
