import { useEffect } from "react";
import { type Editor, EditorContent, Extension, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "@tiptap/markdown";
import { Bold, Italic, Link2, List, ListOrdered, Quote, Strikethrough } from "lucide-react";

type Props = {
  id: string;
  value: string; // Markdown
  onChange: (markdown: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
};

// 서버(Slack 변환)가 지원하는 문법만 켠다: 굵게/기울임/취소선/링크/목록/인용/코드. 밑줄·제목·구분선은 Markdown/Slack 대응이 없어 끈다.
const extensions = [
  StarterKit.configure({
    heading: false,
    horizontalRule: false,
    underline: false,
    link: { openOnClick: false, autolink: true, defaultProtocol: "https" },
  }),
  Markdown,
  // 줄바꿈은 항상 새 문단 + 서식 해제.
  // Slack 습관의 Shift+Enter가 <br>을 넣으면 한 문단으로 묶여 "* " 자동 목록·목록 버튼(현재 줄만)이 깨지고 "\*" 이스케이프가 전송된다.
  Extension.create({
    name: "plainLineBreak",
    priority: 1000,
    addKeyboardShortcuts() {
      // 코드블록은 기본 동작(Enter 3번/⌘Enter로 탈출)에 맡긴다
      const enter = () =>
        !this.editor.isActive("codeBlock") &&
        this.editor
          .chain()
          .first(({ commands }) => [
            () => commands.splitListItem("listItem"),
            () => commands.createParagraphNear(),
            () => commands.liftEmptyBlock(),
            () => commands.splitBlock({ keepMarks: false }),
          ])
          .command(({ tr }) => {
            tr.setStoredMarks([]);
            return true;
          })
          .run();
      return { Enter: enter, "Shift-Enter": enter };
    },
  }),
];

// 빈 문단은 "&nbsp;"로 직렬화되는데 서버가 &를 이스케이프해 Slack에 글자 그대로 찍히므로 빈 줄로 바꾼다
function toMarkdown(editor: Editor) {
  return editor.getMarkdown().replace(/^&nbsp;$/gm, "");
}

export function MarkdownEditor({ id, value, onChange, disabled, invalid, describedBy }: Props) {
  const editor = useEditor({
    extensions,
    content: value,
    contentType: "markdown",
    editable: !disabled,
    editorProps: {
      attributes: {
        id,
        role: "textbox",
        "aria-multiline": "true",
        ...(invalid ? { "aria-invalid": "true" } : {}),
        ...(describedBy ? { "aria-describedby": describedBy } : {}),
        class:
          "min-h-[9rem] px-3 py-2 text-sm outline-none [&_a]:text-blue-600 [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-black/20 [&_blockquote]:pl-3 [&_code]:rounded [&_code]:bg-black/5 [&_code]:px-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1 [&_ul]:list-disc [&_ul]:pl-5",
      },
    },
    onUpdate: ({ editor }) => onChange(toMarkdown(editor)),
  });

  useEffect(() => {
    // emitUpdate=false: 켜고 끌 때 update가 나가면 이전 내용이 부모 상태로 되돌아온다
    editor?.setEditable(!disabled, false);
  }, [editor, disabled]);

  // 부모가 값을 바꾼 경우(템플릿 변경, 공지 로드)에만 내용을 교체한다
  useEffect(() => {
    if (editor && value !== toMarkdown(editor)) {
      editor.commands.setContent(value, { contentType: "markdown", emitUpdate: false });
    }
  }, [editor, value]);

  const active = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e?.isActive("bold") ?? false,
      italic: e?.isActive("italic") ?? false,
      strike: e?.isActive("strike") ?? false,
      link: e?.isActive("link") ?? false,
      bulletList: e?.isActive("bulletList") ?? false,
      orderedList: e?.isActive("orderedList") ?? false,
      blockquote: e?.isActive("blockquote") ?? false,
    }),
  });

  const toggleLink = () => {
    if (!editor) return;
    if (editor.isActive("link")) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    const url = window.prompt("링크 주소를 입력하세요 (https://...)")?.trim();
    if (!url) return;
    if (!/^https?:\/\//.test(url)) {
      window.alert("http:// 또는 https://로 시작하는 주소만 넣을 수 있습니다.");
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const buttons = [
    { key: "bold", label: "굵게 (⌘B)", icon: Bold, run: () => editor?.chain().focus().toggleBold().run() },
    { key: "italic", label: "기울임 (⌘I)", icon: Italic, run: () => editor?.chain().focus().toggleItalic().run() },
    { key: "strike", label: "취소선 (⌘⇧S)", icon: Strikethrough, run: () => editor?.chain().focus().toggleStrike().run() },
    { key: "link", label: "링크", icon: Link2, run: toggleLink },
    { key: "bulletList", label: "글머리 목록 (⌘⇧8)", icon: List, run: () => editor?.chain().focus().toggleBulletList().run() },
    { key: "orderedList", label: "번호 목록 (⌘⇧7)", icon: ListOrdered, run: () => editor?.chain().focus().toggleOrderedList().run() },
    { key: "blockquote", label: "인용 (⌘⇧B)", icon: Quote, run: () => editor?.chain().focus().toggleBlockquote().run() },
  ] as const;

  return (
    <div
      className={`rounded-md border focus-within:border-brand ${invalid ? "border-red-400" : "border-black/10"} ${disabled ? "bg-black/5" : "bg-white"}`}
    >
      <div role="toolbar" aria-label="서식" className="flex flex-wrap gap-1 border-b border-black/10 px-2 py-1">
        {buttons.map(({ key, label, icon: Icon, run }) => (
          <button
            key={key}
            type="button"
            title={label}
            aria-label={label}
            aria-pressed={active?.[key] ?? false}
            disabled={disabled || !editor}
            onClick={run}
            className={`inline-flex h-8 w-8 items-center justify-center rounded hover:bg-black/5 disabled:opacity-40 ${active?.[key] ? "bg-black/10" : ""}`}
          >
            <Icon size={15} />
          </button>
        ))}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
