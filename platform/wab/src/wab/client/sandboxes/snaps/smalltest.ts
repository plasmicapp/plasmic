import { DomSnap } from "@/wab/client/WebImporter";

export const smalltestSnap: DomSnap = {
  baseUrl: "http://localhost",
  html: `<html>
<body>
<div>
<span>Jump</span>
<div><span>Hello</span><span>World</span></div>
<div>Main content</div>
</div>
</body>
</html>`,
  stylesheets: [],
};
