import "./CharacterCount.css";

type Props = {
  titleCount: number;
  bodyCount: number;
};

export default function CharacterCount({ titleCount, bodyCount }: Props) {
  return (
    <div className="characterCount" aria-label="文字数">
      <span className="characterCountItem">タイトル: {titleCount}文字</span>
      <span className="characterCountItem">本文: {bodyCount}文字</span>
    </div>
  );
}