<script>
  import { setContext } from "svelte";
  import { writable } from "svelte/store"
  import { PLASMIC_CONTEXT } from "../context";

  export let loader;
  export let globalVariants = undefined;
  export let prefetchedData = undefined;

  // We use svelte store to allow the children to be updated when the context
  // changes
  const ctx = writable({
    loader,
    globalVariants,
    prefetchedData,
  });

  setContext(PLASMIC_CONTEXT, ctx);

  const updateContext = (loader, globalVariants, prefetchedData) => {
    $ctx = {
      loader,
      globalVariants,
      prefetchedData,
    };
  };

  // update context when there is some change in the props
  $: updateContext(loader, globalVariants, prefetchedData);
</script>

<div>
  <slot></slot>
</div>
