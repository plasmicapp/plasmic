import {
    AuthMiddlewareOptions,
    ClientBuilder,
    HttpMiddlewareOptions,
  } from '@commercetools/sdk-client-v2'
import { CommercetoolsCredentials } from './provider'

const initCommercetoolsSDKClient = (creds: CommercetoolsCredentials) => {
  const scopes = [`manage_project:${creds.projectKey}`]
  
  // Configure authMiddlewareOptions
  const authMiddlewareOptions: AuthMiddlewareOptions = {
    host: `https://auth.${creds.region}.commercetools.com`,
    projectKey: creds.clientSecret,
    credentials: {
      clientId: creds.clientId,
      clientSecret: creds.clientSecret,
    },
    scopes,
    fetch,
  }
  
  // Configure httpMiddlewareOptions
  const httpMiddlewareOptions: HttpMiddlewareOptions = {
    host: `https://api.${creds.region}.commercetools.com`,
    fetch,
  }
  
  // Export the ClientBuilder
  return new ClientBuilder()
    .withProjectKey(creds.projectKey)
    .withClientCredentialsFlow(authMiddlewareOptions)
    .withHttpMiddleware(httpMiddlewareOptions)
    .build()
}
  
  export default initCommercetoolsSDKClient