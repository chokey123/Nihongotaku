"use client";

import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import { FontSize, TextStyle } from "@tiptap/extension-text-style";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

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
}: {
  content: Record<string, unknown>;
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
    ],
    content,
    editable: false,
    immediatelyRender: false,
  });

  return (
    <div className="prose-tiptap rounded-[28px] border border-border bg-surface p-6">
      <EditorContent editor={editor} />
    </div>
  );
}
