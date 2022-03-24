import { repeatedElement } from "@plasmicapp/host";
import axios from "axios";
import React, { ReactNode, useEffect, useState } from "react";
import { MovieContext, useMovie, usePlasmicCanvas } from "../helper/contexts";
import defaultMovie from "../helper/default_movie.json";
import { getGenre, getVideoId, imagePath } from "../helper/utils";
import { ReactYoutube } from "./Youtube";

interface MoviePosterProps {
  customStyle: object;
  className: string;
}

export const MoviePoster = (props: MoviePosterProps) => {
  const { customStyle, className } = props;
  const movieContext = useMovie();
  return (
    <img
      style={customStyle}
      src={imagePath(movieContext?.poster_path ?? "")}
      className={className}
    />
  );
};

interface MovieTextInfoProps {
  className: string;
  customStyle: object;
  useDefaultMovie: boolean;
  separator: string;
  info: string;
  maximumLength: number;
  itemsLimit: number;
}

enum MOVIE_INFO_TYPE {
  TITLE = "title",
  RELEASE_YEAR = "release_year",
  RUNTIME = "runtime",
  GENRES = "genres",
  CAST = "cast",
  OVERVIEW = "overview",
  CERTIFICATION = "certification",
}

export const MovieTextInfo = (props: MovieTextInfoProps) => {
  const {
    className,
    customStyle,
    useDefaultMovie,
    separator,
    info,
    maximumLength,
    itemsLimit,
  } = props;
  const movieContext = useMovie();
  const inEditor = usePlasmicCanvas();
  const movie = inEditor && useDefaultMovie ? defaultMovie : movieContext;
  if (!movie) {
    return null;
  }
  const getMovieInfo = (): string[] | undefined => {
    if (info === MOVIE_INFO_TYPE.CAST) {
      return movie.cast;
    } else if (info === MOVIE_INFO_TYPE.GENRES) {
      return movie.genre_ids.map((genre_id: number) => getGenre(genre_id));
    } else if (info === MOVIE_INFO_TYPE.OVERVIEW) {
      return movie.overview ? [movie.overview] : undefined;
    } else if (info === MOVIE_INFO_TYPE.RUNTIME) {
      return movie.runtime ? [movie.runtime] : undefined;
    } else if (info === MOVIE_INFO_TYPE.TITLE) {
      return [movie.title];
    } else if (info === MOVIE_INFO_TYPE.RELEASE_YEAR) {
      return [movie.release_date.substring(0, 4)];
    } else if (info === MOVIE_INFO_TYPE.CERTIFICATION) {
      return movie.certification ? [movie.certification] : undefined;
    }
  };

  const movieInfo = getMovieInfo()
    ?.map((info) => info.substring(0, maximumLength))
    .slice(0, itemsLimit);
  return (
    <div className={className} style={customStyle}>
      {separator ? (
        <span>{movieInfo?.join(separator)}</span>
      ) : (
        movieInfo?.map((cast, i) => <span key={i}>{cast}</span>)
      )}
    </div>
  );
};

export const MovieVideo = ({
  className,
  useDefaultMovie,
  lazyLoading,
  width,
  height,
}: {
  className: string;
  useDefaultMovie: boolean;
  lazyLoading: boolean;
  width: string;
  height: string;
}) => {
  const movieContext = useMovie();
  const inEditor = usePlasmicCanvas();
  const movie = inEditor && useDefaultMovie ? defaultMovie : movieContext;
  if (!movie) {
    return null;
  }

  return (
    <ReactYoutube
      videoId={movie.videoId ?? ""}
      lazyLoading={lazyLoading}
      className={className}
      width={width}
      height={height}
    />
  );
};

interface MovieTrailersProps {
  className: string;
  children: React.ReactNode;
  useDefaultMovie: boolean;
  columns?: number;
  columnGap?: number;
  rowGap?: number;
}

export const MovieTrailers = (props: MovieTrailersProps) => {
  const {
    className,
    children,
    useDefaultMovie,
    columns,
    columnGap,
    rowGap,
  } = props;
  const movieContext = useMovie();
  const inEditor = usePlasmicCanvas();
  const movie = inEditor && useDefaultMovie ? defaultMovie : movieContext;
  if (!movie) {
    return null;
  }

  return (
    <div
      className={className}
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns ?? 1}, 1fr)`,
        columnGap: `${columnGap}px`,
        rowGap: `${rowGap}px`,
      }}
    >
      {movie.trailers?.map((trailer, i) => (
        <MovieContext.Provider
          value={{ ...movie, title: trailer.title, videoId: trailer.videoId }}
        >
          {repeatedElement(i === 0, children)}
        </MovieContext.Provider>
      ))}
    </div>
  );
};

interface MovieSimilarsProps {
  className: string;
  children: React.ReactNode;
  useDefaultMovie: boolean;
  columns?: number;
  columnGap?: number;
  rowGap?: number;
}

export const MovieSimilars = (props: MovieSimilarsProps) => {
  const {
    className,
    children,
    useDefaultMovie,
    columns,
    columnGap,
    rowGap,
  } = props;
  const movieContext = useMovie();
  const inEditor = usePlasmicCanvas();
  const movie = inEditor && useDefaultMovie ? defaultMovie : movieContext;
  if (!movie) {
    return null;
  }

  return (
    <div
      className={className}
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns ?? 1}, 1fr)`,
        columnGap: `${columnGap}px`,
        rowGap: `${rowGap}px`,
      }}
    >
      {movie.similar?.map((similar, i) => (
        <MovieContext.Provider
          value={{
            ...movie,
            title: similar.title,
            videoId: similar.videoId,
            overview: similar.overview,
          }}
        >
          {repeatedElement(i === 0, children)}
        </MovieContext.Provider>
      ))}
    </div>
  );
};

interface FetchMovieProps {
  children: ReactNode;
  className: string;
  id: number;
}

export const FetchMovie = (props: FetchMovieProps) => {
  const { children, className, id } = props;
  const [movie, setMovie] = useState(undefined);

  useEffect(() => {
    (async () => {
      const response = await axios.get(
        `https://api.themoviedb.org/3/movie/${id}?api_key=9beb1634cec80c0b62602a3d1ee9bdf9`
      );
      const videoId = await getVideoId(response.data.id);
      setMovie({
        ...response.data,
        videoId,
      });
    })();
  }, []);

  return (
    <div className={className}>
      <MovieContext.Provider value={movie}>{children}</MovieContext.Provider>
    </div>
  );
};

interface LoadMovieProps {
  children: ReactNode;
  className: string;
  useDefaultMovie: boolean;
}

export const LoadMovie = (props: LoadMovieProps) => {
  const { children, className, useDefaultMovie } = props;
  const movieJson = localStorage.getItem("movie");
  const inEditor = usePlasmicCanvas();
  const movie =
    inEditor && useDefaultMovie
      ? defaultMovie
      : movieJson
      ? JSON.parse(movieJson)
      : undefined;
  if (!movie) {
    return null;
  }
  return (
    <div className={className}>
      <MovieContext.Provider value={movie}>{children}</MovieContext.Provider>
    </div>
  );
};
