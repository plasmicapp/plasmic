import React, { ReactNode, useEffect, useRef, useState } from "react";
import Youtube from "react-youtube";
import { useMovie } from "../helper/contexts";

export interface ReactYotubeProps {
  children?: ReactNode;
  videoId: string;
  width?: string;
  height?: string;
  className?: string;
  controls?: boolean;
  lazyLoading?: boolean;
}

export function ReactYoutube(props: ReactYotubeProps) {
  const ref = useRef(null);
  const [isIntersecting, setIntersecting] = useState(false);
  const [wasHovered, setWasHovered] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setIntersecting(entry.isIntersecting);
    });
    if (ref.current) {
      observer.observe(ref.current);
    }
    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isIntersecting) {
      setWasHovered(true);
    }
  }, [isIntersecting]);

  return (
    <div ref={ref}>
      {(props.lazyLoading === false || wasHovered) && (
        <Youtube
          videoId={props.videoId}
          className={props.className}
          opts={{
            playerVars: {
              autoplay: 1,
              controls: (props.controls ? 1 : 0) ?? 0,
              showinfo: 0,
              mute: 1,
              start: 10,
              disablekb: 1,
              fs: 0,
              modestbranding: 1,
              loop: 1,
            },
            width: props.width ?? "100%",
            height: props.height ?? "100%",
          }}
          onPause={(event) => event.target.playVideo()}
        />
      )}
    </div>
  );
}

interface YoutubeThumbnailProps {
  videoId?: string;
  className?: string;
  customStyle?: object;
}

export const YoutubeThumbnail = (props: YoutubeThumbnailProps) => {
  const { videoId, className, customStyle } = props;
  const movieContext = useMovie();
  return (
    <img
      src={`https://img.youtube.com/vi/${
        videoId ?? movieContext?.videoId
      }/0.jpg`}
      className={className}
      style={customStyle}
    />
  );
};
