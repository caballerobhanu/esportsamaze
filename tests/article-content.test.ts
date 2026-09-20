import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeArticleHtml } from '../lib/article-content';

describe('Article content sanitizer', () => {
  it('keeps a table authored in the editor, structure and merge attributes intact', () => {
    const html =
      '<table><tbody>' +
      '<tr><th colspan="2">Team standings</th></tr>' +
      '<tr><td rowspan="2">Team Soul</td><td>114</td></tr>' +
      '<tr><td>108</td></tr>' +
      '</tbody></table>';

    const out = sanitizeArticleHtml(html);

    assert.ok(out.includes('<table'));
    assert.ok(out.includes('</table>'));
    assert.ok(out.includes('<th colspan="2">'));
    assert.ok(out.includes('<td rowspan="2">'));
    assert.ok(out.includes('Team Soul'));
    assert.ok(out.includes('114'));
  });

  it('keeps the wrapper, colgroup and column widths the editor emits', () => {
    // Shape produced by the WYSIWYG table menu (TableKit).
    const html =
      '<div class="tableWrapper"><table style="min-width: 100px;"><colgroup><col style="min-width: 25px;"><col style="min-width: 25px;"></colgroup>' +
      '<tbody><tr><th colspan="1" rowspan="1"><p>Team</p></th><th colspan="1" rowspan="1"><p>Pts</p></th></tr>' +
      '<tr><td colspan="1" rowspan="1"><p>Soul</p></td><td colspan="1" rowspan="1"><p>114</p></td></tr></tbody></table></div>';

    const out = sanitizeArticleHtml(html);

    assert.ok(out.includes('class="tableWrapper"'));
    assert.ok(out.includes('<colgroup>'));
    assert.ok(out.includes('min-width: 100px'));
    assert.ok(out.includes('Soul'));
  });

  it('drops an event handler pasted in alongside a table while keeping the cell', () => {
    const out = sanitizeArticleHtml(
      '<table><tbody><tr><td onclick="alert(1)">Soul</td></tr></tbody></table>'
    );

    assert.ok(!out.includes('onclick'));
    assert.ok(out.includes('<td>Soul</td>'));
  });

  it('leaves ordinary article markup untouched', () => {
    const out = sanitizeArticleHtml('<h2>Recap</h2><p>Team <strong>Soul</strong> won.</p>');
    assert.equal(out, '<h2>Recap</h2><p>Team <strong>Soul</strong> won.</p>');
  });
});
