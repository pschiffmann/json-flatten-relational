import { matches, resolveCaptures, ResolvedValue } from "./matcher";
import { resolveValue, TableResolver, validate } from "./resolvers";

export interface Table {
  /**
   * A list of column names in this table.
   */
  readonly header: Set<string>;

  /**
   * Extracted rows in the order they were encountered in the input JSON. Each
   * row contains only the columns for keys that were found in the input JSON.
   */
  readonly rows: Record<string, ResolvedValue>[];
}

type WriteRow = (tableName: string, row: Record<string, ResolvedValue>) => void;

interface TableResolverContext {
  readonly tableResolver: TableResolver;
  readonly nextPathMatcher: number;
  readonly captures: Map<string, ResolvedValue>;
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
    if (resolver.path[0].type === "**") {
      candidates.push({
        tableResolver: resolver,
        nextPathMatcher: 1,
        captures: new Map(),
      });
    }

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

  function writeRow(tableName: string, row: Record<string, ResolvedValue>) {
    tables.get(tableName)!.rows.push(row);
  }

  visit(data, [], candidates, writeRow);
  return tables;
}

function visit(
  data: unknown,
  ancestors: unknown[],
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
      const newCaptures = matcher.captureName
        ? resolveCaptures(key, matcher, captures)
        : captures;

      if (nextPathMatcher === tableResolver.path.length - 1) {
        extractRow(value, ancestors, tableResolver, newCaptures, writeRow);
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
        } else if (tableResolver.path[nextPathMatcher + 1].type === "**") {
          keyCandidates.push({
            tableResolver,
            nextPathMatcher: nextPathMatcher + 2,
            captures: newCaptures,
          });
        }
      }
    }
    if (keyCandidates.length !== 0) {
      visit(value, [value, ...ancestors], keyCandidates, writeRow);
    }
  }
}

function extractRow(
  data: any,
  ancestors: unknown[],
  tableResolver: TableResolver,
  capturedPathSegments: Map<string, ResolvedValue>,
  writeRow: WriteRow
) {
  const row: { [column: string]: ResolvedValue } = {};
  for (const [column, capturedValue] of capturedPathSegments) {
    row[column] = capturedValue;
  }
  for (const [column, valueResolver] of Object.entries(tableResolver.columns)) {
    row[column] = resolveValue(data, ancestors, valueResolver);
  }
  writeRow(tableResolver.tableName, row);
}
