import type {
  ArticleItem,
  AuthUser,
  HomePayload,
  LocalizedText,
  LyricLine,
  MusicItem,
  MusicVocabItem,
  WishPayload,
} from "@/lib/types";

type LegacyLyricLine = LyricLine & {
  vocab: Array<Omit<MusicVocabItem, "id" | "lineId">>;
};

type LegacyMusicItem = Omit<MusicItem, "lyrics" | "vocab"> & {
  lyrics: LegacyLyricLine[];
};

const localized = (zh: string, en = zh, ja = zh): LocalizedText => ({
  zh,
  en,
  ja,
});

export const mockUser: AuthUser = {
  id: "admin-demo",
  name: "Demo Admin",
  role: "admin",
};

export const musicCatalog: LegacyMusicItem[] = [
  {
    id: "night-dancer",
    title: "NIGHT DANCER",
    artist: "imase",
    genre: "City Pop",
    favorite: true,
    thumbnailLabel: "Moonlight",
    palette: { from: "#ffd8c7", to: "#ff8f70", accent: "#ffffff" },
    youtubeId: "kagoEGKHZvU",
    quizVocabKeys: ["nd-1-0", "nd-2-0"],
    lyrics: [
      {
        id: "nd-1",
        atMs: 14000,
        timeLabel: "00:14",
        japanese: "どうでもいいような 夜だけど",
        translation: localized(
          "虽然只是一个看似无所谓的夜晚",
          "It may be just another careless night",
          "どうでもいいような夜だけど",
        ),
        vocab: [
          {
            word: "どうでもいい",
            furigana: "どうでもいい",
            meaning: localized("无所谓，不重要", "doesn't matter", "どうでもよい"),
            example: "どうでもいい話はあとにしよう。",
            exampleTranslation: localized(
              "这种无所谓的话题等会再说吧。",
              "Let's leave that unimportant topic for later.",
              "どうでもいい話はあとにしよう。",
            ),
          },
          {
            word: "夜",
            furigana: "よる",
            meaning: localized("夜晚", "night", "夜"),
            example: "夜に散歩すると気持ちいい。",
            exampleTranslation: localized(
              "在夜晚散步很舒服。",
              "It feels nice to walk at night.",
              "夜に散歩すると気持ちいい。",
            ),
          },
        ],
      },
      {
        id: "nd-2",
        atMs: 18000,
        timeLabel: "00:18",
        japanese: "響めき 煌めきと君も",
        translation: localized(
          "回响与闪烁，也把你一起带上",
          "Echoes and sparkles take you with them too",
          "響めき 煌めきと君も",
        ),
        vocab: [
          {
            word: "煌めき",
            furigana: "きらめき",
            meaning: localized("闪耀，闪烁", "glitter, sparkle", "煌めき"),
            example: "海の煌めきが目に残った。",
            exampleTranslation: localized(
              "海面的闪耀仍留在我的眼底。",
              "The sparkle of the sea stayed in my eyes.",
              "海の煌めきが目に残った。",
            ),
          },
        ],
      },
      {
        id: "nd-3",
        atMs: 22300,
        timeLabel: "00:22",
        japanese: "まだ止まった 刻む針も",
        translation: localized(
          "连停住的时针也仍旧刻画着节奏",
          "Even the stopped hands still carve out the beat",
          "まだ止まった 刻む針も",
        ),
        vocab: [],
      },
    ],
  },
  {
    id: "gurenge",
    title: "紅蓮華",
    artist: "LiSA",
    genre: "Anime Rock",
    favorite: false,
    thumbnailLabel: "Scarlet Flame",
    palette: { from: "#ffc9c5", to: "#ef4444", accent: "#fff7ed" },
    youtubeId: "CwkzK-F0Y00",
    quizVocabKeys: ["gr-1-0", "gr-2-0"],
    lyrics: [
      {
        id: "gr-1",
        atMs: 21000,
        timeLabel: "00:21",
        japanese: "強くなれる理由を知った",
        translation: localized(
          "我已经知道自己能变强的理由",
          "I learned the reason I can become stronger",
          "強くなれる理由を知った",
        ),
        vocab: [
          {
            word: "理由",
            furigana: "りゆう",
            meaning: localized("理由", "reason", "理由"),
            example: "その理由を説明してください。",
            exampleTranslation: localized(
              "请说明一下那个理由。",
              "Please explain that reason.",
              "その理由を説明してください。",
            ),
          },
        ],
      },
      {
        id: "gr-2",
        atMs: 25000,
        timeLabel: "00:25",
        japanese: "僕を連れて進め",
        translation: localized(
          "带着我继续前进吧",
          "Take me with you and move forward",
          "僕を連れて進め",
        ),
        vocab: [
          {
            word: "連れる",
            furigana: "つれる",
            meaning: localized("带着，带去", "to take along", "連れる"),
            example: "友だちを連れて映画を見に行く。",
            exampleTranslation: localized(
              "带着朋友一起去看电影。",
              "I'm taking a friend to watch a movie.",
              "友だちを連れて映画を見に行く。",
            ),
          },
        ],
      },
    ],
  },
  {
    id: "idol",
    title: "アイドル",
    artist: "YOASOBI",
    genre: "Pop",
    favorite: true,
    thumbnailLabel: "Stage Spark",
    palette: { from: "#fde68a", to: "#fb7185", accent: "#312e81" },
    youtubeId: "ZRtdQ81jPUQ",
    quizVocabKeys: ["id-1-0", "id-1-1"],
    lyrics: [
      {
        id: "id-1",
        atMs: 13000,
        timeLabel: "00:13",
        japanese: "無敵の笑顔で荒らすメディア",
        translation: localized(
          "用无敌笑容席卷所有媒体",
          "With an invincible smile, she storms the media",
          "無敵の笑顔で荒らすメディア",
        ),
        vocab: [
          {
            word: "無敵",
            furigana: "むてき",
            meaning: localized("无敌", "invincible", "無敵"),
            example: "今日は無敵な気分だ。",
            exampleTranslation: localized(
              "今天感觉自己无所不能。",
              "I feel invincible today.",
              "今日は無敵な気分だ。",
            ),
          },
          {
            word: "笑顔",
            furigana: "えがお",
            meaning: localized("笑脸，笑容", "smile", "笑顔"),
            example: "彼女の笑顔はとても明るい。",
            exampleTranslation: localized(
              "她的笑容非常灿烂。",
              "Her smile is very bright.",
              "彼女の笑顔はとても明るい。",
            ),
          },
        ],
      },
      {
        id: "id-2",
        atMs: 16600,
        timeLabel: "00:16",
        japanese: "知りたいその秘密ミステリアス",
        translation: localized(
          "想知道那份秘密，神秘又迷人",
          "I want to know that mysterious secret",
          "知りたいその秘密ミステリアス",
        ),
        vocab: [],
      },
    ],
  },
  {
    id: "pretender",
    title: "Pretender",
    artist: "Official HIGE DANDism",
    genre: "Ballad",
    favorite: false,
    thumbnailLabel: "Soft Rain",
    palette: { from: "#c4e0ff", to: "#6b9cff", accent: "#eff6ff" },
    youtubeId: "TQ8WlA2GXbk",
    quizVocabKeys: ["pt-1-0"],
    lyrics: [
      {
        id: "pt-1",
        atMs: 30000,
        timeLabel: "00:30",
        japanese: "君とのラブストーリー それは予想通り",
        translation: localized(
          "和你的爱情故事，果然还是一如预料",
          "The love story with you went just as expected",
          "君とのラブストーリー それは予想通り",
        ),
        vocab: [
          {
            word: "予想通り",
            furigana: "よそうどおり",
            meaning: localized("如预期地", "as expected", "予想通り"),
            example: "予想通り雨が降り始めた。",
            exampleTranslation: localized(
              "事情果然如预期一样开始下雨了。",
              "It started to rain just as expected.",
              "予想通り雨が降り始めた。",
            ),
          },
        ],
      },
    ],
  },
];

