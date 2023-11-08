import * as React from "react";
import PlasmicInitTokenContainer from "./plasmic/PlasmicInitTokenContainer";

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
