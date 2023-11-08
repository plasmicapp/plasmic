<template>
  <PlasmicRootProvider :loader="this.loader">
    <!-- Router renders everything here, including Plasmic pages. -->
    <router-view />
  </PlasmicRootProvider>
</template>

<script>
import { PlasmicRootProvider } from "@plasmicapp/loader-vue";
import { PLASMIC } from "./plasmic-init";

export default {
  name: "App",
  components: {
    PlasmicRootProvider,
  },
  computed: {
    loader() {
      return PLASMIC;
    },
  },
};
</script>
