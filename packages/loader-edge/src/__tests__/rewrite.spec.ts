import { rewriteWithoutVariation, rewriteWithVariation } from '../index';
import { DELIMITER } from '../variation';

describe('rewriteWithVariation', () => {
  it('should expand variation in url', () => {
    expect(
      rewriteWithVariation('plasmic.app', {
        'seg.split-0': 'slice-0',
      })
    ).toEqual(`plasmic.app/${DELIMITER}seg.split-0=slice-0`);

    expect(
      rewriteWithVariation('docs.plasmic.app/learn', {
        'exp.split-1': 'slice-1',
      })
    ).toEqual(`docs.plasmic.app/learn/${DELIMITER}exp.split-1=slice-1`);

    expect(
      rewriteWithVariation('https://plasmic.app', {
        'exp.split-2': 'slice-0',
        'ext.EXTSPLIT': 'EXTSLICE0',
      })
    ).toEqual(`https://plasmic.app/${DELIMITER}exp.split-2=slice-0`);

    expect(
      rewriteWithVariation('https://docs.plasmic.app/', {
        'ext.EXTSPLIT': 'EXTSLICE1',
        'exp.split-2': 'slice-1',
        'exp.split-1': 'slice-0',
        'seg.split-0': 'slice-1',
      })
    ).toEqual(
      // should be ordered by split id
      `https://docs.plasmic.app/${DELIMITER}seg.split-0=slice-1${DELIMITER}exp.split-1=slice-0${DELIMITER}exp.split-2=slice-1`
    );

    expect(
      rewriteWithVariation('sort', {
        'seg.E': '5',
        'seg.A': '1',
        'exp.C': '3',
        'seg.D': '4',
        'exp.B': '2',
      })
    ).toEqual(
      `sort/${DELIMITER}seg.A=1${DELIMITER}exp.B=2${DELIMITER}exp.C=3${DELIMITER}seg.D=4${DELIMITER}seg.E=5`
    );
  });
});

describe('rewriteWithoutVariation', () => {
  it('should recover variation from url', () => {
    expect(
      rewriteWithoutVariation(`plasmic.app/${DELIMITER}seg.split-0=slice-0`)
    ).toMatchObject({
      path: 'plasmic.app/',
      variation: {
        'seg.split-0': 'slice-0',
      },
    });

    expect(
      rewriteWithoutVariation(
        `docs.plasmic.app/learn/${DELIMITER}exp.split-1=slice-1`
      )
    ).toMatchObject({
      path: 'docs.plasmic.app/learn/',
      variation: {
        'exp.split-1': 'slice-1',
      },
    });

    expect(
      rewriteWithoutVariation(
        `https://plasmic.app/${DELIMITER}exp.split-2=slice-0`
      )
    ).toMatchObject({
      path: 'https://plasmic.app/',
      variation: {
        'exp.split-2': 'slice-0',
      },
    });

    expect(
      rewriteWithoutVariation(
        `https://docs.plasmic.app/${DELIMITER}seg.split-0=slice-1${DELIMITER}exp.split-1=slice-0${DELIMITER}exp.split-2=slice-1`
      )
    ).toMatchObject({
      path: 'https://docs.plasmic.app/',
      variation: {
        'exp.split-2': 'slice-1',
        'exp.split-1': 'slice-0',
        'seg.split-0': 'slice-1',
      },
    });
  });
});
