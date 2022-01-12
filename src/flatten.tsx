import { Matcher, matches } from "./matcher";

export interface TableResolver {
  readonly tableName: string;
  readonly path: Matcher[];
  readonly columns: {
    readonly [name: string]: {
      readonly path: (string | number)[];
      // readonly type: "boolean" | "number" | "null" | "string";
      // readonly defaultValue: any;
    };
  };
}

export type PrimitiveValue = boolean | number | null | string;

export interface TableRow {
  readonly [column: string]: PrimitiveValue;
}

export interface Table {
  /**
   * A list of column names in this table.
   */
  readonly header: Set<string>;

  /**
   * Extracted rows in the order they were encountered in the input JSON. Each
   * row contains only the columns for keys that were found in the input JSON.
   */
  readonly rows: TableRow[];
}

type CapturedPathSegments = Map<string, string | number>;

interface TableResolverInternal extends TableResolver {
  writeRow(row: TableRow): void;
}

export function flatten(
  data: unknown,
  resolvers: TableResolver[]
): Map<string, Table> {
  const tables = new Map<string, Table>();
  const candidates = new Map<TableResolverInternal, CapturedPathSegments>();
  for (const resolver of resolvers) {
    let table = tables.get(resolver.tableName);
    if (!table) {
      tables.set(resolver.tableName, (table = { header: new Set(), rows: [] }));
    }
    for (const column of resolver.path
      .map((m) => m.captureName!)
      .filter((s) => s !== undefined)) {
      table.header.add(column);
    }
    for (const column of Object.keys(resolver.columns)) {
      table.header.add(column);
    }

    const resolverInternal: TableResolverInternal = {
      ...resolver,
      writeRow(row) {
        table!.rows.push(row);
      },
    };
    candidates.set(resolverInternal, new Map());
  }

  visit(data, 0, candidates);
  return tables;
}

function visit(
  data: unknown,
  depth: number,
  candidates: Map<TableResolverInternal, CapturedPathSegments>
) {
  if (typeof data !== "object" || data === null) return;
  const entries = Array.isArray(data) ? data.entries() : Object.entries(data);
  for (const [key, value] of entries) {
    const keyCandidates = new Map<
      TableResolverInternal,
      CapturedPathSegments
    >();
    for (let [tableResolver, capturedPathSegments] of candidates) {
      const matcher = tableResolver.path[depth];
      if (!matches(key, matcher)) continue;
      if (matcher.captureName) {
        capturedPathSegments = new Map(capturedPathSegments);
        capturedPathSegments.set(matcher.captureName, key);
      }
      if (depth === tableResolver.path.length - 1) {
        extractRow(value, tableResolver, capturedPathSegments);
      } else {
        keyCandidates.set(tableResolver, capturedPathSegments);
      }
    }
    if (keyCandidates.size !== 0) {
      visit(value, depth + 1, keyCandidates);
    }
  }
}

function extractRow(
  data: any,
  tableResolver: TableResolverInternal,
  capturedPathSegments: CapturedPathSegments
) {
  const row: { [column: string]: PrimitiveValue } = {};
  for (const [column, capturedValue] of capturedPathSegments) {
    row[column] = capturedValue;
  }
  for (const [column, { path }] of Object.entries(tableResolver.columns)) {
    const rawValue = extractValue(data, path);
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
  tableResolver.writeRow(row);
}

function extractValue(data: unknown, path: (string | number)[]): unknown {
  if (typeof data !== "object" || data === null) return undefined;
  const [head, ...tail] = path;
  const keyTypeMatchesDataType =
    (typeof head === "number") === Array.isArray(data);
  if (!keyTypeMatchesDataType) return undefined;
  return tail.length
    ? extractValue((data as any)[head], tail)
    : (data as any)[head];
}
