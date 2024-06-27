import { AppCtx } from "@/wab/client/app-ctx";
import { NormalLayout } from "@/wab/client/components/normal-layout";
import InitTokenContainer from "@/wab/client/components/pages/InitTokenContainer";
import { useAsyncFnStrict } from "@/wab/client/hooks/useAsyncStrict";
import { ensure } from "@/wab/shared/common";
import React from "react";

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
