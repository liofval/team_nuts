export type Article = {
  id: number;
  title: string;
  mainImageUrl: string | null;
  excerpt: string;
  publishedAt: string; 
  tags: string[];
  score?: number; 
};