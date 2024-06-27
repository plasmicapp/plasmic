// eslint-disable-next-line @typescript-eslint/no-namespace
declare namespace global {
  let dbg: { [name: string]: any };
}

// debug tools
export const dbg: { [name: string]: any } = (global.dbg = {});
