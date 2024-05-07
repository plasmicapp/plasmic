import { DefinedIndicator } from "@/wab/client/components/style-controls/DefinedIndicator";
import {
  getLabelForStyleName,
  StyleComponent,
  useStyleComponent,
  withStyleComponent,
  WithStyleContextMenu,
} from "@/wab/client/components/style-controls/StyleComponent";
import { ensure, ensureArray } from "@/wab/common";
import classNames from "classnames";
import { observer } from "mobx-react";
import * as React from "react";

export class StyleWrapper_ extends React.Component<
  {
    styleName: string | string[];
    showDefinedIndicator?: boolean;
    // Must be provided when showDefinedIndicator is true
    sc?: StyleComponent;
    displayStyleName?: string;
    className?: string;
    children?: React.ReactNode;
  },
  {}
> {
  render() {
    const {
      showDefinedIndicator = false,
      sc,
      styleName,
      displayStyleName,
      className,
    } = this.props;
    const styleNames = ensureArray(styleName);
    return (
      <WithStyleContextMenu
        className={`style-wrapper ${className}`}
        styleNames={styleNames}
        displayStyleName={displayStyleName}
        sc={sc || useStyleComponent()}
      >
        {showDefinedIndicator && (
          <div
            className={classNames({
              "style-wrapper__defined-container": true,
            })}
          >
            <DefinedIndicator
              type={ensure(
                sc,
                "must have styleComponent if showing defined indicator"
              ).definedIndicators(...styleNames)}
              label={
                displayStyleName
                  ? getLabelForStyleName(displayStyleName)
                  : styleNames.length === 1
                  ? getLabelForStyleName(styleNames[0])
                  : undefined
              }
            />
          </div>
        )}
        {this.props.children}
      </WithStyleContextMenu>
    );
  }
}

export const StyleWrapper = withStyleComponent(observer(StyleWrapper_));
