import platform from "platform";

export const PLATFORM = (() => {
  // Copied from https://github.com/avocode/react-shortcuts/blob/master/src/helpers.js
  let os = platform.os?.family || "";
  os = os.toLowerCase().replace(/\s*/g, "");
  if (/\bwin/.test(os)) {
    return "windows";
  } else if (/darwin|osx/.test(os)) {
    return "osx";
  } else if (/linux|freebsd|sunos|ubuntu|debian|fedora|redhat|suse/.test(os)) {
    return "linux";
  } else {
    return "other";
  }
})();
