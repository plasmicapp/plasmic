/** @format */

import Stars from "../components/Stars";

export default function Test() {
  return (
    <div>
      <div style={{ position: "fixed", top: 0 }}>
        <Stars />
      </div>
      <div style={{ margin: "9999px 0", height: 100, background: "red" }}></div>
    </div>
  );
}
