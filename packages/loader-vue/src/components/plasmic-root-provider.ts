import {
  ComponentRenderData,
  GlobalVariantSpec,
  PlasmicComponentLoader,
} from "@plasmicapp/loader-react";
import { defineComponent, h, PropType, provide } from "vue-demi";
import { PLASMIC_CONTEXT } from "../context";

export default defineComponent({
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
  setup(props, { slots }) {
    provide(PLASMIC_CONTEXT, {
      loader: props.loader,
      globalVariants: props.globalVariants,
      prefetchedData: props.prefetchedData,
    });
    return () => h("div", (slots as any).default());
  },
});
