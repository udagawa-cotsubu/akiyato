/**
 * 宿泊ダッシュボード用の型定義
 *
 * - Supabase への移行を見据えたシンプルなドメインモデル
 * - 個人情報に関わる列（ゲスト名・電話番号・メールアドレスなど）はインポートしない前提
 * - CSV の 1 行目ヘッダーを基にしたフィールド名だが、アプリ内では英語のプロパティ名を利用する
 */

/** 宿（物件） */
export interface Inn {
  /** 内部用 ID（ブラウザ側で生成する UUID など） */
  id: string;
  /** CSV の「物件名」 */
  name: string;
  /** CSV の「物件タグ」 */
  tag?: string | null;
}

/** 予約（宿泊レコード） */
export interface Reservation {
  /** 内部用 ID（ブラウザ側で生成する UUID など） */
  id: string;
  /** 紐づく宿の ID */
  innId: string;

  /** 宿名（CSV の「物件名」）。ID が解決できない場合の表示用に保持 */
  innName: string | null;

  /** CSV: 予約サイト（一覧にも表示） */
  source: string | null;

  /** CSV: AirHost予約ID */
  airhostReservationId: string | null;

  /** CSV: チェックイン */
  checkIn: string | null;
  /** CSV: チェックアウト */
  checkOut: string | null;

  /** CSV: 合計日数 */
  nights: number | null;

  /** CSV: ゲスト数 */
  guestCount: number | null;

  /** CSV: 大人（人数） */
  adults: number | null;
  /** CSV: 子供（人数） */
  children: number | null;
  /** CSV: 幼児（人数・一覧には出さない） */
  infants: number | null;

  /** CSV: 国籍（一覧には出さない） */
  nationality: string | null;

  /** CSV: 予約日 */
  bookingDate: string | null;

  /** CSV: 販売 */
  saleAmount: number | null;

  /** CSV: 状態（確認済み / システムキャンセル / キャンセル / ブロックされた など）を正規化して保持 */
  status: string | null;

  /** CSV: 料金プラン（一覧には出さない） */
  ratePlan: string | null;
}

/** 予約一覧のフィルタ条件 */
export interface ReservationFilter {
  /** 宿 ID（未指定なら全宿） */
  innId?: string;
  /** 予約サイト（未指定なら全サイト） */
  source?: string;
  /** チェックイン開始日（YYYY-MM-DD 文字列） */
  checkInFrom?: string;
  /** チェックイン終了日（YYYY-MM-DD 文字列） */
  checkInTo?: string;
  /** 宿名・予約サイトなどに対するフリーテキスト検索 */
  searchText?: string;
}

/** 1泊単位の滞在レコード（ダッシュボード用の派生データ） */
export interface StayNight {
  /** 内部用 ID（ブラウザ側で生成する UUID など） */
  id: string;
  /** 紐づく宿の ID */
  innId: string;
  /** 紐づく予約の ID */
  reservationId: string;
  /** 宿名（集計・表示用の冗長データ） */
  innName: string | null;
  /** 予約サイト */
  source: string | null;
  /** 宿泊した日付（YYYY-MM-DD） */
  date: string;
  /** 状態（キャンセル・ブロックなど） */
  status: string | null;
}

