"use client";

import { useEffect, useRef } from "react";
import {
  ResizableNodeView,
  type ResizableNodeViewDirection,
} from "@tiptap/core";

import Image from "@tiptap/extension-image";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import { FontSize, TextStyle } from "@tiptap/extension-text-style";
import {
  EditorContent,
  useEditor,
  type Editor,
  type JSONContent,
} from "@tiptap/react";

const resizableImageOptions = {
  enabled: true,
  directions: ["bottom-right"] as ResizableNodeViewDirection[],
  minWidth: 120,
  minHeight: 80,
  alwaysPreserveAspectRatio: true,
} as NonNullable<Parameters<typeof Image.configure>[0]>["resize"];

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

  addNodeView() {
    if (!this.options.resize || !this.options.resize.enabled || typeof document === "undefined") {
      return null;
    }

    const { directions, minWidth, minHeight, alwaysPreserveAspectRatio } = this.options.resize;

    return ({ node, getPos, HTMLAttributes, editor }) => {
      const element = document.createElement("img");

      Object.entries(HTMLAttributes).forEach(([key, value]) => {
        if (value == null || key === "width" || key === "height") {
          return;
        }

        element.setAttribute(key, String(value));
      });

      element.src = String(HTMLAttributes.src ?? "");

      const nodeView = new ResizableNodeView({
        element,
        editor,
        node,
        getPos,
        onResize: (width, height) => {
          element.style.width = `${width}px`;
          element.style.height = `${height}px`;
        },
        onCommit: (width, height) => {
          const pos = getPos();
          if (pos === undefined) {
            return;
          }

          this.editor
            .chain()
            .setNodeSelection(pos)
            .updateAttributes(this.name, {
              width,
              height,
            })
            .run();
        },
        onUpdate: (updatedNode) => {
          if (updatedNode.type !== node.type) {
            return false;
          }

          const align = (updatedNode.attrs.align as string | undefined) ?? "center";
          nodeView.dom.setAttribute("data-image-align", align);
          element.setAttribute("data-align", align);

          return true;
        },
        options: {
          directions,
          min: {
            width: minWidth,
            height: minHeight,
          },
          preserveAspectRatio: alwaysPreserveAspectRatio === true,
          createCustomHandle: (direction) => {
            const handle = document.createElement("div");
            handle.dataset.resizeHandle = direction;
            handle.style.position = "absolute";
            handle.style.right = "0";
            handle.style.bottom = "0";
            handle.style.transform = "translate(40%, 40%)";
            handle.style.width = "22px";
            handle.style.height = "22px";
            handle.style.cursor = "nwse-resize";
            return handle;
          },
        },
      });

      const align = (node.attrs.align as string | undefined) ?? "center";
      nodeView.dom.setAttribute("data-image-align", align);
      element.setAttribute("data-align", align);

      nodeView.dom.style.visibility = "hidden";
      nodeView.dom.style.pointerEvents = "none";
      element.onload = () => {
        nodeView.dom.style.visibility = "";
        nodeView.dom.style.pointerEvents = "";
      };

      return nodeView;
    };
  },
});

