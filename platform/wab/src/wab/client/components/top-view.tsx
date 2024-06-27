import { ensure } from "@/wab/shared/common";
import {
  withConsumer,
  withProvider,
} from "@/wab/commons/components/ContextUtil";
import { ScreenDimmer } from "@/wab/commons/components/ScreenDimmer";
import { Spin } from "antd";
import cx from "classnames";
import * as React from "react";
import { ReactNode } from "react";
import { createPortal } from "react-dom";
import { IconContext } from "react-icons";

export class App {
  _view: AppView;
  constructor(_view) {
    this._view = _view;
  }
  setIsDragging(isDragging: boolean) {
    if (isDragging !== this.isDragging()) {
      this._view.setState({ isDragging });
    }
  }
  isDragging() {
    return this._view.state.isDragging;
  }
  async withSpinner<T>(task: Promise<T>): Promise<T> {
    const wasShowingSpinner = this._view.state.showSpinner;
    this._view.setState({ showSpinner: true });
    try {
      return await task;
    } finally {
      this._view.setState({ showSpinner: wasShowingSpinner });
    }
  }
}
type AppViewProps = {
  contents: (app: App) => ReactNode;
};
type AppViewState = {
  app: App;
  isDragging: boolean;
  showSpinner: boolean;
};
export class AppView extends React.Component<AppViewProps, AppViewState> {
  constructor(props) {
    super(props);
    this.state = {
      app: new App(this),
      isDragging: false,
      showSpinner: false,
    };
  }
  render() {
    return (
      <IconContext.Provider value={{ style: { transform: "translateY(16%)" } }}>
        {providesAppContext(this.state.app)(
          <div
            className={cx({
              app: true,
              "app--dragging": this.state.isDragging,
            })}
          >
            {this.props.contents(this.state.app)}
            {this.state.showSpinner &&
              createPortal(
                <ScreenDimmer>
                  <Spin size={"large"} />
                </ScreenDimmer>,
                document.body
              )}
          </div>
        )}
      </IconContext.Provider>
    );
  }
}

export const AppContext = React.createContext<App | undefined>(undefined);
export const withAppContext = withConsumer(AppContext.Consumer, "app");
export const providesAppContext = withProvider(AppContext.Provider);
export const useApp = () =>
  ensure(React.useContext(AppContext), "AppContext must exist");
