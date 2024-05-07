import fs from "fs";
import glob from "glob";
import path from "path";
import _ from "underscore";
const UStr = (_.str = require("underscore.string"));
_.mixin(UStr.exports());

export {};

const lines: string[] = [];
for (const filepath of [
  ...glob.sync("./export/*.svg"),
  ...glob.sync("./export/icons/*.svg"),
]) {
  let contents = fs.readFileSync(filepath, { encoding: "utf8" });
  const rootId = /<g id="([-\w]+)"/.exec(
    _.last(contents.split("</defs>"))!
  )![1];
  const dirpath = filepath.indexOf("/icons/") >= 0 ? "icons/" : "";
  const viewBox = /viewBox="([^"]+)"/.exec(contents)![1];
  contents = contents.replace(
    /\b(fill|stroke)="#[a-f0-9]{6}"/gi,
    '$1="currentcolor"'
  );
  contents = contents.replace(/\b(fill-opacity)="[^"]*"/gi, "");
  const filename = path.basename(filepath);
  fs.writeFileSync(`./public/static/img/${dirpath}${filename}`, contents);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [match, width, height] = Array.from(
    /<svg width="(\d+)px" height="(\d+)px"/.exec(contents)!
  );
  const componentName = _.str.capitalize(_.str.camelize(filename.slice(0, -4)));
  lines.push(`\
export class ${componentName} extends React.Component<SvgIconProps> {
  render() {
    const {scale = 1, style, ...otherProps} = this.props;
    return <svg
      {...otherProps}
      data-icon-name={${JSON.stringify(componentName)}}
      style={{
        width: ${width} * scale,
        height: ${height} * scale,
        ...style || {}
      }}
      viewBox={${JSON.stringify(viewBox)}}
      dangerouslySetInnerHTML={{
        __html: '<use xlink:href="/static/img/${dirpath}${filename}#${rootId}"/>'
      }}
    />;
  }
}\
`);
}
fs.writeFileSync(
  "./src/wab/gen/svg-icons.tsx",
  `\
import * as React from "react";

type SvgProps = JSX.IntrinsicElements["svg"];
interface SvgIconProps extends SvgProps {
  scale?: number;
}

${lines.join("\n\n")}\
`
);
