import { Type } from "@/wab/shared/model/classes";
import { typeDisplayName } from "@/wab/shared/model/model-util";

export class TypeHelpers {
  _type: Type;

  constructor(_type) {
    this._type = _type;
  }

  disp() {
    return typeDisplayName(this._type);
  }
}
