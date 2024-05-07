import {
  extractValueFromCurrentUser,
  isCurrentUserBinding,
} from "@/wab/shared/dynamic-bindings";

describe("dynamic-bindings", () => {
  describe("isCurrentUserBinding", () => {
    it("should properly matches safe currentUser bindings", () => {
      expect(isCurrentUserBinding(" (currentUser.email) ")).toBeTrue();
      expect(isCurrentUserBinding(" (currentUser.id) ")).toBeTrue();
      expect(isCurrentUserBinding(" (currentUser.roleId) ")).toBeTrue();
      expect(isCurrentUserBinding(" (currentUser.roleOrder) ")).toBeTrue();
      expect(isCurrentUserBinding(" (currentUser.roleName) ")).toBeTrue();
      expect(isCurrentUserBinding(" (currentUser.properties) ")).toBeFalse();
      expect(isCurrentUserBinding(" (currentUser.properties.) ")).toBeFalse();
      expect(
        isCurrentUserBinding(" (currentUser.properties.name) ")
      ).toBeTrue();
      expect(isCurrentUserBinding(" (currentUser.properties.0) ")).toBeFalse();
      expect(
        isCurrentUserBinding(" (currentUser.properties.0name) ")
      ).toBeFalse();
      expect(
        isCurrentUserBinding(" (currentUser.properties._name) ")
      ).toBeTrue();
      expect(
        isCurrentUserBinding(" (currentUser.properties._name_) ")
      ).toBeTrue();
      expect(
        isCurrentUserBinding(" (currentUser.customProperties) ")
      ).toBeFalse();
      expect(
        isCurrentUserBinding(" (currentUser.customProperties.) ")
      ).toBeFalse();
      expect(
        isCurrentUserBinding(" (currentUser.customProperties.name) ")
      ).toBeTrue();
      expect(
        isCurrentUserBinding(" (currentUser.customProperties.0) ")
      ).toBeFalse();
      expect(
        isCurrentUserBinding(" (currentUser.customProperties.0name) ")
      ).toBeFalse();
      expect(
        isCurrentUserBinding(" (currentUser.customProperties._name) ")
      ).toBeTrue();
      expect(
        isCurrentUserBinding(" (currentUser.customProperties.user_id) ")
      ).toBeTrue();
      expect(
        isCurrentUserBinding(
          " (currentUser.customProperties.name.toLowerCase()) "
        )
      ).toBeFalse();
    });
  });

  describe("extractValueFromCurrentUser", () => {
    it("should properly extract value from currentUser", () => {
      expect(
        extractValueFromCurrentUser(undefined, "{{ (currentUser.email) }}")
      ).toBeUndefined();

      expect(
        extractValueFromCurrentUser(
          {
            email: "admin@example.com",
          },
          "{{ (currentUser.email) }}"
        )
      ).toBe("admin@example.com");

      expect(
        extractValueFromCurrentUser(
          {
            customProperties: {
              name: "admin",
              has_id: true,
            },
          },
          "{{ (currentUser.customProperties.name) }}"
        )
      ).toBe("admin");

      expect(
        extractValueFromCurrentUser(
          {
            customProperties: {
              name: "admin",
              has_id: true,
            },
          },
          "{{ (currentUser.customProperties.has_id) }}"
        )
      ).toBeTrue();

      expect(
        extractValueFromCurrentUser(
          {
            customProperties: {
              name: "admin",
              has_id: true,
            },
          },
          "{{ (currentUser.customProperties._name) }}"
        )
      ).toBeUndefined();
    });
  });
});
