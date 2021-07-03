import {
  ComponentRenderData,
  GlobalVariantSpec,
  PlasmicComponentLoader,
} from "@plasmicapp/loader-react";
import Vue, { PropType } from "vue";
import { PLASMIC_CONTEXT } from "../context";

export default Vue.extend({
  name: "PlasmicRootProvider",
  props: {
    loader: {
      type: Object as PropType<PlasmicComponentLoader>,
      required: true,
    },
    globalVariants: {
      type: Array as PropType<GlobalVariantSpec[]>,
    },
    prefetchedData: {
      type: Object as PropType<ComponentRenderData>,
    },
  },
  provide() {
    return {
      [PLASMIC_CONTEXT]: {
        loader: this.$props.loader,
        globalVariants: this.$props.globalVariants,
        prefetchedData: this.$props.prefetchedData,
      },
    };
  },
  render(h) {
    return h("div", this.$slots.default);
  },
});
