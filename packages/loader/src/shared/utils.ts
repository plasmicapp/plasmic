export function spawn(promise: Promise<any>) {}

export function toCamelCase(str: string) {
  return str.replace(/-([a-z])/g, function (_, word) {
    return word.toUpperCase();
  });
}
