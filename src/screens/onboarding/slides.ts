export type Slide = {
  id: string;
  /** Unsplash photo id, the part after `photo-` in an images.unsplash.com URL. */
  photoId: string;
  /** Best guess at where the photo was taken; correct it if you know better. */
  place: string;
  title: string;
  body: string;
};

export const slides: Slide[] = [
  {
    id: "find",
    photoId: "1510798831971-661eb04b3739",
    place: "Emerald Lake, BC",
    title: "Find a stay that fits your story",
    body: "From mountain cabins to oceanfront villas, Havenly helps you find unforgettable stays for every kind of trip.",
  },
  {
    id: "describe",
    photoId: "1470770841072-f978cf4d019e",
    place: "Lago di Braies, Italy",
    title: "Describe it in one sentence",
    body: "Type something like “quiet pet friendly cabin with a hot tub under $300” and get stays ranked for you.",
  },
  {
    id: "book",
    photoId: "1520250497591-112f2f40a3f4",
    place: "Krabi, Thailand",
    title: "Book with confidence",
    body: "Ask about cancellation, pets or check-in and get the answer word for word from the stay’s own policies.",
  },
];
