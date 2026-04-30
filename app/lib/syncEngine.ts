/**
 * OrderCatch Sync Engine
 * LWW (Last-Write-Wins) 기반 Supabase 백그라운드 동기화
 * Pro 전용: 무료 사용자 데이터는 로컬에만 보관
 */

import { db, getDirtyOrders, localToSupabasePayload, supabaseRowToLocal } from "./db";
import type { LocalOrder } from "./db";

let isSyncing = false;

// ─── Push: 로컬 → Supabase ─────────────────────────────────────

/**
 * isDirty=true인 주문을 Supabase에 upsert한다 (Pro 전용).
 * @param supabaseClient - @supabase/supabase-js 클라이언트
 * @param storeId - 현재 매장 UUID
 */
export async function syncDirtyOrders(
  supabaseClient: any,
  storeId: string
): Promise<void> {
  if (isSyncing || !storeId) return;
  if (!navigator.onLine) return;

  isSyncing = true;
  try {
    const dirty = await getDirtyOrders(storeId);
    if (dirty.length === 0) return;

    // soft-delete 항목 → Supabase delete
    const toDelete = dirty.filter((o) => o.isDeleted);
    const toUpsert = dirty.filter((o) => !o.isDeleted);

    // Upsert 배치
    if (toUpsert.length > 0) {
      const payloads = toUpsert.map(localToSupabasePayload);
      const { error } = await supabaseClient
        .from("orders")
        .upsert(payloads, { onConflict: "id" });

      if (!error) {
        const now = new Date().toISOString();
        await db.orders
          .where("id")
          .anyOf(toUpsert.map((o) => o.id))
          .modify({ isDirty: false, syncedAt: now });
      }
    }

    // Delete 배치
    if (toDelete.length > 0) {
      const { error } = await supabaseClient
        .from("orders")
        .delete()
        .in(
          "id",
          toDelete.map((o) => o.id)
        );

      if (!error) {
        // Supabase에서 삭제 완료 → 로컬에서도 실제 삭제
        await db.orders
          .where("id")
          .anyOf(toDelete.map((o) => o.id))
          .delete();
      }
    }
  } catch (err) {
    // 네트워크 오류 등 — 조용히 실패, 다음 기회에 재시도
    console.warn("[SyncEngine] Push failed, will retry on next online event:", err);
  } finally {
    isSyncing = false;
  }
}

// ─── Pull: Supabase → 로컬 (LWW merge) ────────────────────────

/**
 * Supabase에서 최신 데이터를 pull하여 LWW 기준으로 Dexie에 merge한다.
 * updatedAt이 더 최신인 쪽이 승리한다.
 */
export async function pullFromCloud(
  supabaseClient: any,
  storeId: string,
  storeName?: string,
  storeType?: string
): Promise<void> {
  if (!storeId) return;
  if (!navigator.onLine) return;

  try {
    const { data, error } = await supabaseClient
      .from("orders")
      .select("*")
      .eq("store_id", storeId)
      .order("pickup_date", { ascending: true });

    if (error || !data) return;

    const now = new Date().toISOString();
    const remoteOrders: LocalOrder[] = data.map((row: any) =>
      supabaseRowToLocal(row, storeName, storeType)
    );

    // LWW merge: 로컬 updatedAt vs 원격 updatedAt 비교
    for (const remote of remoteOrders) {
      const local = await db.orders.get(remote.id);

      if (!local) {
        // 로컬에 없음 → 원격 데이터 저장
        await db.orders.put(remote);
      } else if (!local.isDirty) {
        // 로컬이 클린 상태 → 원격 우선 (안전)
        await db.orders.put({ ...remote, syncedAt: now });
      } else {
        // 로컬에 더티 변경 있음 → updatedAt 비교 (LWW)
        const localTime = new Date(local.updatedAt || local.createdAt).getTime();
        const remoteTime = new Date(remote.updatedAt || remote.createdAt).getTime();
        if (remoteTime > localTime) {
          // 원격이 더 새것 → 원격 우선
          await db.orders.put({ ...remote, syncedAt: now });
        }
        // else: 로컬이 더 새것 → 로컬 유지 (isDirty=true이므로 다음 push에서 반영됨)
      }
    }
  } catch (err) {
    console.warn("[SyncEngine] Pull failed:", err);
  }
}

// ─── 자동 sync 리스너 설정 ─────────────────────────────────────

let syncListenersSetup = false;

/**
 * 온라인 복귀 시 자동으로 dirty 주문을 push한다.
 * 앱 초기화 시 1회 호출한다.
 */
export function setupSyncListeners(
  supabaseClient: any,
  storeId: string
): () => void {
  if (syncListenersSetup) return () => {};
  syncListenersSetup = true;

  const handler = () => {
    syncDirtyOrders(supabaseClient, storeId);
  };

  window.addEventListener("online", handler);

  // 즉시 1회 시도 (이미 온라인인 경우)
  if (navigator.onLine) {
    setTimeout(() => syncDirtyOrders(supabaseClient, storeId), 2000);
  }

  return () => {
    window.removeEventListener("online", handler);
    syncListenersSetup = false;
  };
}
