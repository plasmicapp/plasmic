# Testing

Use `yarn run-cpa` to run CPA with predefined sets of args.
This will update the files in cpa-out, allowing us to review any diffs.

# Debugging

Example invocation:

    CPA_DEBUG_CHDIR=/path/to/target/project \
        node --inspect -r ts-node/register src/index.ts

- `CPA_DEBUG_CHDIR`: First cd's into the target directory (which typically has its own node_modules etc., so it's tricky to try to run the source from there).
