"use client";

export function SearchTrigger() {
  return (
    <button
      onClick={() => {
        window.dispatchEvent(
          new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true })
        );
      }}
      className="flex items-center gap-2 h-8 px-3 rounded-lg border border-border bg-muted/50 text-sm text-muted-foreground hover:bg-muted transition-colors"
    >
      <svg
        className="w-3.5 h-3.5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      Search
      <kbd className="text-xs border border-border rounded px-1 py-0.5 ml-1">⌘K</kbd>
    </button>
  );
}
