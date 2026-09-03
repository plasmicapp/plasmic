import { ApiUser } from "@/wab/shared/ApiSchema";
import {
  fullName,
  fullNameAndEmail,
  fullNameLastAbbreviated,
} from "@/wab/shared/ApiSchemaUtil";

function mkUser(
  firstName: string | null,
  lastName: string | null,
  email: string = "email@domain.com"
): ApiUser {
  return {
    email,
    firstName,
    lastName,
  } as ApiUser;
}

describe("fullName/fullNameAndEmail/fullNameLastAbbreviated", () => {
  it("handles user with first and last name", () => {
    const user = mkUser("First", "Last");
    expect(fullName(user)).toEqual("First Last");
    expect(fullNameAndEmail(user)).toEqual("First Last (email@domain.com)");
    expect(fullNameLastAbbreviated(user)).toEqual("First L.");
  });
  it("handles user with first and last name with one character", () => {
    const user = mkUser("First", "L");
    expect(fullName(user)).toEqual("First L");
    expect(fullNameAndEmail(user)).toEqual("First L (email@domain.com)");
    expect(fullNameLastAbbreviated(user)).toEqual("First L");
  });
  it("handles user with first name only", () => {
    const user = mkUser("First", null);
    expect(fullName(user)).toEqual("First");
    expect(fullNameAndEmail(user)).toEqual("First (email@domain.com)");
    expect(fullNameLastAbbreviated(user)).toEqual("First");
  });
  it("handles user with last name only", () => {
    const user = mkUser(null, "Last");
    expect(fullName(user)).toEqual("Last");
    expect(fullNameAndEmail(user)).toEqual("Last (email@domain.com)");
    expect(fullNameLastAbbreviated(user)).toEqual("L.");
  });
  it("handles user without first name and last name", () => {
    const user = mkUser(null, null);
    expect(fullName(user)).toEqual("email@domain.com");
    expect(fullNameAndEmail(user)).toEqual("email@domain.com");
    expect(fullNameLastAbbreviated(user)).toEqual("email@domain.com");
  });
});
