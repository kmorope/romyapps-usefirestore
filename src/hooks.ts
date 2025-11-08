import { useEffect } from "react";
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { useFirebaseConfig } from "./context";
import {
  buildConstraints,
  buildQuery,
  convertDocSnapshot,
  convertQuerySnapshot,
  getDocsByMode,
  getDocByMode,
  nowServerTimestamp,
  recordReadStats,
  getKeyPrefix,
  defaultResolveLogCollection,
  safeStorage,
} from "./utils";
import type {
  CollectionOptions,
  QueryBehavior,
  WithId,
  MetaResult,
} from "./types";

/** useCollection */
export function useCollection<T = any>(
  collectionName: string,
  options?: CollectionOptions<T>,
  behavior?: QueryBehavior & UseQueryOptions
) {
  const cfg = useFirebaseConfig();
  const {
    debug = false,
    preferCache = "default",
    withMeta = false,
    ...rqOptions
  } = behavior ?? {};
  const storage = safeStorage(cfg.storage);
  const keyPrefix = getKeyPrefix(cfg);

  const res = useQuery({
    queryKey: [
      keyPrefix,
      "collection",
      collectionName,
      JSON.stringify(options ?? {}),
    ],
    queryFn: async () => {
      const start = performance.now();
      const colRef = collection(cfg.db, collectionName);
      const constraints = buildConstraints(options);
      const q = constraints.length
        ? buildQuery(colRef, ...constraints)
        : colRef;

      const snapshot = await getDocsByMode(q as any, preferCache!);

      const end = performance.now();
      debug &&
        cfg.logger?.debug?.(
          `📥 ${collectionName} read in ${(end - start).toFixed(2)}ms`
        );

      const items = convertQuerySnapshot<T>(snapshot);
      if (withMeta) {
        const firstDoc = snapshot.docs[0] ?? null;
        const lastDoc = snapshot.docs[snapshot.docs.length - 1] ?? null;
        return {
          items,
          firstDoc,
          lastDoc,
          size: snapshot.size,
          empty: snapshot.empty,
        } as MetaResult<T>;
      }
      return items;
    },
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: false,
    ...cfg.defaultQueryOptions,
    ...rqOptions,
  });

  useEffect(() => {
    if (res.isSuccess) {
      const stats = recordReadStats(storage, collectionName);
      if (debug) {
        cfg.logger?.debug?.(
          `✅ "${collectionName}" loaded; reads: ${stats?.updated ?? "n/a"}`
        );
      }
    }
  }, [res.isSuccess, collectionName]);

  useEffect(() => {
    if (res.isError && res.error) {
      cfg.onError?.(res.error, `useCollection:${collectionName}`);
      debug && cfg.logger?.error?.(res.error);
    }
  }, [res.isError, res.error, collectionName]);

  return res as typeof res & {
    data: Array<WithId<T>> | MetaResult<T> | undefined;
  };
}

/** useDocument */
export function useDocument<T = any>(
  collectionName: string,
  documentId?: string | null,
  behavior?: QueryBehavior & UseQueryOptions
) {
  const cfg = useFirebaseConfig();
  const {
    debug = false,
    preferCache = "default",
    ...rqOptions
  } = behavior ?? {};
  const keyPrefix = getKeyPrefix(cfg);

  return useQuery({
    queryKey: [keyPrefix, "document", collectionName, documentId],
    queryFn: async () => {
      if (!documentId) return null;
      const start = performance.now();
      const ref = doc(cfg.db, collectionName, documentId);
      const snapshot = await getDocByMode(ref, preferCache!);
      const end = performance.now();
      debug &&
        cfg.logger?.debug?.(
          `📄 ${collectionName}/${documentId} in ${(end - start).toFixed(2)}ms`
        );
      return convertDocSnapshot<T>(snapshot as any);
    },
    enabled: !!documentId,
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: false,
    ...cfg.defaultQueryOptions,
    ...rqOptions,
  }) as any;
}

