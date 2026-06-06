'use client';

import {
  ArrowLeft,
  CheckCircle2,
  Clipboard,
  Download,
  ExternalLink,
  FileText,
  PencilLine,
  Save,
  Sparkles,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  type AutomationOutputItem,
  getAutomationStorageChangedEventName,
  readAutomationOutputs,
  writeAutomationOutputs,
} from '@/lib/vault/localVault';


const getWordCount = (content: string) => {
  return content.trim().split(/\s+/).filter(Boolean).length;
};

const getReadingTime = (wordCount: number) => {
  return Math.max(1, Math.ceil(wordCount / 220));
};

const getMarkdownFilename = (title: string) => {
  return `${title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'etherana-output'}.md`;
};

const renderPrintableInlineMarkdown = (value: string) => {
  return escapeHtml(value)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noreferrer">$1</a>',
    )
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
};

const renderPrintableTable = (rows: string[]) => {
  const parsedRows = rows.map((row) =>
    row
      .trim()
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((cell) => cell.trim()),
  );

  const bodyRows = parsedRows.filter(
    (row) => !row.every((cell) => /^:?-{3,}:?$/.test(cell)),
  );

  if (bodyRows.length === 0) return '';

  const [header, ...body] = bodyRows;

  return `<table>
    <thead>
      <tr>${header
        .map((cell) => `<th>${renderPrintableInlineMarkdown(cell)}</th>`)
        .join('')}</tr>
    </thead>
    <tbody>
      ${body
        .map(
          (row) =>
            `<tr>${row
              .map((cell) => `<td>${renderPrintableInlineMarkdown(cell)}</td>`)
              .join('')}</tr>`,
        )
        .join('')}
    </tbody>
  </table>`;
};

const renderPrintableMarkdown = (markdown: string) => {
  const lines = markdown.split('\n');
  const html: string[] = [];
  let paragraph: string[] = [];
  let listType: 'ul' | 'ol' | null = null;
  let codeBlock: string[] = [];
  let inCodeBlock = false;

  const closeParagraph = () => {
    if (paragraph.length === 0) return;

    html.push(
      `<p>${paragraph.map(renderPrintableInlineMarkdown).join('<br />')}</p>`,
    );
    paragraph = [];
  };

  const closeList = () => {
    if (!listType) return;

    html.push(`</${listType}>`);
    listType = null;
  };

  const openList = (type: 'ul' | 'ol') => {
    closeParagraph();

    if (listType === type) return;

    closeList();
    listType = type;
    html.push(`<${type}>`);
  };

  const closeCodeBlock = () => {
    if (!inCodeBlock) return;

    html.push(`<pre class="code">${escapeHtml(codeBlock.join('\n'))}</pre>`);
    codeBlock = [];
    inCodeBlock = false;
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();

    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        closeCodeBlock();
      } else {
        closeParagraph();
        closeList();
        inCodeBlock = true;
        codeBlock = [];
      }

      continue;
    }

    if (inCodeBlock) {
      codeBlock.push(line);
      continue;
    }

    if (!trimmed) {
      closeParagraph();
      closeList();
      continue;
    }

    if (
      trimmed.includes('|') &&
      lines[index + 1]?.trim().match(/^\|?\s*:?-{3,}:?/)
    ) {
      closeParagraph();
      closeList();

      const tableRows = [trimmed];
      index += 1;

      while (index < lines.length && lines[index].trim().includes('|')) {
        tableRows.push(lines[index].trim());
        index += 1;
      }

      index -= 1;
      html.push(renderPrintableTable(tableRows));
      continue;
    }

    if (/^---+$/.test(trimmed)) {
      closeParagraph();
      closeList();
      html.push('<hr />');
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);

    if (headingMatch) {
      closeParagraph();
      closeList();

      const level = Math.min(headingMatch[1].length, 4);
      html.push(
        `<h${level}>${renderPrintableInlineMarkdown(headingMatch[2])}</h${level}>`,
      );
      continue;
    }

    if (trimmed.startsWith('> ')) {
      closeParagraph();
      closeList();
      html.push(
        `<blockquote>${renderPrintableInlineMarkdown(trimmed.slice(2))}</blockquote>`,
      );
      continue;
    }

    const unorderedMatch = trimmed.match(/^[-*]\s+(.+)$/);

    if (unorderedMatch) {
      openList('ul');
      html.push(`<li>${renderPrintableInlineMarkdown(unorderedMatch[1])}</li>`);
      continue;
    }

    const orderedMatch = trimmed.match(/^\d+\.\s+(.+)$/);

    if (orderedMatch) {
      openList('ol');
      html.push(`<li>${renderPrintableInlineMarkdown(orderedMatch[1])}</li>`);
      continue;
    }

    paragraph.push(trimmed);
  }

  closeCodeBlock();
  closeParagraph();
  closeList();

  return html.join('\n');
};

