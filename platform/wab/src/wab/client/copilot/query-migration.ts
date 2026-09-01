/**
 * Prompts prefilled into the chat input by the legacy data-query menus. These are
 * meant to be human readable, the system prompt explains technical migration details.
 */
import { mkMentionRaw } from "@/wab/client/components/copilot/resource-mention-utils";
import { toVarName } from "@/wab/shared/codegen/util";
import { ComponentType } from "@/wab/shared/core/components";
import { Component, ComponentDataQuery } from "@/wab/shared/model/classes";

type ComponentIdentity = Pick<Component, "name" | "uuid" | "type">;
type LegacyQueryIdentity = Pick<ComponentDataQuery, "name" | "uuid">;

function describeQuery(query: LegacyQueryIdentity): string {
  const reference = `$queries.${toVarName(query.name)}`;
  return `"${query.name}" (uuid ${query.uuid}, ${reference})`;
}

/**
 * The component as an @-mention, so it lands in the chat input as a chip that
 * resolves to the model object. Legacy data queries aren't a mentionable kind,
 * so those stay described by name and uuid.
 */
function mentionComponent(component: ComponentIdentity): string {
  return `@<${mkMentionRaw({
    kind: component.type === ComponentType.Page ? "page" : "component",
    uuid: component.uuid,
    name: component.name,
  })}>`;
}

export function makeLegacyQueryMigrationPrompt(
  component: ComponentIdentity,
  query: LegacyQueryIdentity
): string {
  return (
    `Migrate the legacy data query ${describeQuery(query)} on ` +
    `${mentionComponent(component)} to a modern data query. ` +
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
    `Migrate ${subject} on ${mentionComponent(component)} to modern ` +
    `data queries. Give me a one-line outcome per query — migrated, or skipped ` +
    `and why, plus anything left for me to do by hand.`
  );
}
