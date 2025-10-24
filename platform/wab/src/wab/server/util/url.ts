import dns from "dns";
import npmPrivateIp from "private-ip";

/** Checks if a URL is safe to call from the server to avoid SSRF attacks. */
export async function isUrlSafe(url: URL): Promise<boolean> {
  const ipAddr = await dns.promises.lookup(url.hostname);
  return isIpAddrSafe(ipAddr.address);
}

/** Checks if IP address is safe to call from the server to avoid SSRF attacks. */
export function isIpAddrSafe(ipAddr: string): boolean {
  // private-ip returns undefined if not a valid IP address
  return npmPrivateIp(ipAddr) === false;
}