function ToolbarButton({
  isActive = false,
  label,
  onClick,
}: {
  isActive?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-2 text-sm font-semibold transition ${
        isActive
          ? "border-brand bg-brand-soft text-brand-strong"
          : "border-border bg-surface-strong text-foreground hover:border-brand"
      }`}
    >
      {label}
    </button>
  );
}

function EditorToolbar({ editor }: { editor: Editor }) {
  const currentFontSize =
    (editor.getAttributes("textStyle").fontSize as string | undefined) ?? "16px";
  const currentTextAlign =
    (editor.getAttributes("heading").textAlign as string | undefined) ??
    (editor.getAttributes("paragraph").textAlign as string | undefined) ??
    "left";
  const currentImageAlign =
    (editor.getAttributes("image").align as string | undefined) ?? "center";

  return (
    <div className="sticky top-0 z-30 mb-4 flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-surface px-4 py-4 shadow-sm">
      <ToolbarButton
        label="Bold"
        isActive={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      />
      <ToolbarButton
        label="Bullet"
        isActive={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      />
      <ToolbarButton
        label="H2"
        isActive={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      />
      <ToolbarButton
        label="Image"
        onClick={() => {
          const url = window.prompt("Image URL");
          if (!url) {
            return;
          }

          editor
            .chain()
            .focus()
            .setImage({ src: url, alt: "Article image" })
            .updateAttributes("image", { align: "center" })
            .run();
        }}
      />
      <div className="ml-2 flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          Text
        </span>
        <ToolbarButton
          label="Left"
          isActive={currentTextAlign === "left"}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
        />
        <ToolbarButton
          label="Center"
          isActive={currentTextAlign === "center"}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
        />
        <ToolbarButton
          label="Right"
          isActive={currentTextAlign === "right"}
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
        />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          Image
        </span>
        <ToolbarButton
          label="Left"
          isActive={currentImageAlign === "left"}
          onClick={() => editor.chain().focus().updateAttributes("image", { align: "left" }).run()}
        />
        <ToolbarButton
          label="Center"
          isActive={currentImageAlign === "center"}
          onClick={() =>
            editor.chain().focus().updateAttributes("image", { align: "center" }).run()
          }
        />
        <ToolbarButton
          label="Right"
          isActive={currentImageAlign === "right"}
          onClick={() =>
            editor.chain().focus().updateAttributes("image", { align: "right" }).run()
          }
        />
      </div>
      <label className="ml-auto flex items-center gap-2 rounded-full border border-border bg-surface-strong px-3 py-2 text-sm">
        <span>Font size</span>
        <select
          value={currentFontSize}
          onChange={(event) => {
            const value = event.target.value;
            editor.chain().focus().setFontSize(value).run();
          }}
          className="bg-transparent outline-none"
        >
          <option value="14px">14px</option>
          <option value="16px">16px</option>
          <option value="18px">18px</option>
          <option value="20px">20px</option>
          <option value="24px">24px</option>
          <option value="28px">28px</option>
          <option value="32px">32px</option>
        </select>
      </label>
      <ToolbarButton
        label="Reset size"
        onClick={() => editor.chain().focus().unsetFontSize().run()}
      />
    </div>
  );
}

export function ArticleEditor({
  content,
  onChange,
}: {
  content: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
}) {
  const lastExternalContentRef = useRef(JSON.stringify(content));
  const hasInitializedRef = useRef(false);

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
        resize: resizableImageOptions,
      }),
      TextStyle,
      FontSize,
    ],
    content,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "prose-tiptap min-h-[280px] rounded-[22px] px-2 py-1 outline-none focus:outline-none",
      },
    },
    onCreate: () => {
      hasInitializedRef.current = true;
    },
    onUpdate: ({ editor: nextEditor }) => {
      const nextJson = nextEditor.getJSON() as Record<string, unknown>;
      lastExternalContentRef.current = JSON.stringify(nextJson);
      onChange(nextJson);
    },
  });

  useEffect(() => {
    if (!editor || !hasInitializedRef.current) {
      return;
    }

    const serialized = JSON.stringify(content);
    if (serialized === lastExternalContentRef.current) {
      return;
    }

    lastExternalContentRef.current = serialized;
    editor.commands.setContent(content as JSONContent, { emitUpdate: false });
  }, [content, editor]);

  if (!editor) {
    return (
      <div className="rounded-[28px] border border-border bg-surface p-4">
        <div className="min-h-[280px]" />
      </div>
    );
  }

  return (
    <div className="flex h-[min(760px,78vh)] flex-col overflow-hidden rounded-[28px] border border-border bg-surface">
      <EditorToolbar editor={editor} />
      <div className="mx-4 mb-4 min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-[22px] pr-2">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
