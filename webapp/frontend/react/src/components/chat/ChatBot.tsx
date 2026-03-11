import type { Editor } from "@tiptap/react";
import { useState, useRef, useEffect, useCallback } from "react";
import { BASE_URL } from "../../constants";
import "./ChatBot.css";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const INITIAL_MESSAGE: ChatMessage = {
  role: "assistant",
  content: "プレスリリースの作成をお手伝いします。お気軽にご質問ください。",
};

const QUICK_ACTIONS = [
  "タイトルの書き方を教えて",
  "リード文の作り方は？",
  "この本文を要約して",
  "文章をチェックして",
];

function generateResponse(input: string, editor: Editor | null): string {
  const text = editor?.getText() ?? "";
  const lowerInput = input.toLowerCase();

  if (lowerInput.includes("タイトル")) {
    return [
      "タイトルの書き方について、以下のポイントをご参考ください：",
      "",
      "1. 30文字以内に収めましょう",
      "2. 結論・最大の強みを冒頭に置きましょう",
      "3. 数字を入れると具体性が増します（例：「売上150%増」「3つの新機能」）",
      "4. 「誰が・何を・どうした」が一目でわかる構成にしましょう",
      "5. 専門用語よりも平易な言葉を選びましょう",
    ].join("\n");
  }

  if (lowerInput.includes("リード")) {
    return [
      "リード文（冒頭の要約部分）は5W1Hを網羅するのがポイントです：",
      "",
      "- Who（誰が）：会社名・団体名",
      "- What（何を）：発表内容の概要",
      "- When（いつ）：開始日・発売日",
      "- Where（どこで）：展開地域・販売チャネル",
      "- Why（なぜ）：背景・目的",
      "- How（どのように）：具体的な方法・手段",
      "",
      "最初の3行で記事の全容が伝わるように書きましょう。",
    ].join("\n");
  }

  if (lowerInput.includes("要約")) {
    if (!text || text.trim().length === 0) {
      return "本文がまだ入力されていないようです。エディタに本文を入力してから、もう一度お試しください。";
    }
    const preview = text.slice(0, 100);
    const suffix = text.length > 100 ? "..." : "";
    return [
      "本文を拝見しました。要点は以下の通りです：",
      "",
      `「${preview}${suffix}」`,
      "",
      `現在の本文は約${text.length}文字です。`,
      "プレスリリースの推奨文字数は400〜800文字程度です。",
    ].join("\n");
  }

  if (lowerInput.includes("チェック") || lowerInput.includes("確認")) {
    if (!text || text.trim().length === 0) {
      return "本文がまだ入力されていないようです。エディタに本文を入力してから、もう一度お試しください。";
    }
    const charCount = text.length;
    const lines: string[] = [
      "本文を確認しました。以下の点をご検討ください：",
      "",
      `- 文字数：${charCount}文字`,
    ];
    if (charCount < 400) {
      lines.push("  → やや短めです。情報を追加すると説得力が増します。");
    } else if (charCount > 800) {
      lines.push("  → やや長めです。冗長な表現を整理すると読みやすくなります。");
    } else {
      lines.push("  → 適切な文字数です。");
    }
    lines.push(
      "- 誤字脱字がないかご確認ください",
      "- 固有名詞の表記が統一されているかご確認ください",
      "- 問い合わせ先（電話番号・メールアドレス）が正しいかご確認ください",
    );
    return lines.join("\n");
  }

  return [
    "プレスリリースを書く際のポイントをいくつかご紹介します：",
    "",
    "1. 結論ファースト：最も伝えたいことを冒頭に書きましょう",
    "2. 客観的な表現：「すごい」「画期的」などの主観的表現は避けましょう",
    "3. 数字で裏付け：具体的な数値があると信頼性が高まります",
    "4. 画像の活用：写真やグラフを入れると記事になりやすくなります",
    "",
    "他にご質問があればお気軽にどうぞ。",
  ].join("\n");
}

type Props = {
  editor: Editor | null;
};

export default function ChatBot({ editor }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      const userMessage: ChatMessage = { role: "user", content: text.trim() };
      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      setInput("");
      setIsLoading(true);

      try {
        // 初期メッセージ(index 0)を除外してAPI送信
        const apiMessages = updatedMessages.slice(1).map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const res = await fetch(`${BASE_URL}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: apiMessages,
            editor_body: editor?.getText() ?? "",
          }),
        });

        if (!res.ok) throw new Error(`API error: ${res.status}`);

        const data = await res.json();
        const assistantMessage: ChatMessage = {
          role: "assistant",
          content: data.content,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } catch {
        // API失敗時はダミー応答にフォールバック
        const response = generateResponse(text, editor);
        const assistantMessage: ChatMessage = {
          role: "assistant",
          content: response,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } finally {
        setIsLoading(false);
      }
    },
    [editor, isLoading, messages],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const isInitialState = messages.length === 1;

  return (
    <div className="chatContainer">
      <div className="chatMessages">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={
              msg.role === "user" ? "chatMessage chatMessageUser" : "chatMessage chatMessageBot"
            }
          >
            <div className="chatBubble">{msg.content}</div>
          </div>
        ))}
        {isLoading && (
          <div className="chatMessage chatMessageBot">
            <div className="chatBubble chatBubbleLoading">
              <span className="chatDot" />
              <span className="chatDot" />
              <span className="chatDot" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {isInitialState && (
        <div className="chatQuickActions">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action}
              className="chatQuickButton"
              onClick={() => sendMessage(action)}
              disabled={isLoading}
            >
              {action}
            </button>
          ))}
        </div>
      )}

      <div className="chatInputArea">
        <textarea
          className="chatInput"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="メッセージを入力..."
          rows={1}
          disabled={isLoading}
        />
        <button
          className="chatSendButton"
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || isLoading}
        >
          送信
        </button>
      </div>
    </div>
  );
}
