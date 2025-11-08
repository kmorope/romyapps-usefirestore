import React, { createContext, useContext } from "react";
import type { UseFirebaseConfig } from "./types";

const Ctx = createContext<UseFirebaseConfig | null>(null);

export function UseFirebaseProvider({
  config,
  children,
}: {
  config: UseFirebaseConfig;
  children: React.ReactNode;
}) {
  return <Ctx.Provider value={config}>{children}</Ctx.Provider>;
}

export function useFirebaseConfig(): UseFirebaseConfig {
  const cfg = useContext(Ctx);
  if (!cfg) {
    throw new Error(
      "@romy/useFirestore → No provider found. Wrap your app with <UseFirebaseProvider config={...} />"
    );
  }
  return cfg;
}
