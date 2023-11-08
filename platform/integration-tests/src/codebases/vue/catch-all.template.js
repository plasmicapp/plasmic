import { PlasmicComponent } from "@plasmicapp/loader-vue";
import Vue from "vue";
import VueRouter from "vue-router";
import { PLASMIC } from "./plasmic-init";

Vue.use(VueRouter);

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
    path: "*",
    component: CatchAllPage,
  },
];

// Your usual routing.
const router = new VueRouter({
  mode: "history",
  base: process.env.BASE_URL,
  routes,
});

export default router;
