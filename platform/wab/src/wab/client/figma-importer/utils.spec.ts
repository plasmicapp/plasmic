import { parseNodeNameToSlotMeta } from "@/wab/client/figma-importer/utils";

describe("Figma importer utils", () => {
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
        isSlot: false,
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
        isSlot: false,
      });
    });
  });
});
