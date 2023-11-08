import React from "react";

interface BadgeProps {
  name: string;
  className: string;
}

export default function Badge({ name = "friend", className }: BadgeProps) {
  const [clicked, setClicked] = React.useState(0);
  const message = React.useMemo(
    () =>
      // Don't use "'" (in "haven't") to make it easier to check HTML response
      clicked === 0 ? `You havent clicked` : `You clicked ${clicked} times`,
    [clicked]
  );

  return (
    <div className={className} data-test-id="badge">
      Hello {name}!
      <br />
      <br />
      <button onClick={() => setClicked(clicked + 1)}>Click here</button>
      <br />
      {message}
    </div>
  );
}
