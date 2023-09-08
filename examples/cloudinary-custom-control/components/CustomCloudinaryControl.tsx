import React from "react";

const BUTTON_ID = "cloudinary-button";
const CLOUDINARY_SCRIPT = "https://media-library.cloudinary.com/global/all.js";
const CLOUDINARY_CLOUD_NAME = "YOUR_CLOUD_NAME";
const CLOUDINARY_API_KEY = "YOUR_API_KEY";

function loadCloudinary(
  studioDocument: Document,
  updateValue: (value: string) => void
) {
  const studioWindow = studioDocument.defaultView;
  const script = studioDocument.createElement("script");

  script.src = CLOUDINARY_SCRIPT;
  script.defer = true;
  script.onload = () => {
    (studioWindow as any).cloudinary.createMediaLibrary(
      {
        cloud_name: CLOUDINARY_CLOUD_NAME,
        api_key: CLOUDINARY_API_KEY,
        button_caption: "Select Image or Video",
      },
      {
        insertHandler: function (data: any) {
          // If there was any media selected, update the value with the first one
          if (data.assets.length > 0) {
            updateValue(data.assets[0].secure_url);
          }
        },
      },
      studioDocument.getElementById(BUTTON_ID)
    );
  };

  studioDocument.body.appendChild(script);
}

export function CloudinaryButton({
  studioDocument,
  updateValue,
}: {
  studioDocument: Document;
  updateValue: (value: string) => void;
}) {
  const loadedCloudinary = React.useRef(false);
  React.useEffect(() => {
    if (loadedCloudinary.current) {
      return;
    }
    loadedCloudinary.current = true;
    loadCloudinary(studioDocument, updateValue);
  }, [studioDocument, updateValue]);
  return (
    <div>
      <button id={BUTTON_ID}>Upload Media</button>
    </div>
  );
}

export function CustomCloudinaryControl({
  updateValue,
  value,
  studioDocument,
}: {
  updateValue: (value: string) => void;
  value?: string;
  studioDocument: Document;
}) {
  return (
    <div
      style={{
        maxWidth: "100%",
        display: "flex",
        flexDirection: "column",
        rowGap: 8,
      }}
    >
      {value && <img src={value} />}
      <span
        style={{
          overflowWrap: "break-word",
          padding: 5,
        }}
      >
        {value ?? "Unset"}
      </span>
      <CloudinaryButton
        studioDocument={studioDocument}
        updateValue={updateValue}
      />
    </div>
  );
}
