import { Type } from "@/wab/classes";
import { typeDisplayName } from "@/wab/shared/core/model-util";

export class TypeHelpers {
  _type: Type;

  constructor(_type) {
    this._type = _type;
  }

  disp() {
    return typeDisplayName(this._type);
  }
}
