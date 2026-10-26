import React from 'react';
import { useTranslation } from '../../providers/TranslationContext';

interface MarkdownContentProps {
  content: string;
  className?: string;
  enableTranslation?: boolean;
}

/**
 * Sanitizes URLs to prevent DOM text from being reinterpreted as HTML (CodeQL CWE-079 / CWE-116).
 * Ensures only http:, https:, or single-slash relative URLs are accepted,
 * strictly rejects any HTML meta-characters (<, >, ", ', `, etc.),
 * and returns the encoded URI string.
 */
export const sanitizeUrl = (rawUrl: string): string | null => {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();

  // Reject dangerous pseudo-protocols and protocol-relative URLs
  if (
    /^(?:javascript|data|vbscript|file):/i.test(trimmed) ||
    trimmed.startsWith('//')
  ) {
    return null;
  }

  // Reject any string containing HTML meta-characters, quotes, or control/markup symbols
  if (/[<>"'`\\^|{}[\]]/i.test(trimmed)) {
    return null;
  }

  // Safe relative paths starting with single '/'
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    try {
      return encodeURI(trimmed);
    } catch {
      return null;
    }
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return encodeURI(parsed.href);
    }
    return null;
  } catch {
    return null;
  }
};


/**
 * Tokenizes inline Markdown syntax with dynamic multilingual translation:
 * - ***bold italic***
 * - **bold**
 * - *italic*
 * - `code`
 * - [link text](url)
 * - ![image](url)
 */
export const renderInlineMarkdown = (
  text: string,
  tText?: (s: string) => string
): React.ReactNode => {
  if (!text) return null;

  // Regex splitting on markdown tokens (images, links, bold/italic, code)
  const regex = /(!\[[^\]]*\]\([^)]+\)|\[[^\]]+\]\([^)]+\)|\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  const parts = text.split(regex);

  const translateStr = (s: string) => (tText ? tText(s) : s);

  return parts.map((part, i) => {
    if (!part) return null;

    // Image: ![alt](url)
    const imgMatch = part.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imgMatch) {
      const alt = imgMatch[1];
      const src = sanitizeUrl(imgMatch[2]);
      if (!src) {
        return (
          <span key={i} className="text-[#717784] italic text-xs">
            {translateStr(alt || 'Invalid image URL')}
          </span>
        );
      }
      return (
        <figure key={i} className="my-6 rounded-2xl overflow-hidden border border-[#e6e8ec] shadow-xs block">
          <img src={src} alt={alt || 'Article Image'} className="w-full h-auto max-h-[520px] object-cover" loading="lazy" />
          {alt && (
            <figcaption className="text-center text-xs text-[#717784] py-2 px-4 bg-slate-50 border-t border-[#e6e8ec] font-medium">
              {translateStr(alt)}
            </figcaption>
          )}
        </figure>
      );
    }

    // Link: [label](url)
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      const href = sanitizeUrl(linkMatch[2]);
      if (!href) {
        return <span key={i}>{translateStr(linkMatch[1])}</span>;
      }
      return (
        <a
          key={i}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#0f2f63] font-medium underline hover:text-[#2563c9] transition-colors"
        >
          {translateStr(linkMatch[1])}
        </a>
      );
    }

    // Bold + Italic: ***text***
    if (part.startsWith('***') && part.endsWith('***') && part.length >= 6) {
      return (
        <strong key={i} className="font-bold text-[#0a0a0a]">
          <em className="italic">{translateStr(part.slice(3, -3))}</em>
        </strong>
      );
    }

    // Bold: **text**
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return (
        <strong key={i} className="font-bold text-[#0a0a0a]">
          {translateStr(part.slice(2, -2))}
        </strong>
      );
    }

    // Italic: *text*
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      return (
        <em key={i} className="italic text-[#1f2937]">
          {translateStr(part.slice(1, -1))}
        </em>
      );
    }

    // Inline Code: `code`
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code key={i} className="px-1.5 py-0.5 bg-[#f4f4f4] text-[#0f2f63] font-mono rounded text-xs">
          {part.slice(1, -1)}
        </code>
      );
    }

    // Normal plain text
    return translateStr(part);
  });
};

