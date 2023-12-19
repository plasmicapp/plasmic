import PR from "packrattle";
import { plus, seq, seq_, _ } from "./packrattle-util";

function noExc(f: /*TWZ*/ () => any) {
  try {
    return f();
  } catch (e) {
    return alert();
  }
}

const type_ = () => seq(PR.regex(/[A-Z]+/), "[");
let start = () =>
  PR.alt(
    seq_(type, phrase, ret).onMatch(function (...args) {
      let desc, mainType;
      let ret;
      [mainType, desc, ret] = [...args[0]];
      return { form: "unary", mainType, desc, ret };
    }),
    seq_(type, phrase, type, ret).onMatch(function (...args) {
      let desc, mainType, secondType;
      let ret;
      [mainType, desc, secondType, ret] = [...args[0]];
      return { form: "binary", mainType, desc, secondType, ret };
    }),
    seq(type, _, phrase, ":", plus(parts), ret).onMatch(function (...args) {
      let __, desc, mainType;
      let parts, ret;
      [mainType, desc, __, parts, ret] = [...args[0]];
      return { form: "nary", mainType, desc, parts, ret };
    }),
    seq_(phrase, ret).onMatch(function (...args) {
      let desc;
      let ret;
      [desc, ret] = [...args[0]];
      return { form: "nullary", desc, ret };
    }),
    seq(phrase, ":", plus(parts), ret).onMatch(function (...args) {
      let __, desc;
      let parts, ret;
      [desc, __, parts, ret] = [...args[0]];
      return { form: "global-nary", desc, parts, ret };
    })
  );
//start = -> seq_(type, type)

const parts = () =>
  PR.seq(_, phrase, _, namedParam).onMatch(function (...args) {
    const [fixed, param] = [...args[0]];
    return { fixed, param };
  });

const namedParam = () =>
  seq(/[A-Z]+/, ":", type, PR.optional("?")).onMatch(function (...args) {
    let __, array, name, opt;
    let type;
    (array = args[0]),
      ([name] = [...array[0]]),
      (__ = array[1]),
      (type = array[2]),
      (opt = array[3]);
    return { name: name.toLowerCase(), type, opt: opt === "?" };
  });

const phrase = () =>
  PR.repeatSeparated(word, _).onMatch((m: /*TWZ*/ string[]) => m.join(" "));

const word = () =>
  PR.regex(/[a-z0-9][a-z0-9-]*/).onMatch(function (...args) {
    let word;
    [word] = [...args[0]];
    return word;
  });

const ret = () =>
  seq_("->", type).onMatch(
    (
      m: /*TWZ*/
      | Array<null | string | { name: string; params: null }>
        | Array<
            | null
            | string
            | { name: string; params: { name: string; params: null }[] }
          >
    ) => ({
      type: m[1],
    })
  );

const type = () =>
  seq(/[$A-Z][A-Z0-9]*/, PR.optional(params, [])).onMatch(function (...args) {
    let array, name;
    let params;
    (array = args[0]), ([name] = [...array[0]]), (params = array[1]);
    return noExc(() => ({ name: name.toLowerCase(), params }));
  });

const params = () =>
  seq("[", PR.repeatSeparated(type, ","), "]").onMatch(function (...args) {
    const [_1, types, _2] = [...args[0]];
    return noExc(() => types);
  });

start = start();

export const parse = (string: /*TWZ*/ string) => (start as any).run(string);