export const articleCatalog: ArticleItem[] = [
  {
    id: "imase-night-dancer",
    title: "从 NIGHT DANCER 学会口语里很自然的暧昧感",
    type: "歌词解析",
    artist: "imase",
    excerpt: "从 どうでもいい 到 煌めき，整理这首歌里很常见的感性表达。",
    thumbnailUrl: "",
    palette: { from: "#ffe5d9", to: "#ffb4a2", accent: "#7c2d12" },
    content: {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "为什么这首歌很适合学日语" }],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "这首歌的句子短、节奏清楚，而且很多词都来自日常会话，非常适合拿来练习语感。",
            },
          ],
        },
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [
                    { type: "text", text: "どうでもいい：口语里很常见的“无所谓”语气" },
                  ],
                },
              ],
            },
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [
                    { type: "text", text: "煌めき：比单纯的“光”更有文学气息" },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  },
  {
    id: "lisa-gurenge",
    title: "红莲华里的热血表达，可以怎么拆成单词卡",
    type: "单词整理",
    artist: "LiSA",
    excerpt: "把“強くなれる理由”这类高频表达拆开看，背单词会轻松很多。",
    thumbnailUrl: "",
    palette: { from: "#ffd1d1", to: "#f87171", accent: "#450a0a" },
    content: {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "核心表达" }],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "理由、連れて、進め 这些词既能在歌词里见到，也很适合延伸到日常对话。",
            },
          ],
        },
      ],
    },
  },
  {
    id: "yoasobi-idol",
    title: "偶像系歌词为什么总是这么高速",
    type: "文化随笔",
    artist: "YOASOBI",
    excerpt: "从节奏、拟态和角色设定，拆开看 Idol 的语言魅力。",
    thumbnailUrl: "",
    palette: { from: "#fff1a8", to: "#f472b6", accent: "#4a044e" },
    content: {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "高速感从哪里来" }],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "这类歌词通常会在一句话里堆叠多个形容词与名词，制造像舞台灯光一样不断切换的速度感。",
            },
          ],
        },
      ],
    },
  },
];

export const homePayload: HomePayload = {
  newReleases: musicCatalog.slice(0, 3),
  trendingSongs: [musicCatalog[2], musicCatalog[0], musicCatalog[3]],
  latestArticles: articleCatalog,
} as unknown as HomePayload;

export const mockWishHistory: WishPayload[] = [
  {
    artist: "Ado",
    title: "唱",
    genre: "J-Pop",
    url: "https://example.com/ado-show",
  },
];
