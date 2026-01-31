This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## まずやること（初回セットアップ）

1. **Supabase の準備**
   - [Supabase](https://supabase.com) でプロジェクトを作成する。
   - ダッシュボードの **SQL Editor** で `supabase/migrations/001_create_judgements.sql` の内容を実行し、`judgements` テーブルを作成する。
   - **Settings → API** で **Project URL** と **anon public** キーをコピーする。

2. **`.env.local` の作成**
   - プロジェクト直下に `.env.local` を作成する（`.env.example` をコピーして編集してよい）。
   - 以下を設定する（キーにスペースやクォートは付けない）。
     - `NEXT_PUBLIC_SUPABASE_URL` … Supabase の Project URL
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY` … Supabase の anon public キー
     - `OPENAI_API_KEY` … [OpenAI API Keys](https://platform.openai.com/api-keys) で発行したキー
     - `SERPER_API_KEY` …（任意）[Serper](https://serper.dev) で発行したキー（住所の特徴で Web 検索を併用する場合）

3. **開発サーバーを起動・再起動**
   - `.env.local` を変更したあとは、必ず `npm run dev` を一度止めてから再度実行する。

4. **API 接続の確認**
   - ブラウザで [http://localhost:3000/admin/api-check](http://localhost:3000/admin/api-check) を開く。
   - **OpenAI** / **Supabase** / **Serper**（任意）がすべて「接続成功」になっているか確認する。失敗している項目は表示されたメッセージに従って修正する。

## Getting Started

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser. トップは判定フォーム（`/judge`）にリダイレクトされます。

### 環境変数（`.env.local`）

| 変数 | 必須 | 説明 |
|------|------|------|
| **NEXT_PUBLIC_SUPABASE_URL** | 必須 | Supabase の Project URL。判定結果の保存に使用。 |
| **NEXT_PUBLIC_SUPABASE_ANON_KEY** | 必須 | Supabase の anon public キー。 |
| **OPENAI_API_KEY** | 必須 | OpenAI API キー。判定・希望価格の妥当性・住所の特徴に使用。[OpenAI API Keys](https://platform.openai.com/api-keys) で発行。 |
| **SERPER_API_KEY** | 任意 | [Serper](https://serper.dev) の API キー。設定すると住所の特徴で Web 検索を併用。 |

- キーに余分なスペースやクォートを付けないでください。
- `.env.local` を変更したら、**開発サーバーを再起動**してください。

### API 接続チェック

管理画面の **API接続チェック**（[/admin/api-check](http://localhost:3000/admin/api-check)）で、OpenAI・Supabase・Serper の接続可否を確認できます。接続失敗時は表示メッセージに従って `.env.local` やテーブル作成を確認してください。

### 判定・AI の動作確認

- 判定実行後、thanks ページに「**希望価格の妥当性**」「**住所の特徴**」が表示されていれば、OpenAI API は正常に動作しています。
- 住所の特徴が「**Web検索 + AI により要約**」と出ていれば、Serper API も利用されています。

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
