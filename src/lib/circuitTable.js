/**
 * A circuit's point table, read the way the server reads it (P5).
 *
 * The organiser types a table as "1: 300, 2-9: 100, default 10" (design
 * section 13). The server decides (vent_circuits/tables.py); this is the same
 * reading, so the form can show what a table means while it is typed and say
 * which part it cannot read before anything is sent. The codes are the
 * server's, so one translation serves both.
 *
 * `scripts/test-circuit-table.mjs` holds the cases, the same ones as the
 * server's PointTableTests.
 */

const MAX_PLACE = 1024;
const MAX_POINTS = 1000000;
const MAX_ROWS = 64;
const RANGE = /^(\d+)\s*(?:-\s*(\d+))?\s*:\s*(\S+)$/;
const DEFAULT = /^default\s*:?\s*(\S+)$/i;
const NUMBER = /^-?\d+(?:\.\d{1,2})?$/;

const fail = (code, part = '') => ({ table: null, error: { code, part } });

function points(raw) {
  if (!NUMBER.test(raw)) return { code: 'POINT_TABLE_INVALID' };
  const value = Number(raw);
  if (value < 0 || value > MAX_POINTS) return { code: 'POINT_TABLE_RANGE' };
  return { value: String(value) };
}

/** {table, error}: the table a typed line means, or why it cannot be read. */
export function parseTable(text) {
  const parts = String(text ?? '').split(/[,;\n]+/).map((p) => p.trim()).filter(Boolean);
  if (!parts.length) return { table: {}, error: null };
  if (parts.length > MAX_ROWS) return fail('POINT_TABLE_TOO_LONG');
  const rows = [];
  const taken = [];
  let def = null;
  for (const part of parts) {
    const isDefault = DEFAULT.exec(part);
    if (isDefault) {
      if (def !== null) return fail('POINT_TABLE_OVERLAP', part);
      const read = points(isDefault[1]);
      if (read.code) return fail(read.code, part);
      def = read.value;
      continue;
    }
    const found = RANGE.exec(part);
    if (!found) return fail('POINT_TABLE_INVALID', part);
    const first = Number(found[1]);
    const last = found[2] ? Number(found[2]) : first;
    if (first < 1 || last < 1 || first > MAX_PLACE || last > MAX_PLACE) return fail('POINT_TABLE_RANGE', part);
    if (last < first) return fail('POINT_TABLE_ORDER', part);
    if (taken.some(([a, b]) => first <= b && a <= last)) return fail('POINT_TABLE_OVERLAP', part);
    const read = points(found[3]);
    if (read.code) return fail(read.code, part);
    taken.push([first, last]);
    rows.push([first, last, read.value]);
  }
  rows.sort((a, b) => a[0] - b[0]);
  const table = { rows };
  if (def !== null) table.default = def;
  return { table, error: null };
}

/**
 * What a table says, place by place, in the reader's language:
 * [{label: "Place 1", points: "300"}, ..., {label: "Everybody else", points: "10"}].
 */
export function describeTable(tt, table) {
  const out = (table?.rows || []).map(([first, last, value]) => ({
    label: first === last
      ? tt('circuit.place', 'Place {n}').replace('{n}', first)
      : tt('circuit.places', 'Places {from} to {to}').replace('{from}', first).replace('{to}', last),
    points: String(value),
  }));
  out.push({ label: tt('circuit.everyoneElse', 'Everybody else'), points: String(table?.default ?? 0) });
  return out;
}

/** The message for a table that cannot be read, naming the part. */
export function tableProblem(tt, error) {
  if (!error) return '';
  const words = {
    POINT_TABLE_INVALID: tt('api.POINT_TABLE_INVALID', 'That point table cannot be read. Write each part like 2-9: 100.'),
    POINT_TABLE_RANGE: tt('api.POINT_TABLE_RANGE', 'Places run from 1 to 1024 and points from 0 to 1,000,000.'),
    POINT_TABLE_ORDER: tt('api.POINT_TABLE_ORDER', 'A range goes from the higher place to the lower one, like 5-8.'),
    POINT_TABLE_OVERLAP: tt('api.POINT_TABLE_OVERLAP', 'Two parts of the table give the same place.'),
    POINT_TABLE_TOO_LONG: tt('api.POINT_TABLE_TOO_LONG', 'A table can have at most 64 parts.'),
  };
  const sentence = words[error.code] || words.POINT_TABLE_INVALID;
  return error.part
    ? tt('circuit.tableProblemAt', '{problem} ("{part}")').replace('{problem}', sentence).replace('{part}', error.part)
    : sentence;
}
