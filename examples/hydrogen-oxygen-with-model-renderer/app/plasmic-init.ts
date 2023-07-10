import {initPlasmicLoader} from '@plasmicapp/loader-react';
import {FeaturedProducts} from '~/components';
export const PLASMIC = initPlasmicLoader({
  projects: [
    {
      id: 'epbgVLcp3YhaE2wswNV8LH', // ID of a project you are using
      token:
        'JkMij4v6NRfS5iEZrAoHiNR02pdXKeUKrH0QGfRLQ0ym2o5qUU89VSYdGYCyhx88sOiUTQtNCREgRc9DM9A', // API token for that project
    },
  ],
  // Fetches the latest revisions, whether or not they were unpublished!
  // Disable for production to ensure you render only published changes.
  preview: true,
});

PLASMIC.registerComponent(FeaturedProducts, {
  name: 'FeaturedProducts',
  props: {
    count: {
      type: 'number',
      defaultValue: 1,
    },
    heading: {
      type: 'string',
      defaultValue: 'Shop Best Sellers',
    },
    sortKey: {
      type: 'string',
      defaultValue: 'ID',
      hidden: () => true,
    },
  },
});
