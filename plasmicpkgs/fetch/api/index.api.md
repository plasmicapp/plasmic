## API Report File for "@plasmicpkgs/fetch"

> Do not edit this file. It is a report generated by [API Extractor](https://api-extractor.com/).

```ts

import registerFunction from '@plasmicapp/host/registerFunction';

// @public (undocumented)
function fetch_2(url: string, method: HTTPMethod, headers: Record<string, string>, body?: string | object): Promise<{
    statusCode: number;
    headers: {
        [k: string]: string;
    };
    body: any;
}>;
export { fetch_2 as fetch }

// @public (undocumented)
export function registerFetch(loader?: Registerable): void;

// (No @packageDocumentation comment for this package)

```
