import { maybeConvertToIife } from "@/wab/shared/parser-utils";

describe("maybeConvertToIife", function () {
  it("should preserve valid JS expressions", () => {
    const code = "new Date($props.date).getMonth()";
    const result = maybeConvertToIife(code);
    expect(result).toEqual(code);
  });
  it("should accept object literals", () => {
    const code = "{ x: 1, y: 2 }";
    const result = maybeConvertToIife(code);
    expect(result).toEqual(code);
  });
  it("should work with basic statements", () => {
    const code = `let x = 1;`;
    const result = maybeConvertToIife(code);
    const expected = `
(() => {
  let x = 1;
  return x;
})()`.trim();
    expect(result).toEqual(expected);
  });
  it("should work with block statements", () => {
    const code = `{
  let x = 1;
  x + 2;
}`;
    const result = maybeConvertToIife(code);
    const expected = `
(() => {
  {
    let x = 1;
    return x + 2;
  }
})()`.trim();
    expect(result).toEqual(expected);
  });
  it("should work with conditionals", () => {
    const code = `
if (n > 0) {
  1;
} else if (n < 0) {
  -1;
} else {
  0;
}
`;
    const result = maybeConvertToIife(code);
    const expected = `
(() => {
  if (n > 0) {
    return 1;
  } else if (n < 0) {
    return -1;
  } else {
    return 0;
  }
})()`.trim();
    expect(result).toEqual(expected);
  });
  it("should work with array patterns", () => {
    const code = `let x = 1, [a, b, ...c] = v;`;
    const result = maybeConvertToIife(code);
    const expected = `
(() => {
  let x = 1, [a, b, ...c] = v;
  return c;
})()`.trim();
    expect(result).toEqual(expected);
  });
  it("should work with member patterns", () => {
    const code = `let x = 1, {y} = v;`;
    const result = maybeConvertToIife(code);
    const expected = `
(() => {
  let x = 1, {y} = v;
  return y;
})()`.trim();
    expect(result).toEqual(expected);
  });
  it("should work with member patterns", () => {
    const code = `let x = 1, {
    y: [z]
  } = v;`;
    const result = maybeConvertToIife(code);
    const expected = `
(() => {
  let x = 1, {
      y: [z]
    } = v;
  return z;
})()`.trim();
    expect(result).toEqual(expected);
  });
  it("should work with multiple statements", () => {
    const code = `
let res;
if (a == 2) {
  res = b;
} else {
  res = c;
}
res + 2;`;
    const result = maybeConvertToIife(code);
    const expected = `
(() => {
  let res;
  if (a == 2) {
    res = b;
  } else {
    res = c;
  }
  return res + 2;
})()`.trim();
    expect(result).toEqual(expected);
  });
  it("should work with nested statements", () => {
    const code = `
{
  if (a == 2) {
    b;
  } else {
    try {
      fn();
    } catch {
      {
        c + 2;
      }
    }
  }
}`;
    const result = maybeConvertToIife(code);
    const expected = `
(() => {
  {
    if (a == 2) {
      return b;
    } else {
      try {
        return fn();
      } catch {
        {
          return c + 2;
        }
      }
    }
  }
})()`.trim();
    expect(result).toEqual(expected);
  });
  it("should work with loops", () => {
    const code = `
let sum = 0;
for (const item of $query.items) {
  sum += item;
}
`;
    const result = maybeConvertToIife(code);
    const expected = `
(() => {
  let __plasmic_ret = undefined;
  let sum = 0;
  for (const item of $query.items) {
    __plasmic_ret = sum += item;
  }
  return __plasmic_ret;
})()`.trim();
    expect(result).toEqual(expected);
  });
  it("should work with loops", () => {
    const code = `
for (const item of $state.array) {
  if (cond(item)) {
    let repeat = false;
    do {
      if (early_exit()) {
        return;
      } else {
        repeat = process(item);
      }
    } while (repeat);
  } else {
    try {
      for (let i = 1; i < item.data.length; i++) {
        fn(item.data[i - 1], item.data[i]);
      }
    } catch (err) {
      for (errorHandleKey in item.errorHandlers) {
        $ctx.handlers[errorHandleKey](err);
      }
    } finally {
      console.log("finished")
    }
  }
}
`;
    const result = maybeConvertToIife(code);
    const expected = `
(() => {
  let __plasmic_ret = undefined;
  for (const item of $state.array) {
    if (cond(item)) {
      let repeat = false;
      do {
        if (early_exit()) {
          return;
        } else {
          __plasmic_ret = repeat = process(item);
        }
      } while (repeat);
    } else {
      try {
        for (let i = 1; i < item.data.length; i++) {
          __plasmic_ret = fn(item.data[i - 1], item.data[i]);
        }
      } catch (err) {
        for (errorHandleKey in item.errorHandlers) {
          __plasmic_ret = $ctx.handlers[errorHandleKey](err);
        }
      } finally {
        console.log("finished");
      }
    }
  }
  return __plasmic_ret;
})()`.trim();
    expect(result).toEqual(expected);
  });
  it("should work with function declarations", () => {
    const code = `{ () => 3.14 }`;
    const result = maybeConvertToIife(code);
    const expected = `
(() => {
  {
    return () => 3.14;
  }
})()`.trim();
    expect(result).toEqual(expected);
  });
  it("should work with function declarations", () => {
    const code = `{ function f() { return 3.14; } }`;
    const result = maybeConvertToIife(code);
    const expected = `
(() => {
  {
    return function f() {
      return 3.14;
    };
  }
})()`.trim();
    expect(result).toEqual(expected);
  });
  it("should work with class declarations", () => {
    const code = `{ class C{} }`;
    const result = maybeConvertToIife(code);
    const expected = `
(() => {
  {
    return class C {
    };
  }
})()`.trim();
    expect(result).toEqual(expected);
  });
  it("should work with empty code", () => {
    const code = "";
    const result = maybeConvertToIife(code);
    const expected = `
(() => {

})()`.trim();
    expect(result).toEqual(expected);
  });
  it("should work with await", () => {
    const code = `
const result = await fetch("https://plasmic.app");
console.log("fetched");
return result;
`.trim();
    const result = maybeConvertToIife(code);
    const expected = `
(async () => {
  const result = await fetch("https://plasmic.app");
  console.log("fetched");
  return result;
})()`.trim();
    expect(result).toEqual(expected);
  });
});
