import type {
  Config,
  Field,
  ListItem,
} from "@react-awesome-query-builder/core";
import type { RulesLogic } from "json-logic-js";
import { cleanUrl } from "./utils";

/**
 * Predefined field configuration for WordPress Posts
 */
export const WORDPRESS_POST_FIELDS: Record<string, Field> = {
  id: {
    type: "number",
    label: "ID",
    operators: ["equal", "not_equal"],
  },
  date: {
    type: "datetime",
    label: "Published Date",
    operators: ["less", "greater"],
    defaultOperator: "greater", // this prevents "equals" operator from being shown by default
  },
  modified: {
    type: "datetime",
    label: "Modified Date",
    operators: ["less", "greater"],
    defaultOperator: "greater",
  },
  slug: {
    type: "text",
    label: "Slug",
    operators: ["equal"],
  },
  author: {
    type: "number",
    label: "Author ID",
    operators: ["equal", "not_equal"],
  },
  categories: {
    type: "multiselect",
    label: "Category",
    operators: ["multiselect_contains", "multiselect_not_contains"],
    defaultOperator: "multiselect_contains",
    fieldSettings: {
      listValues: [], // Will be populated dynamically
    },
  },
  tags: {
    type: "multiselect",
    label: "Tag",
    operators: ["multiselect_contains", "multiselect_not_contains"],
    defaultOperator: "multiselect_contains",
    fieldSettings: {
      listValues: [], // Will be populated dynamically
    },
  },
  sticky: {
    type: "boolean",
    label: "Sticky",
    operators: ["equal"],
  },
  search: {
    type: "text",
    label: "Search",
    operators: ["equal"],
  },
  search_columns: {
    type: "multiselect",
    label: "Search Columns",
    operators: ["multiselect_contains"],
    defaultOperator: "multiselect_contains",
    fieldSettings: {
      listValues: ["post_title", "post_content", "post_excerpt"],
    },
  },
};

/**
 * Predefined field configuration for WordPress Pages
 */
export const WORDPRESS_PAGE_FIELDS: Record<string, Field> = {
  id: WORDPRESS_POST_FIELDS.id,
  date: WORDPRESS_POST_FIELDS.date,
  modified: WORDPRESS_POST_FIELDS.modified,
  slug: WORDPRESS_POST_FIELDS.slug,
  author: WORDPRESS_POST_FIELDS.author,
  search: WORDPRESS_POST_FIELDS.search,
  search_columns: WORDPRESS_POST_FIELDS.search_columns,
  // Page-specific fields
  parent: {
    type: "number",
    label: "Parent Page",
    operators: ["equal", "not_equal"],
  },
  menu_order: {
    type: "number",
    label: "Menu Order",
    operators: ["equal"],
  },
};

/**
 * Fetch categories for multiselect dropdown to allow filtering by category
 */
export async function fetchCategories(
  wordpressUrl: string
): Promise<Array<ListItem>> {
  try {
    const url = `${cleanUrl(
      wordpressUrl
    )}/wp-json/wp/v2/categories?per_page=100`;
    const resp = await fetch(url);
    if (!resp.ok) {
      return [];
    }

    const categories = await resp.json();
    const formatted = categories.map((cat: any) => ({
      value: cat.id,
      title: cat.name,
    }));

    return formatted;
  } catch (error) {
    console.error("Failed to fetch WordPress categories:", error);
    return [];
  }
}

/**
 * Fetch tags for multiselect dropdown to allow filtering by tag
 */
export async function fetchTags(
  wordpressUrl: string
): Promise<Array<ListItem>> {
  try {
    const url = `${cleanUrl(wordpressUrl)}/wp-json/wp/v2/tags?per_page=100`;
    const resp = await fetch(url);
    if (!resp.ok) {
      return [];
    }

    const tags = await resp.json();
    const formatted = tags.map((tag: any) => ({
      value: tag.id,
      title: tag.name,
    }));

    return formatted;
  } catch (error) {
    console.error("Failed to fetch WordPress tags:", error);
    return [];
  }
}

/**
 * Build complete query builder configuration for WordPress
 */
