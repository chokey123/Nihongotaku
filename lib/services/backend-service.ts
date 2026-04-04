import {
  articleCatalog,
  homePayload,
  mockUser,
  musicCatalog,
} from "@/data/mock-data";
import type {
  ArticleDraftPayload,
  ArticleItem,
  HomePayload,
  MusicDraftPayload,
  MusicItem,
  WishPayload,
} from "@/lib/types";

const wait = (ms = 180) => new Promise((resolve) => setTimeout(resolve, ms));

export class BackendService {
  async getHomeData(): Promise<HomePayload> {
    await wait();
    return structuredClone(homePayload);
  }

  async searchMusic(query = ""): Promise<MusicItem[]> {
    await wait();
    const keyword = query.trim().toLowerCase();
    if (!keyword) return structuredClone(musicCatalog);

    return structuredClone(
      musicCatalog.filter((item) =>
        [item.title, item.artist, item.genre].some((value) =>
          value.toLowerCase().includes(keyword),
        ),
      ),
    );
  }

  async getMusicById(id: string): Promise<MusicItem | undefined> {
    await wait();
    return structuredClone(musicCatalog.find((item) => item.id === id));
  }

  async searchArticles(query = ""): Promise<ArticleItem[]> {
    await wait();
    const keyword = query.trim().toLowerCase();
    if (!keyword) return structuredClone(articleCatalog);

    return structuredClone(
      articleCatalog.filter((item) =>
        [item.title, item.artist, item.type].some((value) =>
          value.toLowerCase().includes(keyword),
        ),
      ),
    );
  }

  async getArticleById(id: string): Promise<ArticleItem | undefined> {
    await wait();
    return structuredClone(articleCatalog.find((item) => item.id === id));
  }

  async submitWish(payload: WishPayload) {
    await wait(320);
    return {
      ok: true,
      message: `Wish submitted for ${payload.artist} - ${payload.title}`,
    };
  }

  async getCurrentUser() {
    await wait(80);
    return structuredClone(mockUser);
  }

  async searchExampleSentence(keyword: string, lang = "jpn") {
    const normalizedKeyword = keyword.trim();
    if (!normalizedKeyword) {
      return "";
    }

    const params = new URLSearchParams({
      q: normalizedKeyword,
      lang,
      sort: "relevance",
    });

    try {
      const response = await fetch(
        `https://api.tatoeba.org/v1/sentences?${params.toString()}`,
      );

      if (!response.ok) {
        return "";
      }

      const payload = (await response.json()) as {
        data?: Array<{ text?: string }>;
      };

      return payload.data?.[0]?.text?.trim() ?? "";
    } catch {
      return "";
    }
  }

  async createMusic(payload: MusicDraftPayload) {
    await wait(280);
    return { ok: true, id: "draft-music", payload };
  }

  async updateMusic(id: string, payload: MusicDraftPayload) {
    await wait(280);
    return { ok: true, id, payload };
  }

  async createArticle(payload: ArticleDraftPayload) {
    await wait(280);
    return { ok: true, id: "draft-article", payload };
  }

  async updateArticle(id: string, payload: ArticleDraftPayload) {
    await wait(280);
    return { ok: true, id, payload };
  }
}

export const backendService = new BackendService();
