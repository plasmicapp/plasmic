import { NODE_FIELDS } from "@babel/types/lib/definitions";

const has = Function.call.bind(Object.prototype.hasOwnProperty);

// This function will never be called for comments, only for real nodes.
function cloneIfNode(obj, deep, withoutLoc, cloneNodeHook) {
  if (obj && typeof obj.type === "string") {
    return cloneNode(obj, deep, withoutLoc, cloneNodeHook);
  }

  return obj;
}

function cloneIfNodeOrArray(obj, deep, withoutLoc, cloneNodeHook) {
  if (Array.isArray(obj)) {
    return obj.map((node) =>
      cloneIfNode(node, deep, withoutLoc, cloneNodeHook)
    );
  }
  return cloneIfNode(obj, deep, withoutLoc, cloneNodeHook);
}

/**
 * Create a clone of a `node` including only properties belonging to the node.
 * If the second parameter is `false`, cloneNode performs a shallow clone.
 * If the third parameter is true, the cloned nodes exclude location properties.
 */
export default function cloneNode(
  node,
  deep = true,
  withoutLoc = false,
  cloneNodeHook = undefined
) {
  if (cloneNodeHook) {
    const cloned = cloneNodeHook(node);
    if (cloned) {
      return cloned;
    }
  }
  if (!node) return node;

  const { type } = node;
  const newNode = { type };

  // Special-case identifiers since they are the most cloned nodes.
  if (type === "Identifier") {
    newNode.name = node.name;

    if (has(node, "optional") && typeof node.optional === "boolean") {
      newNode.optional = node.optional;
    }

    if (has(node, "typeAnnotation")) {
      newNode.typeAnnotation = deep
        ? cloneIfNodeOrArray(
            node.typeAnnotation,
            true,
            withoutLoc,
            cloneNodeHook
          )
        : node.typeAnnotation;
    }
  } else if (!has(NODE_FIELDS, type)) {
    throw new Error(`Unknown node type: "${type}"`);
  } else {
    for (const field of Object.keys(NODE_FIELDS[type])) {
      if (has(node, field)) {
        if (deep) {
          newNode[field] =
            type === "File" && field === "comments"
              ? maybeCloneComments(node.comments, deep, withoutLoc)
              : cloneIfNodeOrArray(
                  node[field],
                  true,
                  withoutLoc,
                  cloneNodeHook
                );
        } else {
          newNode[field] = node[field];
        }
      }
    }
  }

  if (has(node, "loc")) {
    if (withoutLoc) {
      newNode.loc = null;
    } else {
      newNode.loc = node.loc;
    }
  }
  if (has(node, "leadingComments")) {
    newNode.leadingComments = maybeCloneComments(
      node.leadingComments,
      deep,
      withoutLoc
    );
  }
  if (has(node, "innerComments")) {
    newNode.innerComments = maybeCloneComments(
      node.innerComments,
      deep,
      withoutLoc
    );
  }
  if (has(node, "trailingComments")) {
    newNode.trailingComments = maybeCloneComments(
      node.trailingComments,
      deep,
      withoutLoc
    );
  }
  if (has(node, "extra")) {
    newNode.extra = {
      ...node.extra,
    };
  }

  return newNode;
}

function cloneCommentsWithoutLoc(comments) {
  return comments.map(({ type, value }) => ({ type, value, loc: null }));
}

function maybeCloneComments(comments, deep, withoutLoc) {
  return deep && withoutLoc ? cloneCommentsWithoutLoc(comments) : comments;
}
