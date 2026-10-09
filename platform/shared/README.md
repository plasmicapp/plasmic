# Shared platform libraries

Each `platform/shared/<library>` directory is an independent private package
named `@plasmic-shared/<library>`.

Export TypeScript from `src/` directly. In `observability`, colocate unit tests
with the implementation in `src/` using the `.test.ts` suffix.

The platform workspace discovers `shared/*`. Apps in that workspace use
`workspace:*`, and apps with an independent install root use a relative `file:`
dependency and maintain their own lockfile.

When adding dependencies to a shared library, ensure its consumers'
production installs and images include those dependencies too. Update consumer
CI path filters when adding a library.
