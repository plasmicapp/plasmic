import { CustomError } from "@/wab/shared/common";
import * as React from "react";
import { isValidElement } from "react";
import { failable, IFailable } from "ts-failable";

export class InvalidComponentImplError extends CustomError {
  name: "InvalidComponentImplError";
}

export function canComponentTakeRef(
  impl: React.ComponentType,
  react: typeof React,
  win: typeof window | typeof globalThis
): IFailable<boolean, InvalidComponentImplError> {
  return failable<boolean, InvalidComponentImplError>(
    ({ success, run, failure }) => {
      if (impl == null) {
        return failure(new InvalidComponentImplError());
      }

      const symbolFor = win.Symbol.for;

      // const REACT_ELEMENT_TYPE = symbolFor('react.element');
      // const REACT_PORTAL_TYPE = symbolFor('react.portal');
      const REACT_FRAGMENT_TYPE = symbolFor("react.fragment");
      const REACT_STRICT_MODE_TYPE = symbolFor("react.strict_mode");
      const REACT_PROFILER_TYPE = symbolFor("react.profiler");
      const REACT_PROVIDER_TYPE = symbolFor("react.provider");
      const REACT_CONTEXT_TYPE = symbolFor("react.context");
      const REACT_FORWARD_REF_TYPE = symbolFor("react.forward_ref");
      const REACT_SUSPENSE_TYPE = symbolFor("react.suspense");
      const REACT_SUSPENSE_LIST_TYPE = symbolFor("react.suspense_list");
      const REACT_MEMO_TYPE = symbolFor("react.memo");
      const REACT_LAZY_TYPE = symbolFor("react.lazy");
      // const REACT_BLOCK_TYPE = symbolFor('react.block');
      // const REACT_SERVER_BLOCK_TYPE = symbolFor('react.server.block');
      // const REACT_FUNDAMENTAL_TYPE = symbolFor('react.fundamental');
      const REACT_SCOPE_TYPE = symbolFor("react.scope");
      // const REACT_OPAQUE_ID_TYPE = symbolFor('react.opaque.id');
      const REACT_DEBUG_TRACING_MODE_TYPE = symbolFor("react.debug_trace_mode");
      // const REACT_OFFSCREEN_TYPE = symbolFor('react.offscreen');
      const REACT_LEGACY_HIDDEN_TYPE = symbolFor("react.legacy_hidden");
      // const REACT_CACHE_TYPE = symbolFor('react.cache');
      const REACT_MODULE_REFERENCE = symbolFor("react.module.reference");

      if (typeof impl === "function") {
        return success(
          impl.prototype instanceof react.Component ||
            impl.prototype === react.Component
        );
      }

      if (
        [
          REACT_FRAGMENT_TYPE,
          REACT_PROFILER_TYPE,
          REACT_DEBUG_TRACING_MODE_TYPE,
          REACT_STRICT_MODE_TYPE,
          REACT_SUSPENSE_TYPE,
          REACT_SUSPENSE_LIST_TYPE,
          REACT_LEGACY_HIDDEN_TYPE,
          REACT_SCOPE_TYPE,
        ].includes(impl as any)
      ) {
        return success(false);
      }

      if (
        [REACT_LAZY_TYPE, REACT_PROVIDER_TYPE, REACT_CONTEXT_TYPE].includes(
          (impl as any).$$typeof
        )
      ) {
        return success(false);
      }

      if ((impl as any).$$typeof === REACT_FORWARD_REF_TYPE) {
        // Forward ref
        return success(true);
      }

      if ((impl as any).$$typeof === REACT_MEMO_TYPE) {
        // Recursively test memo underlying type
        return success(
          run(canComponentTakeRef((impl as any).type, react, win))
        );
      }

      if (
        (impl as any).$$typeof === REACT_MODULE_REFERENCE ||
        (impl as any).getModuleId !== undefined
      ) {
        // Module reference object type from Flight, not sure if it supports ref
        return success(false);
      }

      return failure(new InvalidComponentImplError());
    }
  );
}

export function reactNodeToString(reactNode: React.ReactNode): string {
  let string = "";
  if (typeof reactNode === "string") {
    string = reactNode;
  } else if (typeof reactNode === "number") {
    string = reactNode.toString();
  } else if (reactNode instanceof Array) {
    reactNode.forEach(function (child) {
      string += reactNodeToString(child);
    });
  } else if (isValidElement(reactNode)) {
    string += reactNodeToString(reactNode.props.children);
  }
  return string;
}
