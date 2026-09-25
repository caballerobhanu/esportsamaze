'use client';

import * as React from 'react';

/**
 * Start/end picker for a tournament. Calendars often announce a month before a
 * date, so the precision switch swaps the two `<input type="date">` fields for
 * `<input type="month">` ones. The server stores a month-only range as the 1st of
 * the start month and the last day of the end month, and keeps the precision so
 * the public pages render month-year instead of invented days.
 */
export function TournamentDatesInput({
  inputCls,
  labelCls,
  precision = 'DAY',
  startDate = '',
  endDate = '',
  startMonth = '',
  endMonth = '',
}: {
  inputCls: string;
  labelCls: string;
  precision?: string;
  startDate?: string;
  endDate?: string;
  startMonth?: string;
  endMonth?: string;
}) {
  const [mode, setMode] = React.useState<'DAY' | 'MONTH'>(precision === 'MONTH' ? 'MONTH' : 'DAY');

  return (
    <>
      <div>
        <label className={labelCls}>Date Precision</label>
        <select
          name="datePrecision"
          value={mode}
          onChange={(e) => setMode(e.target.value as 'DAY' | 'MONTH')}
          className={inputCls}
        >
          <option value="DAY">Exact dates</option>
          <option value="MONTH">Month only (day not announced)</option>
        </select>
      </div>

      {mode === 'MONTH' ? (
        <>
          <div>
            <label className={labelCls}>Start Month *</label>
            <input type="month" name="startMonth" required defaultValue={startMonth} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>End Month *</label>
            <input type="month" name="endMonth" required defaultValue={endMonth} className={inputCls} />
          </div>
        </>
      ) : (
        <>
          <div>
            <label className={labelCls}>Start Date *</label>
            <input type="date" name="startDate" required defaultValue={startDate} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>End Date *</label>
            <input type="date" name="endDate" required defaultValue={endDate} className={inputCls} />
          </div>
        </>
      )}
    </>
  );
}
