export enum TutorialEventsType {
  AddButtonClicked = "add-button-clicked",
  TplInserted = "tpl-inserted",
  RightTabSwitched = "right-tab-switched",
  AddComponentDataQuery = "add-component-data-query",
  SaveDataSourceQuery = "save-data-source-query",
  ElementFocused = "element-focused",
  PublishButtonClicked = "publish-button-clicked",
  TurnedFormToSimplified = "turned-form-to-simplified",
  ArrayPropEditorAddItem = "array-prop-editor-add-item",
  ClosedPropEditor = "closed-prop-editor",
  AddedInteraction = "add-interaction",
  SelectedHandler = "selected-handler",
  PickedDataSourceOption = "picked-data-source-option",
  ConfigureDataOperation = "configure-data-operation",
  PublishModalButtonClicked = "publish-modal-button-clicked",
  AddWebsiteButtonClicked = "add-website-button-clicked",
  HostingPublished = "hosting-published",
  FinishClicked = "finish-clicked",
}

export interface TutorialEvent {
  type: TutorialEventsType;
  params: any;
}
