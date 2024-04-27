import PlasmicInitTokenContainer from "@/wab/client/components/pages/plasmic/PlasmicInitTokenContainer";
import * as React from "react";

interface InitTokenContainerProps {
  state?: "loading" | "error" | "done";
  onAuthorizeClick: () => {};
}

function InitTokenContainer({
  state,
  onAuthorizeClick,
}: InitTokenContainerProps) {
  return (
    <PlasmicInitTokenContainer
      state={state}
      authorizeButton={{ props: { onClick: onAuthorizeClick } }}
    />
  );
}

export default InitTokenContainer;
