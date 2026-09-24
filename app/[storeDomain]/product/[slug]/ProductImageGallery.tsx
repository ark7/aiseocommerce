"use client";
import { useState } from "react";
import Image from "next/image";

interface ImageItem {
  id: string;
  url: string;
  altText?: string | null;
}

interface Props {
  images: ImageItem[];
  name: string;
}

export default function ProductImageGallery({ images, name }: Props) {
  const [selected, setSelected] = useState(0);
  const selectedImg = images[selected];

  return (
    <div className="flex flex-col-reverse">
      {/* Thumbnails */}
      <div className="hidden mt-6 w-full max-w-2xl mx-auto sm:block lg:max-w-none">
        <div className="grid grid-cols-4 gap-6">
          {images.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setSelected(i)}
              className={`relative h-24 rounded-md flex items-center justify-center overflow-hidden ${i === selected ? "ring-2 ring-indigo-500" : ""}`}
            >
              <Image src={img.url} alt={img.altText || `${name} image ${i + 1}`} width={200} height={200} className="w-full h-full object-cover object-center" />
            </button>
          ))}
        </div>
      </div>
      {/* Main image */}
      <div className="w-full aspect-w-1 aspect-h-1">
        <div className="bg-white rounded-lg overflow-hidden">
          {selectedImg ? (
            <Image src={selectedImg.url} alt={selectedImg.altText || name} width={800} height={800} className="w-full h-full object-cover object-center" priority />
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
              <span className="text-gray-500">No image available</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}