import React from "react";

type GenericErrorBoundaryProps = React.PropsWithChildren<{
  className?: string;
}>;

interface GenericErrorBoundaryState {
  error?: any;
  justErrored: boolean;
}

export class GenericErrorBoundary extends React.Component<
  GenericErrorBoundaryProps,
  GenericErrorBoundaryState
> {
  rootRef = React.createRef<HTMLElement>();

  constructor(props: GenericErrorBoundaryProps) {
    super(props);
    // We use justErrored to make sure that after the setState to display an
    // error, the next update we clear the error state and retry rendering.
    this.state = { justErrored: false };
  }
  static getDerivedStateFromProps(
    _props: GenericErrorBoundaryProps,
    state: GenericErrorBoundaryState
  ): GenericErrorBoundaryState | null {
    if (state.error != null) {
      if (state.justErrored) {
        return { justErrored: false };
      } else {
        return { error: null, justErrored: false };
      }
    }
    return null;
  }

  componentDidCatch(error: any) {
    return this.setState({ error, justErrored: true });
  }

  render() {
    const { children } = this.props;
    if (this.state.error != null) {
      const message =
        typeof this.state.error.message === "string"
          ? this.state.error.message
          : "";
      return React.createElement(
        "div",
        { className: this.props.className },
        "Error" + (message ? ": " + message : "")
      );
    } else {
      return children;
    }
  }
}
