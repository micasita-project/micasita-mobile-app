export function getImageSource(imagePath?: string): { uri: string } | undefined {
  if (!imagePath) return undefined;
  return { uri: imagePath };
}
