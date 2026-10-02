export const RatingChoice = {
  Bad: 'bad',
  Neutral: 'neutral',
  Good: 'good',
} as const;

export type RatingChoice = (typeof RatingChoice)[keyof typeof RatingChoice];

export type Rating = {
  rating: RatingChoice;
};

export type RatingRequest = Rating;

/* -------- */

export type Report = {
  notHelpful: boolean;
  rude: boolean;
  privacyIntruder: boolean;
  other?: string;
};

export type ReportRequest = Report;
