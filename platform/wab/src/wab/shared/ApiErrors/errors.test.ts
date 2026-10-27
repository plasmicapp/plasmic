import {
  AuthError,
  BadRequestError,
  NotFoundError,
  transformErrors,
} from "@/wab/shared/ApiErrors/errors";

describe("transformErrors", () => {
  it("maps a body-parser JSON parse error to BadRequestError", () => {
    const err = Object.assign(new SyntaxError("Unexpected end of JSON input"), {
      status: 400,
      statusCode: 400,
      type: "entity.parse.failed",
    });
    const transformed = transformErrors(err);
    expect(transformed).toBeInstanceOf(BadRequestError);
    expect(transformed.message).toBe("Invalid JSON body");
  });

  it("leaves other SyntaxErrors alone", () => {
    const err = new SyntaxError("Unexpected token");
    expect(transformErrors(err)).toBe(err);
  });

  it("maps CSRF errors to AuthError", () => {
    expect(transformErrors(new Error("CSRF token missing"))).toBeInstanceOf(
      AuthError,
    );
  });

  it("reconstructs ApiErrors by name", () => {
    const err = new Error("gone");
    err.name = "NotFoundError";
    const transformed = transformErrors(err);
    expect(transformed).toBeInstanceOf(NotFoundError);
    expect(transformed.message).toBe("gone");
  });
});
