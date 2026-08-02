"use client";

import { useCallback } from "react";
import { App, Divider, Tooltip } from "antd";
import { Placeholder } from "@tiptap/extensions";
import { Image as TiptapImage } from "@tiptap/extension-image";
import { TextAlign } from "@tiptap/extension-text-align";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo2,
  Unlink,
} from "lucide-react";
import type { FieldValues } from "react-hook-form";
import { useController } from "react-hook-form";

import { cn } from "@/lib/utils";

import { FormItemLayout } from "../FormItemLayout";
import type { BaseFieldProps } from "./types";

interface ToolbarButtonProps {
  icon: React.ReactNode;
  title: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

function ToolbarButton({
  icon,
  title,
  active,
  disabled,
  onClick,
}: ToolbarButtonProps) {
  return (
    <Tooltip title={title}>
      <button
        type="button"
        aria-label={title}
        aria-pressed={active}
        disabled={disabled}
        // onMouseDown ngăn editor mất focus khi bấm nút trên thanh công cụ
        onMouseDown={(event) => event.preventDefault()}
        onClick={onClick}
        className={cn(
          "text-content hover:bg-row-hover inline-flex h-8 w-8 items-center justify-center rounded transition-colors",
          active && "bg-brand/12 text-brand",
          disabled && "cursor-not-allowed opacity-40",
        )}
      >
        {icon}
      </button>
    </Tooltip>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const { modal } = App.useApp();

  const setLink = useCallback(() => {
    let url = editor.getAttributes("link").href ?? "";
    modal.confirm({
      title: "Chèn liên kết",
      content: (
        <input
          defaultValue={url}
          autoFocus
          placeholder="https://..."
          onChange={(event) => {
            url = event.target.value;
          }}
          className="border-line mt-2 w-full rounded border px-2 py-1"
        />
      ),
      okText: "Chèn",
      cancelText: "Huỷ",
      onOk: () => {
        if (!url.trim()) {
          editor.chain().focus().unsetLink().run();
          return;
        }
        editor.chain().focus().setLink({ href: url.trim() }).run();
      },
    });
  }, [editor, modal]);

  const addImage = useCallback(() => {
    let url = "";
    modal.confirm({
      title: "Chèn ảnh vào nội dung",
      content: (
        <input
          autoFocus
          placeholder="Dán đường dẫn ảnh..."
          onChange={(event) => {
            url = event.target.value;
          }}
          className="border-line mt-2 w-full rounded border px-2 py-1"
        />
      ),
      okText: "Chèn",
      cancelText: "Huỷ",
      onOk: () => {
        if (url.trim()) editor.chain().focus().setImage({ src: url.trim() }).run();
      },
    });
  }, [editor, modal]);

  return (
    <div className="border-line bg-subtle flex flex-wrap items-center gap-0.5 rounded-t-md border-b px-2 py-1.5">
      <ToolbarButton
        icon={<Undo2 size={16} />}
        title="Hoàn tác"
        disabled={!editor.can().undo()}
        onClick={() => editor.chain().focus().undo().run()}
      />
      <ToolbarButton
        icon={<Redo2 size={16} />}
        title="Làm lại"
        disabled={!editor.can().redo()}
        onClick={() => editor.chain().focus().redo().run()}
      />

      <Divider type="vertical" className="mx-1!" />

      <ToolbarButton
        icon={<Bold size={16} />}
        title="Đậm"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      />
      <ToolbarButton
        icon={<Italic size={16} />}
        title="Nghiêng"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      />
      <ToolbarButton
        icon={<UnderlineIcon size={16} />}
        title="Gạch chân"
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      />
      <ToolbarButton
        icon={<Strikethrough size={16} />}
        title="Gạch ngang"
        active={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      />
      <ToolbarButton
        icon={<Code size={16} />}
        title="Mã lệnh"
        active={editor.isActive("code")}
        onClick={() => editor.chain().focus().toggleCode().run()}
      />

      <Divider type="vertical" className="mx-1!" />

      <ToolbarButton
        icon={<Heading2 size={16} />}
        title="Tiêu đề lớn"
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      />
      <ToolbarButton
        icon={<Heading3 size={16} />}
        title="Tiêu đề nhỏ"
        active={editor.isActive("heading", { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      />
      <ToolbarButton
        icon={<List size={16} />}
        title="Danh sách"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      />
      <ToolbarButton
        icon={<ListOrdered size={16} />}
        title="Danh sách đánh số"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      />
      <ToolbarButton
        icon={<Quote size={16} />}
        title="Trích dẫn"
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      />

      <Divider type="vertical" className="mx-1!" />

      <ToolbarButton
        icon={<AlignLeft size={16} />}
        title="Căn trái"
        active={editor.isActive({ textAlign: "left" })}
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
      />
      <ToolbarButton
        icon={<AlignCenter size={16} />}
        title="Căn giữa"
        active={editor.isActive({ textAlign: "center" })}
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
      />
      <ToolbarButton
        icon={<AlignRight size={16} />}
        title="Căn phải"
        active={editor.isActive({ textAlign: "right" })}
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
      />

      <Divider type="vertical" className="mx-1!" />

      <ToolbarButton
        icon={<LinkIcon size={16} />}
        title="Chèn liên kết"
        active={editor.isActive("link")}
        onClick={setLink}
      />
      <ToolbarButton
        icon={<Unlink size={16} />}
        title="Bỏ liên kết"
        disabled={!editor.isActive("link")}
        onClick={() => editor.chain().focus().unsetLink().run()}
      />
      <ToolbarButton
        icon={<ImagePlus size={16} />}
        title="Chèn ảnh"
        onClick={addImage}
      />
      <ToolbarButton
        icon={<Minus size={16} />}
        title="Đường kẻ ngang"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
      />
    </div>
  );
}

interface RichTextFieldProps<T extends FieldValues> extends BaseFieldProps<T> {
  placeholder?: string;
  minHeight?: number;
}

/**
 * Trình soạn thảo nội dung dựng trên TipTap (ProseMirror). Bản gốc dùng TinyMCE
 * qua iframe nên khó khớp theme; TipTap render thẳng vào DOM nên dùng lại được
 * đúng token màu sáng/tối của dự án.
 *
 * Giá trị lưu vào form là HTML — khớp với cách API nội dung thường nhận.
 */
export function RichTextField<T extends FieldValues>({
  name,
  control,
  rules,
  label,
  required,
  helpText,
  disabled,
  className,
  placeholder = "Nhập nội dung...",
  minHeight = 320,
}: RichTextFieldProps<T>) {
  const { field, fieldState } = useController({ name, control, rules });

  const editor = useEditor({
    // Nội dung dựng ở client, tắt render phía server để tránh lệch hydration
    immediatelyRender: false,
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        link: { openOnClick: false, autolink: true },
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TiptapImage.configure({ inline: false }),
      Placeholder.configure({ placeholder }),
    ],
    content: field.value ?? "",
    onUpdate: ({ editor: instance }) => {
      const html = instance.getHTML();
      // TipTap trả về "<p></p>" khi rỗng; quy về chuỗi rỗng để validate required chạy đúng
      field.onChange(instance.isEmpty ? "" : html);
    },
    onBlur: field.onBlur,
  });

  return (
    <FormItemLayout
      label={label}
      required={required}
      error={fieldState.error?.message}
      helpText={helpText}
      className={className}
    >
      <div
        className={cn(
          "border-line bg-card overflow-hidden rounded-md border transition-colors",
          fieldState.error && "border-danger",
        )}
      >
        {editor && <Toolbar editor={editor} />}
        <EditorContent
          editor={editor}
          className="tiptap-content"
          style={{ minHeight }}
        />
      </div>
    </FormItemLayout>
  );
}

export default RichTextField;
