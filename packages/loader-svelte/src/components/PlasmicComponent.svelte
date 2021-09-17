<script>
  import { renderToElement, renderToString } from "@plasmicapp/loader-react";
  import { getContext, onMount } from "svelte";
  import { PLASMIC_CONTEXT } from "../context";

  const isServer = typeof window === "undefined";
  export let component;
  export let componentProps = undefined;

  const context = getContext(PLASMIC_CONTEXT);

  if (!context) {
    throw new Error("<PlasmicComponent /> should be wrapped inside a <PlasmicRootProvider />")
  }

  let root = null;

  // receive values so that reactivity kicks in
  const updateElement = (component, componentProps) => {
    const { loader, prefetchedData, globalVariants } = $context;
    if (root && root instanceof HTMLElement) {
      renderToElement(loader, root, component, {
        prefetchedData,
        componentProps,
        globalVariants,
      });
    }
  };

  const renderHTML = () => {
    const { loader, prefetchedData, globalVariants } = $context;
    return renderToString(loader, { name: component }, { prefetchedData, componentProps, globalVariants });
  };

  onMount(() => {
    updateElement(component, componentProps);
  });

  // update element when there is some change in the context or in the props
  $: $context, updateElement(component, componentProps);
</script>

<div bind:this={root} id={component}>
  {#if isServer}
    {@html renderHTML()}
  {/if}
</div>