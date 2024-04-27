import { headRegexp } from "@/wab/client/components/canvas/CanvasFrame/headRegexp";

describe("headRegexp", () => {
  it("can inject <script> after <head>", () => {
    const replaced = "<html><head><meta/></head><body></body></html>".replace(
      headRegexp,
      "$&<script/>"
    );
    expect(replaced).toBe(
      "<html><head><script/><meta/></head><body></body></html>"
    );
  });
  it("matches doc with <head>", () => {
    const match = "<html><head><meta/></head><body></body></html>".match(
      headRegexp
    );
    expect(match?.[0]).toBe("<html><head>");
  });
  it("matches doc without <head>", () => {
    const match = "<html><meta/><body></body></html>".match(headRegexp);
    expect(match?.[0]).toBe("<html>");
  });
  it("matches doc with <!DOCTYPE>", () => {
    const match =
      "<!DOCTYPE html><html><head><meta/></head><body></body></html>".match(
        headRegexp
      );
    expect(match?.[0]).toBe("<html><head>");
  });
  it("matches doc with attribute on <head>", () => {
    const match =
      '<html lang="en"><head><meta/></head><body></body></html>'.match(
        headRegexp
      );
    expect(match?.[0]).toBe('<html lang="en"><head>');
  });
  it("matches doc with space between <html> and <head>", () => {
    const match = `<html>
  <head>
    <meta/>
  </head>
  <body></body>
</html>
`.match(headRegexp);
    expect(match?.[0]).toEqual("<html>\n  <head>");
  });
});
