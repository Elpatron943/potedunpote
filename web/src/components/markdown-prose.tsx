import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";

export function MarkdownProse({ markdown }: { markdown: string }) {
  return (
    <div className="diy-markdown text-sm leading-relaxed text-ink">
      <ReactMarkdown
        components={{
          h2: ({ children }) => (
            <h2 className="mt-8 border-b border-ink/10 pb-2 text-lg font-semibold text-ink first:mt-0 dark:border-white/10">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-5 text-base font-semibold text-ink">{children}</h3>
          ),
          p: ({ children }) => <p className="mt-3 text-ink-soft first:mt-0">{children}</p>,
          ul: ({ children }) => (
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-ink-soft">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-ink-soft">{children}</ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
          a: ({ href, children }) => (
            <a
              href={href}
              className="font-medium text-teal-700 underline decoration-teal-700/30 underline-offset-2 hover:decoration-teal-700 dark:text-teal-400"
            >
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="mt-4 border-l-4 border-teal-600/40 pl-4 text-ink-soft italic dark:border-teal-500/50">
              {children}
            </blockquote>
          ),
          code: ({ children }): ReactNode => (
            <code className="rounded bg-canvas-muted px-1.5 py-0.5 font-mono text-xs text-ink dark:bg-white/10">
              {children}
            </code>
          ),
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
