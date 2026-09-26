/**
 * AdSense placements. One entry per slot on the page.
 *
 * `format` / `layout` / `width`+`height` mirror the AdSense unit type - they are
 * not free choices:
 *   Display, responsive -> format 'auto'
 *   Display, fixed size  -> width + height, no format
 *   In-article           -> format 'fluid' + layout 'in-article'
 *   In-feed              -> format 'fluid' + layoutKey '<key from AdSense>'
 *   Multiplex            -> format 'autorelaxed'
 */
export interface AdPlacement {
  /** data-ad-slot. Empty until the unit is created in AdSense. */
  slot: string;
  /** data-ad-format. Omitted for fixed-size units. */
  format?: string;
  /** data-ad-layout (in-article units). */
  layout?: string;
  /** data-ad-layout-key (in-feed units only). */
  layoutKey?: string;
  /** Fixed-size units render at this exact size. */
  width?: number;
  height?: number;
  /** Reserved height in px for responsive units, so filling cannot shift the layout. */
  minHeight?: number;
}

export const AD_PLACEMENTS: Record<string, AdPlacement> = {
  /** Display (responsive). Slim bar under the byline, every breakpoint. */
  articleTop: { slot: '2711902122', format: 'auto', minHeight: 90 },
  /** In-article. Mid-copy, after the opening paragraphs. Mobile/tablet only. */
  articleInline: { slot: '9768265062', format: 'fluid', layout: 'in-article', minHeight: 280 },
  /** Display (responsive). End of the article body. */
  articleEnd: { slot: '6484635336', format: 'auto', minHeight: 280 },
  /**
   * Display (fixed). Portrait rail, desktop only (xl and up).
   *
   * Deliberately 300x250 rather than the 300x600 half-page: the rail's sticky
   * column already holds the TOC, this unit and the most-read card, and a sticky
   * element taller than the viewport leaves its bottom unreachable.
   */
  articleRail: { slot: '3202856713', width: 300, height: 250 },

  /**
   * The units below carry the rest of the site: every tournament, player, team,
   * compare and rankings page.
   *
   * They deliberately reuse the article slots for now. One unit's code may sit on
   * many pages, so nothing needs creating in AdSense before ads reach those pages;
   * the cost is that reporting merges the families. Each has its own entry here, so
   * moving one onto a dedicated unit is a one-line edit.
   */

  /** Display (responsive). The first unit on a page, under the masthead or tab dock. */
  pageTop: { slot: '2711902122', format: 'auto', minHeight: 90 },
  /** Display (responsive). Under the last block of a page. */
  pageEnd: { slot: '6484635336', format: 'auto', minHeight: 280 },
  /** Display (fixed). The sidebar unit on the three overview pages, desktop only. */
  pageRail: { slot: '3202856713', width: 300, height: 250 },
  /**
   * Display (responsive). The compare page only, and only once a comparison has
   * run — the "pick two" card before that is a page with nothing on it.
   */
  compareResult: { slot: '6484635336', format: 'auto', minHeight: 280 },
};
