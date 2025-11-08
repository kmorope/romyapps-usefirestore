import {
  collection,
  query as buildQuery,
  where as w,
  orderBy as ob,
  limit as lm,
  startAfter,
  endBefore,
  getDocs,
  getDocsFromCache,
  getDocsFromServer,
  getDoc,
  getDocFromCache,
  getDocFromServer,
  serverTimestamp,
  type Firestore,
  type DocumentSnapshot,
  type Query,
  type QueryConstraint,
  type QuerySnapshot,
} from "firebase/firestore";
import type {
  CollectionOptions,
  QueryBehavior,
  WithId,
  MetaResult,
  StorageLike,
  PreferCacheMode,
  UseFirebaseConfig,
} from "./types";

export { buildQuery };
export const nowServerTimestamp = serverTimestamp;

export function safeStorage(custom?: StorageLike): StorageLike | null {
  if (custom) return custom;
  try {
    if (typeof window !== "undefined" && window.localStorage)
      return window.localStorage;
  } catch (_) {}
  // Fallback in-memory
  const mem = new Map<string, string>();
  return {
    get length() {
      return mem.size;
    },
    key: (i: number) => Array.from(mem.keys())[i] ?? null,
    getItem: (k: string) => (mem.has(k) ? mem.get(k)! : null),
    setItem: (k: string, v: string) => {
      mem.set(k, v);
    },
    removeItem: (k: string) => {
      mem.delete(k);
    },
  } as any;
}

export function convertQuerySnapshot<T>(
  snapshot: QuerySnapshot
): Array<WithId<T>> {
  return snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as T) }));
}

export function convertDocSnapshot<T>(
  snapshot: DocumentSnapshot
): WithId<T> | null {
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...(snapshot.data() as T) };
}

export function buildConstraints<T>(
  opts?: CollectionOptions<T>
): QueryConstraint[] {
  const constraints: QueryConstraint[] = [];
  if (!opts) return constraints;

  if (opts.where?.length) {
    for (const clause of opts.where) {
      constraints.push(
        w(clause.field as string, clause.operator as any, clause.value)
      );
    }
  }
  if (opts.orderBy?.length) {
    for (const o of opts.orderBy) {
      constraints.push(ob(o.field as string, o.direction ?? "asc"));
    }
  }
  if (typeof opts.limit === "number") {
    constraints.push(lm(opts.limit));
  }
  if (opts.cursor?.type === "after" && opts.cursor.doc) {
    constraints.push(startAfter(opts.cursor.doc));
  }
  if (opts.cursor?.type === "before" && opts.cursor.doc) {
    constraints.push(endBefore(opts.cursor.doc));
  }
  return constraints;
}

export async function getDocsByMode(q: Query, mode: PreferCacheMode) {
  switch (mode) {
    case "cache-only":
      return getDocsFromCache(q);
    case "server-only":
      return getDocsFromServer(q);
    case "cache-first":
      try {
        const snap = await getDocsFromCache(q);
        if (!snap.empty) return snap;
      } catch (_) {}
      return getDocsFromServer(q);
    default:
      return getDocs(q); // SDK decides (cache + server)
  }
}

export async function getDocByMode(ref: any, mode: PreferCacheMode) {
  switch (mode) {
    case "cache-only":
      return getDocFromCache(ref);
    case "server-only":
      return getDocFromServer(ref);
    case "cache-first":
      try {
        const snap = await getDocFromCache(ref);
        if (snap.exists()) return snap;
      } catch (_) {}
      return getDocFromServer(ref);
    default:
      return getDoc(ref);
  }
}

export function recordReadStats(
  storage: StorageLike | null,
  collectionName: string
) {
  if (!storage) return;
  const key = `@romyapps:readCount::${collectionName}`;
  const lastFetchedKey = `@romyapps:lastFetched::${collectionName}`;
  const count = Number(storage.getItem(key) ?? "0");
  const updated = count + 1;
  storage.setItem(key, String(updated));
  storage.setItem(lastFetchedKey, new Date().toISOString());
  return { updated };
}

export function getCollectionStats(
  storage: StorageLike | null,
  collectionName: string
) {
  if (!storage) return { readCount: 0, lastFetched: null as string | null };
  const readCount = Number(
    storage.getItem(`@romyapps:readCount::${collectionName}`) ?? "0"
  );
  const lastFetched =
    storage.getItem(`@romyapps:lastFetched::${collectionName}`) ?? null;
  return { readCount, lastFetched };
}

export function clearCollectionStats(
  storage: StorageLike | null,
  collectionName: string
) {
  if (!storage) return;
  storage.removeItem(`@romyapps:readCount::${collectionName}`);
  storage.removeItem(`@romyapps:lastFetched::${collectionName}`);
}

export function clearAllCollectionStats(storage: StorageLike | null) {
  if (!storage) return { removed: 0 };
  const toRemove: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const k = storage.key(i);
    if (!k) continue;
    if (
      k.startsWith("@romyapps:readCount::") ||
      k.startsWith("@romyapps:lastFetched::")
    ) {
      toRemove.push(k);
    }
  }
  toRemove.forEach((k) => storage.removeItem(k));
  return { removed: toRemove.length };
}

export function defaultResolveLogCollection(name: string) {
  return `${name}_log`;
}

export function getKeyPrefix(cfg: UseFirebaseConfig) {
  return cfg.keyPrefix ?? "rf";
}
