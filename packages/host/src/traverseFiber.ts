/*
from https://github.com/bendtherules/react-fiber-traverse

The MIT License (MIT)

Copyright (c) 2019-present bendtherules <abhasbhattacharya2@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
 */

import { Fiber } from "./fiber";

interface TTraverseConfig {
  order?: Array<"self" | "child" | "sibling">;
  skipSiblingForStartNode?: boolean;
  skipSelfForStartNode?: boolean;
}

/**
 * Traverse nodes recursively using generators.
 *
 * This is the advanced traverse function, which can be used used
 * to write other variants of traversal and find.
 *
 * Type signature for generator.next first argument is `{ skipChild?: boolean; skipSibling?: boolean } | void `
 * Throw any error into the generator to finish the generator and let it cleanup its internals.
 *
 * It allows inversion of control -
 * so, application code can decide to
 * 1. change order of traversal,
 * 2. skip some elements,
 * 3. cancel traversal mid-way.
 *
 * @example
 * ```js
 * // Basic use (for-of)
 *
 * const nodeIterator = traverseGenerator(rootNode);
 * for (const node of nodeIterator) {
 *  // do something with each node here
 * }
 * ```
 * ------
 *
 * @example
 * ```js
 * // Breadth-first
 *
 * // note the order below
 * const nodeIterator = traverseGenerator(rootNode, ["self", "sibling", "child"]);
 * // rest - same as above
 * ```
 * -----
 *
 * @example
 * ```js
 * // Get first 3 nodes and then stop the generator
 *
 * const nodeIterator = traverseGenerator(rootNode);
 *
 * var count = 0;
 * var next;
 * while (
 *    count < 3 &&
 *    !(next = nodeIterator.next()).done
 * ) {
 *    count++;
 *    const node = next.value;
 *    // do something with each node here
 * }
 *
 * // Finish generator, to prevent memory leak
 * nodeIterator.throw(new Error());
 * ```
 * -----
 *
 */
function* traverseGenerator(
  node: Fiber,
  {
    order = ["self", "child", "sibling"],
    skipSiblingForStartNode = true,
    skipSelfForStartNode = false,
  }: TTraverseConfig = {}
): IterableIterator<Fiber> {
  let skipChild = false,
    skipSibling = skipSiblingForStartNode,
    skipSelf = skipSelfForStartNode;

  function* traverseSelf() {
    if (!skipSelf) {
      const controlInput:
        | { skipChild?: boolean; skipSibling?: boolean }
        | undefined = yield node;

      if (controlInput !== undefined) {
        ({ skipChild = skipChild, skipSibling = skipSibling } = controlInput);
      }
    }
  }

  function* traverseChild() {
    if (!skipChild && node.child !== null) {
      const nextNode = node.child;
      yield* traverseGenerator(nextNode, {
        order,
        skipSiblingForStartNode: false,
        skipSelfForStartNode: false,
      });
    }
  }

  function* traverseSibling() {
    if (!skipSibling && node.sibling !== null) {
      const nextNode = node.sibling;
      yield* traverseGenerator(nextNode, {
        order,
        skipSiblingForStartNode: false,
        skipSelfForStartNode: false,
      });
    }
  }

  const traverseMap = {
    self: traverseSelf,
    child: traverseChild,
    sibling: traverseSibling,
  };

  // For each item mentioned in order, find generator functions to run
  const orderedGenerators = order
    .map((step) => traverseMap[step])
    .filter((tmp) => tmp !== undefined);

  // Now run each generator till end
  for (const eachGen of orderedGenerators) {
    yield* eachGen();
  }
}

/**
 * Traverse nodes recursively in depth-first manner, starting from a start node.
 *
 * This is the default and basic traversal function, which covers basic use cases.
 * You can't do advanced things like change the order of traversal, skip or cancel traversal after any node, etc.
 * For more advanced usecases, see {@link traverseGenerator}
 *
 * @example
 * ```js
 * // calls fn for each node inside startNode
 * traverse(startNode, fn);
 * ```
 *
 */
function traverse(
  node: Fiber,
  fn: (node: Fiber) => any,
  traverseConfig?: TTraverseConfig
) {
  const nodeIterator = traverseGenerator(node, traverseConfig);
  for (const tmpNode of nodeIterator) {
    fn.call(null, tmpNode);
  }
}

export { traverse, traverseGenerator, TTraverseConfig };
