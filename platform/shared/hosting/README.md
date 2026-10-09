# @plasmic-shared/hosting

Private, dependency-free hosting types and helpers.

The package exports `src/index.ts` directly, without a build step.

Node-only revalidation credentials are available from `src/revalidation.ts`;
do not re-export them from the browser/edge entry point.
