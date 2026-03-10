import { Node, mergeAttributes } from "@tiptap/core";

export type LinkCardAttributes = {
  url: string;
  title: string;
  description: string;
  imageUrl: string;
};

// リンクカードのカスタムノード（Tiptap v3）
export const LinkCard = Node.create({
  name: "linkCard",
  group: "block",
  atom: true, // 内部編集不可の単一ノードとして扱う

  addAttributes() {
    return {
      url:         { default: "" },
      title:       { default: "" },
      description: { default: "" },
      imageUrl:    { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-type='link-card']" }];
  },

  renderHTML({ HTMLAttributes }) {
    const { url, title, description, imageUrl } = HTMLAttributes;
    return [
      "div",
      mergeAttributes({ "data-type": "link-card" }, HTMLAttributes),
      [
        "a",
        { href: url, target: "_blank", rel: "noopener noreferrer", class: "linkCard" },
        ...(imageUrl
          ? [["img", { src: imageUrl, alt: title, class: "linkCard__image" }]]
          : []),
        [
          "div",
          { class: "linkCard__body" },
          ["p", { class: "linkCard__title" }, title],
          ["p", { class: "linkCard__description" }, description],
          ["p", { class: "linkCard__url" }, url],
        ],
      ],
    ];
  },
});
