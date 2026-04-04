import "server-only";

import { notFound } from "next/navigation";

import type { Locale } from "@/lib/types";

export const locales: Locale[] = ["ja", "en", "zh"];
export const defaultLocale: Locale = "ja";

export const dictionary = {
  ja: {
    brand: "ニホンゴタク",
    slogan: "ニホンゴタク 一起用JPOP学日语！",
    nav: {
      musicSearch: "歌曲查询",
      articles: "文章",
      wish: "许愿",
    },
    controls: {
      theme: "切换主题",
      login: "Login",
      logout: "Logout",
      admin: "Admin",
      searchMusic: "搜索歌曲、歌手或风格",
      searchArticle: "搜索文章、歌手或类型",
    },
    sections: {
      newReleases: "新曲",
      trendingSongs: "热门曲子",
      latestArticles: "最新文章",
      songLibrary: "歌曲目录",
      articleLibrary: "文章目录",
      lyrics: "歌词",
      vocab: "单词卡",
      video: "视频",
      request: "许愿表单",
      admin: "管理后台",
    },
    labels: {
      favorite: "收藏",
      genre: "风格",
      artist: "歌手",
      title: "标题",
      type: "类型",
      mentionArtist: "提及歌手",
      sourceUrl: "网址",
      lrcUpload: "上传 LRC",
      noVocab: "这一句暂时还没有指定单词卡。",
      readonlyEditor: "文章预览",
      tiptapEditor: "文章编辑器",
      lyricsTimeline: "歌词时间轴",
      createMusic: "建立新歌曲",
      editMusic: "编辑歌曲",
      createArticle: "建立新文章",
      editArticle: "编辑文章",
      adminHint: "当前 demo login 后会使用 mock admin 身份。",
      accessDenied: "只有 admin 才能进入这个页面。",
      submit: "提交",
      saveDraft: "保存草稿",
      chooseAction: "选择一个管理入口",
    },
    actions: {
      backHome: "回到首页",
      openAdminMusic: "新增歌曲",
      openAdminArticle: "新增文章",
      editExisting: "编辑现有内容",
      parseLrc: "解析歌词",
    },
  },
  en: {
    brand: "Nihongotaku",
    slogan: "Nihongotaku Learn Japanese with JPOP!",
    nav: {
      musicSearch: "Song Search",
      articles: "Articles",
      wish: "Wish",
    },
    controls: {
      theme: "Toggle theme",
      login: "Login",
      logout: "Logout",
      admin: "Admin",
      searchMusic: "Search songs, artists, or genres",
      searchArticle: "Search articles, artists, or types",
    },
    sections: {
      newReleases: "New Songs",
      trendingSongs: "Popular Songs",
      latestArticles: "Latest Articles",
      songLibrary: "Song Library",
      articleLibrary: "Article Library",
      lyrics: "Lyrics",
      vocab: "Vocabulary",
      video: "Video",
      request: "Wish Form",
      admin: "Admin",
    },
    labels: {
      favorite: "Favorite",
      genre: "Genre",
      artist: "Artist",
      title: "Title",
      type: "Type",
      mentionArtist: "Artist Mention",
      sourceUrl: "URL",
      lrcUpload: "Upload LRC",
      noVocab: "No vocabulary cards are assigned for this lyric line yet.",
      readonlyEditor: "Article Preview",
      tiptapEditor: "Article Editor",
      lyricsTimeline: "Lyrics Timeline",
      createMusic: "Create Music",
      editMusic: "Edit Music",
      createArticle: "Create Article",
      editArticle: "Edit Article",
      adminHint: "In this demo, login uses a mock admin account.",
      accessDenied: "Only admin users can enter this page.",
      submit: "Submit",
      saveDraft: "Save Draft",
      chooseAction: "Choose an admin action",
    },
    actions: {
      backHome: "Back Home",
      openAdminMusic: "Create Song",
      openAdminArticle: "Create Article",
      editExisting: "Edit Existing",
      parseLrc: "Parse Lyrics",
    },
  },
  zh: {
    brand: "日语宅学",
    slogan: "日语宅学 一起用JPOP学日语！",
    nav: {
      musicSearch: "歌曲查询",
      articles: "文章",
      wish: "许愿",
    },
    controls: {
      theme: "切换主题",
      login: "登录",
      logout: "登出",
      admin: "管理",
      searchMusic: "搜索歌曲、歌手或曲风",
      searchArticle: "搜索文章、歌手或类型",
    },
    sections: {
      newReleases: "新曲",
      trendingSongs: "热门曲子",
      latestArticles: "最新文章",
      songLibrary: "歌曲目录",
      articleLibrary: "文章目录",
      lyrics: "歌词",
      vocab: "单词卡",
      video: "视频",
      request: "许愿表单",
      admin: "管理后台",
    },
    labels: {
      favorite: "收藏",
      genre: "曲风",
      artist: "歌手",
      title: "标题",
      type: "类型",
      mentionArtist: "提及歌手",
      sourceUrl: "网址",
      lrcUpload: "上传 LRC",
      noVocab: "这句歌词还没有配置单词卡。",
      readonlyEditor: "文章预览",
      tiptapEditor: "文章编辑器",
      lyricsTimeline: "歌词时间轴",
      createMusic: "建立新歌曲",
      editMusic: "编辑歌曲",
      createArticle: "建立新文章",
      editArticle: "编辑文章",
      adminHint: "这个 demo 登录后会使用 mock admin 身份。",
      accessDenied: "只有 admin 可以进入这个页面。",
      submit: "提交",
      saveDraft: "保存草稿",
      chooseAction: "选择一个后台入口",
    },
    actions: {
      backHome: "回到首页",
      openAdminMusic: "新增歌曲",
      openAdminArticle: "新增文章",
      editExisting: "编辑现有内容",
      parseLrc: "解析歌词",
    },
  },
} as const;

export type Dictionary = (typeof dictionary)[Locale];

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

export async function getDictionary(locale: string) {
  if (!isLocale(locale)) {
    notFound();
  }

  return dictionary[locale];
}
