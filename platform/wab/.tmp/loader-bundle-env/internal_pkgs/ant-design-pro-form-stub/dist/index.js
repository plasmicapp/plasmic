var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var src_exports = {};
__export(src_exports, {
  BetaSchemaForm: () => BetaSchemaForm,
  FieldContext: () => FieldContext,
  ProForm: () => ProForm,
  ProFormDependency: () => ProFormDependency,
  ProFormField: () => ProFormField,
  default: () => src_default
});
module.exports = __toCommonJS(src_exports);
var import_react = __toESM(require("react"));
function ProFormField() {
}
function BetaSchemaForm() {
}
function ProForm({ children }) {
  return children;
}
function ProFormDependency() {
}
const FieldContext = import_react.default.createContext(null);
var src_default = ProForm;