/** useAddDocument */
export function useAddDocument<T extends object = any>(
  collectionName: string,
  opts?: {
    invalidate?: boolean;
    enableLogging?: boolean;
    debug?: boolean;
    beforeSave?: (data: T) => T | Promise<T>;
  }
) {
  const {
    invalidate = true,
    enableLogging = false,
    debug = false,
    beforeSave,
  } = opts ?? {};
  const cfg = useFirebaseConfig();
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (data: T) => {
      const now = nowServerTimestamp();
      const base = beforeSave ? await beforeSave(data) : data;
      const payload = { ...base, createdAt: now, updatedAt: now } as any;

      debug && cfg.logger?.debug?.(`📝 add "${collectionName}"`, payload);

      const ref = await addDoc(collection(cfg.db, collectionName), payload);
      const result = { id: ref.id, ...(data as T) };

      if (enableLogging) {
        try {
          const userId = cfg.getUserId?.() ?? null;
          if (!userId) {
            cfg.logger?.warn?.(`⚠️ logging enabled but no user id`);
          }
          const logCol =
            cfg.logging?.resolveLogCollection?.(collectionName) ??
            defaultResolveLogCollection(collectionName);

          await addDoc(collection(cfg.db, logCol), {
            ...payload,
            originalDocId: ref.id,
            action: "CREATE",
            modifiedBy: userId,
            modifiedOn: new Date(),
            timestamp: now,
          });
        } catch (e) {
          cfg.logger?.warn?.("log create failed", e);
        }
      }
      return result as WithId<T>;
    },
    onSuccess: () => {
      if (invalidate) {
        qc.invalidateQueries({
          queryKey: [getKeyPrefix(cfg), "collection", collectionName],
        });
        if (enableLogging) {
          const logCol =
            cfg.logging?.resolveLogCollection?.(collectionName) ??
            defaultResolveLogCollection(collectionName);
          qc.invalidateQueries({
            queryKey: [getKeyPrefix(cfg), "collection", logCol],
          });
        }
      }
    },
    onError: (e) => {
      cfg.onError?.(e, `useAddDocument:${collectionName}`);
      debug && cfg.logger?.error?.(e);
    },
  });

  return mutation;
}

/** useUpdateDocument */
export function useUpdateDocument<T extends { id: string } = any>(
  collectionName: string,
  opts?: {
    enableLogging?: boolean;
    debug?: boolean;
    beforeSave?: (
      partial: Partial<Omit<T, "id">>
    ) => Partial<Omit<T, "id">> | Promise<Partial<Omit<T, "id">>>;
  }
) {
  const { enableLogging = false, debug = false, beforeSave } = opts ?? {};
  const cfg = useFirebaseConfig();
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (data: T) => {
      const { id, ...update } = data as any;
      const now = nowServerTimestamp();
      const payload = {
        ...(beforeSave ? await beforeSave(update) : update),
        updatedAt: now,
      };

      debug &&
        cfg.logger?.debug?.(`📝 update "${collectionName}"/${id}`, payload);

      const ref = doc(cfg.db, collectionName, id);
      let previous: any = null;

      if (enableLogging && cfg.logging?.includePreviousData) {
        try {
          const snap = await getDocByMode(ref, "default");
          previous = snap.exists()
            ? { id: snap.id, ...(snap.data() as object) }
            : null;
        } catch (e) {
          cfg.logger?.warn?.("failed to fetch previous for logging", e);
        }
      }

      await updateDoc(ref, payload);

      if (enableLogging) {
        try {
          const userId = cfg.getUserId?.() ?? null;
          const logCol =
            cfg.logging?.resolveLogCollection?.(collectionName) ??
            defaultResolveLogCollection(collectionName);
          await addDoc(collection(cfg.db, logCol), {
            ...payload,
            originalDocId: id,
            action: "UPDATE",
            modifiedBy: userId,
            modifiedOn: new Date(),
            timestamp: now,
            previousData: previous ?? undefined,
          });
        } catch (e) {
          cfg.logger?.warn?.("log update failed", e);
        }
      }

      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({
        queryKey: [getKeyPrefix(cfg), "collection", collectionName],
      });
      qc.invalidateQueries({
        queryKey: [
          getKeyPrefix(cfg),
          "document",
          collectionName,
          (data as any).id,
        ],
      });
      if (enableLogging) {
        const logCol =
          cfg.logging?.resolveLogCollection?.(collectionName) ??
          defaultResolveLogCollection(collectionName);
        qc.invalidateQueries({
          queryKey: [getKeyPrefix(cfg), "collection", logCol],
        });
      }
    },
    onError: (e) => {
      cfg.onError?.(e, `useUpdateDocument:${collectionName}`);
      debug && cfg.logger?.error?.(e);
    },
  });

  return mutation;
}

