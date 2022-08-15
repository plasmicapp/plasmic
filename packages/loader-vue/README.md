# @plasmicapp/loader-vue

This is the SDK for using the Plasmic visual builder with Vue codebases.

To get started, see the quickstart for Vue:

https://docs.plasmic.app/learn/vue-quickstart

Works with Vue 2._ and 3._.

Some oddities:

- We're using rollup instead of vue-cli-service, because I couldn't figure out how to get vue-cli-service to build a bundle that doesn't already include its dependencies (specifically, having trouble with isomorphic-unfetch).
- We're using `rollup-plugin-vue` version `5.*`, instead of "latest" `6.*`, as 6 only works with vue v3+. See [this bug](https://github.com/vuejs/rollup-plugin-vue/issues/363)
- We're using .ts and not .vue files, because `rollup-plugin-vue` and `rollup-plugin-typescript2` don't play well together. See [this bug](https://github.com/ezolenko/rollup-plugin-typescript2/issues/129).
