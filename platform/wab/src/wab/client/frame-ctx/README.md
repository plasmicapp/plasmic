# frame-ctx

## Protocol

Roughly...

1. Top frame renders
    ```tsx
   const browserHistory = createBrowserHistory();
    <Shell history={browserHistory}>
      <TopFrameCtxProvider>
        <StudioFrame />
      </TopFrameCtxProvider>
    </Shell>
    ```
2. Top frame listens for PLASMIC_HOST_REGISTERED message
3. Host frame renders
    ```tsx
   const memoryHistory = createMemtoryHistory();
    <HostFrameCtxProvider history={memoryHistory}>
      <Shell history={memoryHistory}>
        <StudioInitializer />
      </Shell>
    </HostFrameCtxProvider>
    ```
4. Host frame sends PLASMIC_HOST_REGISTERED message
5. Top frame receives PLASMIC_HOST_REGISTER message, exposes API to host frame
6. Host frame calls `registerLocationListener` with a callback
   to update its memory history based on the top frame's real browser history
7. Top frame calls the callback with the initial location
8. Host frame API ready, exposes API to top frame
