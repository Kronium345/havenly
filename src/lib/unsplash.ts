/** Sample photo URL. `photoId` is the part after `photo-` in an images.unsplash.com URL. */
export function unsplashPhoto(photoId: string) {
  return `https://images.unsplash.com/photo-${photoId}?w=1200&q=80&auto=format&fit=crop`;
}
