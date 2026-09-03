import { _testonly } from "@/wab/client/components/HostUrlInput";

const { normalizeHostUrl } = _testonly;

describe("normalizeHostUrl", () => {
  it("trims inputs", () => {
    expect(normalizeHostUrl("")).toBe("");
    expect(normalizeHostUrl("   ")).toBe("");
    expect(normalizeHostUrl(" https://my-app.com/ ")).toBe(
      "https://my-app.com/"
    );
  });

  it("returns original if we cannot make a valid URL", () => {
    expect(normalizeHostUrl("/")).toBe("/");
    expect(normalizeHostUrl("://")).toBe("://");
  });

  it("prepends https:// to most inputs when valid", () => {
    expect(normalizeHostUrl("my-app.com")).toBe("https://my-app.com/");
    expect(normalizeHostUrl("my-app.com/plasmic-host")).toBe(
      "https://my-app.com/plasmic-host"
    );
    expect(normalizeHostUrl("localhost.com")).toBe("https://localhost.com/");
  });

  it("prepends http:// for localhost and 127.0.0.1", () => {
    expect(normalizeHostUrl("localhost:3000")).toBe("http://localhost:3000/");
    expect(normalizeHostUrl("localhost:3000/host")).toBe(
      "http://localhost:3000/host"
    );
    expect(normalizeHostUrl("127.0.0.1:8000")).toBe("http://127.0.0.1:8000/");
    expect(normalizeHostUrl("127.0.0.1:8000/plasmic-host")).toBe(
      "http://127.0.0.1:8000/plasmic-host"
    );
  });

  it("canonicalizes valid URLs", () => {
    // doesn't change valid URLs, doesn't change scheme
    expect(normalizeHostUrl("http://my-app.com/")).toBe("http://my-app.com/");
    expect(normalizeHostUrl("https://localhost/")).toBe("https://localhost/");

    // adds trailing slash on without path-less URL
    expect(normalizeHostUrl("https://my-app.com")).toBe("https://my-app.com/");
    expect(normalizeHostUrl("https://my-app.com/")).toBe("https://my-app.com/");
    expect(normalizeHostUrl("https://my-app.com/plasmic-host")).toBe(
      "https://my-app.com/plasmic-host"
    );
    expect(normalizeHostUrl("https://my-app.com/plasmic-host/")).toBe(
      "https://my-app.com/plasmic-host/"
    );

    // omits :80 and :443 when matches http/https
    expect(normalizeHostUrl("http://my-app.com:80/")).toBe(
      "http://my-app.com/"
    );
    expect(normalizeHostUrl("http://my-app.com:443/")).toBe(
      "http://my-app.com:443/"
    );
    expect(normalizeHostUrl("https://my-app.com:80/")).toBe(
      "https://my-app.com:80/"
    );
    expect(normalizeHostUrl("https://my-app.com:443/")).toBe(
      "https://my-app.com/"
    );
  });
});
