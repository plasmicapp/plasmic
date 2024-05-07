import { RightTabKey } from "@/wab/client/studio-ctx/StudioCtx";
import { changeRightTabKeyStepFunc } from "@/wab/client/tours/tutorials/frags/basic-steps";
import {
  TutorialEvent,
  TutorialEventsType,
} from "@/wab/client/tours/tutorials/tutorials-events";
import {
  addTutorialdbQuery,
  ONBOARDING_TUTORIALS_META,
  sleep,
  TUTORIAL_DB_META,
} from "@/wab/client/tours/tutorials/tutorials-helpers";
import { STUDIO_ELEMENTS_TARGETS } from "@/wab/client/tours/tutorials/tutorials-targets";
import {
  OnNextCtx,
  StudioTutorialStep,
  TutorialStepFunctionality,
} from "@/wab/client/tours/tutorials/tutorials-types";

const QUERY_ADD_STEP_FUNC: TutorialStepFunctionality<OnNextCtx> = {
  target: STUDIO_ELEMENTS_TARGETS.dataQueriesSection,
  placement: "left",
  highlightTarget: STUDIO_ELEMENTS_TARGETS.dataQueryAddBtn,
  triggers: [TutorialEventsType.AddComponentDataQuery],
  shouldAdvance: (event: TutorialEvent) => {
    return event.type === TutorialEventsType.AddComponentDataQuery;
  },
  onNext: async (ctx: OnNextCtx) => {
    await addTutorialdbQuery(
      ctx.studioCtx,
      TUTORIAL_DB_META.northwind.name,
      TUTORIAL_DB_META.northwind.tables.customers,
      ONBOARDING_TUTORIALS_META.northwind.customersQueryName
    );
  },
};

export const ADD_QUERY_STEPS: StudioTutorialStep[] = [
  {
    name: "data-query-switch-component-tab",
    content: `
You now have a table! But it's empty.

Let's get some data.

**Switch to the "Page Data" tab.**`,
    ...changeRightTabKeyStepFunc(RightTabKey.component),
  },
  {
    name: "data-tab",
    target: "#sidebar-page-meta",
    placement: "left",
    nextButtonText: "Next",
    content: `
The page data tab contains settings for the page, such as the URL and SEO metadata.

It's also where you can manage _data queries_, which let you fetch data from databases and APIs.`,
  },
  {
    name: "data-query-add",
    content: `
**Add a data query.**`,
    ...QUERY_ADD_STEP_FUNC,
  },
  {
    name: "data-query-modal-draft",
    content: `
For this tutorial, we’ve already set you up with an example customer database.

But you can connect to your own data sources and APIs.

This query is set to **fetch rows** from the **customers** table, without any filters.
This gets us _all_ our customer data.`,
    waitFor: async () => {
      await sleep(2500); // Higher wait time to compensate not waiting for mount state
      // await waitElementToBeVisible(
      //   STUDIO_ELEMENTS_TARGETS.dataSourceModalAnimatedMountState
      // );
    },
    nextButtonText: "Next",
    target: STUDIO_ELEMENTS_TARGETS.dataSourceModalDraftSection,
    placement: "right",
    highlightTarget: STUDIO_ELEMENTS_TARGETS.dataSourceModalDraftSection,
  },
  {
    name: "data-query-modal-preview",
    content: `
Now check out the right side. It's a _live_ preview of the data!`,
    nextButtonText: "Next",
    target: STUDIO_ELEMENTS_TARGETS.dataSourceModalPreviewSection,
    placement: "left",
    highlightTarget: STUDIO_ELEMENTS_TARGETS.dataSourceModalPreviewSection,
  },
  {
    name: "data-query-modal-save",
    content: `**Save your query**, and we'll move on to populating our table.`,
    target: STUDIO_ELEMENTS_TARGETS.dataSourceModalSaveBtn,
    placement: "top",
    highlightTarget: STUDIO_ELEMENTS_TARGETS.dataSourceModalSaveBtn,
    shouldAdvance: (event: TutorialEvent) => {
      return event.type === TutorialEventsType.SaveDataSourceQuery;
    },
    onNext: () => sleep(1000), // wait for modal animation
  },
];
