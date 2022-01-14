import { Matcher, ValueResolver } from "./matcher";

export interface TableResolver {
  readonly tableName: string;
  readonly path: Matcher[];
  readonly columns: Record<string, ValueResolver>;
}

export function validate(resolver: TableResolver): {
  readonly captureColumns: Set<string>;
  readonly valueColumns: Set<string>;
} {
  if (!resolver.path.length) {
    throw new TableResolverError(resolver.tableName, "Path must not be empty.");
  }
  if (resolver.path[resolver.path.length - 1].type === "**") {
    throw new TableResolverError(
      resolver.tableName,
      "Path must not end with a wildcard matcher."
    );
  }

  const captureColumns = new Set<string>();
  function addCaptureColumn(columnName: string) {
    if (captureColumns.has(columnName)) {
      throw new TableResolverError(
        resolver.tableName,
        `Two path matchers write to the column ${columnName}`
      );
    }
    captureColumns.add(columnName);
  }

  for (const matcher of resolver.path) {
    if (!matcher.capture) continue;
    const { key, columns } = matcher.capture;
    if (key !== undefined) addCaptureColumn(key);
    if (columns) Object.getOwnPropertyNames(columns).forEach(addCaptureColumn);
  }

  const valueColumns = new Set<string>();
  for (const columnName of Object.getOwnPropertyNames(resolver.columns)) {
    if (captureColumns.has(columnName)) {
      throw new TableResolverError(
        resolver.tableName,
        `A path matcher and a value column write to the column ${columnName}`
      );
    }
    valueColumns.add(columnName);
  }

  return { captureColumns, valueColumns };
}

class TableResolverError extends Error {
  constructor(readonly tableName: string, message: string) {
    super(message);
  }

  toString() {
    return `Error in table resolver ${this.tableName}: ${this.message}`;
  }
}
