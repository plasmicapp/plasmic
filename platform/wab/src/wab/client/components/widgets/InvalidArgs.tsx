import { getCustomFunctionDisplayName } from "@/wab/client/components/modals/customFunctionModals";
import { Icon } from "@/wab/client/components/widgets/Icon";
import WarningIcon from "@/wab/client/plasmic/plasmic_kit_icons/icons/PlasmicIcon__WarningTriangleSvg";
import { cx } from "@/wab/shared/common";
import {
  InvalidArg,
  getInvalidArgErrorMessage,
} from "@/wab/shared/core/invalid-arg";
import { CustomFunction } from "@/wab/shared/model/classes";
import * as React from "react";

/**
 * Amber warning icon + label, matching the per-field prop-validation warning
 * (see `.invalid-arg-warning` in main.sass).
 */
export const InvalidArgsBadge = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(function InvalidArgsBadge({ className, children, ...rest }, ref) {
  return (
    <div
      ref={ref}
      {...rest}
      className={cx("flex flex-vcenter gap-sm invalid-arg-warning", className)}
    >
      <Icon icon={WarningIcon} />
      {children}
    </div>
  );
});

export function UnregisteredFunctionMessage(props: { func: CustomFunction }) {
  const { func } = props;
  return (
    <>
      Function "{getCustomFunctionDisplayName(func)}" is no longer registered.
      Select another function or restore the registration.
    </>
  );
}

/**
 * {@link InvalidArgsList} prefixed with a count-aware intro sentence, for
 * surfaces that show the list standalone (server query preview/tooltips).
 */
export function InvalidArgsSummary(props: { invalidArgs: InvalidArg[] }) {
  return (
    <>
      {props.invalidArgs.length === 1
        ? "This parameter has an invalid value:"
        : "These parameters have invalid values:"}
      <InvalidArgsList invalidArgs={props.invalidArgs} />
    </>
  );
}

/**
 * Lists each invalid arg as "Label: error", using the same error text as the
 * per-field prop-validation warning ({@link getInvalidArgErrorMessage}), so
 * every surface that summarizes invalid args (canvas overlay, server query
 * preview/tooltips) describes them the same way.
 */
export function InvalidArgsList(props: { invalidArgs: InvalidArg[] }) {
  return (
    <ul>
      {props.invalidArgs.map((invalidArg, i) => (
        <li key={i}>
          {invalidArg.displayLabel}: {getInvalidArgErrorMessage(invalidArg)}
        </li>
      ))}
    </ul>
  );
}
