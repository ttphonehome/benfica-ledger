export type RatingBand = "hi" | "mid" | "lo";

export function ratingBand(r: number): RatingBand {
  if (r >= 7.3) return "hi";
  if (r >= 6.7) return "mid";
  return "lo";
}
