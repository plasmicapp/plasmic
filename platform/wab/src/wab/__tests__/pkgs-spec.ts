import "lodash";

describe("creation", function () {
  it("should support adding tables, fields, relationships, pages, routes, components, workflows, functions, types, settings, permissions", () => {});

  it("should pull in any metaobjects that are dependencies", () => {});

  it("should specify any other packages as dependencies", () => {});

  return it("should allow removal of metaobjects that are not yet published", () => {});
});

describe("publishing", function () {
  it("should clone all metaobjects down to any dependent managed pkg", () => {});

  it("should be blocked with insufficient code coverage", () => {});

  it("should freeze the packaged metaobjects", () => {});

  return it("should permit unmanaged packages that do not freeze requirements", () => {});
});

describe("installation", function () {
  it("should create tables, fields, relationships, pages, routes, components, workflows, functions, types, settings, permissions into target app", () => {});

  it("should auto install any (transitive) dependencies", () => {});

  return it("should maintain a mapping from pkg instances to the instances in target app", () => {});
});

describe("upgrading", function () {
  it("should add any missing metaobjects", () => {});

  return it("should update (mutate) metaobjects", () => {});
});

describe("uninstallation", function () {
  it("should check for any existing usage in current app", () => {});

  it("should remove any and all metaobjects", () => {});

  return it("should support purging any (transitive) dependencies", () => {});
});
