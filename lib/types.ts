export type Locale = "ja" | "en" | "zh";
export type LocalizedText = Partial<Record<Locale, string>>;
export type MusicSubmissionSource = "upload" | "wish";

export type UserRole = "guest" | "admin";

export interface VocabItem {
  word: string;
  furigana: string;
  meaning: LocalizedText;
  example: string;
  exampleTranslation: LocalizedText;
}

export interface MusicVocabItem extends VocabItem {
  id: string;
  lineId: string;
}

export interface MusicQuizQuestion {
  key: string;
  word: string;
  furigana: string;
  correctMeaning: string;
  options: string[];
}

export interface MusicQuizAttemptAnswer {
  questionKey: string;
  selectedMeaning: string;
  correctMeaning: string;
  isCorrect: boolean;
}

export interface MusicQuizAttemptRecord {
  id: string;
  musicId: string;
  userId: string;
  score: number;
  totalQuestions: number;
  answers: MusicQuizAttemptAnswer[];
  createdAt?: string;
}

export interface LyricLine {
  id: string;
  atMs: number;
  timeLabel: string;
  japanese: string;
  translation: LocalizedText;
}

export interface MusicItem {
  id: string;
  title: string;
  artist: string;
  genre: string;
  createdBy?: string;
  creatorRole?: UserRole;
  submissionSource?: MusicSubmissionSource;
  createdAt?: string;
  reviewRequestedAt?: string | null;
  sourceUrl?: string;
  favorite: boolean;
  thumbnailLabel: string;
  palette: {
    from: string;
    to: string;
    accent: string;
  };
  youtubeId: string;
  isPublished?: boolean;
  lyrics: LyricLine[];
  vocab: MusicVocabItem[];
  quizVocabKeys: string[];
}

export interface ArticleItem {
  id: string;
  title: string;
  type: string;
  artist: string;
  createdBy?: string;
  excerpt: string;
  thumbnailUrl: string;
  isPublished?: boolean;
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

export interface WishRequestItem extends WishPayload {
  id: string;
  status?: string;
  createdAt?: string;
}

export interface MusicDraftPayload {
  sourceUrl: string;
  title: string;
  artist: string;
  genre: string;
  lyrics: LyricLine[];
  vocab: MusicVocabItem[];
  quizVocabKeys?: string[];
  submissionSource?: MusicSubmissionSource;
  reviewRequestedAt?: string | null;
}

export interface ArticleDraftPayload {
  title: string;
  type: string;
  artist: string;
  thumbnailUrl: string;
  content: Record<string, unknown>;
}

export interface HomePayload {
  newReleases: MusicItem[];
  trendingSongs: MusicItem[];
  latestArticles: ArticleItem[];
}

export interface AuthUser {
  id: string;
  email?: string;
  name: string;
  role: UserRole;
}
