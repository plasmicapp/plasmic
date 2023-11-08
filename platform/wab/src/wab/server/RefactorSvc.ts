import * as babelParser from "@babel/parser";
import traverse from "babel-traverse";
import fs, { writeFileSync } from "fs";
import lineColumn from "line-column";
import { fileSync } from "tmp";
import { ensure, findAllIndexesInString, todo, tuple } from "../common";
import { FindFreeVarsRequest, FindFreeVarsResponse } from "../shared/ApiSchema";
import { tplMarker } from "../shared/codegen/react-p/plain";
import { TsSvc } from "./TsSvc";

export class RefactorSvc {
  constructor(private tsSvc: TsSvc) {}

  async rename() {
    return todo();
  }

  async findFreeVars(req: FindFreeVarsRequest): Promise<FindFreeVarsResponse> {
    const { generatedCode: moduleCode } = req;

    // save to file

    const fileHandle = fileSync({
      postfix: ".tsx",
    });
    const filePath = fileHandle.name;
    try {
      writeFileSync(filePath, moduleCode, { encoding: "utf8" });

      // use tsserver to extract method - need to first identify the relevant
      // part of the code, however!  find the marker start and end locations
      // and convert to line/offset.

      let [start, end] = findAllIndexesInString(moduleCode, tplMarker);
      start += tplMarker.length;

      const [startCoord, endCoord] = [start, end].map(
        (pos) =>
          lineColumn(moduleCode).fromIndex(pos) as {
            line: number;
            col: number;
          }
      );

      const openReq = {
        seq: 1,
        type: "quickinfo",
        command: "open",
        arguments: {
          file: filePath,
        },
      };
      await this.tsSvc.req(openReq as any);

      const GetApplicableRefactors = "getApplicableRefactors" as protocol.CommandTypes.GetApplicableRefactors;
      const range = {
        file: filePath,
        startLine: startCoord.line,
        startOffset: startCoord.col,
        endLine: endCoord.line,
        endOffset: endCoord.col,
      };
      const listReq: protocol.GetApplicableRefactorsRequest = {
        seq: 0,
        type: "request",
        command: GetApplicableRefactors,
        arguments: range,
      };
      const listResp = (await this.tsSvc.reqResp(
        listReq
      )) as protocol.GetApplicableRefactorsResponse;
      // inspect(listResp, true);

      const extractRef = ensure(
        ensure(listResp.body).find(
          (ref) =>
            ref.name === "Extract Symbol" &&
            ref.description === "Extract function"
        )
      );
      const action = ensure(
        extractRef.actions.find((a) => a.description.includes("module scope"))
      );

      const GetEditsForRefactor = "getEditsForRefactor" as protocol.CommandTypes.GetEditsForRefactor;
      const extractReq: protocol.GetEditsForRefactorRequest = {
        seq: 0,
        type: "request",
        command: GetEditsForRefactor,
        arguments: {
          ...range,
          refactor: extractRef.name,
          action: action.name,
        },
      };
      const extractResp = (await this.tsSvc.reqResp(
        extractReq
      )) as protocol.GetEditsForRefactorResponse;
      // inspect(extractResp, true);

      // parse method argument names and types

      const src = extractResp.body!.edits[0].textChanges[1].newText;

      const ast = babelParser.parse(src, {
        plugins: ["jsx", "typescript"],
      }) as any;

      const params: { name: string; type: string }[] = [];
      traverse(ast, {
        FunctionDeclaration: function (path) {
          params.splice(
            0,
            0,
            ...path.get("params").map((param) => {
              if (param.node.type !== "Identifier") throw new Error();
              const { start, end } = ensure(param.node.typeAnnotation);
              return {
                name: param.node.name,
                // Drop the ':'
                type: src.slice(start + 1, end).trim(),
              };
            })
          );
        },
      });

      // return these variables

      return {
        params: Object.fromEntries(
          params.map(({ name, type }) => tuple(name, type))
        ),
      };
    } finally {
      fs.unlinkSync(filePath);
    }
  }
}
