import L from "lodash";
import { Site } from "../classes";
import { assert, ensure } from "../common";
import { flattenComponent } from "./cached-selectors";

export type NodesByComponent = Array<[string, string[]]>;

export const extractNodesByComponent = (site: Site): NodesByComponent => {
  return site.components.map((c) => [
    c.uuid,
    flattenComponent(c).map((n) => n.uuid),
  ]);
};

export const extractNodesByComponentAsJson = (site: Site) => {
  return JSON.stringify(extractNodesByComponent(site));
};

export const parseNodesByComponent = (json: string) => {
  return JSON.parse(json) as NodesByComponent;
};

export const assignSeqId = (
  projectAssign: ProjectSeqIdAssignment,
  nodesToAssign: NodesByComponent
) => {
  nodesToAssign.forEach(([compId, nodes]) => {
    const compAssign = projectAssign.getOrCreate(compId);
    compAssign.ensureAssigned(nodes);
  });
};

export const mkProjectAssignFromSite = (site: Site) => {
  const nodesByComponent = extractNodesByComponent(site);
  const projectAssign = new ProjectSeqIdAssignment(new Map());
  assignSeqId(projectAssign, nodesByComponent);
  return projectAssign;
};

export const parseAndAssignSeqId = (
  projectAssignJson: string | undefined,
  nodesByComponent: NodesByComponent | undefined
) => {
  const projectAssign = ProjectSeqIdAssignment.fromJson(
    projectAssignJson || "[]"
  );
  if (nodesByComponent) {
    assignSeqId(projectAssign, nodesByComponent);
  }
  return projectAssign;
};

export class ComponentSeqIdAssignment {
  constructor(
    public nextSeqId: number,
    readonly uuidToSeqId: Map<string, number>
  ) {}

  getNextSeqId() {
    return this.nextSeqId;
  }

  getSeqId(nodeUuid: string) {
    return ensure(this.uuidToSeqId.get(nodeUuid));
  }

  ensureAssigned(nodes: Array<string>) {
    nodes.forEach((n) => {
      if (!this.uuidToSeqId.has(n)) {
        this.uuidToSeqId.set(n, this.nextSeqId);
        this.nextSeqId += 1;
      }
    });
  }

  toJSON() {
    return {
      nextSeqId: this.nextSeqId,
      uuidToSeqId: [...this.uuidToSeqId.entries()],
    };
  }

  static fromJsObject(jsObj: any) {
    return new ComponentSeqIdAssignment(
      jsObj.nextSeqId,
      new Map<string, number>(jsObj.uuidToSeqId as Array<[string, number]>)
    );
  }
}

export class ProjectSeqIdAssignment {
  constructor(readonly components: Map<string, ComponentSeqIdAssignment>) {}

  toJSON() {
    return [...this.components.entries()];
  }

  getOrCreate(compId: string) {
    const x = this.components.get(compId);
    if (!x) {
      const compAssign = new ComponentSeqIdAssignment(
        1,
        new Map<string, number>()
      );
      this.components.set(compId, compAssign);
      return compAssign;
    }
    return x;
  }

  static fromJson(json: string) {
    const j = JSON.parse(json);
    assert(L.isArray(j));
    return new ProjectSeqIdAssignment(
      new Map<string, ComponentSeqIdAssignment>(
        j.map((item) => [
          item[0],
          ComponentSeqIdAssignment.fromJsObject(item[1]),
        ])
      )
    );
  }
}
