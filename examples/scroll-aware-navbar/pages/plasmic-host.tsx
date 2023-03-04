
import * as React from 'react';
import Script from 'next/script';
import { PlasmicCanvasHost } from '@plasmicapp/loader-nextjs';
import { PLASMIC } from '../plasmic-init';

export default function PlasmicHost() {
  return PLASMIC && <PlasmicCanvasHost />;
}
    