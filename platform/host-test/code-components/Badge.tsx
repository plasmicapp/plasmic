import React from "react";

interface BadgeProps {
  containerClassName: string;
  name: string;
  year: any;
  onClicksChange?: (clicks: number) => void;
}

export function Badge({
  containerClassName,
  name,
  year = 2022,
  onClicksChange,
}: BadgeProps) {
  if (typeof year !== "number") {
    throw new Error(`Unexpected year ${year}`);
  }
  // Test state and effects
  const [clicked, setClicked] = React.useState(0);
  const message = React.useMemo(
    () =>
      clicked === 0 ? `You haven't clicked` : `You clicked ${clicked} times`,
    [clicked]
  );
  return (
    <div
      className={containerClassName}
      style={{
        background: "rgb(200, 200, 255)",
      }}
      data-test-id="badge-component"
    >
      Hello {name}! Happy {year}!
      <br />
      <br />
      <button
        onClick={() => {
          const newClicked = clicked + 1;
          setClicked(newClicked);
          onClicksChange?.(newClicked);
        }}
      >
        Click here
      </button>
      <br />
      {message}
      <br />
      {`State value: ${clicked}`}
    </div>
  );
}
