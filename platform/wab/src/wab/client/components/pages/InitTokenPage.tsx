import { AppCtx } from "@/wab/client/app-ctx";
import { NormalLayout } from "@/wab/client/components/normal-layout";
import { useAsyncFnStrict } from "@/wab/client/hooks/useAsyncStrict";
import { ensure } from "@/wab/common";
import React from "react";
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
