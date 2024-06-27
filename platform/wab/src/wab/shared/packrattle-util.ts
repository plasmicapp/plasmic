import PR from "packrattle";

// In later versions of packrattle, this should be: PR.repeat(x, min: 1)
export const plus = (x) => PR.repeat(x, 1);
export const _ = plus(PR.alt(" ", "\t")).drop();

// similar to PR.seq but optional spaces come between each token - more natural
// for this language since it's whitespace sensitive and thus leading indents
// make a difference
export function seq(...args) {
  const args1: any[] = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (i > 0) {
      args1.push(_.optional().drop());
    }
    args1.push(arg);
  }
  return PR.seq(...[...(args1 || [])]);
}
// require spaces between tokens; useful for `for x in foo`
export function seq_(...args) {
  const args1: any[] = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (i > 0) {
      args1.push(_);
    }
    args1.push(arg);
  }
  args1.push(_.optional().drop());
  return PR.seq(...[...(args1 || [])]);
}
