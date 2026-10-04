"use client";
import { useRef, useState } from "react";

/** Code block with a copy button. Used for every fenced block in the MDX content. */
export default function Pre(props: React.ComponentProps<"pre">) {
  const ref = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);
  function copy() {
    const text = ref.current?.textContent ?? "";
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => {});
  }
  return (
    <div className="code">
      <button className="copy" type="button" onClick={copy}>{copied ? "اتنسخ" : "نسخ"}</button>
      <pre ref={ref} {...props} />
    </div>
  );
}
