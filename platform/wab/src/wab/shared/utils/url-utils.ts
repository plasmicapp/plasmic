export function substituteUrlParams(
  url: string,
  params: Record<string, string>
) {
  let path = url;
  for (const [key, value] of Object.entries(params)) {
    const marker = `[${key}]`;
    if (path.includes(marker) && value) {
      // if value is empty string, keep the placeholder so the path is still valid
      path = path.replace(marker, encodeURIComponent(value));
    }
  }
  return path;
}
