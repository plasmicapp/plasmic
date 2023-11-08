import React from "react";

interface Credentials {
  token: string;
}

const CredentialsContext = React.createContext<Credentials | null>(null);

export function FetcherCredentialsProvider(
  props: Credentials & { children?: React.ReactNode }
) {
  const { token } = props;
  return (
    <CredentialsContext.Provider value={{ token }}>
      {props.children}
    </CredentialsContext.Provider>
  );
}

export function Fetcher(props: { children?: React.ReactNode }) {
  const creds = React.useContext(CredentialsContext)!;
  return (
    <>
      <div>Token: {creds.token}</div>
      {props.children}
    </>
  );
}
