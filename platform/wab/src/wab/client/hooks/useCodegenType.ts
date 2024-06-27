import { useAppCtx } from "@/wab/client/contexts/AppContexts";
import { mkUuid, spawn } from "@/wab/shared/common";
import { proxy } from "comlink";
import { useEffect, useState } from "react";

/**
 * Returns the user's last selected codegenType. Listen to changes in
 * Docs portal's localStorage and updates the value accordingly.
 */
export function useCodegenType(): "loader" | "codegen" {
  const appCtx = useAppCtx();
  const [codegenType, setCodegenType] = useState<"loader" | "codegen">(
    "codegen"
  );

  useEffect(() => {
    spawn(
      Promise.resolve(appCtx.api.getStorageItem("codegenType")).then(
        (storedCodegenType: any) => {
          if (storedCodegenType) {
            setCodegenType(storedCodegenType as any);
          }
        }
      )
    );
    const uniqueId = mkUuid();
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    appCtx.api.addStorageListener(
      uniqueId,
      proxy(({ key, newValue }) => {
        if (key === "codegenType" && newValue) {
          setCodegenType(newValue as any);
        }
      })
    );
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      appCtx.api.removeEventListener("storage", uniqueId);
    };
  }, []);
  return codegenType;
}
