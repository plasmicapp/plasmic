// pages/host.tsx
import { PlasmicCanvasHost } from "@plasmicapp/loader-nextjs";
import Head from "next/head";
import { PLASMIC } from "../init";

function Host() {
  return (
    <div>
      <Head>
        <script
          dangerouslySetInnerHTML={{
            __html: `!function(){const n=window,i="__REACT_DEVTOOLS_GLOBAL_HOOK__",o="__PlasmicPreambleVersion",t=function(){};if(void 0!==n){if(n.parent!==n)try{n[i]=n.parent[i]}catch(e){}if(!n[i]){const r=new Mapn[i]={supportsFiber:!0,renderers:r,inject:function(n){r.set(r.size+1,n)},onCommitFiberRoot:t,onCommitFiberUnmount:t}}n[i][o]||(n[i][o]="1")}}()`,
          }}
        />
      </Head>
      {PLASMIC && <PlasmicCanvasHost />}
    </div>
  );
}

export default Host;
