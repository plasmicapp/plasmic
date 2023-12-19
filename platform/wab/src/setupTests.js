import "jest-extended";
import { TextDecoder, TextEncoder } from "util";
import "whatwg-fetch";

import "./initTests";

jest.mock("./wab/client/cli-routes");

// Set a large default global timeout
jest.setTimeout(60000);

// Needed because we use JSDOM in one of our migrations
// https://github.com/inrupt/solid-client-authn-js/issues/1676#issuecomment-1617031412
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
