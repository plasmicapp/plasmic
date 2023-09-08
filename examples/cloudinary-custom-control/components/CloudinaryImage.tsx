import Image from "next/image";

export function CloudinaryImage({
  cloudinaryImage,
}: {
  cloudinaryImage: string;
}) {
  return (
    <div>
      <Image
        width={500}
        height={500}
        src={cloudinaryImage}
        alt="Image from cloudinary"
      />
    </div>
  );
}
