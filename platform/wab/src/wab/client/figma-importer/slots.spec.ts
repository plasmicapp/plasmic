import {
  getAllSlotsInNode,
  parseNodeNameToSlotMeta,
} from "@/wab/client/figma-importer/slots";

describe("Figma importer slot handling", () => {
  describe("parseNodeNameToSlotMeta", () => {
    it("should parse old slot identifier", () => {
      expect(parseNodeNameToSlotMeta("slot:")).toEqual({
        isSlot: false,
      });

      expect(parseNodeNameToSlotMeta("slot: ")).toEqual({
        isSlot: false,
      });

      expect(parseNodeNameToSlotMeta("slot: children")).toEqual({
        isSlot: true,
        slotName: "children",
        tplName: undefined,
      });

      expect(parseNodeNameToSlotMeta("slot: name")).toEqual({
        isSlot: true,
        slotName: "name",
        tplName: undefined,
      });

      expect(parseNodeNameToSlotMeta("slot: name ")).toEqual({
        isSlot: true,
        slotName: "name",
        tplName: undefined,
      });

      expect(parseNodeNameToSlotMeta("slot:name")).toEqual({
        isSlot: true,
        slotName: "name",
        tplName: undefined,
      });
    });

    it("should handle brackets pattern", () => {
      expect(parseNodeNameToSlotMeta("[slot]")).toEqual({
        isSlot: true,
        slotName: "children",
        tplName: undefined,
      });

      expect(parseNodeNameToSlotMeta("rect[slot]")).toEqual({
        isSlot: true,
        slotName: "children",
        tplName: "rect",
      });

      expect(parseNodeNameToSlotMeta("rect [slot]")).toEqual({
        isSlot: true,
        slotName: "children",
        tplName: "rect",
      });

      expect(parseNodeNameToSlotMeta("rect [slot] ")).toEqual({
        isSlot: true,
        slotName: "children",
        tplName: "rect",
      });

      expect(parseNodeNameToSlotMeta("[slot: name]")).toEqual({
        isSlot: true,
        slotName: "name",
        tplName: undefined,
      });

      expect(parseNodeNameToSlotMeta("rect[slot: name]")).toEqual({
        isSlot: true,
        slotName: "name",
        tplName: "rect",
      });

      expect(parseNodeNameToSlotMeta("rect [slot: name]")).toEqual({
        isSlot: true,
        slotName: "name",
        tplName: "rect",
      });

      expect(parseNodeNameToSlotMeta("rect [slot: name] ")).toEqual({
        isSlot: true,
        slotName: "name",
        tplName: "rect",
      });
    });
  });

  describe("getAllSlotsInNode", () => {
    it("should properly ignore the root", () => {
      const node = {
        name: "root [slot]",
        type: "INSTANCE",
        children: [
          {
            name: "child1 [slot]",
            type: "INSTANCE",
            children: [
              {
                name: "child1.1 [slot]",
                type: "INSTANCE",
                children: [],
              },
            ],
          },
          {
            name: "child2 [slot: children]",
            type: "INSTANCE",
            children: [],
          },
          {
            name: "child3 [slot: box]",
            type: "INSTANCE",
            children: [
              {
                name: "child3.1 [slot: box]",
                type: "INSTANCE",
                children: [],
              },
            ],
          },
        ],
      } as any;

      const fn = jest.fn().mockImplementation(() => ({}));

      expect(
        getAllSlotsInNode(node, fn, {
          includeRoot: true,
        })
      ).toEqual({
        children: [
          {
            name: "root",
          },
        ],
      });

      expect(fn).toHaveBeenCalledTimes(1);

      expect(
        getAllSlotsInNode(node, fn, {
          includeRoot: false,
        })
      ).toMatchObject({
        children: [
          {
            name: "child1",
          },
          {
            name: "child2",
          },
        ],
        box: [
          {
            name: "child3",
          },
        ],
      });
    });
  });
});
