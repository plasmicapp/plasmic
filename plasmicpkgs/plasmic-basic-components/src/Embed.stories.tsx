import { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor } from "@storybook/test";
import { delay, http, HttpResponse } from "msw";
import React, { useEffect } from "react";
import ReactDOMClient from "react-dom/client";
import ReactDOMServer from "react-dom/server";
import { Embed } from "./Embed";

export default {
  title: "Embed HTML",
  component: Embed,
  args: {
    code: `<style>.foo { font-size: 14px; }</style>
<button class="foo">click me</button>
<script>document.querySelector('.foo').onclick = (e) => { e.target.style = 'font-size: 20px;'; console.log('clicked', e) }</script>`,
  },
  render: (args) => {
    const [_, setRender] = React.useState(0);
    const [code, setCode] = React.useState(args.code);
    return (
      <>
        <div style={{ border: "1px solid black", padding: "8px" }}>
          <Embed code={code} />
        </div>
        <button onClick={() => setRender((prev) => prev + 1)}>
          Re-render parent
        </button>
        <button onClick={() => setCode((prev) => prev + " ")}>
          Change code prop
        </button>
      </>
    );
  },
} satisfies Meta<typeof Embed>;

type Story = StoryObj<typeof Embed>;

export const HtmlCssJs: Story = {
  name: "HTML / CSS / JS",
  play: async ({ canvas, step }) => {
    const button = canvas.getByText("click me");

    await step(
      "Expect HTML/CSS to render a button with a font-size style",
      () => {
        expect(button).toHaveStyle("font-size: 14px");
      }
    );

    await step("Expect JS to change the font-size", async () => {
      await userEvent.click(button);
      expect(button).toHaveStyle("font-size: 20px");
    });

    await step(
      "Expect button to have same font-size on parent re-render",
      async () => {
        await userEvent.click(canvas.getByText("Re-render parent"));
        expect(button).toHaveStyle("font-size: 20px");
      }
    );

    await step(
      "Expect button to revert to original font-size on code prop change",
      async () => {
        await userEvent.click(canvas.getByText("Change code prop"));
        expect(button).not.toBeVisible(); // the original button is unmounted
        expect(canvas.getByText("click me")).toHaveStyle("font-size: 14px");
      }
    );
  },
};

export const HtmlCssJsSsr: Story = {
  name: "HTML / CSS / JS (SSR)",
  render: (args) => {
    const ref = React.useRef<HTMLDivElement | null>(null);
    useEffect(() => {
      if (ref.current) {
        simulateSsr(ref.current, <Embed code={args.code} />);
      }
    }, []);
    return (
      <>
        <div ref={ref} style={{ border: "1px solid black", padding: "8px" }} />
        <span>
          Note: This story only works the first time it is loaded. Refreshes of
          the story don't load scripts properly because we pollute the global
          window with `addIdentifierScript`.
        </span>
      </>
    );
  },
  play: async ({ canvas, step }) => {
    const button = canvas.getByText("click me");

    await step(
      "Expect HTML/CSS to render a button with a font-size style",
      () => {
        expect(button).toHaveStyle("font-size: 14px");
      }
    );

    await step("Expect JS to change the font-size", async () => {
      await userEvent.click(button);
      expect(button).toHaveStyle("font-size: 20px");
    });
  },
};

export const Iframe: Story = {
  name: "iframe",
  args: {
    code: `<div data-testid="count">0</div>
<iframe
  data-testid="iframe"
  src="https://example.com"
  height="250px"
  width="400px"
  onload="document.querySelector('[data-testid=count]').textContent = +document.querySelector('[data-testid=count]').textContent + 1;"
></iframe>`,
  },
  play: async ({ canvas, step }) => {
    await step("Expect iframe to load", async ({ canvas }) => {
      expect(canvas.getByTestId("count")).toHaveTextContent("0");
      await waitFor(() =>
        expect(canvas.getByTestId("count")).toHaveTextContent("1")
      );
    });

    await step(
      "Expect iframe not to be reloaded on parent re-render",
      async () => {
        await userEvent.click(canvas.getByText("Re-render parent"));
        await delay(150);
        expect(canvas.getByTestId("count")).toHaveTextContent("1");
      }
    );

    await step("Expect iframe to be reloaded on code prop change", async () => {
      await userEvent.click(canvas.getByText("Change code prop"));
      // Sometimes https://example.com loads too fast...
      // expect(canvas.getByTestId("count")).toHaveTextContent("0");
      await waitFor(() => {
        expect(canvas.getByTestId("count")).toHaveTextContent("1");
      });
    });
  },
};

