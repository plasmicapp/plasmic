import * as React from "react";
import { mergeProps, NONE } from "./react-utils";

describe("mergeProps", () => {
  it("works for refs", () => {
    const fn1 = jest.fn();
    const ref2: React.MutableRefObject<any> = { current: undefined };
    const merged = mergeProps(
      {
        ref: fn1,
      },
      {},
      {
        ref: ref2,
      }
    );

    merged.ref("OHHAI");
    expect(fn1).toHaveBeenCalledWith("OHHAI");
    expect(ref2.current).toEqual("OHHAI");
  });

  it("works for styles", () => {
    expect(
      mergeProps(
        {
          className: "hi",
          style: {
            display: "block",
            fontWeight: "bold",
          },
        },
        {},
        {},
        {
          className: "no",
          style: {
            display: "flex",
            color: "black",
          },
        }
      )
    ).toEqual({
      className: "hi no",
      style: {
        display: "flex",
        fontWeight: "bold",
        color: "black",
      },
    });
  });

  it("works for event listeners", () => {
    const fn1 = jest.fn();
    const fn2 = jest.fn();
    const fn3 = jest.fn();
    const merged = mergeProps(
      {
        onClick: fn1,
      },
      {},
      {
        onClick: fn2,
        onMouseEnter: fn3,
      }
    );

    merged.onClick("HELLO");
    expect(fn1).toHaveBeenCalledWith("HELLO");
    expect(fn2).toHaveBeenCalledWith("HELLO");
    expect(fn3).toHaveBeenCalledTimes(0);

    merged.onMouseEnter("YUP");
    expect(fn3).toHaveBeenCalledWith("YUP");
  });

  it("works with setting NONE to null", () => {
    expect(
      mergeProps(
        {
          className: "blah",
          onClick: jest.fn(),
          style: NONE,
        },
        {
          style: {
            display: "block",
          },
          className: NONE,
          onClick: NONE,
        }
      )
    ).toEqual({
      className: null,
      onClick: null,
      style: null,
    });
  });
});
