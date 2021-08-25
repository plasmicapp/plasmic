import { renderToElement, renderToString } from "@plasmicapp/loader-react";
import { defineComponent, h, inject, ref } from "vue-demi";
import { PlasmicContextValue, PLASMIC_CONTEXT } from "../context";

const isServer = typeof window === "undefined";

export default defineComponent({
  name: "PlasmicComponent",
  props: {
    component: {
      type: String,
      required: true,
    },
    componentProps: {
      type: Object,
    },
  },
  methods: {
    updateElement() {
      const element = this.root;
      if (element && element instanceof HTMLElement) {
        // renderToElement() also works for hydration
        renderToElement(this.context.loader, element, this.$props.component, {
          prefetchedData: this.context.prefetchedData,
          componentProps: this.$props.componentProps,
          globalVariants: this.context.globalVariants,
        });
      }
    },
  },
  setup() {
    const context = inject(PLASMIC_CONTEXT) as PlasmicContextValue | undefined;
    const root = ref<HTMLElement | null>(null);
    if (!context) {
      throw new Error(
        "<PlasmicComponent> should be wrapped inside a <PlasmicRootProvider>"
      );
    }
    return {
      root,
      context,
    };
  },
  watch: {
    component: function () {
      this.updateElement();
    },
    componentProps: function () {
      this.updateElement();
    },
  },
  mounted() {
    this.updateElement();
  },
  render() {
    return h("div", {
      ref: "root",
      ...(isServer && {
        // Generate html if we are doing server-side rendering
        domProps: {
          innerHTML: renderToString(
            this.context.loader,
            { name: this.$props.component },
            {
              prefetchedData: this.context.prefetchedData,
              componentProps: { ...this.$props.componentProps },
              globalVariants: this.context.globalVariants,
            }
          ),
        },
      }),
    });
  },
});
