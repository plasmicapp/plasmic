/** @format */

import { PlasmicComponent } from "@plasmicapp/loader-vue";
import { createRouter, createWebHistory } from "vue-router"; // vue-router 4.x
import { PLASMIC } from "../plasmic-init";

// Create a catch-all route for your specific routing framework
const CatchAllPage = {
  data() {
    return {
      loading: true,
      pageData: null,
    };
  },
  created() {
    this.fetchData();
  },
  render() {
    if (this.loading) {
      return <div>Loading...</div>;
    }
    if (!this.pageData) {
      return <div>Not found</div>;
    }
    return <PlasmicComponent component={location.pathname} />;
  },
  methods: {
    async fetchData() {
      const pageData = await PLASMIC.maybeFetchComponentData(location.pathname);
      this.pageData = pageData;
      this.loading = false;
    },
  },
};
const routes = [
  /* ... Your other routes here ... */
  // Add this route to catch all pages
  {
    path: "/:pathMatch(.*)*",
    component: CatchAllPage,
  },
];
const router = createRouter({
  history: createWebHistory(),
  routes,
});
export default router;
