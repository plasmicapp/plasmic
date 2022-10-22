import { ChakraProvider, ChakraProviderProps } from "@chakra-ui/react";
import { GlobalContextMeta } from "@plasmicapp/host";
import registerGlobalContext from "@plasmicapp/host/registerGlobalContext";
import { Registerable } from "./registerable";
import { getComponentNameAndImportMeta } from "./utils";

export const chakraProviderMeta: GlobalContextMeta<ChakraProviderProps> = {
  ...getComponentNameAndImportMeta("ChakraProvider"),
  props: {
    theme: "object",
  },
};

export function registerChakraProvider(
  loader?: Registerable,
  customChakraProviderMeta?: GlobalContextMeta<ChakraProviderProps>
) {
  const doRegisterComponent: typeof registerGlobalContext = (...args) =>
    loader
      ? loader.registerGlobalContext(...args)
      : registerGlobalContext(...args);
  doRegisterComponent(
    ChakraProvider,
    customChakraProviderMeta ?? chakraProviderMeta
  );
}
