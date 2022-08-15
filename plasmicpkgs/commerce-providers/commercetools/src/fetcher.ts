import { Fetcher } from '@plasmicpkgs/commerce'
import { CommercetoolsCredentials } from './provider'
import { createApiBuilderFromCtpClient } from '@commercetools/platform-sdk'
import initCommercetoolsSDKClient from './client'

export const getFetcher: 
  (creds: CommercetoolsCredentials) => Fetcher =
  (creds) => {
    const client = initCommercetoolsSDKClient(creds);
    const apiRoot = createApiBuilderFromCtpClient(client).withProjectKey({
      projectKey: creds.projectKey!,
    })
    return async ({
      method, variables, query, body
    }) => {
      let queryBuilder: any = apiRoot;
      if (query) {
        queryBuilder = queryBuilder[query]();
      }        
      if (variables?.id) {
        queryBuilder = queryBuilder.withId({ ID: variables.id });
      }
      if (variables?.search) {
        queryBuilder = queryBuilder.search();
      }
      return await queryBuilder[method!]({
        body,
        queryArgs: {
          expand: variables?.expand,
          limit: variables?.limit,
          ...(variables?.sort ? { sort: variables.sort } : {}),
          ...(variables?.search ? variables.search : {}),
          ...(variables?.filters ? { filter: variables.filters } : {}),
          ...(variables?.where ? { where: variables.where } : {})
        },
      })
      .execute()
    }
}
