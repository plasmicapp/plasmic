import { SliderState } from '@chungwu/react-stately-slider';
import { BaseSliderProps } from '@chungwu/react-types-slider';
import * as React from 'react';

export const SliderContext = React.createContext<
  SliderContextState | undefined
>(undefined);

export interface SliderContextState {
  state: SliderState;
  sliderProps: BaseSliderProps;
  trackRef: React.RefObject<HTMLElement>;
}

export function useSliderContext() {
  const state = React.useContext(SliderContext);
  if (!state) {
    throw new Error('SliderThumb used outside of a Slider');
  }
  return state;
}
