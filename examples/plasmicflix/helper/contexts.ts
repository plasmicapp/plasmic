import { PlasmicCanvasContext } from "@plasmicapp/loader-nextjs";
import React, { useContext } from "react";
import { Movie, Page } from "./interfaces";

export const PageContext = React.createContext<Page | undefined>(undefined);
export function usePage() {
  return useContext(PageContext);
}

export const MovieContext = React.createContext<Movie | undefined>(undefined);
export function useMovie() {
  return useContext(MovieContext);
}

export function usePlasmicCanvas() {
  return useContext(PlasmicCanvasContext);
}
