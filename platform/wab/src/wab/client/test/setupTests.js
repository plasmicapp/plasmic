import { DEVFLAGS } from "@/wab/shared/devflags";
import "jest-extended";
import { TransformStream } from "stream/web";
import { TextDecoder, TextEncoder } from "util";
import { deserialize, serialize } from "v8";
import "whatwg-fetch";
import { BroadcastChannel as NodeBroadcastChannel } from "worker_threads";

// jest.config.ts defines `structuredClone` as an unusable placeholder object.
// TODO - remove that clone override and delete this.
global.structuredClone = (value) => deserialize(serialize(value));
require("fake-indexeddb/auto");

import "@/wab/client/test/initTests";

// Set a large default global timeout
jest.setTimeout(60000);

// Use mocks for code that doesn't work in JSDOM
jest.mock("@/wab/client/image/metadata");

DEVFLAGS.hostUrl = "http://localhost";

// Web shims for APIs missing in JSDOM

// Needed because we use JSDOM in one of our migrations
// https://github.com/inrupt/solid-client-authn-js/issues/1676#issuecomment-1617031412
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
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
global.URL.createObjectURL = (url) => {
  console.log(`revokeObjectURL(${url}) called`);
};
