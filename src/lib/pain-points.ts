export interface PainPoint {
  id: string;
  title: string;
  selftext: string;
  subreddit: string;
  score: number;
  permalink: string;
  created_utc: number;
  num_comments: number;
  type: "post" | "comment";
}
