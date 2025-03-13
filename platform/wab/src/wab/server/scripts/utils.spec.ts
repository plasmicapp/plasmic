import { extractMentionedEmails } from "@/wab/server/scripts/utils";

describe("extractMentionedEmails", function () {
  it("should extract user emails", () => {
    const body = "check this out @abc@xyz.com";
    const emails = extractMentionedEmails(body);
    expect(emails).toEqual(["abc@xyz.com"]);
  });

  it("should not extract invalid user emails", () => {
    const body = "check this out @abc@xyz@.com, please test it @test@test.com";
    const emails = extractMentionedEmails(body);
    expect(emails).toEqual(["test@test.com"]);
  });

  it("should extract multiple valid emails", () => {
    const body = "Contact @john.doe@example.com and @jane.doe@company.org.";
    const emails = extractMentionedEmails(body);
    expect(emails).toEqual(["john.doe@example.com", "jane.doe@company.org"]);
  });

  it("should not extract emails without preceding @", () => {
    const body = "john.doe@example.com is my email, but not mentioned.";
    const emails = extractMentionedEmails(body);
    expect(emails).toEqual([]);
  });

  it("should extract emails with special characters", () => {
    const body = "Follow @user+123@example.com or @user.name-xyz@company.io!";
    const emails = extractMentionedEmails(body);
    expect(emails).toEqual([
      "user+123@example.com",
      "user.name-xyz@company.io",
    ]);
  });

  it("should not extract invalid emails", () => {
    const body =
      "Invalid emails like @user@domain..com or @user@domain@com should not be extracted.";
    const emails = extractMentionedEmails(body);
    expect(emails).toEqual([]);
  });

  it("should return an empty array if no valid emails are found", () => {
    const body = "Hello @user, how are you? Also, @someone!";
    const emails = extractMentionedEmails(body);
    expect(emails).toEqual([]);
  });

  it("should extract emails even with newlines and extra spaces", () => {
    const body =
      "Mention: @john.doe@example.com \n And also @jane_doe@company.com";
    const emails = extractMentionedEmails(body);
    expect(emails).toEqual(["john.doe@example.com", "jane_doe@company.com"]);
  });

  it("should extract emails with subdomains", () => {
    const body = "Use @support@mail.example.co.uk for help.";
    const emails = extractMentionedEmails(body);
    expect(emails).toEqual(["support@mail.example.co.uk"]);
  });

  it("should extract mention at start", () => {
    const body = "@a@b.c foo";
    const emails = extractMentionedEmails(body);
    expect(emails).toEqual(["a@b.c"]);
  });

  it("should extract mention at end", () => {
    const body = "foo @a@b.c";
    const emails = extractMentionedEmails(body);
    expect(emails).toEqual(["a@b.c"]);
  });

  it("should extract mention at start and end (standalone)", () => {
    const body = "@a@b.c";
    const emails = extractMentionedEmails(body);
    expect(emails).toEqual(["a@b.c"]);
  });

  it("should not extract mention without preceding @", () => {
    const body = "#@a@b.c";
    const emails = extractMentionedEmails(body);
    expect(emails).toEqual([]);
  });

  it("should extract mention on second line", () => {
    const body = "foo\n@a@b.c\nbar";
    const emails = extractMentionedEmails(body);
    expect(emails).toEqual(["a@b.c"]);
  });

  it("should handle mentions with UTF-8 characters", () => {
    const body = "Hola @usuário@domínio.com and @ünicodé@test.co!";
    const emails = extractMentionedEmails(body);
    expect(emails).toEqual(["usuário@domínio.com", "ünicodé@test.co"]);
  });

  it("should not extract emails with spaces in domain", () => {
    const body = "Check @user@domain .com and @test@valid.com";
    const emails = extractMentionedEmails(body);
    expect(emails).toEqual(["test@valid.com"]);
  });

  it("should extract emails with multiple mentions in a row", () => {
    const body = "Team: @a@b.com @c@d.com @e@f.co";
    const emails = extractMentionedEmails(body);
    expect(emails).toEqual(["a@b.com", "c@d.com", "e@f.co"]);
  });

  it("should handle mentions with trailing punctuation", () => {
    const body = "Email @user@domain.com, or @test@xyz.org!";
    const emails = extractMentionedEmails(body);
    expect(emails).toEqual(["user@domain.com", "test@xyz.org"]);
  });

  it("should not extract incomplete emails", () => {
    const body = "Incomplete @user@ or @domain.com or @user@domain";
    const emails = extractMentionedEmails(body);
    expect(emails).toEqual([]);
  });

  it("should handle mixed valid and invalid mentions", () => {
    const body =
      "Try @valid@domain.com and @invalid@domain..org then @test@xyz.io";
    const emails = extractMentionedEmails(body);
    expect(emails).toEqual(["valid@domain.com", "test@xyz.io"]);
  });

  it("should extract email with minimal valid format", () => {
    const body = "Short @a@b.co works.";
    const emails = extractMentionedEmails(body);
    expect(emails).toEqual(["a@b.co"]);
  });
});
