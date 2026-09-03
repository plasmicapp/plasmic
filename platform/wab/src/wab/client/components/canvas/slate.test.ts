import { marksForToolbar } from "@/wab/client/components/canvas/slate";
import { CSSProperties } from "@/wab/shared/element-repr/element-repr-v2";
import {
  createEditor,
  Descendant,
  Editor,
  Element,
  Text,
  Transforms,
} from "slate";

/** Used to hold multiple inline texts. */
function p(...children: Descendant[]): Element {
  return { type: "paragraph", children };
}

const SPAN_MARKS: CSSProperties = {};
const BOLD_MARKS: CSSProperties = { fontWeight: "700" };

function span(text: string): Text {
  return { text, ...SPAN_MARKS };
}

function b(text: string): Text {
  return { text, ...BOLD_MARKS };
}

function ul(...children: Descendant[]): Element {
  return { type: "TplTag", tag: "ul", children };
}

function ol(...children: Descendant[]): Element {
  return { type: "TplTag", tag: "ol", children };
}

function li(...children: Descendant[]): Element {
  return { type: "TplTag", tag: "li", children };
}

function expectMarks(editor: Editor, expected: CSSProperties | null) {
  expect(Editor.marks(editor)).toEqual(expected);
  expect(marksForToolbar(editor)).toEqual(expected);
}

function expectMarksDiffer(
  editor: Editor,
  expectedToolbar: CSSProperties | null,
  expectedEditorMarks: CSSProperties | null
) {
  expect(marksForToolbar(editor)).toEqual(expectedToolbar);
  expect(Editor.marks(editor)).toEqual(expectedEditorMarks);
}

function expectMarksThrow(editor: Editor) {
  expect(() => Editor.marks(editor)).toThrow();
  expect(() => marksForToolbar(editor)).toThrow();
}

describe("marksForToolbar", () => {
  let editor: Editor;

  beforeEach(() => {
    editor = createEditor();
  });

  describe("first-level hello world", () => {
    beforeEach(() => {
      editor.children = [span("Hello "), b("world")];
    });

    it("returns null without selection", () => {
      Transforms.deselect(editor);
      expectMarks(editor, null);
    });

    it("throws if selection references element", () => {
      Transforms.select(editor, { path: [2], offset: 0 });
      expectMarksThrow(editor);

      Transforms.select(editor, { path: [0, 0], offset: 0 });
      expectMarksThrow(editor);
    });

    it("ephemeral marks override leaf marks when adding a new mark", () => {
      Transforms.select(editor, { path: [0], offset: 1 });
      editor.marks = BOLD_MARKS; // user toggled bold on
      expectMarks(editor, BOLD_MARKS);

      Transforms.select(editor, Editor.end(editor, []));
    });

    it("ephemeral marks override leaf marks when toggling off", () => {
      Transforms.select(editor, { path: [1], offset: 0 });
      expectMarks(editor, BOLD_MARKS);

      editor.marks = SPAN_MARKS; // user toggled bold off
      expectMarks(editor, SPAN_MARKS);

      Transforms.select(editor, Editor.end(editor, []));
    });

    it("works", () => {
      // <span>Hello </span><b>world</b>
      // ------1-----2---------3----4----

      Transforms.select(editor, { path: [0], offset: 0 }); // 1
      expectMarks(editor, SPAN_MARKS);
      Transforms.select(editor, { path: [0], offset: 6 }); // 2
      expectMarks(editor, SPAN_MARKS);

      Transforms.select(editor, { path: [1], offset: 0 }); // 3
      expectMarks(editor, BOLD_MARKS);
      Transforms.select(editor, { path: [1], offset: 5 }); // 4
      expectMarks(editor, BOLD_MARKS);
      expect(editor.selection).toEqual({
        anchor: Editor.end(editor, []),
        focus: Editor.end(editor, []),
      });
    });
  });

  describe("nested hello world", () => {
    beforeEach(() => {
      editor.children = [p(span("Hello "), b("world"))];
    });

    it("works", () => {
      // <p><span>Hello </span><b>world</b></p>
      // ---------1-----2---------3----4--------

      Transforms.select(editor, { path: [0, 0], offset: 0 }); // 1
      expectMarks(editor, SPAN_MARKS);
      Transforms.select(editor, { path: [0, 0], offset: 6 }); // 2
      expectMarks(editor, SPAN_MARKS);

      Transforms.select(editor, { path: [0, 1], offset: 0 }); // 3
      expectMarksDiffer(editor, BOLD_MARKS, SPAN_MARKS);
      Transforms.select(editor, { path: [0, 1], offset: 5 }); // 4
      expectMarks(editor, BOLD_MARKS);
      expect(editor.selection).toEqual({
        anchor: Editor.end(editor, []),
        focus: Editor.end(editor, []),
      });
    });
  });

  describe("complex lists", () => {
    beforeEach(() => {
      editor.children = [
        ul(
          li(p(span("Reasons to use "), b("Plasmic"), span(":"))),
          li(ol(li(p(b("fun"))), li(p(span("fast"))), li(p(b("")))))
        ),
      ];
    });

    it("works", () => {
      // li[0]: <p><span>Reasons to use </span><b>Plasmic</b><span>:</span></p>
      //        ---------1--------------2---------3------4---------56-----------

      Transforms.select(editor, { path: [0, 0, 0, 0], offset: 0 }); // 1
      expectMarks(editor, SPAN_MARKS);
      Transforms.select(editor, { path: [0, 0, 0, 0], offset: 15 }); // 2
      expectMarks(editor, SPAN_MARKS);

      Transforms.select(editor, { path: [0, 0, 0, 1], offset: 0 }); // 3
      expectMarksDiffer(editor, BOLD_MARKS, SPAN_MARKS);
      Transforms.select(editor, { path: [0, 0, 0, 1], offset: 7 }); // 4
      expectMarks(editor, BOLD_MARKS);

      Transforms.select(editor, { path: [0, 0, 0, 2], offset: 0 }); // 5
      expectMarksDiffer(editor, SPAN_MARKS, BOLD_MARKS);
      Transforms.select(editor, { path: [0, 0, 0, 2], offset: 1 }); // 6
      expectMarks(editor, SPAN_MARKS);

      // li[1] ol li[0]: <p><b>fun</b></p>
      //                 ------1--2--------
      // li[1] ol li[1]: <p><span>fast</span></p>
      //                 ---------3---4-----------
      // li[1] ol li[2]: <p><b></b></p>
      //                 ------5--------

      Transforms.select(editor, { path: [0, 1, 0, 0, 0, 0], offset: 0 }); // 1
      expectMarks(editor, BOLD_MARKS);
      Transforms.select(editor, { path: [0, 1, 0, 0, 0, 0], offset: 3 }); // 2
      expectMarks(editor, BOLD_MARKS);

      Transforms.select(editor, { path: [0, 1, 0, 1, 0, 0], offset: 0 }); // 3
      expectMarks(editor, SPAN_MARKS);
      Transforms.select(editor, { path: [0, 1, 0, 1, 0, 0], offset: 4 }); // 4
      expectMarks(editor, SPAN_MARKS);

      Transforms.select(editor, { path: [0, 1, 0, 2, 0, 0], offset: 0 }); // 5
      expectMarks(editor, BOLD_MARKS);
      expect(editor.selection).toEqual({
        anchor: Editor.end(editor, []),
        focus: Editor.end(editor, []),
      });
    });
  });
});
