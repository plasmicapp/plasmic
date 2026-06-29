/** @jest-environment node */
import {
  setupSsrfTestServers,
  SsrfTestServers,
} from "@/wab/server/testonly/test-server";
import { triggerWebhookOnly } from "@/wab/server/trigger-webhooks";

describe("triggerWebhookOnly", () => {
  let ssrf: SsrfTestServers | undefined;

  beforeEach(async () => {
    ssrf = await setupSsrfTestServers();
  });

  afterEach(async () => {
    await ssrf?.dispose();
  });

  it("calls a webhook with an external IP", async () => {
    const response = await triggerWebhookOnly({
      method: "GET",
      url: ssrf!.externalGoodServer.url,
      headers: [],
      payload: "{}",
    });
    expect(response).toEqual({
      status: 200,
      data: ssrf!.expectedGoodContent,
    });
    expect(ssrf!.externalGoodServer.requestCount()).toBe(1);
  });

  it("does not call a webhook with an internal IP", async () => {
    const response = await triggerWebhookOnly({
      method: "GET",
      url: ssrf!.internalServer.url,
      headers: [],
      payload: "{}",
    });
    expect(response).toEqual({
      status: 400,
      data: "Invalid URL",
    });
    expect(ssrf!.internalServer.requestCount()).toBe(0);
  });

  it("does not follow redirects", async () => {
    const response = await triggerWebhookOnly({
      method: "GET",
      url: ssrf!.externalBadServer.url,
      headers: [],
      payload: "{}",
    });
    expect(response).toEqual({
      status: 302,
      data: "",
    });
    expect(ssrf!.externalBadServer.requestCount()).toBe(1);
    expect(ssrf!.internalServer.requestCount()).toBe(0);
  });
});
