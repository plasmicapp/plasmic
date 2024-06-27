import * as fs from "fs";
import { componentMetasStr as ReactMetasStr } from "../src/wab/component-metas/react-meta-gen";
import { arrayEqIgnoreOrder, assert, ensure } from "../src/wab/shared/common";

/**
 * Group of tags and props such that all of those props
 * are common to all of those tags.
 */
interface ReactMetaClique {
  tags: string[];
  keys: number[];
}

interface CompressedReactMeta {
  key2prop: { [key: number]: any };
  tag2keys: { [tag: string]: number[] };
  largeCliques: ReactMetaClique[];
}

async function main() {
  const parsed = JSON.parse(ReactMetasStr);
  const tag2keys: { [tag: string]: number[] } = {};
  const propJSON2key = {};
  const key2prop: { [key: number]: any } = {};
  const key2tags: { [key: number]: string[] } = {};
  let nextPropIndex = 1;
  for (const componentMeta of parsed) {
    tag2keys[componentMeta.component] = [];
    for (const prop of componentMeta.props) {
      const propJSON = JSON.stringify(prop);
      if (!(propJSON in propJSON2key)) {
        propJSON2key[propJSON] = nextPropIndex;
        key2prop[nextPropIndex] = prop;
        key2tags[nextPropIndex] = [];
        nextPropIndex++;
      }
      const tagKey = propJSON2key[propJSON];
      tag2keys[componentMeta.component].push(tagKey);
      key2tags[tagKey].push(componentMeta.component);
    }
  }
  const freq2Keys: { [freq: number]: number[] } = {};
  // eslint-disable-next-line no-shadow
  for (const key of Object.keys(key2prop).map((key) => +key)) {
    const freq = ensure(key2tags[key].length);
    if (!(freq in freq2Keys)) {
      freq2Keys[freq] = [];
    }
    freq2Keys[freq].push(key);
  }

  const largeCliques: ReactMetaClique[] = [];
  const keysInCliques = new Set<number>();

  // eslint-disable-next-line no-shadow
  for (const freq of Object.keys(freq2Keys).map((freq) => +freq)) {
    const keys = ensure(freq2Keys[freq]);
    // Usually frequent props happen to be used by the same set of components
    if (freq * keys.length > 1000) {
      try {
        for (const key of keys) {
          assert(arrayEqIgnoreOrder(key2tags[key], key2tags[keys[0]]));
        }
        console.log("Info: found clique of size " + freq * keys.length);
      } catch {
        console.log("Warn: Assumption of large cliques failed.");
        continue;
      }
      largeCliques.push({
        keys,
        tags: key2tags[keys[0]],
      });
      keys.forEach((key) => keysInCliques.add(key));
    }
  }

  console.log(
    `${keysInCliques.size} keys in cliques (out of ${
      Object.keys(key2prop).length
    })`
  );

  // Filter global/commmon tags
  [...Object.keys(tag2keys)].forEach((tag) => {
    tag2keys[tag] = tag2keys[tag].filter((key) => !keysInCliques.has(key));
  });

  const compressedReactMeta: CompressedReactMeta = {
    key2prop,
    tag2keys,
    largeCliques,
  };

  const source = `/**
 * Group of tags and props such that all of those props
 * are common to all of those tags.
 */
interface ReactMetaClique {
  tags: string[];
  keys: number[];
}

export interface CompressedReactMeta {
  key2prop: { [key: number]: any };
  tag2keys: { [tag: string]: number[] };
  largeCliques: ReactMetaClique[];
}

export const compressedReactMetaString = \`${JSON.stringify(
    compressedReactMeta,
    null,
    2
  )}\`;
`;

  const outputFile = "src/wab/component-metas/react-meta-gen-compressed.ts";
  fs.writeFileSync(outputFile, source);
}

main();
