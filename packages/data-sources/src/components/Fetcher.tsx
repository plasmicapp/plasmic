import { DataProvider } from '@plasmicapp/host';
import React from 'react';
import { DataOp } from '../executor';
import { usePlasmicDataOp } from '../hooks/usePlasmicDataOp';

export function Fetcher(props: {
  dataOp?: DataOp;
  name?: string;
  children?: React.ReactNode;
}) {
  const { dataOp, children, name } = props;
  const { data, error } = usePlasmicDataOp(dataOp);
  return (
    <DataProvider name={name ?? 'data'} data={data}>
      {error || data?.error ? (
        <div>Error: {error?.toString() || data?.error?.message}</div>
      ) : (
        children
      )}
    </DataProvider>
  );
}
