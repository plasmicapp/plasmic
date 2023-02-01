import { FileRoutes, Router, ShopifyProvider } from "@shopify/hydrogen";
import renderHydrogen from "@shopify/hydrogen/entry-server";
import { Suspense } from "react";

function App() {
  return (
    <Suspense fallback={null}>
      <ShopifyProvider>
        <Router>
          <FileRoutes />
        </Router>
      </ShopifyProvider>
    </Suspense>
  );
}

export default renderHydrogen(App);
