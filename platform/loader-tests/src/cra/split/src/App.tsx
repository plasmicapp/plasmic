import { BrowserRouter as Router, Route, Switch } from "react-router-dom";
import "./App.css";
import Raw from "./Raw";
import Schedule from "./Schedule";
import Segment from "./Segment";

function App() {
  return (
    <Router>
      <Switch>
        <Route path="/segment" exact render={() => <Segment />} />
        <Route path="/schedule" exact render={() => <Schedule />} />
        <Route render={() => <Raw />} />
      </Switch>
    </Router>
  );
}

export default App;
