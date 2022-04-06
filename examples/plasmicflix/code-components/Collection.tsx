import {
  PlasmicCanvasContext,
  repeatedElement,
} from "@plasmicapp/loader-nextjs";
import { classNames } from "@plasmicapp/react-web";
import axios from "axios";
import { ReactNode, useContext, useEffect, useState } from "react";
import { MovieContext, PageContext, usePage } from "../helper/contexts";
import { Movie } from "../helper/interfaces";
import { getVideoId, shuffleArray } from "../helper/utils";
import sty from "./CategoryRowWrapper.module.css"; // plasmic-import: Sxo9CpcVLkB/css

export interface MovieGridProps {
  className: string;
  category_id: string;
  children?: ReactNode;
  loading?: ReactNode;
  itemLimit?: number;
}

export function MovieGrid(props: MovieGridProps) {
  const { children, className, loading, category_id, itemLimit } = props;
  const [collection, setCollection] = useState<Movie[]>([]);
  const [loaded, setLoaded] = useState<boolean>(false);
  const items = collection.slice(0, itemLimit);

  useEffect(() => {
    (async () => {
      const collection = await getMovieCollection(category_id);
      setCollection(collection);
      setLoaded(true);
    })();
  }, [loaded]);

  if (!loaded) {
    return <div className={className}>{loading}</div>;
  }

  return (
    <div className={className}>
      {items.map((movie: Movie, i: number) => (
        <MovieContext.Provider value={movie} key={movie.id}>
          {repeatedElement(i === 0, children)}
        </MovieContext.Provider>
      ))}
    </div>
  );
}

export async function getMovieCollection(category_id: string) {
  const response = await axios.get(
    `https://api.themoviedb.org/3/movie/${category_id}?api_key=9beb1634cec80c0b62602a3d1ee9bdf9`
  );
  const data =
    category_id !== "now_playing"
      ? response.data.results
      : shuffleArray(response.data.results);

  const collection = data.slice(0, data.length - (data.length % 6));
  const collectionWithExtraData = collection.map(async (movie: Movie) => {
    let response = await axios.get(
      `https://api.themoviedb.org/3/movie/${movie.id}/videos?api_key=9beb1634cec80c0b62602a3d1ee9bdf9&language=en-US`
    );
    const videoData: any[] = response.data.results.filter(
      (res: any) => res.site === "YouTube"
    );

    response = await axios.get(
      `https://api.themoviedb.org/3/movie/${movie.id}/credits?api_key=9beb1634cec80c0b62602a3d1ee9bdf9`
    );
    const cast: any[] = response.data.cast;

    response = await axios.get(
      `https://api.themoviedb.org/3/movie/${movie.id}?api_key=9beb1634cec80c0b62602a3d1ee9bdf9`
    );
    const movieDetails = response.data;

    response = await axios.get(
      `https://api.themoviedb.org/3/movie/${movie.id}/release_dates?api_key=9beb1634cec80c0b62602a3d1ee9bdf9`
    );
    const movieCertification: any[] = response.data.results;
    const certification = movieCertification.some((v) => v.iso_3166_1 === "US")
      ? movieCertification.find((v) => v.iso_3166_1 === "US").release_dates[0]
          .certification
      : movieCertification[0].release_dates[0].certification;

    response = await axios.get(
      `https://api.themoviedb.org/3/movie/${movie.id}/similar?api_key=9beb1634cec80c0b62602a3d1ee9bdf9`
    );
    const similar: any[] = response.data.results;

    return {
      ...movie,
      videoId: await getVideoId(movie.id),
      cast: cast.slice(0, 4).map((person) => person.name),
      runtime: `${Math.floor(+movieDetails.runtime / 60)}h ${
        +movieDetails.runtime % 60
      }m`,
      certification: (certification == "" ? undefined : certification) ?? "PG",
      trailers: videoData
        .slice(0, 5)
        .map((v) => ({ videoId: v.key, title: v.name })),
      similar: await Promise.all(
        similar.slice(0, 6).map(async (v) => ({
          title: v.title,
          poster_path: v.poster_path,
          overview: v.overview,
        }))
      ),
    };
  });
  return await Promise.all(collectionWithExtraData);
}

export interface CollectionProps {
  category_id: string;
  className: string;
  children: ReactNode;
}

export function Collection(props: CollectionProps) {
  const { category_id, className, children } = props;
  const inEditor = useContext(PlasmicCanvasContext);

  const [collection, setCollection] = useState<Movie[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(inEditor ? 1 : 0);
  const [loaded, setLoaded] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      const collection = await getMovieCollection(category_id);
      setCollection(collection);
      setLoaded(true);
    })();
  }, [loaded]);

  const getX = (pageNumber: number) => (pageNumber - currentPage) * 100;

  if (collection.length > 0) {
    console.log("collection", collection);
    const pages = collection.length / 6;
    const renderedPages: JSX.Element[] = [];
    for (let pageNumber = 0; pageNumber < pages; pageNumber++) {
      const page = (
        <div
          className={classNames(sty.moviePage)}
          style={{
            transform: `translateX(${getX(
              pageNumber
            )}%) translateY(0px) translateZ(0px)`,
          }}
          key={pageNumber}
        >
          {repeatedElement(pageNumber === 1, children)}
        </div>
      );
      renderedPages.push(page);
    }
    return (
      <div className={className}>
        {renderedPages.map((page, i) => (
          <PageContext.Provider
            value={{
              onPageChange: (offset: number) =>
                setCurrentPage(currentPage + offset),
              page: collection.slice(i * 6, i * 6 + 6),
              prevMovie: i > 0 ? collection[i * 6 - 1] : undefined,
              nextMovie: i + 1 !== pages ? collection[i * 6 + 6] : undefined,
              isFirst: i === 0,
              isLast: i + 1 === pages,
            }}
            key={i}
          >
            {page}
          </PageContext.Provider>
        ))}
      </div>
    );
  }
  return <p>Loading</p>;
}

export interface CollectionPageProps {
  children?: any;
  numColumns?: number;
  columnGap?: number;
  className?: string;
  loading?: any;
  testLoading?: boolean;
}
export const CollectionPage = (props: CollectionPageProps) => {
  const pageContext = usePage();
  const {
    children,
    numColumns,
    columnGap,
    className,
    loading,
    testLoading,
  } = props;
  const columns = numColumns ?? 6;
  if (!pageContext || !pageContext.page || testLoading) {
    return loading;
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        columnGap: `${columnGap}px`,
      }}
      className={className}
    >
      {pageContext.page.map((movie: Movie, i: number) => (
        <MovieContext.Provider value={movie} key={movie.id}>
          {repeatedElement(i === 0, children)}
        </MovieContext.Provider>
      ))}
    </div>
  );
};
