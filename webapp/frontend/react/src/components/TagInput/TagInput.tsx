import {
  useState,
  useCallback,
  useMemo,
  useRef,
  type KeyboardEvent,
  type ChangeEvent,
} from "react";
import styles from "./TagInput.module.css";

export interface TagSuggestion {
  label: string;
  count: number;
}

interface TagInputProps {
  initialTags?: string[];
  suggestions?: TagSuggestion[];
  onChange?: (tags: string[]) => void;
  onInputChange?: (value: string) => void;
}

const MAX_TAGS = 10;
const MAX_TAG_LENGTH = 30;

export default function TagInput({
  initialTags = [],
  suggestions = [],
  onChange,
  onInputChange,
}: TagInputProps) {
  const [tags, setTags] = useState<string[]>(initialTags);
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [error, setError] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLUListElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const isAtLimit = tags.length >= MAX_TAGS;

  const filteredSuggestions = useMemo(() => {
    return suggestions.filter((s) => !tags.includes(s.label));
  }, [suggestions, tags]);

  const showCreateOption =
    inputValue.trim() !== "" &&
    !tags.includes(inputValue.trim()) &&
    !suggestions.some(
      (s) => s.label.toLowerCase() === inputValue.trim().toLowerCase()
    );

  const addTag = useCallback(
    (raw: string) => {
      const value = raw.trim();
      if (!value) return;

      if (value.length > MAX_TAG_LENGTH) {
        setError(`タグは${MAX_TAG_LENGTH}文字以内で入力してください`);
        return;
      }
      if (tags.includes(value)) {
        setError("同じタグはすでに追加されています");
        return;
      }
      if (tags.length >= MAX_TAGS) {
        setError(`タグは最大${MAX_TAGS}個まで追加できます`);
        return;
      }

      const next = [...tags, value];
      setTags(next);
      onChange?.(next);
      setInputValue("");
      onInputChange?.("");
      setError("");
      setActiveIndex(-1);
    },
    [tags, onChange, onInputChange]
  );

  const removeTag = useCallback(
    (index: number) => {
      const next = tags.filter((_, i) => i !== index);
      setTags(next);
      onChange?.(next);
      setError("");
    },
    [tags, onChange]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (activeIndex >= 0) {
          const totalItems =
            filteredSuggestions.length + (showCreateOption ? 1 : 0);
          if (activeIndex < filteredSuggestions.length) {
            addTag(filteredSuggestions[activeIndex].label);
          } else if (showCreateOption && activeIndex === totalItems - 1) {
            addTag(inputValue.trim());
          }
        } else {
          addTag(inputValue);
        }
        setIsOpen(false);
      } else if (e.key === "Backspace" && inputValue === "") {
        removeTag(tags.length - 1);
      } else if (e.key === "Escape") {
        setIsOpen(false);
        setActiveIndex(-1);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        const total =
          filteredSuggestions.length + (showCreateOption ? 1 : 0);
        setActiveIndex((prev) => (prev + 1) % total);
        setIsOpen(true);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const total =
          filteredSuggestions.length + (showCreateOption ? 1 : 0);
        setActiveIndex((prev) => (prev <= 0 ? total - 1 : prev - 1));
        setIsOpen(true);
      }
    },
    [
      activeIndex,
      filteredSuggestions,
      showCreateOption,
      inputValue,
      addTag,
      removeTag,
      tags.length,
    ]
  );

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      if (val.endsWith(",")) {
        addTag(val.slice(0, -1));
        setIsOpen(true);
        return;
      }
      setInputValue(val);
      onInputChange?.(val);
      setError("");
      setActiveIndex(-1);
      setIsOpen(true);
    },
    [addTag, onInputChange]
  );

  const handleFocus = useCallback(() => {
    setIsOpen(true);
  }, []);

  const handleBlur = useCallback(() => {
    setTimeout(() => {
      if (!containerRef.current?.contains(document.activeElement)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    }, 150);
  }, []);

  const handleSuggestionClick = useCallback(
    (label: string) => {
      addTag(label);
      setIsOpen(false);
      inputRef.current?.focus();
    },
    [addTag]
  );

  const showDropdown =
    isOpen &&
    !isAtLimit &&
    (filteredSuggestions.length > 0 || showCreateOption);

  return (
    <div className={styles.wrapper} ref={containerRef}>
      <div
        className={styles.field}
        onClick={() => inputRef.current?.focus()}
      >
        {tags.map((tag, i) => (
          <span key={tag} className={styles.tag}>
            <span className={styles.tagText}>{tag}</span>
            <button
              type="button"
              className={styles.tagRemove}
              onClick={(e) => {
                e.stopPropagation();
                removeTag(i);
              }}
              aria-label={`${tag} を削除`}
            >
              <svg viewBox="0 0 10 10" width="10" height="10" aria-hidden>
                <line x1="1" y1="1" x2="9" y2="9" />
                <line x1="9" y1="1" x2="1" y2="9" />
              </svg>
            </button>
          </span>
        ))}

        {isAtLimit ? (
          <span className={styles.limitText}>上限に達しました</span>
        ) : (
          <input
            ref={inputRef}
            type="text"
            className={styles.input}
            value={inputValue}
            placeholder={tags.length === 0 ? "タグを入力…" : ""}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={handleBlur}
            aria-autocomplete="list"
            aria-expanded={showDropdown}
            maxLength={MAX_TAG_LENGTH + 1}
          />
        )}
      </div>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      {showDropdown && (
        <ul className={styles.dropdown} ref={dropdownRef} role="listbox">
          {filteredSuggestions.map((s, i) => (
            <li
              key={s.label}
              role="option"
              aria-selected={i === activeIndex}
              className={`${styles.dropdownItem} ${
                i === activeIndex ? styles.dropdownItemActive : ""
              }`}
              onMouseDown={() => handleSuggestionClick(s.label)}
            >
              <span className={styles.dropdownLabel}>{s.label}</span>
              <span className={styles.dropdownCount}>{s.count}</span>
            </li>
          ))}

          {showCreateOption && (
            <li
              role="option"
              aria-selected={activeIndex === filteredSuggestions.length}
              className={`${styles.dropdownItem} ${styles.dropdownCreate} ${
                activeIndex === filteredSuggestions.length
                  ? styles.dropdownItemActive
                  : ""
              }`}
              onMouseDown={() => handleSuggestionClick(inputValue.trim())}
            >
              <span className={styles.dropdownCreateIcon}>＋</span>
              <span>
                「<strong>{inputValue.trim()}</strong>」を新規作成
              </span>
            </li>
          )}
        </ul>
      )}

      <div className={styles.counter}>
        <span className={isAtLimit ? styles.counterLimit : ""}>
          {tags.length}
        </span>
        <span className={styles.counterSep}>/</span>
        <span>{MAX_TAGS}</span>
      </div>
    </div>
  );
}