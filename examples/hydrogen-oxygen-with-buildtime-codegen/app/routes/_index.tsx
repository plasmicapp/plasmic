import Homepage from '~/_plasmic/Homepage';
import {extractPlasmicQueryData} from '@plasmicapp/react-web/lib/prepass';
import {PlasmicQueryDataProvider} from '@plasmicapp/react-web/lib/query';
import {json} from '@shopify/remix-oxygen';
import {useLoaderData} from '@remix-run/react';

export const loader = async () => {
  const cache = await extractPlasmicQueryData(<Homepage />);
  console.log('CACHE', cache);
  return json({cache});
};

export default function Page() {
  const data = useLoaderData<typeof loader>();

  return (
    <PlasmicQueryDataProvider prefetchedCache={data.cache}>
      <Homepage />
    </PlasmicQueryDataProvider>
  );
}
