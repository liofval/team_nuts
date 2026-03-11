import type { Editor } from "@tiptap/react";
import {
  useTemplatesQuery,
  useCreateTemplateMutation,
} from "../../hooks/useTemplate";
import "./RecruitButton.css";

type Props = {
  editor: Editor | null;
};

function textToHtml(text: string): string {
  return text
    .split("\n\n")
    .map((block) => `<p>${block.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

const DEFAULT_RECRUIT_CONTENT = `■ 採用情報
私たちは一緒に働く仲間を募集しています。

■ 募集職種
・[職種1]
・[職種2]

■ 応募方法
採用ページよりご応募ください。
URL：[採用ページURL]

■ お問い合わせ
[会社名] 採用担当
Email：[メールアドレス]`;

export default function RecruitButton({ editor }: Props) {
  const { data: templates } = useTemplatesQuery();
  const createMutation = useCreateTemplateMutation();

  const recruit = templates?.find((t) => t.name === "recruit");

  const handleInsert = () => {
    if (!editor || !recruit) return;
    const html = textToHtml(recruit.content);
    editor.commands.focus("end");
    editor.commands.insertContent(html);
  };

  const handleCreate = () => {
    createMutation.mutate({
      name: "recruit",
      title: "リクルート",
      content: DEFAULT_RECRUIT_CONTENT,
    });
  };

  if (!editor) return null;

  return (
    <div className="recruitSection">
      {recruit ? (
        <button
          type="button"
          className="recruitSection__insert"
          onClick={handleInsert}
        >
          リクルート情報を挿入
        </button>
      ) : (
        <button
          type="button"
          className="recruitSection__create"
          onClick={handleCreate}
          disabled={createMutation.isPending}
        >
          {createMutation.isPending
            ? "作成中..."
            : "リクルートテンプレートを作成"}
        </button>
      )}
    </div>
  );
}
