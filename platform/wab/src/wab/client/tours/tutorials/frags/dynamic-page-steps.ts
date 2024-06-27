import {
  ADMIN_PANEL_WELCOME_TUTORIAL_STEP,
  changeRightTabKeyStepFunc,
} from "@/wab/client/tours/tutorials/frags/basic-steps";
import {
  TutorialEvent,
  TutorialEventsType,
} from "@/wab/client/tours/tutorials/tutorials-events";
import {
  addDynamicPage,
  addTutorialdbQuery,
  changePagePath,
  ONBOARDING_TUTORIALS_META,
  sleep,
  TUTORIAL_DB_META,
} from "@/wab/client/tours/tutorials/tutorials-helpers";
import { STUDIO_ELEMENTS_TARGETS } from "@/wab/client/tours/tutorials/tutorials-targets";
import {
  OnNextCtx,
  StudioTutorialStep,
} from "@/wab/client/tours/tutorials/tutorials-types";
import { ensure } from "@/wab/shared/common";
import { RightTabKey } from "@/wab/client/studio-ctx/StudioCtx";

export const DYNAMIC_PAGE_STEPS: StudioTutorialStep[] = [
  ADMIN_PANEL_WELCOME_TUTORIAL_STEP,
  {
    name: "open-project-panel",
    target: STUDIO_ELEMENTS_TARGETS.projNavBtn,
    content: "Let's create a new page",
    onNext: async (ctx: OnNextCtx) => {
      ctx.studioCtx.showProjectPanel();
    },
    placement: "bottom",
  },
  {
    name: "create-new-page",
    target: STUDIO_ELEMENTS_TARGETS.projPanelPlusBtn,
    content: "Click here to create a new page",
    waitFor: async () => {
      await sleep(1000);
    },
    onNext: async (ctx: OnNextCtx) => {
      await addDynamicPage(ctx.studioCtx);
    },
    placement: "bottom",
  },
  {
    name: "dynamic-page-switch-to-component-tab",
    content: `**Switch to the Page tab.**`,
    ...changeRightTabKeyStepFunc(RightTabKey.component),
  },
  {
    name: "page-settings",
    target: STUDIO_ELEMENTS_TARGETS.pageSettings,
    content: "Here we can configure the page",
    placement: "left",
  },
  {
    name: "page-settings-url",
    target: STUDIO_ELEMENTS_TARGETS.pageSettingsUrl,
    content:
      "We can change the url here to be dynamic using [value] to indicate a dynamic value",
    onNext: async (ctx: OnNextCtx) => {
      await changePagePath(
        ctx.studioCtx,
        ensure(
          ctx.studioCtx.onboardingTourState.results.dynamicPage,
          "missing onboardingTourState.results.dynamicPage"
        ),
        "/ordersByCountry/[country]"
      );
    },
    placement: "left",
  },
  {
    name: "page-settings-url-params",
    target: STUDIO_ELEMENTS_TARGETS.pageUrlParameters,
    content:
      "Here we can define the parameters that will be passed to the page in studio. This is useful for testing the page in studio",
    placement: "left",
  },
  {
    name: "add-new-query",
    target: STUDIO_ELEMENTS_TARGETS.dataQueriesSection,
    content: "Let's add a new query",
    onNext: async (ctx: OnNextCtx) => {
      await addTutorialdbQuery(
        ctx.studioCtx,
        TUTORIAL_DB_META.northwind.name,
        TUTORIAL_DB_META.northwind.tables.orders,
        ONBOARDING_TUTORIALS_META.northwind.ordersQueryName,
        {
          withFilters: true,
        }
      );
    },
    placement: "left",
  },
  {
    name: "data-query-modal-draft",
    target: STUDIO_ELEMENTS_TARGETS.queryBuilderScope,
    content: "Here we can add filters to the data we want to fetch",
    waitFor: () => sleep(1000),
    placement: "right",
  },
  {
    name: "add-data-query-modal-save",
    content: `**Click Save to save and continue.**`,
    target: STUDIO_ELEMENTS_TARGETS.dataSourceModalSaveBtn,
    placement: "top",
    highlightTarget: STUDIO_ELEMENTS_TARGETS.dataSourceModalSaveBtn,
    shouldAdvance: (event: TutorialEvent) => {
      return event.type === TutorialEventsType.SaveDataSourceQuery;
    },
  },
];
