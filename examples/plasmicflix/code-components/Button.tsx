import React, { ReactNode, useRef, useState } from "react";
import {
  MovieContext,
  useMovie,
  usePage,
  usePlasmicCanvas,
} from "../helper/contexts";
import defaultMovie from "../helper/default_movie.json";
import { Modal } from "./Modal";
import { VIDEOID_PARAM } from "./Movie";

interface WatchButtonProps {
  children: ReactNode;
  className: string;
  watchPage: string;
  useDefaultMovie: boolean;
}

export const WatchButton = (props: WatchButtonProps) => {
  const { children, className, watchPage, useDefaultMovie } = props;
  const ref = useRef<HTMLAnchorElement>(null);
  const movieContext = useMovie();
  const inEditor = usePlasmicCanvas();
  const movie = inEditor && useDefaultMovie ? defaultMovie : movieContext;
  if (!movie) {
    return null;
  }

  const url = new URL(watchPage, window.location.origin);
  if (movie.videoId) {
    url.searchParams.append(VIDEOID_PARAM, movie.videoId);
  }

  return (
    <div className={className} onClick={() => ref?.current?.click()}>
      {children}
      <a href={url.href} ref={ref} hidden={true} />
    </div>
  );
};

interface PageChangeButtonProps {
  children: ReactNode;
  className: string;
  type: string;
}
export const PageChangeButton = (props: PageChangeButtonProps) => {
  const { children, className, type } = props;
  const pageContext = usePage();
  const isRightButton = type === "right";

  const offset = isRightButton ? 1 : -1;
  const movie = isRightButton ? pageContext?.nextMovie : pageContext?.prevMovie;

  if (
    (isRightButton && pageContext?.isLast) ||
    (!isRightButton && pageContext?.isFirst)
  ) {
    return null;
  }

  return (
    <MovieContext.Provider value={movie}>
      <div
        className={className}
        onClick={() => pageContext?.onPageChange(offset)}
      >
        {children}
      </div>
    </MovieContext.Provider>
  );
};

interface MoreInfoButtonProps {
  children: ReactNode;
  className: string;
  modal: any;
  isOpen: boolean;
}

export const MoreInfoButton = (props: MoreInfoButtonProps) => {
  const { children, className, modal, isOpen } = props;
  const movieContext = useMovie();
  const [isVisible, setIsVisible] = useState(false);

  if (!movieContext) {
    return null;
  }

  return (
    <>
      <div className={className} onClick={() => setIsVisible(true)}>
        {children}
      </div>
      <Modal
        isVisible={isVisible}
        key={JSON.stringify(isVisible)}
        onClose={() => setIsVisible(false)}
      >
        {modal}
      </Modal>
    </>
  );
};
