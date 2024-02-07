import { ensure } from "@/wab/common";
import { ComponentType, mkComponent } from "@/wab/components";
import {
  ComponentSeqIdAssignment,
  extractNodesByComponentAsJson,
  parseNodesByComponent,
  ProjectSeqIdAssignment,
} from "@/wab/shared/seq-id-utils";
import { createSite } from "@/wab/sites";
import { mkTplTagX } from "@/wab/tpls";

describe("seq-id-utils", function () {
  it("parseNodesByComponent works", function () {
    const site = createSite();

    expect(parseNodesByComponent(extractNodesByComponentAsJson(site))).toEqual(
      []
    );

    const cCompRoot = mkTplTagX("div");
    const cComp = mkComponent({
      name: "C",
      tplTree: cCompRoot,
      type: ComponentType.Plain,
    });

    const dCompRoot = mkTplTagX("div");
    const dComp = mkComponent({
      name: "D",
      tplTree: dCompRoot,
      type: ComponentType.Plain,
    });
    site.components.push(cComp);
    site.components.push(dComp);

    expect(parseNodesByComponent(extractNodesByComponentAsJson(site))).toEqual([
      [cComp.uuid, [cCompRoot.uuid]],
      [dComp.uuid, [dCompRoot.uuid]],
    ]);
  });

  it("ProjectSeqIdAssignment serializer works - empty", function () {
    const project = new ProjectSeqIdAssignment(
      new Map<string, ComponentSeqIdAssignment>([])
    );
    const projectAfterSerDer = ProjectSeqIdAssignment.fromJson(
      JSON.stringify(project)
    );
    expect(projectAfterSerDer.components.size).toEqual(0);
  });

  it("ProjectSeqIdAssignment serializer works - non empty", function () {
    const project = new ProjectSeqIdAssignment(
      new Map<string, ComponentSeqIdAssignment>([
        [
          "comp1",
          new ComponentSeqIdAssignment(
            4,
            new Map<string, number>([
              ["uuid1", 1],
              ["uuid2", 2],
              ["uuid3", 3],
            ])
          ),
        ],
        [
          "comp2",
          new ComponentSeqIdAssignment(
            42,
            new Map<string, number>([
              ["uuid5", 5],
              ["uuid6", 6],
            ])
          ),
        ],
      ])
    );
    const projectAfterSerDer = ProjectSeqIdAssignment.fromJson(
      JSON.stringify(project)
    );
    expect(projectAfterSerDer.components.size).toEqual(2);
    const comp1 = ensure(projectAfterSerDer.components.get("comp1"));
    expect(comp1.getNextSeqId()).toEqual(4);
    expect(comp1.uuidToSeqId.size).toEqual(3);
    expect(comp1.uuidToSeqId.get("uuid1")).toEqual(1);
    expect(comp1.uuidToSeqId.get("uuid2")).toEqual(2);
    expect(comp1.uuidToSeqId.get("uuid3")).toEqual(3);

    const comp2 = ensure(projectAfterSerDer.components.get("comp2"));
    expect(comp2.getNextSeqId()).toEqual(42);
    expect(comp2.uuidToSeqId.get("uuid5")).toEqual(5);
    expect(comp2.uuidToSeqId.get("uuid6")).toEqual(6);
  });

  it("ProjectSeqIdAssignment ensureAssigned works", function () {
    const project = new ProjectSeqIdAssignment(
      new Map<string, ComponentSeqIdAssignment>([
        [
          "comp1",
          new ComponentSeqIdAssignment(
            4,
            new Map<string, number>([
              ["uuid1", 1],
              ["uuid2", 2],
              ["uuid3", 3],
            ])
          ),
        ],
        [
          "comp2",
          new ComponentSeqIdAssignment(
            42,
            new Map<string, number>([
              ["uuid5", 5],
              ["uuid6", 6],
            ])
          ),
        ],
      ])
    );

    const comp3 = project.getOrCreate("comp3");
    expect(project.components.size === 3);
    expect(comp3.getNextSeqId()).toEqual(1);
    comp3.ensureAssigned(["uuid7", "uuid8"]);
    expect(comp3.uuidToSeqId.get("uuid7")).toEqual(1);
    expect(comp3.uuidToSeqId.get("uuid8")).toEqual(2);
    expect(comp3.getNextSeqId()).toEqual(3);

    const comp1 = project.getOrCreate("comp1");
    // uuid4 is assigned
    comp1.ensureAssigned(["uuid1", "uuid4"]);
    expect(comp1.uuidToSeqId.get("uuid1")).toEqual(1);
    expect(comp1.uuidToSeqId.get("uuid2")).toEqual(2);
    expect(comp1.uuidToSeqId.get("uuid3")).toEqual(3);
    expect(comp1.uuidToSeqId.get("uuid4")).toEqual(4);
    expect(comp1.getNextSeqId()).toEqual(5);
  });
});
