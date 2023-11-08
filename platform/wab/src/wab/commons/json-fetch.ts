export async function jsonFetch<JSON = any>(
  input: RequestInfo,
  init?: RequestInit
): Promise<JSON> {
  const response = await fetch(input, init);

  const rawResult = await response.text();

  if (!response.ok) {
    const error = new Error(
      `${response.status} ${response.statusText}: ${rawResult}`
    );
    (error as any).code = response.status;
    throw error;
  }

  try {
    return JSON.parse(rawResult);
  } catch (e) {
    throw new Error(`Failed to parse JSON: ${rawResult}`);
  }
}

export default jsonFetch;
