/**
 * A heading's text with (at most) one accent word: italic Cormorant in --gold-text. Headings
 * themselves are flat --text; this is the only gold in them.
 */
export function Accent({ text, word }: { text: string; word?: string }) {
  const i = word ? text.indexOf(word) : -1;
  if (!word || i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <span className="accent-word">{word}</span>
      {text.slice(i + word.length)}
    </>
  );
}
