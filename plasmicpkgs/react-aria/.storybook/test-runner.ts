import type { TestRunnerConfig } from "@storybook/test-runner";

const config: TestRunnerConfig = {
  async preVisit(page) {
    // Native pointer events during layout changes can cancel userEvent's simulated hover.
    // Keep the browser's pointer outside the viewport while play functions run.
    await page.mouse.move(-1, -1);
  },
};

export default config;
