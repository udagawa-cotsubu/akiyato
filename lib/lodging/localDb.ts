/**
 * 宿泊ダッシュボード用のブラウザ内ローカルDB（IndexedDB ラッパー）
 *
 * - DB 名: lodgingDashboard
 * - オブジェクトストア: inns, reservations
 * - 将来 Supabase に切り替える際は、この層の実装を差し替える想定
 */

import type { Inn, Reservation } from "@/lib/types/lodging";
import type { ReservationFilter } from "@/lib/types/lodging";

const DB_NAME = "lodgingDashboard";
const DB_VERSION = 1;
const STORE_INNS = "inns";
const STORE_RESERVATIONS = "reservations";

type StoreName = typeof STORE_INNS | typeof STORE_RESERVATIONS;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available in this environment."));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(request.error ?? new Error("Failed to open IndexedDB"));
    };

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_INNS)) {
        db.createObjectStore(STORE_INNS, { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains(STORE_RESERVATIONS)) {
        const reservationsStore = db.createObjectStore(STORE_RESERVATIONS, {
          keyPath: "id",
        });
        // 宿ごとのクエリをしやすくするためのインデックス
        reservationsStore.createIndex("innId", "innId", { unique: false });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };
  });
}

function transaction<T>(
  storeName: StoreName,
  mode: IDBTransactionMode,
  handler: (store: IDBObjectStore) => void | Promise<void>,
): Promise<T> {
  return openDatabase().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);

        let result: T | undefined;

        const maybePromise = handler(store);
        if (maybePromise instanceof Promise) {
          maybePromise.catch((err) => {
            tx.abort();
            reject(err);
          });
        }

        tx.oncomplete = () => {
          // result は handler 側で必要に応じてセットする
          resolve(result as T);
        };
        tx.onerror = () => {
          reject(tx.error ?? new Error("IndexedDB transaction error"));
        };

        // handler から結果を設定するためのヘルパー
        (tx as unknown as { _setResult?: (value: T) => void })._setResult = (value: T) => {
          result = value;
        };
      }),
  );
}

/** 宿一覧を全件取得 */
export async function getAllInns(): Promise<Inn[]> {
  const db = await openDatabase();
  return new Promise<Inn[]>((resolve, reject) => {
    const tx = db.transaction(STORE_INNS, "readonly");
    const store = tx.objectStore(STORE_INNS);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result as Inn[]);
    request.onerror = () => reject(request.error ?? new Error("Failed to get inns"));
  });
}

/** 宿をまとめて保存（同じ ID は上書き） */
export async function saveInns(inns: Inn[]): Promise<void> {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_INNS, "readwrite");
    const store = tx.objectStore(STORE_INNS);

    inns.forEach((inn) => {
      store.put(inn);
    });

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Failed to save inns"));
  });
}

/** 単一の宿を削除 */
export async function deleteInn(id: string): Promise<void> {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_INNS, "readwrite");
    const store = tx.objectStore(STORE_INNS);
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Failed to delete inn"));
  });
}

/** 予約をまとめて保存（同じ ID は上書き） */
export async function saveReservations(reservations: Reservation[]): Promise<void> {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_RESERVATIONS, "readwrite");
    const store = tx.objectStore(STORE_RESERVATIONS);

    reservations.forEach((reservation) => {
      store.put(reservation);
    });

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Failed to save reservations"));
  });
}

/** 全予約 or 簡易フィルタ付きで取得（フロント側フィルタを前提） */
export async function getReservations(filter?: ReservationFilter): Promise<Reservation[]> {
  const db = await openDatabase();

  const all = await new Promise<Reservation[]>((resolve, reject) => {
    const tx = db.transaction(STORE_RESERVATIONS, "readonly");
    const store = tx.objectStore(STORE_RESERVATIONS);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result as Reservation[]);
    request.onerror = () => reject(request.error ?? new Error("Failed to get reservations"));
  });

  if (!filter) return all;

  const { innId, source, checkInFrom, checkInTo, searchText } = filter;
  const text = searchText?.toLowerCase().trim();

  return all.filter((r) => {
    if (innId && r.innId !== innId) return false;
    if (source && r.source && r.source !== source) return false;

    if (checkInFrom && r.checkIn && r.checkIn < checkInFrom) return false;
    if (checkInTo && r.checkIn && r.checkIn > checkInTo) return false;

    if (text) {
      const haystack = `${r.source ?? ""} ${r.ratePlan ?? ""}`.toLowerCase();
      if (!haystack.includes(text)) return false;
    }

    return true;
  });
}

/** 予約のみ削除（宿は残す） */
export async function clearReservationsOnly(): Promise<void> {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_RESERVATIONS, "readwrite");
    const store = tx.objectStore(STORE_RESERVATIONS);
    store.clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Failed to clear reservations"));
  });
}

/** 全データ削除（宿・予約の両方） */
export async function clearAll(): Promise<void> {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([STORE_INNS, STORE_RESERVATIONS], "readwrite");

    const innsStore = tx.objectStore(STORE_INNS);
    const reservationsStore = tx.objectStore(STORE_RESERVATIONS);

    innsStore.clear();
    reservationsStore.clear();

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Failed to clear local DB"));
  });
}

