import { notification } from "antd";
import { createElement } from "react";
import { render } from "react-dom";
import { mutate } from "swr";
import { RevalidatePlasmicHostingResponse } from "../../../../shared/ApiSchema";
import { apiKey } from "../../../api";
import { U } from "../../../cli-routes";
import { SimpleConfetti } from "../../../components/SimpleConfetti";
import { topFrameTourSignals } from "../../../components/TopFrame/TopFrameChrome";
import { TutorialEventsType } from "../tutorials-events";
import { sleep } from "../tutorials-helpers";
import {
  STUDIO_ELEMENTS_TARGETS,
  TOPFRAME_ELEMENTS_TARGETS,
} from "../tutorials-targets";
import {
  OnNextCtx,
  StudioTutorialStep,
  TopFrameTutorialStep,
} from "../tutorials-types";

export const TOPFRAME_PUBLISH_STEPS: TopFrameTutorialStep[] = [
  {
    name: "publish-modal",
    target: TOPFRAME_ELEMENTS_TARGETS.publishFlowDialogRoot,
    content: `
Here you can both configure what happens on publish.

Plasmic lets you deploy your app anywhere, even into existing app codebases.
`,
    nextButtonText: "Next",
    placement: "left",
  },
  {
    name: "publish-modal-version-section",
    target: TOPFRAME_ELEMENTS_TARGETS.publishFlowDialogVersionSection,
    content: `Publishing also saves a version snapshot of the project that you can later roll back to.

Below, you can optionally add notes about what you're about to release.`,
    nextButtonText: "Next",
    placement: "left",
  },
  {
    name: "publish-modal-add-website",
    target: TOPFRAME_ELEMENTS_TARGETS.publishFlowDialogAddWebsitePanel,
    content: `
The easiest way to publish is by using Plasmic's built-in hosting provider.

**Publish to Plasmic hosting.**`,
    highlightTarget: TOPFRAME_ELEMENTS_TARGETS.publishFlowDialogAddWebsitePanel,
    shouldAdvance: (event) => {
      return event.type === TutorialEventsType.AddWebsiteButtonClicked;
    },
    onNext: async (ctx) => {
      await ctx.appCtx.api.setSubdomainForProject(ctx.domain, ctx.projectId);
      await mutate(apiKey("getDomainsForProject", ctx.projectId));
    },
    placement: "left",
  },
  {
    name: "plasmic-hosting-subsection",
    target: TOPFRAME_ELEMENTS_TARGETS.plasmicHostingSubsection,
    content: `
Plasmic Hosting lets you deploy to a custom domain for free, or to a default *.plasmic.run domain.

Here we've configured the app to deploy to {APP_DOMAIN}.
`,
    nextButtonText: "Next",
    placement: "left",
  },
  {
    name: "publish-modal-publish-btn",
    target: TOPFRAME_ELEMENTS_TARGETS.publishFlowDialogPublishBtn,
    highlightTarget: TOPFRAME_ELEMENTS_TARGETS.publishFlowDialogPublishBtn,
    content: "**Publish the app!**",
    shouldAdvance: (event) => {
      return event.type === TutorialEventsType.PublishModalButtonClicked;
    },
    onNext: async (ctx) => {
      // TODO: figure it out how manually triggering the click is going to affect the next steps
      const btn = document.querySelector(
        TOPFRAME_ELEMENTS_TARGETS.publishFlowDialogPublishBtn
      ) as HTMLButtonElement;
      btn.click();
    },
    placement: "left",
  },
  {
    name: "publishing-project",
    target: TOPFRAME_ELEMENTS_TARGETS.publishFlowDialogRoot,
    shouldAdvance: (event) => {
      if (event.type !== TutorialEventsType.HostingPublished) {
        return false;
      }

      const response = event.params
        .response as RevalidatePlasmicHostingResponse;
      if (response.successes.length === 0) {
        notification.error({
          message: "Error publishing the app. Please try again later.",
        });
        return false;
      }

      const node = document.createElement("div");
      document.body.appendChild(node);
      render(createElement(SimpleConfetti), node);

      return true;
    },
    content: "Hang tight! Your app is being published....",
    placement: "left",
  },
  {
    name: "published-project",
    target: TOPFRAME_ELEMENTS_TARGETS.publishFlowDialogRoot,
    onNext: async (ctx) => {
      await ctx.topFrameApi.setShowPublishModal(false);
      await ctx.topFrameApi.setKeepPublishModalOpen(false);
    },
    content: `
## You did it! 🎉

The app is now live at <https://{APP_DOMAIN}>.

You've saved the day and shipped a complete customer management app.
This covered:

- Adding and configuring components
- Querying a database
- Updating records with forms

The Customer Operations team can now do a better job keeping customers happy! 🚀
`,
    nextButtonText: "On to final step",
    placement: "left",
  },
  {
    name: "outro",
    target: "body",
    placement: "center",
    content: `
## Tutorial: complete! 🙌

This just scratches the surface of what you can do with Plasmic.

Now you can head back to the dashboard and create your first real app or explore more examples.

Or, feel free to stay and keep playing around in this tutorial project. Experiment! Break things! 🧑‍🔬

And don't forget to:

- [Join our Slack Community](https://plasmic.app/slack) 💬
- [Learn more in the docs](https://docs.plasmic.app) 📖
`,
    shouldAdvance: (event) => {
      return event.type === TutorialEventsType.FinishClicked;
    },
    secondaryButtonText: "Stay and play",
    onSecondary: async () => {
      topFrameTourSignals?.dispatch({
        type: TutorialEventsType.FinishClicked,
      });
    },
    onNext: async () => {
      location.href = U.dashboard({});
    },
    nextButtonText: "Exit to dashboard",
  },
];

export const TRIGGER_PUBLISH_MODAL_STEP: StudioTutorialStep = {
  name: "open-publish-modal",
  target: STUDIO_ELEMENTS_TARGETS.topBarPublishBtn,
  highlightTarget: STUDIO_ELEMENTS_TARGETS.topBarPublishBtn,
  content: `
## Part 4: Publishing 🚀

Let's **publish the app** so the Customer Operations team can start using it!`,
  shouldAdvance: (event) => {
    return event.type === TutorialEventsType.PublishButtonClicked;
  },
  onNext: async (ctx: OnNextCtx) => {
    await ctx.topFrameApi.setShowPublishModal(true);
    await ctx.topFrameApi.setKeepPublishModalOpen(true);
    await sleep(250);
    await ctx.topFrameApi.setOnboardingTour({
      tour: "publish",
      run: true,
      stepIndex: 0,
    });
  },
  placement: "bottom",
};
