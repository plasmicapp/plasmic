import {
  PlasmicClipboardData,
  PLASMIC_CLIPBOARD_FORMAT,
} from "@/wab/client/clipboard/common";

export abstract class WritableClipboard {
  static fromDataTransfer(dataTransfer: DataTransfer) {
    return new DataTransferWritableClipboard(dataTransfer);
  }

  abstract setData(data: PlasmicClipboardData);
}

class DataTransferWritableClipboard extends WritableClipboard {
  constructor(private readonly dataTransfer: DataTransfer) {
    super();
  }

  setData(data: PlasmicClipboardData) {
    this.dataTransfer.setData(PLASMIC_CLIPBOARD_FORMAT, JSON.stringify(data));
  }
}
