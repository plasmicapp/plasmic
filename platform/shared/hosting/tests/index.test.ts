import assert from "node:assert/strict";
import { test } from "node:test";
import {
  HostingTextFilesError,
  MAX_HOSTING_TEXT_BYTES,
  parseHostingTextFiles,
} from "../src/index.ts";

test("accepts .txt paths anywhere and literal contents", () => {
  for (const path of [
    "/robots.txt",
    "/ads.txt",
    "/.well-known/security.txt",
    "/nested/deep/llms-full.txt",
  ]) {
    assert.deepEqual(
      parseHostingTextFiles({ [path]: "你好\n<script>literal</script>" }),
      { [path]: "你好\n<script>literal</script>" }
    );
  }
  assert.deepEqual(parseHostingTextFiles({ "/robots.txt": "" }), {
    "/robots.txt": "",
  });
  assert.deepEqual(parseHostingTextFiles({}), {});
});
test("rejects invalid paths and content with a typed error", () => {
  for (const path of [
    "robots.txt",
    "/robots.TXT",
    "/index.html",
    "/robots.txt?x=1",
    "/robots.txt#x",
    "//robots.txt",
    "/robots.txt/",
    "/nested/../ads.txt",
    "/./robots.txt",
    "/a b.txt",
    "/你好.txt",
    "constructor",
    "__proto__",
  ]) {
    assert.throws(
      () => parseHostingTextFiles({ [path]: "text" }),
      HostingTextFilesError
    );
  }
  for (const value of [null, undefined, [], false, 42, "text"]) {
    assert.throws(() => parseHostingTextFiles(value), HostingTextFilesError);
    if (typeof value !== "string") {
      assert.throws(
        () => parseHostingTextFiles({ "/robots.txt": value }),
        HostingTextFilesError
      );
    }
  }
});
test("rejects text Postgres cannot store as jsonb", () => {
  assert.deepEqual(parseHostingTextFiles({ "/llms.txt": "\u{1f600}" }), {
    "/llms.txt": "\u{1f600}",
  });
  for (const content of ["a\0b", "a\ud800", "\udc00b"]) {
    assert.throws(
      () => parseHostingTextFiles({ "/llms.txt": content }),
      HostingTextFilesError
    );
  }
});
test("counts combined UTF-8 bytes of paths and contents", () => {
  const content = "é".repeat(
    (MAX_HOSTING_TEXT_BYTES - "/llms-full.txt".length) / 2
  );
  assert.deepEqual(parseHostingTextFiles({ "/llms-full.txt": content }), {
    "/llms-full.txt": content,
  });
  assert.throws(
    () =>
      parseHostingTextFiles({ "/llms-full.txt": content, "/llms.txt": "a" }),
    HostingTextFilesError
  );
  assert.throws(
    () =>
      parseHostingTextFiles({
        ["/" + "a".repeat(MAX_HOSTING_TEXT_BYTES) + ".txt"]: "",
      }),
    HostingTextFilesError
  );
});