export function buildWordPressConfig(
  queryType: "posts" | "pages",
  categories?: Array<{ value: number; title: string }>,
  tags?: Array<{ value: number; title: string }>
): {
  fields: Config["fields"];
  conjunctions: { AND: { label: string } };
  settings: { showNot: boolean; maxNesting: number };
} {
  const fields =
    queryType === "posts"
      ? { ...WORDPRESS_POST_FIELDS }
      : { ...WORDPRESS_PAGE_FIELDS };

  if (queryType === "posts" && categories && tags) {
    fields.categories = {
      ...fields.categories,
      fieldSettings: { listValues: categories },
    };

    fields.tags = {
      ...fields.tags,
      fieldSettings: { listValues: tags },
    };
  }

  return {
    fields,

    // WordPress REST API doesn't support OR logic natively
    // Limit to AND-only combinations
    conjunctions: {
      AND: { label: "AND" },
    },
    settings: {
      showNot: false,
      // hides group controls (we don't want to support nested groups, because the only supported conjunction is AND)
      maxNesting: 1,
    },
  };
}

export interface WordPressFilters {
  // Common
  search?: string;
  slug?: string;
  include?: number[];
  exclude?: number[];
  // Pagination
  page?: number;
  per_page?: number;
  offset?: number;
  // Ordering
  order?: "asc" | "desc";
  orderby?: string;
  // Posts-specific
  author?: number | number[];
  author_exclude?: number[];
  categories?: number[];
  tags?: number[];
  before?: string;
  after?: string;
  modified_before?: string;
  modified_after?: string;
  sticky?: boolean;
  // Pages-specific
  parent?: number[];
  parent_exclude?: number[];
  menu_order?: number;
}

/**
 * Convert RAQB JsonLogic to WordPress REST API query parameters
 */
export function rulesLogicToWordPressFilters(
  logic: RulesLogic | undefined
): WordPressFilters {
  if (logic === null || logic === undefined) {
    return {};
  } else if (typeof logic !== "object") {
    throw new Error(`unexpected logic: ${JSON.stringify(logic)}`);
  } else if ("and" in logic) {
    return handleAndGroup(logic.and);
  }

  return handleCondition(logic);
}

function handleAndGroup(conditions: any[]): WordPressFilters {
  const filters: WordPressFilters = {};

  for (const condition of conditions) {
    const result = handleCondition(condition);
    Object.assign(filters, result);
  }

  return filters;
}

function handleCondition(condition: any, negated = false): WordPressFilters {
  // "some" clause generated by the multiselect operator (used for categories and tags)
  // Pattern: {"some": [{"var": "categories"}, {"in": [{"var": ""}, values]}]}
  if ("some" in condition) {
    const [fieldExpr, inExpr] = condition.some;
    if (
      "var" in fieldExpr &&
      "in" in inExpr &&
      Array.isArray(inExpr.in) &&
      inExpr.in.length === 2
    ) {
      const field = fieldExpr.var;
      const values = inExpr.in[1];
      return negated
        ? convertNotEqualOperator(field, values)
        : convertEqualOperator(field, values);
    }
  }

  if ("!" in condition) {
    return handleCondition(condition["!"], true);
  }

  if ("==" in condition) {
    const [fieldExpr, value] = condition["=="];
    if ("var" in fieldExpr) {
      return convertEqualOperator(fieldExpr.var, value);
    }
  }

  if ("!=" in condition) {
    const [fieldExpr, value] = condition["!="];
    if ("var" in fieldExpr) {
      return convertNotEqualOperator(fieldExpr.var, value);
    }
  }

  if ("<" in condition) {
    const [fieldExpr, value] = condition["<"];
    if ("var" in fieldExpr) {
      return convertLessThanOperator(fieldExpr.var, value);
    }
  }

  if (">" in condition) {
    const [fieldExpr, right] = condition[">"];
    if ("var" in fieldExpr) {
      return convertGreaterThanOperator(fieldExpr.var, right);
    }
  }

  throw new Error(
    `Unsupported WordPress filter condition: ${JSON.stringify(condition)}`
  );
}

function convertEqualOperator(field: string, value: any): WordPressFilters {
  if (field === "id") {
    return { include: value };
  }
  return { [field]: value };
}

function convertNotEqualOperator(field: string, value: any): WordPressFilters {
  if (field === "id") {
    return { exclude: value };
  }
  return { [`${field}_exclude`]: value };
}

function convertLessThanOperator(field: string, value: any): WordPressFilters {
  if (field === "date") {
    return { before: value };
  }
  if (field === "modified") {
    return { modified_before: value };
  }
  console.warn(
    `WordPress: Less than operator not supported for field: ${field}`
  );
  return {};
}

function convertGreaterThanOperator(
  field: string,
  value: any
): WordPressFilters {
  if (field === "date") {
    return { after: value };
  }
  if (field === "modified") {
    return { modified_after: value };
  }
  console.warn(
    `WordPress: Greater than operator not supported for field: ${field}`
  );
  return {};
}