const renderInlineMarkdown = (text: string) => {
  const parts = text.split(
    /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\)|\*[^*]+\*)/g,
  );

  return parts.map((part, index) => {
    if (!part) return null;

    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-semibold text-black dark:text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }

    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <em key={index} className="italic text-black/75 dark:text-white/75">
          {part.slice(1, -1)}
        </em>
      );
    }

    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={index}
          className="rounded-md bg-light-secondary px-1.5 py-0.5 text-sm text-black/75 dark:bg-dark-secondary dark:text-white/75"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);

    if (linkMatch) {
      return (
        <a
          key={index}
          href={linkMatch[2]}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-blue-500 hover:underline"
        >
          {linkMatch[1]}
        </a>
      );
    }

    return <span key={index}>{part}</span>;
  });
};

const isMarkdownTableRow = (line: string) => {
  const trimmed = line.trim();
  return trimmed.startsWith('|') && trimmed.endsWith('|');
};

const isMarkdownTableSeparator = (line: string) => {
  return /^[|:\-\s]+$/.test(line.trim());
};

const parseMarkdownTableRow = (line: string) => {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
};

const renderMarkdownTable = (rows: string[], key: number) => {
  const cleanRows = rows.filter((row) => !isMarkdownTableSeparator(row));

  if (cleanRows.length === 0) return null;

  const [headerRow, ...bodyRows] = cleanRows.map(parseMarkdownTableRow);

  return (
    <div
      key={`table-${key}`}
      className="my-7 overflow-x-auto rounded-2xl border border-light-200 dark:border-dark-200"
    >
      <table className="w-full min-w-[720px] border-collapse text-left text-sm">
        <thead className="bg-light-secondary dark:bg-dark-secondary">
          <tr>
            {headerRow.map((cell, index) => (
              <th
                key={index}
                className="border-b border-light-200 px-4 py-3 font-semibold text-black dark:border-dark-200 dark:text-white"
              >
                {renderInlineMarkdown(cell)}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {bodyRows.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className="border-b border-light-200 last:border-0 dark:border-dark-200"
            >
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className="align-top px-4 py-3 leading-relaxed text-black/70 dark:text-white/70"
                >
                  {renderInlineMarkdown(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const renderMarkdownPreview = (content: string) => {
  const lines = content.split('\n');
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      blocks.push(<div key={index} className="h-4" />);
      index += 1;
      continue;
    }

    if (isMarkdownTableRow(trimmed)) {
      const tableRows: string[] = [];

      while (index < lines.length) {
        const currentLine = lines[index];
        const currentTrimmed = currentLine.trim();

        if (isMarkdownTableRow(currentTrimmed)) {
          tableRows.push(currentLine);
          index += 1;
          continue;
        }

        if (!currentTrimmed) {
          const nextNonEmptyIndex = lines.findIndex(
            (candidate, candidateIndex) =>
              candidateIndex > index && candidate.trim().length > 0,
          );

          if (
            nextNonEmptyIndex !== -1 &&
            isMarkdownTableRow(lines[nextNonEmptyIndex].trim())
          ) {
            index += 1;
            continue;
          }
        }

        break;
      }

      blocks.push(renderMarkdownTable(tableRows, index));
      continue;
    }

    if (trimmed.startsWith('# ')) {
      blocks.push(
        <h1
          key={index}
          className="mb-5 mt-8 text-3xl font-bold tracking-tight text-black first:mt-0 dark:text-white"
        >
          {renderInlineMarkdown(trimmed.replace(/^#\s+/, ''))}
        </h1>,
      );
      index += 1;
      continue;
    }

    if (trimmed.startsWith('## ')) {
      blocks.push(
        <h2
          key={index}
          className="mb-4 mt-7 text-2xl font-bold tracking-tight text-black dark:text-white"
        >
          {renderInlineMarkdown(trimmed.replace(/^##\s+/, ''))}
        </h2>,
      );
      index += 1;
      continue;
    }

    if (trimmed.startsWith('### ')) {
      blocks.push(
        <h3
          key={index}
          className="mb-3 mt-6 text-xl font-semibold text-black dark:text-white"
        >
          {renderInlineMarkdown(trimmed.replace(/^###\s+/, ''))}
        </h3>,
      );
      index += 1;
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      blocks.push(
        <div
          key={index}
          className="my-2 flex gap-3 text-base leading-relaxed text-black/75 dark:text-white/75"
        >
          <span className="mt-[0.65em] h-1.5 w-1.5 shrink-0 rounded-full bg-black/35 dark:bg-white/35" />
          <p>{renderInlineMarkdown(trimmed.replace(/^[-*]\s+/, ''))}</p>
        </div>,
      );
      index += 1;
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const number = trimmed.match(/^(\d+)\./)?.[1];

      blocks.push(
        <div
          key={index}
          className="my-2 flex gap-3 text-base leading-relaxed text-black/75 dark:text-white/75"
        >
          <span className="shrink-0 font-semibold text-black/45 dark:text-white/45">
            {number}.
          </span>
          <p>{renderInlineMarkdown(trimmed.replace(/^\d+\.\s+/, ''))}</p>
        </div>,
      );
      index += 1;
      continue;
    }

    if (trimmed.startsWith('> ')) {
      blocks.push(
        <blockquote
          key={index}
          className="my-5 border-l-4 border-black/20 pl-4 text-base italic leading-relaxed text-black/65 dark:border-white/20 dark:text-white/65"
        >
          {renderInlineMarkdown(trimmed.replace(/^>\s+/, ''))}
        </blockquote>,
      );
      index += 1;
      continue;
    }

    if (trimmed === '---') {
      blocks.push(
        <hr
          key={index}
          className="my-8 border-light-200 dark:border-dark-200"
        />,
      );
      index += 1;
      continue;
    }

    blocks.push(
      <p
        key={index}
        className="my-3 text-base leading-8 text-black/75 dark:text-white/75"
      >
        {renderInlineMarkdown(line)}
      </p>,
    );

    index += 1;
  }

  return blocks;
};

const escapeHtml = (value: string) => {
  return value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };

    return entities[char] ?? char;
  });
};

const renderInlineMarkdownToHtml = (value: string) => {
  const parts = value.split(
    /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\)|\*[^*]+\*)/g,
  );

  return parts
    .map((part) => {
      if (!part) return '';

      if (part.startsWith('**') && part.endsWith('**')) {
        return `<strong>${escapeHtml(part.slice(2, -2))}</strong>`;
      }

      if (part.startsWith('*') && part.endsWith('*')) {
        return `<em>${escapeHtml(part.slice(1, -1))}</em>`;
      }

      if (part.startsWith('`') && part.endsWith('`')) {
        return `<code>${escapeHtml(part.slice(1, -1))}</code>`;
      }

      const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);

      if (linkMatch) {
        return `<a href="${escapeHtml(linkMatch[2])}">${escapeHtml(
          linkMatch[1],
        )}</a>`;
      }

      return escapeHtml(part);
    })
    .join('');
};

const markdownToHtml = (content: string, title: string) => {
  const lines = content.split('\n');
  const blocks: string[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    if (isMarkdownTableRow(trimmed)) {
      const tableRows: string[] = [];

      while (index < lines.length) {
        const currentLine = lines[index];
        const currentTrimmed = currentLine.trim();

        if (isMarkdownTableRow(currentTrimmed)) {
          tableRows.push(currentLine);
          index += 1;
          continue;
        }

        break;
      }

      const cleanRows = tableRows.filter(
        (row) => !isMarkdownTableSeparator(row),
      );

      if (cleanRows.length > 0) {
        const [headerRow, ...bodyRows] = cleanRows.map(parseMarkdownTableRow);

        blocks.push(`
          <table>
            <thead>
              <tr>
                ${headerRow
                  .map((cell) => `<th>${renderInlineMarkdownToHtml(cell)}</th>`)
                  .join('')}
              </tr>
            </thead>
            <tbody>
              ${bodyRows
                .map(
                  (row) => `
                    <tr>
                      ${row
                        .map(
                          (cell) =>
                            `<td>${renderInlineMarkdownToHtml(cell)}</td>`,
                        )
                        .join('')}
                    </tr>
                  `,
                )
                .join('')}
            </tbody>
          </table>
        `);
      }

      continue;
    }

    if (trimmed.startsWith('# ')) {
      blocks.push(`<h1>${renderInlineMarkdownToHtml(trimmed.replace(/^#\s+/, ''))}</h1>`);
      index += 1;
      continue;
    }

    if (trimmed.startsWith('## ')) {
      blocks.push(`<h2>${renderInlineMarkdownToHtml(trimmed.replace(/^##\s+/, ''))}</h2>`);
      index += 1;
      continue;
    }

    if (trimmed.startsWith('### ')) {
      blocks.push(`<h3>${renderInlineMarkdownToHtml(trimmed.replace(/^###\s+/, ''))}</h3>`);
      index += 1;
      continue;
    }

    if (trimmed.startsWith('#### ')) {
      blocks.push(`<h4>${renderInlineMarkdownToHtml(trimmed.replace(/^####\s+/, ''))}</h4>`);
      index += 1;
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      const items: string[] = [];

      while (index < lines.length && /^[-*]\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^[-*]\s+/, ''));
        index += 1;
      }

      blocks.push(
        `<ul>${items
          .map((item) => `<li>${renderInlineMarkdownToHtml(item)}</li>`)
          .join('')}</ul>`,
      );
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];

      while (index < lines.length && /^\d+\.\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^\d+\.\s+/, ''));
        index += 1;
      }

      blocks.push(
        `<ol>${items
          .map((item) => `<li>${renderInlineMarkdownToHtml(item)}</li>`)
          .join('')}</ol>`,
      );
      continue;
    }

    if (trimmed === '---') {
      blocks.push('<hr />');
      index += 1;
      continue;
    }

    blocks.push(`<p>${renderInlineMarkdownToHtml(line)}</p>`);
    index += 1;
  }

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.65; color: #111827; }
          table { width: 100%; border-collapse: collapse; margin: 18px 0; font-size: 14px; }
          th, td { border: 1px solid #d1d5db; padding: 8px 10px; vertical-align: top; }
          th { background: #f3f4f6; font-weight: 700; }
          h1, h2, h3, h4 { margin-top: 24px; margin-bottom: 12px; line-height: 1.25; }
          p { margin: 10px 0; }
          code { background: #f3f4f6; padding: 2px 4px; border-radius: 4px; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(title)}</h1>
        ${blocks.join('\n')}
      </body>
    </html>
  `;
};


const OutputDetailPage = () => {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [outputs, setOutputs] = useState<AutomationOutputItem[]>([]);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);

  const refreshOutput = () => {
    const storedOutputs = readAutomationOutputs();
    const output = storedOutputs.find((item) => item.id === params.id);

    setOutputs(storedOutputs);

    if (output) {
      setTitle(output.title);
      setContent(output.content ?? '');
      setIsEditing(!output.content?.trim());
    }
  };

  useEffect(() => {
    refreshOutput();

    const automationStorageChangedEvent = getAutomationStorageChangedEventName();

    window.addEventListener(automationStorageChangedEvent, refreshOutput);
    window.addEventListener('focus', refreshOutput);

    return () => {
      window.removeEventListener(automationStorageChangedEvent, refreshOutput);
      window.removeEventListener('focus', refreshOutput);
    };
  }, [params.id]);

  const output = useMemo(() => {
    return outputs.find((item) => item.id === params.id);
  }, [outputs, params.id]);

  const wordCount = getWordCount(content);
  const readingTime = getReadingTime(wordCount);

  const saveOutput = () => {
    if (!output) return;

    const updatedOutput: AutomationOutputItem = {
      ...output,
      title: title.trim() || output.title,
      content,
      status: content.trim().length > 0 ? 'ready' : 'drafting',
      updatedAt: new Date().toISOString(),
    };

    const nextOutputs = outputs.map((item) =>
      item.id === output.id ? updatedOutput : item,
    );

    setOutputs(nextOutputs);
    writeAutomationOutputs(nextOutputs);
    setIsEditing(false);
  };

  const copyOutput = async () => {
    if (!content.trim() || !output) return;

    const html = markdownToHtml(content, title || output.title);
    const plainText = `${title || output.title}\n\n${content}`;

    try {
      if ('ClipboardItem' in window) {
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': new Blob([html], { type: 'text/html' }),
            'text/plain': new Blob([plainText], { type: 'text/plain' }),
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(plainText);
      }

      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      await navigator.clipboard.writeText(plainText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    }
  };

  const downloadOutput = () => {
    if (!output) return;

    const markdown = `# ${title || output.title}\n\n${content}`;
    const blob = new Blob([markdown], {
      type: 'text/markdown;charset=utf-8',
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = getMarkdownFilename(title || output.title);
    anchor.click();

    URL.revokeObjectURL(url);
  };

  const printOutputAsPdf = () => {
    if (!output) return;

    const printableTitle = title || output.title;
    const printableContent = content.trim();
    const printableWindow = window.open('', '_blank');

    if (!printableWindow) {
      window.alert('Could not open the print window. Please allow pop-ups for Etherana SX.');
      return;
    }

    printableWindow.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(printableTitle)}</title>
  <style>
    body {
      margin: 0;
      background: #f5f5f5;
      color: #111;
      font-family: Inter, Arial, sans-serif;
      line-height: 1.65;
    }

    main {
      max-width: 850px;
      margin: 0 auto;
      background: #fff;
      min-height: 100vh;
      padding: 48px;
    }

    h1 {
      margin: 0 0 28px;
      font-size: 30px;
      line-height: 1.2;
    }

    .content {
      font-size: 15px;
    }

    .content h1,
    .content h2,
    .content h3,
    .content h4 {
      margin: 28px 0 12px;
      line-height: 1.25;
    }

    .content h1 {
      font-size: 28px;
    }

    .content h2 {
      font-size: 23px;
      border-bottom: 1px solid #e5e5e5;
      padding-bottom: 8px;
    }

    .content h3 {
      font-size: 18px;
    }

    .content p {
      margin: 0 0 14px;
    }

    .content strong {
      font-weight: 750;
    }

    .content em {
      color: #333;
    }

    .content blockquote {
      margin: 18px 0;
      border-left: 4px solid #111;
      padding: 10px 16px;
      background: #f7f7f7;
      color: #333;
    }

    .content ul,
    .content ol {
      margin: 0 0 18px 22px;
      padding: 0;
    }

    .content li {
      margin: 6px 0;
    }

    .content table {
      width: 100%;
      border-collapse: collapse;
      margin: 18px 0 24px;
      font-size: 13px;
    }

    .content th,
    .content td {
      border: 1px solid #ddd;
      padding: 9px 10px;
      text-align: left;
      vertical-align: top;
    }

    .content th {
      background: #f1f1f1;
      font-weight: 750;
    }

    .content hr {
      border: 0;
      border-top: 1px solid #ddd;
      margin: 28px 0;
    }

    .content code {
      border-radius: 5px;
      background: #f1f1f1;
      padding: 2px 5px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.92em;
    }

    .content pre.code {
      white-space: pre-wrap;
      word-wrap: break-word;
      border-radius: 12px;
      background: #111;
      color: #fff;
      padding: 16px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 13px;
      overflow: auto;
    }

    .content a {
      color: #111;
      text-decoration: underline;
    }

    @media print {
      body {
        background: #fff;
      }

      main {
        padding: 0;
      }

      .no-print {
        display: none;
      }
    }
  </style>
</head>
<body>
  <main>
    <article class="content">${renderPrintableMarkdown(printableContent)}</article>
  </main>
</body>
</html>`);

    printableWindow.document.close();

    window.setTimeout(() => {
      printableWindow.focus();
      printableWindow.print();
    }, 250);
  };

  const deleteOutput = () => {
    if (!output) return;

    const confirmed = window.confirm(
      `Delete "${output.title}"? This cannot be undone.`,
    );

    if (!confirmed) return;

    const nextOutputs = outputs.filter((item) => item.id !== output.id);
    writeAutomationOutputs(nextOutputs);
    router.push('/tasks');
  };

  if (!output) {
    return (
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-10">
        <Link
          href="/tasks"
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-black/55 transition hover:text-black dark:text-white/55 dark:hover:text-white"
        >
          <ArrowLeft size={16} />
          Back to Automations
        </Link>

        <div className="rounded-3xl border border-light-200 bg-light-secondary p-8 dark:border-dark-200 dark:bg-dark-secondary">
          <h1 className="text-3xl font-bold text-black dark:text-white">
            Output not found
          </h1>

          <p className="mt-3 text-black/60 dark:text-white/60">
            This output may have been deleted or created in another browser.
          </p>
        </div>
      </div>
    );
  }

  const spaceId = output.outputDestination.startsWith('space:')
    ? output.outputDestination.replace('space:', '')
    : null;

  return (
    <div className="min-h-screen bg-light-primary px-6 py-10 dark:bg-dark-primary lg:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex w-fit items-center gap-2 text-sm font-medium text-black/55 transition hover:text-black dark:text-white/55 dark:hover:text-white"
          >
            <ArrowLeft size={16} />
            Back
          </button>

          <div className="flex flex-wrap gap-3">
            {spaceId && (
              <Link
                href={`/spaces/${spaceId}`}
                className="inline-flex items-center gap-2 rounded-full border border-light-200 px-4 py-2 text-sm font-semibold text-black/65 transition hover:bg-light-secondary hover:text-black dark:border-dark-200 dark:text-white/65 dark:hover:bg-dark-secondary dark:hover:text-white"
              >
                <ExternalLink size={15} />
                Space
              </Link>
            )}

            <Link
              href={`/tasks?automation=${output.automationId}`}
              className="inline-flex items-center gap-2 rounded-full border border-light-200 px-4 py-2 text-sm font-semibold text-black/65 transition hover:bg-light-secondary hover:text-black dark:border-dark-200 dark:text-white/65 dark:hover:bg-dark-secondary dark:hover:text-white"
            >
              <ExternalLink size={15} />
              Automation
            </Link>

            <button
              type="button"
              onClick={copyOutput}
              disabled={!content.trim()}
              className="inline-flex items-center gap-2 rounded-full border border-light-200 px-4 py-2 text-sm font-semibold text-black/65 transition hover:bg-light-secondary hover:text-black disabled:cursor-not-allowed disabled:opacity-40 dark:border-dark-200 dark:text-white/65 dark:hover:bg-dark-secondary dark:hover:text-white"
            >
              <Clipboard size={15} />
              {copied ? 'Copied' : 'Copy formatted'}
            </button>

            <button
              type="button"
              onClick={downloadOutput}
              disabled={!content.trim()}
              className="inline-flex items-center gap-2 rounded-full border border-light-200 px-4 py-2 text-sm font-semibold text-black/65 transition hover:bg-light-secondary hover:text-black disabled:cursor-not-allowed disabled:opacity-40 dark:border-dark-200 dark:text-white/65 dark:hover:bg-dark-secondary dark:hover:text-white"
            >
              <Download size={15} />
              Download .md
            </button>

            <button
              type="button"
              onClick={printOutputAsPdf}
              disabled={!content.trim()}
              className="inline-flex items-center gap-2 rounded-full border border-light-200 px-4 py-2 text-sm font-semibold text-black/65 transition hover:bg-light-secondary hover:text-black disabled:cursor-not-allowed disabled:opacity-40 dark:border-dark-200 dark:text-white/65 dark:hover:bg-dark-secondary dark:hover:text-white"
            >
              <FileText size={15} />
              Print / Save PDF
            </button>

            <button
              type="button"
              onClick={deleteOutput}
              className="inline-flex items-center gap-2 rounded-full border border-red-500/20 px-4 py-2 text-sm font-semibold text-red-500 transition hover:bg-red-500/10"
            >
              <Trash2 size={15} />
              Delete
            </button>
          </div>
        </div>

        <header className="rounded-[2rem] border border-light-200 bg-light-secondary p-7 shadow-sm dark:border-dark-200 dark:bg-dark-secondary">
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-light-primary px-3 py-1 text-xs font-semibold text-black/50 dark:bg-dark-primary dark:text-white/50">
              <FileText size={14} />
              {output.outputType}
            </span>

            <span className="rounded-full bg-light-primary px-3 py-1 text-xs font-semibold capitalize text-black/50 dark:bg-dark-primary dark:text-white/50">
              {output.status}
            </span>

            <span className="rounded-full bg-light-primary px-3 py-1 text-xs font-semibold text-black/50 dark:bg-dark-primary dark:text-white/50">
              Save to {output.outputDestinationLabel}
            </span>

            {content.trim() && (
              <>
                <span className="rounded-full bg-light-primary px-3 py-1 text-xs font-semibold text-black/50 dark:bg-dark-primary dark:text-white/50">
                  {wordCount} words
                </span>

                <span className="rounded-full bg-light-primary px-3 py-1 text-xs font-semibold text-black/50 dark:bg-dark-primary dark:text-white/50">
                  {readingTime} min read
                </span>
              </>
            )}
          </div>

          {isEditing ? (
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-2xl border border-light-200 bg-light-primary px-4 py-3 text-3xl font-bold tracking-tight text-black outline-none transition focus:border-black dark:border-dark-200 dark:bg-dark-primary dark:text-white dark:focus:border-white"
            />
          ) : (
            <h1 className="max-w-4xl text-4xl font-bold tracking-tight text-black dark:text-white md:text-5xl">
              {output.title}
            </h1>
          )}

          <p className="mt-5 text-sm leading-relaxed text-black/55 dark:text-white/55">
            Created from <strong>{output.automationName}</strong> on{' '}
            {new Date(output.createdAt).toLocaleString()}.
            {output.updatedAt && (
              <> Last updated {new Date(output.updatedAt).toLocaleString()}.</>
            )}
          </p>
        </header>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
          <main className="rounded-[2rem] border border-light-200 bg-light-secondary p-7 shadow-sm dark:border-dark-200 dark:bg-dark-secondary">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-black/40 dark:text-white/40">
                  Output content
                </p>

                <h2 className="text-xl font-semibold text-black dark:text-white">
                  {isEditing ? 'Editor' : 'Preview'}
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={copyOutput}
                  disabled={!content.trim()}
                  className="inline-flex items-center gap-2 rounded-full border border-light-200 px-4 py-2 text-sm font-semibold text-black/65 transition hover:bg-light-primary hover:text-black disabled:cursor-not-allowed disabled:opacity-40 dark:border-dark-200 dark:text-white/65 dark:hover:bg-dark-primary dark:hover:text-white"
                >
                  <Clipboard size={15} />
                  {copied ? 'Copied' : 'Copy formatted'}
                </button>

                <button
                  type="button"
                  onClick={downloadOutput}
                  disabled={!content.trim()}
                  className="inline-flex items-center gap-2 rounded-full border border-light-200 px-4 py-2 text-sm font-semibold text-black/65 transition hover:bg-light-primary hover:text-black disabled:cursor-not-allowed disabled:opacity-40 dark:border-dark-200 dark:text-white/65 dark:hover:bg-dark-primary dark:hover:text-white"
                >
                  <Download size={15} />
                  Download
                </button>

                <button
                  type="button"
                  onClick={() => setIsEditing((current) => !current)}
                  className="inline-flex items-center gap-2 rounded-full border border-light-200 px-4 py-2 text-sm font-semibold text-black/65 transition hover:bg-light-primary hover:text-black dark:border-dark-200 dark:text-white/65 dark:hover:bg-dark-primary dark:hover:text-white"
                >
                  <PencilLine size={15} />
                  {isEditing ? 'Preview' : 'Edit'}
                </button>
              </div>
            </div>

            {isEditing ? (
              <div>
                <textarea
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  placeholder="Paste, edit, or refine the final generated article/report here..."
                  rows={22}
                  className="w-full resize-none rounded-2xl border border-light-200 bg-light-primary px-4 py-3 text-sm leading-relaxed text-black outline-none transition focus:border-black dark:border-dark-200 dark:bg-dark-primary dark:text-white dark:focus:border-white"
                />

                <button
                  type="button"
                  onClick={saveOutput}
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white transition hover:scale-[1.01] active:scale-[0.99] dark:bg-white dark:text-black"
                >
                  <Save size={16} />
                  Save Output
                </button>
              </div>
            ) : content.trim().length > 0 ? (
              <article className="rounded-2xl bg-light-primary px-6 py-7 dark:bg-dark-primary">
                {renderMarkdownPreview(content)}
              </article>
            ) : (
              <div className="rounded-2xl border border-dashed border-light-200 bg-light-primary p-10 text-center dark:border-dark-200 dark:bg-dark-primary">
                <Sparkles
                  size={38}
                  className="mx-auto mb-4 text-black/25 dark:text-white/25"
                />

                <h3 className="text-lg font-semibold text-black dark:text-white">
                  Output draft created
                </h3>

                <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-black/55 dark:text-white/55">
                  Etherana created this output record. Once the Agent response
                  is captured, the final content will appear here. You can also
                  add or edit the content manually.
                </p>

                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white transition hover:scale-[1.01] active:scale-[0.99] dark:bg-white dark:text-black"
                >
                  <PencilLine size={16} />
                  Add content
                </button>
              </div>
            )}
          </main>

          <aside className="space-y-6">
            <section className="rounded-[2rem] border border-light-200 bg-light-secondary p-6 shadow-sm dark:border-dark-200 dark:bg-dark-secondary">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-black/40 dark:text-white/40">
                Expected output
              </p>

              <p className="text-sm leading-relaxed text-black/65 dark:text-white/65">
                {output.expectedOutput}
              </p>
            </section>

            <section className="rounded-[2rem] border border-light-200 bg-light-secondary p-6 shadow-sm dark:border-dark-200 dark:bg-dark-secondary">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-black/40 dark:text-white/40">
                Original agent prompt
              </p>

              <p className="max-h-[520px] overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-black/65 dark:text-white/65">
                {output.prompt}
              </p>
            </section>

            <section className="rounded-[2rem] border border-light-200 bg-light-secondary p-6 shadow-sm dark:border-dark-200 dark:bg-dark-secondary">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-black/40 dark:text-white/40">
                Output status
              </p>

              <div className="flex items-start gap-3">
                <CheckCircle2
                  size={20}
                  className={
                    output.status === 'ready'
                      ? 'text-green-500'
                      : 'text-black/30 dark:text-white/30'
                  }
                />

                <p className="text-sm leading-relaxed text-black/60 dark:text-white/60">
                  {output.status === 'ready'
                    ? 'This output has saved content and can be reused, copied, downloaded, or edited.'
                    : 'This output is still a draft. Add content manually or rerun the automation to generate a new version.'}
                </p>
              </div>
            </section>
          </aside>
        </section>
      </div>
    </div>
  );
};

export default OutputDetailPage;
