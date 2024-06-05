import { Api } from "@/wab/client/api";
import { PromisifyMethods } from "@/wab/commons/promisify-methods";
import { svgoProcess } from "@/wab/server/svgo";
import { mock } from "jest-mock-extended";

export function fakePromisifiedApi() {
  const fakeApi = mock<PromisifyMethods<Api>>();
  fakeApi.getPkgByProjectId.mockImplementation(async (projectId) => {
    return {};
  });
  fakeApi.processSvg.mockImplementation(async (data) => {
    return svgoProcess(data.svgXml);
  });

  const storage: { [key: string]: string } = {};
  fakeApi.addStorageItem.mockImplementation(async (key, value) => {
    storage[key] = value;
  });
  fakeApi.getStorageItem.mockImplementation(async (key) => {
    return storage[key] ?? null;
  });
  fakeApi.removeStorageItem.mockImplementation(async (key) => {
    delete storage[key];
  });

  return fakeApi;
}
