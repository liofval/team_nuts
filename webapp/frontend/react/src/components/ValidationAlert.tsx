import "./ValidationAlert.css";

type Props = {
  messages: string[];
};

export default function ValidationAlert({ messages }: Props) {
  return (
    <div className="validationAlert" role="alert" aria-live="polite">
      <div className="validationAlertTitle">入力内容にエラーがあります</div>
      <ul className="validationAlertList">
        {messages.map((msg) => (
          <li key={msg}>{msg}</li>
        ))}
      </ul>
    </div>
  );
}