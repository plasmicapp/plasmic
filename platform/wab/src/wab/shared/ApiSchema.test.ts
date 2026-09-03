import type { PublicStyleSection } from "@/wab/shared/ApiSchema";
import type { StyleSection } from "@plasmicapp/host/registerComponent";

describe("PublicStyleSection", () => {
  it("can be assigned from @plasmicapp/host StyleSection", () => {
    // Type of string values of PublicStyleSection.
    type PublicStyleSectionValues = `${PublicStyleSection}`;

    // Test that the public version of StyleSection in @plasmicapp/host
    // is assignable to PublicStyleSection.
    function testStyleSectionAssignableToPublicStyleSection(
      x: StyleSection
    ): PublicStyleSectionValues {
      return x;
    }
  });
});
