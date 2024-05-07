import React, { ReactNode } from "react";
import PlasmicPersonalAccessToken from "@/wab/client/components/pages/plasmic/PlasmicPersonalAccessToken";

interface PersonalAccessTokenProps {
  tokenValue?: ReactNode;
  copyState?: "copied";
  onDelete: () => void;
  onCopy: (e: React.MouseEvent) => void;
}

function PersonalAccessToken(props: PersonalAccessTokenProps) {
  return (
    <PlasmicPersonalAccessToken
      copyState={props.copyState}
      tokenValue={props.tokenValue}
      deleteBtn={{ onClick: props.onDelete }}
      copyLink={{ onClick: props.onCopy }}
    />
  );
}

export default PersonalAccessToken as React.FunctionComponent<PersonalAccessTokenProps>;
