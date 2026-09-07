# Legacy Data Query Migration

Only migrate when asked. Legacy `$queries` run server-side through Plasmic's integration proxy, which applies the integration's credentials, default headers, and role checks. Modern `$q` queries run `plasmic.fetch` from wherever the page renders, so none of that carries over.

1. Read the component's `legacyDataQueries` and `dataQueries`, plus `project.customFunctions`. For a query's runtime types and values, read only `"$queries.<name>"` from its component data context. Inspect `_meta.read.outputSchema` and follow its migration fields; skip a query a modern `dataQueries` entry already replaces.
2. Create the replacement with the project's Fetch custom function. Build `opts.url` from the legacy operation's `baseUrl`, path, and params. Carry over every operation argument and merge `defaultHeaders` with operation headers, with the operation headers winning. For GraphQL, use `POST` and put both `query` and `variables` in the body. Use custom code only when no suitable function exists.
3. Preserve dynamic `{{ }}` expressions instead of copying preview values. Never invent an endpoint, credential, header, or result.
4. Run `createDataQuery` and then `migrateDataQuery`, following their runtime descriptions and schemas for reference and result-shape rewrites. Verify the new `$q` result through a focused data-context read.

For each requested query, report whether it migrated or why it was skipped. Surface migration fields and tool messages exactly as their runtime metadata directs.
