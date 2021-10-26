import YouTube from "react-youtube";
import { registerComponent } from "@plasmicapp/host";

registerComponent(YouTube, {
  name: "YouTube",
  importPath: "react-youtube",
  props: {
    videoId: {
      type: "string",
      defaultValue: "R6MeLqRQzYw",
      displayName: "Video ID",
      description: "The ID for the YouTube video."
    }
  },
  defaultStyles: {
    height: "390px",
    width: "640px",
    maxHeight: "100%",
    maxWidth: "100%"
  }
});