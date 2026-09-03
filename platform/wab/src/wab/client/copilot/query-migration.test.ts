import {
  makeAllLegacyQueriesMigrationPrompt,
  makeLegacyQueryMigrationPrompt,
} from "@/wab/client/copilot/query-migration";
import { ComponentType } from "@/wab/shared/core/components";

const component = {
  name: "Users",
  uuid: "component-1",
  type: ComponentType.Plain,
};
const page = { name: "Home", uuid: "page-1", type: ComponentType.Page };
const firstQuery = { name: "Get Users", uuid: "query-1" };
const secondQuery = { name: "Get Teams", uuid: "query-2" };

describe("legacy query migration prompts", () => {
  it("scopes a single-query migration to only the selected query", () => {
    const prompt = makeLegacyQueryMigrationPrompt(component, firstQuery);

    expect(prompt).toContain('"Get Users"');
    expect(prompt).toContain("uuid query-1");
    expect(prompt).toContain("$queries.getUsers");
    expect(prompt).toContain("Migrate only that query");
    expect(prompt).not.toContain("query-2");
  });

  it("mentions the owning component so it lands as a chip", () => {
    expect(makeLegacyQueryMigrationPrompt(component, firstQuery)).toContain(
      "@<component:component-1|Users>"
    );
    expect(
      makeAllLegacyQueriesMigrationPrompt(component, [firstQuery])
    ).toContain("@<component:component-1|Users>");
  });

  it("mentions a page with the page kind", () => {
    expect(makeLegacyQueryMigrationPrompt(page, firstQuery)).toContain(
      "@<page:page-1|Home>"
    );
  });

  it("names every legacy query being migrated in an all-query migration", () => {
    const prompt = makeAllLegacyQueriesMigrationPrompt(component, [
      firstQuery,
      secondQuery,
    ]);

    expect(prompt).toContain("all 2 legacy data queries");
    expect(prompt).toContain("one-line outcome per query");
  });

  it("stays grammatical when the component has a single legacy query", () => {
    const prompt = makeAllLegacyQueriesMigrationPrompt(component, [firstQuery]);

    expect(prompt).not.toContain("all 1");
    expect(prompt).toContain('the legacy data query "Get Users"');
  });

  // The how-to lives in the copilot system prompt, so what lands in the chat
  // input has to stay short enough for the user to actually read and edit.
  it("keeps the prefilled prompt human-sized", () => {
    for (const prompt of [
      makeLegacyQueryMigrationPrompt(component, firstQuery),
      makeAllLegacyQueriesMigrationPrompt(component, [firstQuery, secondQuery]),
    ]) {
      expect(prompt.length).toBeLessThan(300);
      expect(prompt).not.toContain("createDataQuery");
      expect(prompt).not.toContain("\n");
    }
  });
});
