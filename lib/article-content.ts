import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitize WYSIWYG article HTML on save.
 *
 * Table tags and their merge attributes are explicitly allowed so a table
 * authored in the editor — or pasted into it — survives the save unchanged.
 * This lives here (rather than inline in the save action) so the rules can be
 * pinned by a test; silently dropping table markup here would break every
 * article that already contains one.
 */
export function sanitizeArticleHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ADD_ATTR: [
      'target',
      'rel',
      'allow',
      'allowfullscreen',
      'frameborder',
      'scrolling',
      'src',
      'colspan',
      'rowspan',
      'data-instgrm-permalink',
      'data-instgrm-version',
      'data-tweet-id',
      'data-inline-toc',
    ],
    ADD_TAGS: ['iframe', 'blockquote', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'figure', 'figcaption', 'script'],
  });
}
