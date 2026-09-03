"use client";

import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import { FontSize, TextStyle } from "@tiptap/extension-text-style";
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

import { timestampToSeconds } from "@/lib/youtube";

const TIMESTAMP_PATTERN = /(?<![\d:：])(?:\d{1,2}[:：])?\d{1,3}[:：][0-5]\d(?![\d:：])/g;
const timestampPluginKey = new PluginKey<DecorationSet>("timestampDecorations");

function timestampDecorations(doc: Parameters<typeof DecorationSet.create>[0]) {
  const decorations: Decoration[] = [];

  doc.descendants((node, position, parent) => {
    if (!node.isText || !node.text || parent?.type.name === "codeBlock") return;

    for (const match of node.text.matchAll(TIMESTAMP_PATTERN)) {
      const timestamp = match[0];
      const seconds = timestampToSeconds(timestamp);

      if (seconds === null || match.index === undefined) continue;

      const from = position + match.index;
      decorations.push(
        Decoration.inline(from, from + timestamp.length, {
          class: "article-timestamp",
          "data-youtube-seconds": String(seconds),
          "data-youtube-timestamp": timestamp,
          role: "button",
          tabindex: "0",
          title: `Jump to ${timestamp}`,
        }),
      );
    }
  });

  return DecorationSet.create(doc, decorations);
}

const TimestampDecorations = Extension.create({
  name: "timestampDecorations",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: timestampPluginKey,
        state: {
          init: (_, state) => timestampDecorations(state.doc),
          apply: (transaction, decorations) =>
            transaction.docChanged
              ? timestampDecorations(transaction.doc)
              : decorations.map(transaction.mapping, transaction.doc),
        },
        props: {
          decorations: (state) => timestampPluginKey.getState(state),
        },
      }),
    ];
  },
});

const ArticleImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      align: {
        default: "center",
        parseHTML: (element) => element.getAttribute("data-align") || "center",
        renderHTML: (attributes) => ({
          "data-align": attributes.align,
        }),
      },
    };
  },
});

export function ReadonlyEditor({
  content,
  onTimestampClick,
}: {
  content: Record<string, unknown>;
  onTimestampClick?: (seconds: number, label: string) => void;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextAlign.configure({
        types: ["heading", "paragraph"],
        alignments: ["left", "center", "right"],
        defaultAlignment: "left",
      }),
      ArticleImage.configure({
        HTMLAttributes: {
          class: "article-editor-image",
        },
      }),
      TextStyle,
      FontSize,
      ...(onTimestampClick ? [TimestampDecorations] : []),
    ],
    content,
    editable: false,
    immediatelyRender: false,
  });

  return (
    <div
      className="prose-tiptap rounded-[28px] border border-border bg-surface p-6"
      onClick={(event) => {
        if (!onTimestampClick) return;
        const target = (event.target as HTMLElement).closest<HTMLElement>(
          "[data-youtube-seconds]",
        );
        if (!target) return;
        const seconds = Number(target.dataset.youtubeSeconds);
        if (Number.isFinite(seconds)) {
          onTimestampClick(seconds, target.dataset.youtubeTimestamp ?? "");
        }
      }}
      onKeyDown={(event) => {
        if (!onTimestampClick || (event.key !== "Enter" && event.key !== " ")) return;
        const target = (event.target as HTMLElement).closest<HTMLElement>(
          "[data-youtube-seconds]",
        );
        if (!target) return;
        event.preventDefault();
        const seconds = Number(target.dataset.youtubeSeconds);
        if (Number.isFinite(seconds)) {
          onTimestampClick(seconds, target.dataset.youtubeTimestamp ?? "");
        }
      }}
    >
      <EditorContent editor={editor} />
    </div>
  );
}
