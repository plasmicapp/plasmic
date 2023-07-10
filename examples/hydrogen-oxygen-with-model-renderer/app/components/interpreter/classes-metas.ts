export const meta = {
  initializers: new Proxy(
    {},
    {
      get(_target: any, _prop: any, _receiver: any) {
        return (dst, src) => Object.assign(dst, src);
      },
    },
  ),
};
