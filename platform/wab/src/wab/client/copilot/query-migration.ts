/**
 * Prompts prefilled into the chat input by the legacy data-query menus. These are
 * meant to be human readable, the system prompt explains technical migration details.
 */
import { toVarName } from "@/wab/shared/codegen/util";
import { Component, ComponentDataQuery } from "@/wab/shared/model/classes";

type ComponentIdentity = Pick<Component, "name" | "uuid">;
type LegacyQueryIdentity = Pick<ComponentDataQuery, "name" | "uuid">;

function describeQuery(query: LegacyQueryIdentity): string {
  const reference = `$queries.${toVarName(query.name)}`;
  return `"${query.name}" (uuid ${query.uuid}, ${reference})`;
}

function describeComponent(component: ComponentIdentity): string {
  return `"${component.name}" (uuid ${component.uuid})`;
}

export function makeLegacyQueryMigrationPrompt(
  component: ComponentIdentity,
  query: LegacyQueryIdentity
): string {
  return (
    `Migrate the legacy data query ${describeQuery(query)} on component ` +
    `${describeComponent(component)} to a modern data query. ` +
    `Migrate only that query, and report what's left for me to do by hand.`
  );
}

export function makeAllLegacyQueriesMigrationPrompt(
  component: ComponentIdentity,
  queries: LegacyQueryIdentity[]
): string {
  const subject =
    queries.length === 1
      ? `the legacy data query ${describeQuery(queries[0])}`
      : `all ${queries.length} legacy data queries`;
  return (
    `Migrate ${subject} on component ${describeComponent(
      component
    )} to modern ` +
    `data queries. Give me a one-line outcome per query — migrated, or skipped ` +
    `and why, plus anything left for me to do by hand.`
  );
}
