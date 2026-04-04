export type Locale = "ja" | "en" | "zh";
export type LocalizedText = Partial<Record<Locale, string>>;

export type UserRole = "guest" | "admin";

export interface VocabItem {
  word: string;
  furigana: string;
  meaning: LocalizedText;
  example: string;
  exampleTranslation: LocalizedText;
}

export interface LyricLine {
  id: string;
  atMs: number;
  timeLabel: string;
  japanese: string;
  translation: LocalizedText;
  vocab: VocabItem[];
}

export interface MusicItem {
  id: string;
  title: string;
  artist: string;
  genre: string;
  favorite: boolean;
  thumbnailLabel: string;
  palette: {
    from: string;
    to: string;
    accent: string;
  };
  youtubeId: string;
  lyrics: LyricLine[];
}

export interface ArticleItem {
  id: string;
  title: string;
  type: string;
  artist: string;
  excerpt: string;
  thumbnailLabel: string;
  palette: {
    from: string;
    to: string;
    accent: string;
  };
  content: Record<string, unknown>;
}

export interface WishPayload {
  artist: string;
  title: string;
  genre: string;
  url: string;
}

export interface MusicDraftPayload {
  sourceUrl: string;
  title: string;
  artist: string;
  genre: string;
  lyrics: LyricLine[];
}

export interface ArticleDraftPayload {
  title: string;
  type: string;
  artist: string;
  thumbnailLabel: string;
  content: Record<string, unknown>;
}

export interface HomePayload {
  newReleases: MusicItem[];
  trendingSongs: MusicItem[];
  latestArticles: ArticleItem[];
}

export interface AuthUser {
  id: string;
  name: string;
  role: UserRole;
}
