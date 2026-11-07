import { InternalDataPickerEditor } from "@/wab/client/components/sidebar-tabs/ComponentProps/DataPickerEditor";
import type { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { DEVFLAGS } from "@/wab/shared/devflags";
import { cleanup, render, screen } from "@testing-library/react";
import { noop } from "lodash";
import React from "react";

vi.mock(
  "@/wab/client/components/sidebar-tabs/DataBinding/DataPickerPanel",
  async () => {
    const React = await import("react");
    return {
      DataPickerTrigger: React.forwardRef(function Trigger(
        { picker }: { picker: { withAddQuery?: boolean } },
        _ref,
      ) {
        return picker.withAddQuery ? <button>Add new data query</button> : null;
      }),
    };
  },
);

const originalDockview = DEVFLAGS.dockview;

afterEach(() => {
  cleanup();
  DEVFLAGS.dockview = originalDockview;
});

it.each([
  [false, false, false],
  [false, true, true],
  [true, false, true],
  [true, true, true],
])(
  "query creation with dockview=%s and enableDataQueries=%s",
  (dockview, enableDataQueries, allowed) => {
    DEVFLAGS.dockview = dockview;
    const viewCtx = {
      focusedTpl: () => undefined,
      focusedCloneKey: () => undefined,
      studioCtx: { appCtx: { appConfig: { enableDataQueries } } },
    } as unknown as ViewCtx;
    render(
      React.createElement(InternalDataPickerEditor, {
        value: null,
        visible: false,
        setVisible: noop,
        viewCtx,
      }),
    );
    expect(!!screen.queryByRole("button", { name: "Add new data query" })).toBe(
      allowed,
    );
  },
);

it.each([false, true])(
  "requires a view for query creation with dockview=%s",
  (dockview) => {
    DEVFLAGS.dockview = dockview;
    render(
      React.createElement(InternalDataPickerEditor, {
        value: null,
        visible: false,
        setVisible: noop,
      }),
    );
    expect(
      screen.queryByRole("button", { name: "Add new data query" }),
    ).toBeNull();
  },
);
