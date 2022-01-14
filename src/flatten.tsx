import { matches, resolveCaptures, resolveValue } from "./matcher";
import { TableResolver, validate } from "./table-resolver";

export type PrimitiveValue = boolean | number | null | string;

export interface Table {
  /**
   * A list of column names in this table.
   */
  readonly header: Set<string>;

  /**
   * Extracted rows in the order they were encountered in the input JSON. Each
   * row contains only the columns for keys that were found in the input JSON.
   */
  readonly rows: Record<string, PrimitiveValue>[];
}

type WriteRow = (
  tableName: string,
  row: Record<string, PrimitiveValue>
) => void;

interface TableResolverContext {
  readonly tableResolver: TableResolver;
  readonly nextPathMatcher: number;
  readonly captures: Map<string, PrimitiveValue>;
}

export function flatten(
  data: unknown,
  resolvers: TableResolver[]
): Map<string, Table> {
  const candidates: TableResolverContext[] = [];
  const allCaptureColumns = new Map<string, Set<string>>();
  const allValueColumns = new Map<string, Set<string>>();
  for (const resolver of resolvers) {
    const { captureColumns, valueColumns } = validate(resolver);
    candidates.push({
      tableResolver: resolver,
      nextPathMatcher: 0,
      captures: new Map(),
    });

    const { tableName } = resolver;
    let tableCaptureColumns = allCaptureColumns.get(tableName);
    let tableValueColumns = allValueColumns.get(tableName);
    if (!tableCaptureColumns) {
      allCaptureColumns.set(tableName, (tableCaptureColumns = new Set()));
      allValueColumns.set(tableName, (tableValueColumns = new Set()));
    }
    for (const column of captureColumns) tableCaptureColumns.add(column);
    for (const column of valueColumns) tableValueColumns!.add(column);
  }

  const tables = new Map<string, Table>();
  for (const [tableName, captureColumns] of allCaptureColumns) {
    const valueColumns = allValueColumns.get(tableName)!;
    const header = new Set<string>();
    for (const column of captureColumns) header.add(column);
    for (const column of valueColumns) header.add(column);
    tables.set(tableName, { header, rows: [] });
  }

  function writeRow(tableName: string, row: Record<string, PrimitiveValue>) {
    tables.get(tableName)!.rows.push(row);
  }

  visit(data, candidates, writeRow);
  return tables;
}

function visit(
  data: unknown,
  candidates: TableResolverContext[],
  writeRow: WriteRow
) {
  if (typeof data !== "object" || data === null) return;
  const entries = Array.isArray(data) ? data.entries() : Object.entries(data);
  for (const [key, value] of entries) {
    const keyCandidates: TableResolverContext[] = [];
    for (const { tableResolver, nextPathMatcher, captures } of candidates) {
      const matcher = tableResolver.path[nextPathMatcher];
      if (!matches(key, matcher)) continue;
      const newCaptures = matcher.capture
        ? resolveCaptures(key, value, matcher, captures)
        : captures;

      if (nextPathMatcher === tableResolver.path.length - 1) {
        extractRow(value, tableResolver, newCaptures, writeRow);
      } else {
        keyCandidates.push({
          tableResolver,
          nextPathMatcher: nextPathMatcher + 1,
          captures: newCaptures,
        });
        if (matcher.type === "**") {
          keyCandidates.push({
            tableResolver,
            nextPathMatcher,
            captures: newCaptures,
          });
        }
      }
    }
    if (keyCandidates.length !== 0) {
      visit(value, keyCandidates, writeRow);
    }
  }
}

function extractRow(
  data: any,
  tableResolver: TableResolver,
  capturedPathSegments: Map<string, PrimitiveValue>,
  writeRow: WriteRow
) {
  const row: { [column: string]: PrimitiveValue } = {};
  for (const [column, capturedValue] of capturedPathSegments) {
    row[column] = capturedValue;
  }
  for (const [column, valueResolver] of Object.entries(tableResolver.columns)) {
    const rawValue = resolveValue(data, valueResolver);
    switch (typeof rawValue) {
      case "boolean":
      case "number":
      case "string":
        row[column] = rawValue;
        break;
      case "object":
        row[column] = JSON.stringify(rawValue);
        break;
    }
  }
  writeRow(tableResolver.tableName, row);
}
