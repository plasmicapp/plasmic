/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from 'react';
import { classNames } from '@plasmicapp/react-web';

export type RadioTrueIconProps = React.ComponentProps<'svg'> & {
  title?: string;
};

export function RadioTrueIcon(props: RadioTrueIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={'http://www.w3.org/2000/svg'}
      stroke={'currentColor'}
      fill={'currentColor'}
      strokeWidth={0}
      viewBox={'0 0 512 512'}
      height={'1em'}
      width={'1em'}
      className={classNames('plasmic-default__svg', className)}
      style={style}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <path
        d={
          'M256 152c-57.2 0-104 46.8-104 104s46.8 104 104 104 104-46.8 104-104-46.8-104-104-104zm0-104C141.601 48 48 141.601 48 256s93.601 208 208 208 208-93.601 208-208S370.399 48 256 48zm0 374.4c-91.518 0-166.4-74.883-166.4-166.4S164.482 89.6 256 89.6 422.4 164.482 422.4 256 347.518 422.4 256 422.4z'
        }
        stroke={'none'}
      ></path>
    </svg>
  );
}

export default RadioTrueIcon;
/* prettier-ignore-end */
