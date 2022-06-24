import registerComponent, {
    ComponentMeta,
} from "@plasmicapp/host/registerComponent";
import registerGlobalContext from "@plasmicapp/host/registerGlobalContext";
import {
    WordpressCredentialsProvider,
    WordpressCredentialsProviderMeta,
    WordpressFetcher,
    WordpressFetcherMeta,
    WordpressField,
    WordpressFieldMeta,
} from "./wordpress";

export function registerAll(loader?: {
    registerComponent: typeof registerComponent;
    registerGlobalContext: typeof registerGlobalContext;
}) {
    const _registerComponent = <T extends React.ComponentType<any>>(
        Component: T,
        defaultMeta: ComponentMeta<React.ComponentProps<T>>
    ) => {
        if (loader) {
            loader.registerComponent(Component, defaultMeta);
        } else {
            registerComponent(Component, defaultMeta);
        }
    };

    if (loader) {
        loader.registerGlobalContext(
            WordpressCredentialsProvider,
            WordpressCredentialsProviderMeta
        );
    } else {
        registerGlobalContext(
            WordpressCredentialsProvider,
            WordpressCredentialsProviderMeta
        );
    }

    _registerComponent(WordpressFetcher, WordpressFetcherMeta);
    _registerComponent(WordpressField, WordpressFieldMeta);
}

export * from "./wordpress";