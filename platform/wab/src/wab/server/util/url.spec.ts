import { isIpAddrSafe } from "@/wab/server/util/url";

describe("isIpAddrSafe", () => {
  it("should return true for safe public IP addresses", () => {
    expect(isIpAddrSafe("1.1.1.1")).toBe(true);
    expect(isIpAddrSafe("8.8.8.8")).toBe(true);
    expect(isIpAddrSafe("2000:0000:0000:0000:0000:0000:0000:0000")).toBe(true);
    expect(isIpAddrSafe("3fff:ffff:ffff:ffff:ffff:ffff:ffff:ffff")).toBe(true);
  });

  it("should return false for private IP addresses", () => {
    expect(isIpAddrSafe("10.0.0.1")).toBe(false);
    expect(isIpAddrSafe("127.0.0.1")).toBe(false);
    expect(isIpAddrSafe("169.254.169.252")).toBe(false);
    expect(isIpAddrSafe("172.16.0.1")).toBe(false);
    expect(isIpAddrSafe("192.168.0.1")).toBe(false);
    expect(isIpAddrSafe("fc00:0000:0000:0000:0000:0000:0000:0000")).toBe(false);
  });

  it("should return false for invalid IP addresses", () => {
    expect(isIpAddrSafe("256.256.256.256")).toBe(false);
    expect(isIpAddrSafe("not.an.ip.address")).toBe(false);
    expect(isIpAddrSafe("")).toBe(false);
  });
});
