import type { SmallAppTemplate } from '@/lib/apps/catalog';
import type { AppCatalogItem, AppInputValues } from './types';

export const buildPromptFromTemplate = (
  app: SmallAppTemplate,
  values: AppInputValues,
) => {
  return app.promptTemplate.replace(/\{\{(.*?)\}\}/g, (_, key: string) => {
    return values[key.trim()] || '';
  });
};

export const escapeHtml = (value: string) => {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

export const renderPrintableInlineMarkdown = (value: string) => {
  return escapeHtml(value)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noreferrer">$1</a>',
    )
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
};

export const renderPrintableTable = (rows: string[]) => {
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

export const renderPrintableMarkdown = (markdown: string) => {
  const lines = markdown.split('\n');
  const html: string[] = [];
  let paragraph: string[] = [];
  let listType: 'ul' | 'ol' | null = null;

  const closeParagraph = () => {
    if (paragraph.length === 0) return;

    html.push(`<p>${paragraph.map(renderPrintableInlineMarkdown).join('<br />')}</p>`);
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

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();

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

    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);

    if (headingMatch) {
      closeParagraph();
      closeList();

      const level = Math.min(headingMatch[1].length, 4);
      html.push(`<h${level}>${renderPrintableInlineMarkdown(headingMatch[2])}</h${level}>`);
      continue;
    }

    if (trimmed.startsWith('> ')) {
      closeParagraph();
      closeList();
      html.push(`<blockquote>${renderPrintableInlineMarkdown(trimmed.slice(2))}</blockquote>`);
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

  closeParagraph();
  closeList();

  return html.join('\n');
};

export const sanitizeRenderedHtml = (html: string) => {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '');
};

export const renderSafePrintableMarkdown = (markdown: string) => {
  return sanitizeRenderedHtml(renderPrintableMarkdown(markdown));
};
