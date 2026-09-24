import { useStickToBottom } from "@/wab/client/hooks/useStickToBottom";
import type { Meta, StoryObj } from "@storybook/react";
import * as React from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";

const SCROLLER_HEIGHT = 200;
const MESSAGE_HEIGHT = 40;

/** A chat log that follows new messages, with controls for the play tests. */
function ChatLog({ initialMessageCount }: { initialMessageCount: number }) {
  const [messageCount, setMessageCount] = React.useState(initialMessageCount);
  const [scroller, setScroller] = React.useState<HTMLDivElement | null>(null);
  const [content, setContent] = React.useState<HTMLDivElement | null>(null);
  const { isStuck, stick } = useStickToBottom(scroller, content);
  return (
    <div style={{ width: 300 }}>
      <div
        ref={setScroller}
        data-testid="scroller"
        style={{
          height: SCROLLER_HEIGHT,
          overflowY: "auto",
          border: "1px solid gray",
        }}
      >
        <div ref={setContent} data-testid="content">
          {Array.from({ length: messageCount }, (_, i) => (
            <div key={i} style={{ height: MESSAGE_HEIGHT }}>
              Message {i + 1}
            </div>
          ))}
        </div>
      </div>
      <output>{isStuck ? "Following" : "Not following"}</output>
      <button onClick={() => setMessageCount((count) => count + 1)}>
        Add message
      </button>
      <button onClick={() => setMessageCount(0)}>Clear</button>
      <button onClick={() => stick(true)}>Follow</button>
      <button onClick={() => stick(false)}>Stop following</button>
    </div>
  );
}

export default {
  component: ChatLog,
  args: {
    initialMessageCount: 20,
  },
} as Meta<typeof ChatLog>;

type Story = StoryObj<typeof ChatLog>;

function bottomOf(scroller: HTMLElement) {
  return scroller.scrollHeight - scroller.clientHeight;
}

/** Waits for the scroller to settle at the bottom. */
async function expectAtBottom(scroller: HTMLElement) {
  await waitFor(() =>
    expect(scroller.scrollTop).toBeCloseTo(bottomOf(scroller), 0),
  );
}

async function expectFollowing(
  canvas: ReturnType<typeof within>,
  following: boolean,
) {
  await waitFor(() =>
    expect(canvas.getByRole("status")).toHaveTextContent(
      following ? /^Following$/ : /^Not following$/,
    ),
  );
}

/** Scrolls like a user would, so the browser fires a scroll event. */
async function scrollTo(scroller: HTMLElement, top: number) {
  scroller.scrollTop = top;
  await waitFor(() => expect(scroller.scrollTop).toBeCloseTo(top, 0));
}

export const StartsAtBottom: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const scroller = canvas.getByTestId("scroller");
    await expect(bottomOf(scroller)).toBeGreaterThan(0);
    await expectAtBottom(scroller);
    await expectFollowing(canvas, true);
  },
};

export const FollowsNewMessages: Story = {
  args: { initialMessageCount: 0 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const scroller = canvas.getByTestId("scroller");
    for (let i = 0; i < 10; i++) {
      await userEvent.click(canvas.getByText("Add message"));
      await expectAtBottom(scroller);
      await expectFollowing(canvas, true);
    }
    await expect(scroller.scrollTop).toBeGreaterThan(0);
  },
};

export const StopsFollowingWhenScrolledUp: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const scroller = canvas.getByTestId("scroller");
    await expectAtBottom(scroller);

    await scrollTo(scroller, 0);
    await expectFollowing(canvas, false);

    await userEvent.click(canvas.getByText("Add message"));
    await expectFollowing(canvas, false);
    await expect(scroller.scrollTop).toBe(0);
  },
};

export const ResumesFollowingWhenScrolledBackDown: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const scroller = canvas.getByTestId("scroller");
    await expectAtBottom(scroller);

    await scrollTo(scroller, 0);
    await expectFollowing(canvas, false);

    await scrollTo(scroller, bottomOf(scroller));
    await expectFollowing(canvas, true);

    await userEvent.click(canvas.getByText("Add message"));
    await expectAtBottom(scroller);
  },
};

export const StaysFollowingWhileEverythingFits: Story = {
  args: { initialMessageCount: 1 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const scroller = canvas.getByTestId("scroller");
    await expectFollowing(canvas, true);
    await expect(bottomOf(scroller)).toBe(0);

    await userEvent.click(canvas.getByText("Add message"));
    await expectFollowing(canvas, true);
    await expectAtBottom(scroller);
  },
};

export const ResumesFollowingWhenCleared: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const scroller = canvas.getByTestId("scroller");
    await expectAtBottom(scroller);

    await scrollTo(scroller, 0);
    await expectFollowing(canvas, false);

    await userEvent.click(canvas.getByText("Clear"));
    await expectFollowing(canvas, true);

    for (let i = 0; i < 10; i++) {
      await userEvent.click(canvas.getByText("Add message"));
    }
    await expectAtBottom(scroller);
    await expect(scroller.scrollTop).toBeGreaterThan(0);
  },
};

export const StopFollowingLeavesTheScrollerAlone: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const scroller = canvas.getByTestId("scroller");
    await expectAtBottom(scroller);
    const scrollTopBefore = scroller.scrollTop;

    await userEvent.click(canvas.getByText("Stop following"));
    await expectFollowing(canvas, false);
    await expect(scroller.scrollTop).toBe(scrollTopBefore);

    await userEvent.click(canvas.getByText("Add message"));
    await expectFollowing(canvas, false);
    await expect(scroller.scrollTop).toBe(scrollTopBefore);
  },
};

export const FollowScrollsToTheBottom: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const scroller = canvas.getByTestId("scroller");
    await expectAtBottom(scroller);

    await scrollTo(scroller, 0);
    await expectFollowing(canvas, false);

    await userEvent.click(canvas.getByText("Follow"));
    await expectAtBottom(scroller);
    await expectFollowing(canvas, true);

    await userEvent.click(canvas.getByText("Add message"));
    await expectAtBottom(scroller);
  },
};
