export enum TutorialEventsType {
  AddButtonClicked = "add-button-clicked",
  TplInserted = "tpl-inserted",
  PublishButtonClicked = "publish-button-clicked",
  PublishModalButtonClicked = "publish-modal-button-clicked",
  AddWebsiteButtonClicked = "add-website-button-clicked",
  HostingPublished = "hosting-published",
  FinishClicked = "finish-clicked",
}

export interface TutorialEvent {
  type: TutorialEventsType;
  params: any;
}
