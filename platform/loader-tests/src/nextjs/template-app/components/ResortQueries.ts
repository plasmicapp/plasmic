/** Query functions used by nextjs-component-server-queries.spec.ts. */
export async function getResorts(codes: string[]) {
  return codes;
}

export async function getAmenities(code: string) {
  return [`${code}-pool`, `${code}-spa`];
}
