import dot from "dot";
dot.templateSettings.strip = false;
(dot as any).log = false;

const templates = (dot as any).process({ path: __dirname });

export default templates;
