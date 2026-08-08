import { DEVFLAGS } from "@/wab/shared/devflags";
import "fake-indexeddb/auto";
import * as jestExtendedMatchers from "jest-extended";
import { TransformStream } from "stream/web";
import { TextDecoder, TextEncoder } from "util";
import { expect, vi } from "vitest";
import "whatwg-fetch";
import { BroadcastChannel as NodeBroadcastChannel } from "worker_threads";

import "@/wab/client/test/initTests";

expect.extend(jestExtendedMatchers);

// Use mocks for code that doesn't work in JSDOM
vi.mock("@/wab/client/image/metadata");

DEVFLAGS.hostUrl = "http://localhost";

// Web shims for APIs missing in JSDOM

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
// Needed at import time by the AI SDKs used for copilot.
global.TransformStream = TransformStream;

// Node's BroadcastChannel is Web-compatible. `unref` so open channels don't keep
// the process alive after tests.
global.BroadcastChannel = class BroadcastChannel extends NodeBroadcastChannel {
  constructor(name) {
    super(name);
    this.unref();
  }
};

let objectURLCounter = 0;
global.URL.createObjectURL = (object) => {
  const url = `blob:${++objectURLCounter}`;
  console.log(`createObjectURL(${object}) called, returning ${url}`);
  return url;
};
global.URL.revokeObjectURL = (url) => {
  console.log(`revokeObjectURL(${url}) called`);
};
