import React from "react";
import { ensure } from "../../../common";
import { AppCtx } from "../../app-ctx";
import { useAsyncFnStrict } from "../../hooks/useAsyncStrict";
import { NormalLayout } from "../normal-layout";
import InitTokenContainer from "./InitTokenContainer";

interface InitTokenPageProps {
  appCtx: AppCtx;
  initToken: string;
}

export function InitTokenPage(props: InitTokenPageProps) {
  const ops = ensure(props.appCtx.ops, "ops");

  const [state, fetch] = useAsyncFnStrict(async () => {
    return await ops.emitPersonalApiToken(props.initToken);
  }, [ops]);

  return (
    <NormalLayout appCtx={props.appCtx}>
      <InitTokenContainer
        state={
          state.loading
            ? "loading"
            : state.error
            ? "error"
            : state.value
            ? "done"
            : undefined
        }
        onAuthorizeClick={fetch}
      />
    </NormalLayout>
  );
}
