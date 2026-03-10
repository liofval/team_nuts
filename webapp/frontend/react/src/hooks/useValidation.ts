import { useMemo, useState, useCallback } from "react";
import { TITLE_MAX, BODY_MAX } from "../constants";

export function useValidation(titleCount: number, bodyCount: number) {
  const messages = useMemo(() => {
    const msgs: string[] = [];
    if (titleCount > TITLE_MAX) {
      msgs.push(`タイトルは${TITLE_MAX}文字以内で入力してください。`);
    }
    if (bodyCount > BODY_MAX) {
      msgs.push(`本文は${BODY_MAX}文字以内で入力してください。`);
    }
    return msgs;
  }, [titleCount, bodyCount]);

  const [showValidation, setShowValidation] = useState(false);

  const triggerValidation = useCallback(() => {
    if (messages.length > 0) {
      setShowValidation(true);
      return false;
    }
    setShowValidation(false);
    return true;
  }, [messages]);

  return { messages, showValidation, triggerValidation };
}