/** useDeleteDocument */
export function useDeleteDocument(
  collectionName: string,
  opts?: { enableLogging?: boolean; debug?: boolean }
) {
  const { enableLogging = false, debug = false } = opts ?? {};
  const cfg = useFirebaseConfig();
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (id: string) => {
      const ref = doc(cfg.db, collectionName, id);

      let deletedData: any = null;
      try {
        const snap = await getDocByMode(ref, "default");
        if (snap.exists())
          deletedData = { id: snap.id, ...(snap.data() as object) };
      } catch (e) {
        cfg.logger?.warn?.("pre-delete fetch failed", e);
      }

      await deleteDoc(ref);
      debug && cfg.logger?.debug?.(`🗑️ deleted "${collectionName}"/${id}`);

      if (enableLogging) {
        try {
          const logCol =
            cfg.logging?.resolveLogCollection?.(collectionName) ??
            defaultResolveLogCollection(collectionName);
          const userId = cfg.getUserId?.() ?? null;
          await addDoc(collection(cfg.db, logCol), {
            originalDocId: id,
            action: "DELETE",
            modifiedBy: userId,
            modifiedOn: new Date(),
            timestamp: nowServerTimestamp(),
            deletedData,
          });
        } catch (e) {
          cfg.logger?.warn?.("log delete failed", e);
        }
      }

      return id;
    },
    onSuccess: (id) => {
      qc.invalidateQueries({
        queryKey: [getKeyPrefix(cfg), "collection", collectionName],
      });
      qc.invalidateQueries({
        queryKey: [getKeyPrefix(cfg), "document", collectionName, id],
      });
      if (enableLogging) {
        const logCol =
          cfg.logging?.resolveLogCollection?.(collectionName) ??
          defaultResolveLogCollection(collectionName);
        qc.invalidateQueries({
          queryKey: [getKeyPrefix(cfg), "collection", logCol],
        });
      }
    },
    onError: (e) => {
      cfg.onError?.(e, `useDeleteDocument:${collectionName}`);
      debug && cfg.logger?.error?.(e);
    },
  });

  return mutation;
}

/** useCollectionFilters */
import { useState } from "react";
export function useCollectionFilters<T = any>(
  initial?: Array<{ field: keyof T | string; operator: any; value: unknown }>
) {
  const [filters, setFilters] = useState(initial ?? []);
  const addFilter = (f: (typeof filters)[number]) =>
    setFilters((prev) => [...prev, f]);
  const removeFilter = (index: number) =>
    setFilters((prev) => prev.filter((_, i) => i !== index));
  const clearFilters = () => setFilters([]);
  return { filters, addFilter, removeFilter, clearFilters, setFilters };
}

/** Stats helpers (re-exported) */
import {
  getCollectionStats as _get,
  clearCollectionStats as _clear,
  clearAllCollectionStats as _clearAll,
  safeStorage as _storage,
} from "./utils";
import type { StorageLike } from "./types";
export function getCollectionStats(
  collectionName: string,
  storage?: StorageLike
) {
  return _get(_storage(storage), collectionName);
}
export function clearCollectionStats(
  collectionName: string,
  storage?: StorageLike
) {
  return _clear(_storage(storage), collectionName);
}
export function clearAllCollectionStats(storage?: StorageLike) {
  return _clearAll(_storage(storage));
}
