import type {
  Firestore,
  WhereFilterOp,
  DocumentSnapshot,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import type { UseQueryOptions } from "@tanstack/react-query";

export type PreferCacheMode =
  | "default"
  | "cache-first"
  | "cache-only"
  | "server-only";

export type WhereClause<T> = {
  field: keyof T | string;
  operator: WhereFilterOp;
  value: unknown;
};

export type OrderByClause<T> = {
  field: keyof T | string;
  direction?: "asc" | "desc";
};

export type CursorConfig = {
  type: "after" | "before";
  doc: QueryDocumentSnapshot | DocumentSnapshot | null;
};

export type CollectionOptions<T> = {
  where?: Array<WhereClause<T>>;
  orderBy?: Array<OrderByClause<T>>;
  limit?: number;
  cursor?: CursorConfig;
};

export type QueryBehavior = {
  preferCache?: PreferCacheMode;
  withMeta?: boolean;
  debug?: boolean;
};

export type StorageLike = Pick<
  Storage,
  "getItem" | "setItem" | "removeItem" | "key" | "length"
>;

export type Logger = {
  debug?: (...args: any[]) => void;
  log?: (...args: any[]) => void;
  info?: (...args: any[]) => void;
  warn?: (...args: any[]) => void;
  error?: (...args: any[]) => void;
};

export type LoggingConfig = {
  enabled?: boolean;
  resolveLogCollection?: (collectionName: string) => string; // default: `${collection}_log`
  includePreviousData?: boolean; // on update
};

export type UseFirebaseConfig = {
  db: Firestore;
  getUserId?: () => string | null;
  logger?: Logger;
  onError?: (error: unknown, context: string) => void;
  keyPrefix?: string; // default: 'rf' (romy firebase)
  defaultQueryOptions?: Partial<UseQueryOptions>;
  storage?: StorageLike; // default: window.localStorage (si existe)
  logging?: LoggingConfig;
};

export type WithId<T> = T & { id: string };

export type MetaResult<T> = {
  items: Array<WithId<T>>;
  firstDoc: QueryDocumentSnapshot | null;
  lastDoc: QueryDocumentSnapshot | null;
  size: number;
  empty: boolean;
};
