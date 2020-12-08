import React from 'react';
import * as Components from './.entrypoint';

export const PlasmicLoader = ({ projectId, component }) => {
  const PlasmicComponent = Components[`${component}${projectId}`];
  return <PlasmicComponent />;
};

export default PlasmicLoader;
