import React, { ReactNode, useRef, useState } from "react";
import {
  MovieContext,
  useMovie,
  usePage,
  usePlasmicCanvas,
} from "../helper/contexts";
import defaultMovie from "../helper/default_movie.json";
import { Modal } from "./Modal";

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

  localStorage.setItem("movie", JSON.stringify(movie));
  return (
    <div className={className} onClick={() => ref?.current?.click()}>
      {children}
      <a href={watchPage} ref={ref} hidden={true} />
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
  const movie = isRightButton ? pageContext.nextMovie : pageContext.prevMovie;

  if (
    (isRightButton && pageContext.isLast) ||
    (!isRightButton && pageContext.isFirst)
  ) {
    return null;
  }

  return (
    <MovieContext.Provider value={movie}>
      <div
        className={className}
        onClick={() => pageContext.onPageChange(offset)}
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
