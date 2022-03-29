# @plasmciapp/query

This is a mini data-fetching library, based on swr, for fetching immutable data. The fetching should be isomorphic so that it can happen both on the client (for rendering in artboards in Plasmic) and on the server (for pre-fetching data in getStaticProps(), etc).