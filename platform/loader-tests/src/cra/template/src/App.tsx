import {
  PlasmicComponent,
  PlasmicRootProvider,
} from "@plasmicapp/loader-react";
import { BrowserRouter as Router, Route, Switch } from "react-router-dom";
import "./App.css";
import { PLASMIC } from "./init-plasmic";

function App() {
  return (
    <PlasmicRootProvider loader={PLASMIC}>
      <Router>
        <Switch>
          <Route
            path="/components"
            exact
            render={() => (
              <>
                <h2>Fake Footer</h2>
                <PlasmicComponent component={"Footer"} />
                <h2>Fake PriceTier</h2>
                <PlasmicComponent
                  component={"PriceTier"}
                  componentProps={{
                    title: "Fake Tier",
                    price: "$100",
                    valueProps: (
                      <div>
                        I am so <strong>VERY COOL</strong>
                      </div>
                    ),
                    children: <em>Do it now!!!</em>,
                  }}
                />
                <h2>Fake testimonials</h2>
                <PlasmicComponent component="Testimonials" />
              </>
            )}
          />
          {
            // Catch-all route
          }
          <Route
            render={({ location }) => (
              <PlasmicComponent component={location.pathname} />
            )}
          />
        </Switch>
      </Router>
    </PlasmicRootProvider>
  );
}

export default App;
