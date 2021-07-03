import { renderToElement, renderToString } from "@plasmicapp/loader-react";
import Vue, { VueConstructor } from "vue";
import { PlasmicContextValue, PLASMIC_CONTEXT } from "../context";

const isServer = typeof window === "undefined";

export default (Vue as VueConstructor<
  Vue & {
    context: PlasmicContextValue;
    updateElement: () => void;
  }
>).extend({
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
  inject: {
    context: PLASMIC_CONTEXT,
  },
  methods: {
    updateElement() {
      const element = this.$refs["root"];
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
  mounted() {
    this.updateElement();
  },
  watch: {
    component: function () {
      this.updateElement();
    },
    componentProps: function () {
      this.updateElement();
    },
  },
  render(h) {
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
