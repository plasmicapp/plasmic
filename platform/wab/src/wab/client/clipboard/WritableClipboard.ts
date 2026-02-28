import {
  PLASMIC_CLIPBOARD_FORMAT,
  PlasmicClipboardData,
  writeClipboardPlasmicData,
} from "@/wab/client/clipboard/common";

export abstract class WritableClipboard {
  static fromDataTransfer(dataTransfer: DataTransfer) {
    return new DataTransferWritableClipboard(dataTransfer);
  }

  static fromNavigatorClipboard() {
    return new NavigatorWritableClipboard();
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

class NavigatorWritableClipboard extends WritableClipboard {
  setData(data: PlasmicClipboardData) {
    writeClipboardPlasmicData(JSON.stringify(data));
  }
}
