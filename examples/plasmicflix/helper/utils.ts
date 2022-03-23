import axios from "axios";

export const imagePath = (posterPath: string) =>
  `https://image.tmdb.org/t/p/original${posterPath}`;

export const shuffleArray = (unshuffled: any[]) =>
  unshuffled
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);

export const getVideoId = async (movieId: number) => {
  let response = await axios.get(
    `https://api.themoviedb.org/3/movie/${movieId}/videos?api_key=9beb1634cec80c0b62602a3d1ee9bdf9&language=en-US`
  );
  const videoData: any[] = response.data.results.filter(
    (res: any) => res.site === "YouTube"
  );
  const idx = videoData.findIndex((res) =>
    (res.name as string).toLowerCase().includes("trailer")
  );
  return videoData.length > 0 ? videoData[idx == -1 ? 0 : idx].key : "";
};

const genres = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Science Fiction",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western",
};

export function getGenre(id: number) {
  return (genres as any)[id] ?? "";
}
