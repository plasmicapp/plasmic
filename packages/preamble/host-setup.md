Host setup
==========

To enable support for functional components in Plasmic Studio, run this before React is loaded:

```js
(function () {
  const win = window,
    hook = "__REACT_DEVTOOLS_GLOBAL_HOOK__",
    vers = "__PlasmicPreambleVersion",
    noop = function () {};
  if (typeof win !== "undefined") {
    if (win.parent !== win) {
      try {
        win[hook] = win.parent[hook];
      } catch (err) {}
    }
    if (!win[hook]) {
      const renderers = new Map();
      win[hook] = {
        supportsFiber: true,
        renderers: renderers,
        inject: function (renderer) {
          renderers.set(renderers.size + 1, renderer);
        },
        onCommitFiberRoot: noop,
        onCommitFiberUnmount: noop,
      };
    }
    if (!win[hook][vers]) {
      win[hook][vers] = "1";
    }
  }
})();
```

Minified:

```js
!function(){const n=window,i="__REACT_DEVTOOLS_GLOBAL_HOOK__",o="__PlasmicPreambleVersion",t=function(){}
if(void 0!==n){if(n.parent!==n)try{n[i]=n.parent[i]}catch(e){}if(!n[i]){const r=new Map
n[i]={supportsFiber:!0,renderers:r,inject:function(n){r.set(r.size+1,n)},onCommitFiberRoot:t,onCommitFiberUnmount:t}}n[i][o]||(n[i][o]="1")}}()
```
