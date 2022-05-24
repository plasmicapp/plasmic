import {
  DELIMITER,
  getActiveSplits,
  getMiddlewareResponse,
  MiddlewareOptions,
} from '../variation';
import { EXPERIMENT_SPLIT, EXTERNAL_SPLIT, SEGMENT_SPLIT } from './data';

const components = [
  {
    isPage: true,
    path: '/home',
  },
  {
    isPage: true,
    path: '/about',
  },
  {
    isPage: false,
  },
];
const activeSplits = [SEGMENT_SPLIT, EXPERIMENT_SPLIT, EXTERNAL_SPLIT];

jest.mock('@plasmicapp/loader-fetcher', () => {
  class PlasmicModulesFetcher {
    constructor() {}
    fetchAllData = () => {
      return {
        components,
        activeSplits,
      };
    };
  }
  return {
    PlasmicModulesFetcher,
  };
});

const opts = {} as MiddlewareOptions;

describe('getActiveSplits', () => {
  it('to filter pages and get activeSplits', async () => {
    expect(await getActiveSplits(opts)).toMatchObject({
      paths: expect.arrayContaining(['/home', '/about']),
      splits: expect.arrayContaining([
        expect.objectContaining(SEGMENT_SPLIT),
        expect.objectContaining(EXPERIMENT_SPLIT),
        expect.objectContaining(EXTERNAL_SPLIT),
      ]),
    });
  });
});

describe('getMiddlewareResponse', () => {
  beforeEach(() => {
    jest.spyOn(global.Math, 'random').mockReturnValue(0.5);
  });
  afterEach(() => {
    jest.spyOn(global.Math, 'random').mockRestore();
  });
  it('should get variation and new cookie values', async () => {
    expect(
      await getMiddlewareResponse({
        opts,
        cookies: {},
        traits: {},
        url: 'plasmic.app',
      })
    ).toMatchObject({
      url: `plasmic.app/${DELIMITER}seg.split-0=slice-0${DELIMITER}exp.split-1=slice-0${DELIMITER}exp.split-2=slice-0`,
      cookies: expect.arrayContaining([
        {
          key: 'plasmic:exp.split-1',
          value: 'slice-0',
        },
        {
          key: 'plasmic:exp.split-2',
          value: 'slice-0',
        },
      ]),
    });
  });
});
