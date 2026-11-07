import {
  createSiteForHostlessProject,
  updateHostlessPackage,
} from "@/wab/server/code-components/code-components";
import { BadRequestError } from "@/wab/shared/ApiErrors/errors";
import { createSite } from "@/wab/shared/core/sites";
import { HostLessPackageInfo } from "@/wab/shared/model/classes";
import { instFieldValues } from "@/wab/shared/model/model-meta";
import { describe, expect, it } from "vitest";

describe.each(["create", "update"] as const)(
  "%s hostless package",
  (action) => {
    it.each([
      "../src/antd",
      "antd/../../src/antd",
      "/tmp/hostless-package",
      "..\\src\\antd",
      "%2e%2e%2fsrc%2fantd",
      "not-a-hostless-package",
    ])("rejects unlisted package names and dependencies: %s", async (name) => {
      for (const field of ["name", "deps"] as const) {
        const info = new HostLessPackageInfo({
          name: field === "name" ? name : "antd",
          deps: field === "deps" ? [name] : [],
          npmPkg: [],
          cssImport: [],
          registerCalls: [],
          minimumReactVersion: null,
        });
        const result =
          action === "create"
            ? createSiteForHostlessProject(instFieldValues(info))
            : updateHostlessPackage(
                createSite({ hostLessPackageInfo: info }),
                "test",
                createSite(),
              );
        await expect(result).rejects.toThrow(BadRequestError);
        await expect(result).rejects.toThrow(
          `Unknown hostless package: ${name}`,
        );
      }
    });
  },
);
