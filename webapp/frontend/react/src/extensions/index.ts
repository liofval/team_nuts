import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import Heading from "@tiptap/extension-heading";
import Bold from "@tiptap/extension-bold";
import Italic from "@tiptap/extension-italic";
import Underline from "@tiptap/extension-underline";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import BulletList from "@tiptap/extension-bullet-list";
import OrderedList from "@tiptap/extension-ordered-list";
import ListItem from "@tiptap/extension-list-item";
import { CommentMark } from "./commentMark";
import { LinkCard } from "./linkCard";
import { ImageDropPaste } from "./imageDropPaste";

export const editorExtensions = [
  Document,
  Heading,
  Paragraph,
  Text,
  Bold,
  Italic,
  Underline,
  Image,
  Link.configure({
    openOnClick: false,
    autolink: true,
    linkOnPaste: true,
    HTMLAttributes: {
      target: "_blank",
      rel: "noopener noreferrer",
    },
  }),
  BulletList,
  OrderedList,
  ListItem,
  CommentMark,
  LinkCard, // OGPリンクカード
  ImageDropPaste, // ドラッグ&ドロップ/ペースト画像アップロード
];
