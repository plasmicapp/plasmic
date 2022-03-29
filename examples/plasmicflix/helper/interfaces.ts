export interface Movie {
  poster_path: string;
  genre_ids: number[];
  id: number;
  title: string;
  popularity: number;
  vote_average: number;
  release_date: string;
  videoId?: string;
  overview?: string;
  cast?: string[];
  runtime?: string;
  certification?: string;
  trailers?: {
    videoId: string;
    title: string;
  }[];
  similar?: {
    poster_path: string;
    title: string;
    overview: string;
    videoId: string;
  }[];
}

export interface Page {
  onPageChange: (offset: number) => void;
  page: Movie[];
  prevMovie?: Movie;
  nextMovie?: Movie;
  isFirst: boolean;
  isLast: boolean;
}