/**
 * Universal Markdown Block Formatter for TrustHyre articles and previews.
 * Correctly renders headings, bullet lists, ordered lists, blockquotes, horizontal rules,
 * tables, images, and paragraphs with inline bold/italics and dynamic multilingual translation.
 */
export const MarkdownContent: React.FC<MarkdownContentProps> = ({
  content,
  className = '',
  enableTranslation = true
}) => {
  const { translate, language } = useTranslation();

  const tText = (text: string): string => {
    if (!enableTranslation || !text || language === 'en') return text;
    return translate(text);
  };

  if (!content) return null;

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];

  let currentParagraph: string[] = [];
  let currentBulletList: string[] = [];
  let currentNumberedList: string[] = [];
  let currentBlockquote: string[] = [];
  let currentTableRows: string[][] = [];

  const flushParagraph = (keyPrefix: string) => {
    if (currentParagraph.length > 0) {
      const text = currentParagraph.join(' ');
      elements.push(
        <p key={`${keyPrefix}-p`} className="text-sm sm:text-base text-[#374151] leading-relaxed mb-4 font-normal">
          {renderInlineMarkdown(text, tText)}
        </p>
      );
      currentParagraph = [];
    }
  };

  const flushBulletList = (keyPrefix: string) => {
    if (currentBulletList.length > 0) {
      elements.push(
        <ul key={`${keyPrefix}-ul`} className="list-disc pl-6 space-y-2 mb-5 text-[#374151]">
          {currentBulletList.map((item, idx) => (
            <li key={idx} className="text-sm sm:text-base leading-relaxed pl-1">
              {renderInlineMarkdown(item, tText)}
            </li>
          ))}
        </ul>
      );
      currentBulletList = [];
    }
  };

  const flushNumberedList = (keyPrefix: string) => {
    if (currentNumberedList.length > 0) {
      elements.push(
        <ol key={`${keyPrefix}-ol`} className="list-decimal pl-6 space-y-2 mb-5 text-[#374151]">
          {currentNumberedList.map((itemText, idx) => (
            <li key={idx} className="text-sm sm:text-base leading-relaxed pl-1">
              {renderInlineMarkdown(itemText, tText)}
            </li>
          ))}
        </ol>
      );
      currentNumberedList = [];
    }
  };

  const flushBlockquote = (keyPrefix: string) => {
    if (currentBlockquote.length > 0) {
      const text = currentBlockquote.join(' ');
      elements.push(
        <blockquote key={`${keyPrefix}-bq`} className="border-l-4 border-[#0f2f63] bg-[#f8fafc] rounded-r-2xl p-4 sm:p-5 my-6 text-sm sm:text-base text-[#0a0a0a] shadow-2xs">
          {renderInlineMarkdown(text, tText)}
        </blockquote>
      );
      currentBlockquote = [];
    }
  };

  const flushTable = (keyPrefix: string) => {
    if (currentTableRows.length > 1) {
      const [headerRow, ...bodyRows] = currentTableRows;
      elements.push(
        <div key={`${keyPrefix}-tbl`} className="my-6 overflow-x-auto rounded-2xl border border-[#e6e8ec] shadow-2xs">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[#f4f4f4] border-b border-[#e6e8ec] text-[#0a0a0a] font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                {headerRow.map((cell, idx) => (
                  <th key={idx} className="px-4 py-3">
                    {renderInlineMarkdown(cell, tText)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e6e8ec] bg-white">
              {bodyRows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-[#fafbfc] transition-colors">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="px-4 py-3 text-[#374151]">
                      {renderInlineMarkdown(cell, tText)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    currentTableRows = [];
  };

  const flushAll = (keyPrefix: string) => {
    flushParagraph(keyPrefix);
    flushBulletList(keyPrefix);
    flushNumberedList(keyPrefix);
    flushBlockquote(keyPrefix);
    flushTable(keyPrefix);
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    const keyPrefix = `block-${index}`;

    // Table rows: | Col 1 | Col 2 |
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      // Check if it's a separator line like |---|---|
      if (/^\|[\s-:]+(\|[\s-:]+)+\|$/.test(trimmed)) {
        return; // Ignore divider row
      }
      flushParagraph(keyPrefix);
      flushBulletList(keyPrefix);
      flushNumberedList(keyPrefix);
      flushBlockquote(keyPrefix);

      const cells = trimmed
        .slice(1, -1)
        .split('|')
        .map((c) => c.trim());
      currentTableRows.push(cells);
      return;
    }

    // If we were parsing a table and current line is not a table row, flush it
    if (currentTableRows.length > 0) {
      flushTable(keyPrefix);
    }

    // Standalone Image: ![alt](url)
    if (trimmed.startsWith('![') && trimmed.endsWith(')')) {
      flushAll(keyPrefix);
      elements.push(
        <div key={keyPrefix}>
          {renderInlineMarkdown(trimmed, tText)}
        </div>
      );
      return;
    }

    // Heading 1: #
    if (trimmed.startsWith('# ')) {
      flushAll(keyPrefix);
      elements.push(
        <h1 key={keyPrefix} className="text-xl sm:text-2xl font-bold uppercase tracking-tight text-[#0a0a0a] mt-8 mb-4 pb-2 border-b border-[#e6e8ec]">
          {renderInlineMarkdown(trimmed.replace(/^#\s+/, ''), tText)}
        </h1>
      );
    }
    // Heading 2: ##
    else if (trimmed.startsWith('## ')) {
      flushAll(keyPrefix);
      elements.push(
        <h2 key={keyPrefix} className="text-lg sm:text-xl font-bold uppercase tracking-tight text-[#0a0a0a] mt-8 mb-4 pb-2 border-b border-[#e6e8ec]">
          {renderInlineMarkdown(trimmed.replace(/^##\s+/, ''), tText)}
        </h2>
      );
    }
    // Heading 3: ###
    else if (trimmed.startsWith('### ')) {
      flushAll(keyPrefix);
      elements.push(
        <h3 key={keyPrefix} className="text-base sm:text-lg font-bold text-[#0a0a0a] mt-6 mb-2">
          {renderInlineMarkdown(trimmed.replace(/^###\s+/, ''), tText)}
        </h3>
      );
    }
    // Heading 4: ####
    else if (trimmed.startsWith('#### ')) {
      flushAll(keyPrefix);
      elements.push(
        <h4 key={keyPrefix} className="text-sm sm:text-base font-bold text-[#0a0a0a] mt-4 mb-2">
          {renderInlineMarkdown(trimmed.replace(/^####\s+/, ''), tText)}
        </h4>
      );
    }
    // Horizontal Rule: --- or ***
    else if (trimmed === '---' || trimmed === '***') {
      flushAll(keyPrefix);
      elements.push(
        <hr key={keyPrefix} className="my-8 border-[#e6e8ec]" />
      );
    }
    // Blockquote: >
    else if (trimmed.startsWith('> ') || trimmed === '>') {
      flushParagraph(keyPrefix);
      flushBulletList(keyPrefix);
      flushNumberedList(keyPrefix);
      currentBlockquote.push(trimmed.replace(/^>\s*/, ''));
    }
    // Bullet List: - or * or •
    else if (/^[-*•]\s+/.test(trimmed)) {
      flushParagraph(keyPrefix);
      flushNumberedList(keyPrefix);
      flushBlockquote(keyPrefix);
      currentBulletList.push(trimmed.replace(/^[-*•]\s+/, ''));
    }
    // Numbered List: 1. or 2.
    else if (/^\d+\.\s+/.test(trimmed)) {
      flushParagraph(keyPrefix);
      flushBulletList(keyPrefix);
      flushBlockquote(keyPrefix);
      const itemText = trimmed.replace(/^\d+\.\s+/, '');
      currentNumberedList.push(itemText);
    }
    // Normal paragraph text
    else if (trimmed.length > 0) {
      flushBulletList(keyPrefix);
      flushNumberedList(keyPrefix);
      flushBlockquote(keyPrefix);
      currentParagraph.push(trimmed);
    }
    // Empty line -> flush blocks
    else {
      flushAll(keyPrefix);
    }
  });

  flushAll('final');

  return <div className={`blog-markdown-content space-y-1 ${className}`}>{elements}</div>;
};
