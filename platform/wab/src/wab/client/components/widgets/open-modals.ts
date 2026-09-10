import { observable } from "mobx";
import * as React from "react";

const openModalCount = observable.box(0);

/**
 * Whether any modal is open in the calling frame.
 */
export function isAnyModalOpen(): boolean {
  return openModalCount.get() > 0;
}

export function useTrackOpenModal(open: boolean): void {
  React.useEffect(() => {
    if (!open) {
      return;
    }
    openModalCount.set(openModalCount.get() + 1);
    return () => openModalCount.set(openModalCount.get() - 1);
  }, [open]);
}
