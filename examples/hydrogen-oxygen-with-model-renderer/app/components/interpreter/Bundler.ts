/*

Example of bundle:

{
  "site": {
    "__iid": 1,
    "__type": "Site",
    "components": [
      {
        "__iid": 25,
        "__type": "Component",
        "uuid": "5-ThUEPfFc",
        "name": "Home",
        "params": [],
        "states": [],
        "tplTree": {
          "__iid": 51705,
          "__type": "TplComponent",
          "name": null,
          "component": { "__iidRef": 51706 },
          "vsettings": [
            {
              "__iid": 51707,
              "__type": "VariantSetting",
              "variants": [{ "__iidRef": 28 }],
              "args": [
                {
                  "__iid": 52922,
                  "__type": "Arg",
                  "param": { "__iidRef": 52921 },
                  "expr": {
                    "__iid": 114515,
                    "...": "..."
                  },
                  "...": "..."
                }
              ],
              "...": "..."
            }
          ],
          "...": "..."
        },
        "...": "..."
      }
    ],
    "...": "..."
  },
  "...": "..."
}

 */

function traverse(o: any, func: any) {
  for (let i in o) {
    const v = o[i];
    func([i, v, o]);
    if (v !== null && typeof v == 'object') {
      //going one step down in the object tree!!
      traverse(v, func);
    }
  }
}

export class Bundler {
  private iidToObject = new Map();
  constructor() {}

  unbundle(bundle: {}, uuid: string) {
    // Clone
    const clone = JSON.parse(JSON.stringify(bundle));
    // Make iid map
    traverse(clone, ([k, v, x]: any) => {
      this.iidToObject.set(
        JSON.stringify({__uuid: uuid, __iidRef: x.__iid}),
        x,
      );
      x.typeTag = x.__type;
    });
    // Replace iidRefs with objects found in iid map
    traverse(clone, ([k, v, x]: any) => {
      if (v?.__iidRef) {
        x[k] = this.iidToObject.get(
          JSON.stringify({
            __uuid: uuid,
            ...v,
          }),
        );
        if (!x[k]) {
          console.warn('Missing reference', v);
        }
      }
    });
    return clone;
  }
}
