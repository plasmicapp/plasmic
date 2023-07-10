import {json, type LoaderArgs} from '@shopify/remix-oxygen';
import {useLoaderData} from '@remix-run/react';
import {
  loadModelData,
  PlasmicModelRenderer,
} from '@plasmicapp/model-renderer-react';
import {PLASMIC} from '~/plasmic-init';

export async function loader({params, context}: LoaderArgs) {
  const repr = await loadModelData({
    componentName: 'Homepage',
    projectId: 'epbgVLcp3YhaE2wswNV8LH',
    projectApiToken:
      'JkMij4v6NRfS5iEZrAoHiNR02pdXKeUKrH0QGfRLQ0ym2o5qUU89VSYdGYCyhx88sOiUTQtNCREgRc9DM9A',
  });

  return json({
    repr,
  });
}

export default function Homepage() {
  const {repr} = useLoaderData<typeof loader>();

  return (
    <PlasmicModelRenderer
      repr={repr}
      loader={PLASMIC}
      componentName={'Homepage'}
      componentProps={{}}
      globalVariants={{experiment: 'override'}}
    />
  );
}