function makeStatusAndScript(i: number) {
  return `<div data-testid="status${i}">initial</div>
<script>document.querySelector("[data-testid=status${i}]").textContent = "loading";</script>
<script src="https://example.com/script${i}.js"></script>`;
}

function makeScriptResolver(i: number, delayMs: number) {
  return http.get(`https://example.com/script${i}.js`, async () => {
    await delay(delayMs);
    return HttpResponse.text(
      `document.querySelector("[data-testid=status${i}]").textContent = "done";
document.querySelector("[data-testid=count]").textContent = +document.querySelector("[data-testid=count]").textContent + 1;`
    );
  });
}

export const ScriptsLoadedSequentially: Story = {
  args: {
    code: `<div data-testid="count">0</div>
${makeStatusAndScript(1)}
${makeStatusAndScript(2)}
${makeStatusAndScript(3)}`,
  },
  parameters: {
    msw: {
      handlers: [
        makeScriptResolver(1, 400),
        makeScriptResolver(2, 50),
        makeScriptResolver(3, 300),
      ],
    },
  },
  play: async ({ canvas, step }) => {
    await step(
      "Expect script1 to be done and script2 to start loading",
      async () => {
        expect(canvas.getByTestId("count")).toHaveTextContent("0");
        expect(canvas.getByTestId("status1")).toHaveTextContent("loading");
        expect(canvas.getByTestId("status2")).toHaveTextContent("initial");
        expect(canvas.getByTestId("status3")).toHaveTextContent("initial");
        await waitFor(() => {
          expect(canvas.getByTestId("count")).toHaveTextContent("1");
          expect(canvas.getByTestId("status1")).toHaveTextContent("done");
          expect(canvas.getByTestId("status2")).toHaveTextContent("loading");
          expect(canvas.getByTestId("status3")).toHaveTextContent("initial");
        });
      }
    );

    await step(
      "Expect no changes on parent re-render in the middle of script loading",
      async () => {
        await userEvent.click(canvas.getByText("Re-render parent"));
        expect(canvas.getByTestId("count")).toHaveTextContent("1");
        expect(canvas.getByTestId("status1")).toHaveTextContent("done");
        expect(canvas.getByTestId("status2")).toHaveTextContent("loading");
        expect(canvas.getByTestId("status3")).toHaveTextContent("initial");
      }
    );

    await step(
      "Expect script2 to be done and script3 to start loading",
      async () => {
        await waitFor(() => {
          expect(canvas.getByTestId("count")).toHaveTextContent("2");
          expect(canvas.getByTestId("status1")).toHaveTextContent("done");
          expect(canvas.getByTestId("status2")).toHaveTextContent("done");
          expect(canvas.getByTestId("status3")).toHaveTextContent("loading");
        });
      }
    );

    await step("Expect script3 to be done", async () => {
      await waitFor(() => {
        expect(canvas.getByTestId("count")).toHaveTextContent("3");
        expect(canvas.getByTestId("status1")).toHaveTextContent("done");
        expect(canvas.getByTestId("status2")).toHaveTextContent("done");
        expect(canvas.getByTestId("status3")).toHaveTextContent("done");
      });
    });

    await step("Expect no changes on parent re-render, again", async () => {
      await userEvent.click(canvas.getByText("Re-render parent"));
      expect(canvas.getByTestId("count")).toHaveTextContent("3");
      expect(canvas.getByTestId("status1")).toHaveTextContent("done");
      expect(canvas.getByTestId("status2")).toHaveTextContent("done");
      expect(canvas.getByTestId("status3")).toHaveTextContent("done");
    });

    await step(
      "Expect scripts to be reloaded on code prop change",
      async () => {
        await userEvent.click(canvas.getByText("Change code prop"));
        expect(canvas.getByTestId("count")).toHaveTextContent("0");
        expect(canvas.getByTestId("status1")).toHaveTextContent("loading");
        expect(canvas.getByTestId("status2")).toHaveTextContent("initial");
        expect(canvas.getByTestId("status3")).toHaveTextContent("initial");
        await waitFor(() => {
          expect(canvas.getByTestId("count")).toHaveTextContent("3");
          expect(canvas.getByTestId("status1")).toHaveTextContent("done");
          expect(canvas.getByTestId("status2")).toHaveTextContent("done");
          expect(canvas.getByTestId("status3")).toHaveTextContent("done");
        });
      }
    );
  },
};

function simulateSsr(
  root: HTMLElement,
  reactElement: React.ReactElement
): void {
  // Server render to string and set in root
  root.innerHTML = ReactDOMServer.renderToString(reactElement);

  // Client hydrate root
  ReactDOMClient.hydrateRoot(root, reactElement);
}
