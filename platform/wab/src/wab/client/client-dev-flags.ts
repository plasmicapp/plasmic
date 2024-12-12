import { isTopFrame } from "@/wab/client/cli-routes";
import { getPlasmicStudioArgs } from "@/wab/client/frame-ctx/plasmic-studio-args";
import { assert, withoutNils } from "@/wab/shared/common";
import { dbg } from "@/wab/shared/dbg";
import {
  applyDevFlagOverrides,
  DEVFLAGS,
  DevFlagsType,
} from "@/wab/shared/devflags";
import { isPlainObject } from "lodash";

export function getClientDevFlagOverrides(): DevFlagsType {
  let params: URLSearchParams;
  if (isTopFrame()) {
    params = new URLSearchParams(location.search);
  } else {
    params = new URLSearchParams(
      `?${getPlasmicStudioArgs().appConfigOverrides}`
    );
  }

  const flags = Object.fromEntries(
    withoutNils(
      Object.keys(DEVFLAGS).map((key) => {
        const v = params.get(key) ?? getStoredDevFlag(key, null);
        if (!v) {
          return null;
        }
        return [
          key,
          v === "true"
            ? true
            : v === "false"
            ? false
            : !isNaN(parseInt(v))
            ? parseInt(v)
            : v,
        ];
      })
    )
  ) as DevFlagsType;

  if (flags.demo && params.get("autoSave") !== "true") {
    flags.autoSave = false;
  }

  if (flags.noObserve && typeof window !== "undefined") {
    if (
      typeof window === "undefined" ||
      !window.location.href.includes("/preview-full")
    ) {
      console.warn(`Can only use noObserve=true for full preview!`);
      flags.noObserve = false;
    }
  }

  return flags;
}

function getFlagStorageKey(key: string) {
  return `plasmic.devFlag.${key}`;
}

function getLegacyFlagStorageKey(key: string) {
  return `devFlag.${key}`;
}

function getStoredDevFlag(key: string, defaultValue: any) {
  const storageKey = getFlagStorageKey(key);
  try {
    const storedValue = globalThis.localStorage?.getItem(storageKey) ?? null;
    return storedValue !== null ? JSON.parse(storedValue) : defaultValue;
  } catch (err) {
    if (err?.message?.includes("Access is denied for this document.")) {
      return defaultValue;
    }
    throw err;
  }
}

dbg.devFlags = {} as any;

export function initClientFlags(flags: DevFlagsType): DevFlagsType {
  if (!Object.getOwnPropertyDescriptor(dbg, "devFlagsSnapshot")) {
    Object.defineProperty(dbg, "devFlagsSnapshot", {
      get() {
        return flags;
      },
    });
  }

  const overrides = getClientDevFlagOverrides();

  Object.entries(flags).forEach(([key, value]) => {
    // Cleanup (legacy) stored flags from localStorage
    // to avoid exceeding quota
    try {
      globalThis.localStorage.removeItem(getLegacyFlagStorageKey(key));
    } catch {
      // ignore
    }

    const storageKey = getFlagStorageKey(key);
    const canBeSet =
      typeof value === "boolean" ||
      typeof value === "string" ||
      typeof value === "number" ||
      isPlainObject(value) ||
      Array.isArray(value);

    Object.defineProperty(dbg.devFlags, key, {
      get() {
        return flags[key];
      },
      set(newValue: any) {
        assert(canBeSet, `The flag "${key}" can't be set`);
        flags[key] = newValue;

        try {
          globalThis.localStorage.setItem(storageKey, JSON.stringify(newValue));
        } catch (err) {
          console.error(`Failed to set devFlag: ${storageKey}`, err);
        }
      },
    });

    flags[key] = overrides[key] ?? value;
  });

  applyDevFlagOverrides(flags);

  return flags;
}
