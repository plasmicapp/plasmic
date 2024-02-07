/**
 * This slot system is based on @sebmarkbage's suggestion in
 * https://github.com/facebook/react/issues/11387.  I explore the problem
 * and solution space in
 * https://paper.dropbox.com/doc/Web-Dev-Tips--AZYKFaLeIhCfvd_fGevipl8BAg-ohIiFVGa3PcjyBrm8zHew#:uid=707046503510445040304251&h2=React-Portals.
 */

import { ensure } from "@/wab/common";
import React, {
  createContext,
  Dispatch,
  ReactNode,
  Reducer,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react";

export interface SlotPush {
  type: "push";
  id: number;
  children: ReactNode;
}

export interface SlotPop {
  type: "pop";
  id: number;
}

export type SlotAction = SlotPush | SlotPop;

export interface SlotState {
  contentMap: { [key: string]: string };
}

export interface SlotStore {
  state: SlotState;
  dispatch: Dispatch<SlotAction>;
}

export const SlotContext = createContext<SlotStore | undefined>(undefined);

export function useSlotContext() {
  return ensure(useContext(SlotContext));
}

export function SlotProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer<Reducer<SlotState, SlotAction>>(
    // eslint-disable-next-line @typescript-eslint/no-shadow
    (state, action) => {
      switch (action.type) {
        case "push": {
          return {
            contentMap: {
              ...state.contentMap,
              [action.id]: action.children,
            },
          };
        }
        case "pop": {
          const { [action.id]: content, ...rest } = state.contentMap;
          return { contentMap: rest };
        }
      }
    },
    {
      contentMap: {},
    }
  );

  const store = useMemo(() => ({ state, dispatch }), [state, dispatch]);

  return <SlotContext.Provider value={store}>{children}</SlotContext.Provider>;
}

let nextId = 0;

function genId() {
  return nextId++;
}

export function SlotContent({ children }: { children: ReactNode }) {
  const [id] = useState(genId());
  const { state, dispatch } = useSlotContext();
  useEffect(() => {
    dispatch({ type: "push", id, children });
    return () => dispatch({ type: "pop", id });
  }, [id, children]);
  return null;
}

export function Slot() {
  const { state } = useSlotContext();
  return (
    <>
      {Object.entries(state.contentMap).map(([k, v]) => (
        <React.Fragment key={k}>{v}</React.Fragment>
      ))}
    </>
  );
}
