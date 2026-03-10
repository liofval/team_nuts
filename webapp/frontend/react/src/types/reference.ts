// src/types/reference.ts

export type TagItem = {
  id: number;
  name: string;
  slug: string;
  type: string; // "tag" 想定
  count: number;
};

export type TagSuggestResponse = {
  items: TagItem[];
};

export type SearchItem = {
  id: number;
  title: string;
  main_image_url: string | null;
  excerpt: string;
  published_at: string;
  matched_tags: string[];
  score: number;
};

export type SearchResponse = {
  total: number;
  page: number;
  per_page: number;
  items: SearchItem[];
};