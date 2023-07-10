import {PlasmicCanvasHost} from '@plasmicapp/loader-react';
import {PLASMIC} from '../plasmic-init';

export default function Page() {
  console.log(PLASMIC);
  return <PlasmicCanvasHost />;
}
