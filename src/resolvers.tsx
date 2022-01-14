import { Matcher, ResolvedValue } from "./matcher";

export interface TableResolver {
  readonly tableName: string;
  readonly path: Matcher[];
  readonly columns: Record<string, ValueResolver>;
}

export interface ValueResolver {
  readonly self?: boolean;
  readonly path?: (string | number)[];
  readonly startAtAncestor?: number;
  // readonly cast?: PrimitiveValueName;
  // readonly type: PrimitiveValueName;
  // readonly defaultValue: any;
}

// export type PrimitiveValueName = "boolean" | "number" | "null" | "string";

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
  const valueColumns = new Set<string>(
    Object.getOwnPropertyNames(resolver.columns)
  );

  let previousMatcherWasWildcard = false;
  for (const { type, captureName } of resolver.path) {
    if (type === "**" && previousMatcherWasWildcard) {
      throw new TableResolverError(
        resolver.tableName,
        "Path must not contain two consecutive Wildcard matchers."
      );
    }
    previousMatcherWasWildcard = type === "**";

    if (captureName === undefined) continue;
    if (captureColumns.has(captureName) || valueColumns.has(captureName)) {
      throw new TableResolverError(
        resolver.tableName,
        "Two path matchers or value columns write to the column " + captureName
      );
    }
    captureColumns.add(captureName);
  }

  return { captureColumns, valueColumns };
}

export function resolveValue(
  data: unknown,
  ancestors: unknown[],
  resolver: ValueResolver
): ResolvedValue {
  const { self, path, startAtAncestor } = resolver;
  const resolutionRoot =
    startAtAncestor === undefined
      ? data
      : startAtAncestor >= 0
      ? ancestors[startAtAncestor]
      : ancestors[ancestors.length + startAtAncestor];
  const result =
    (path && extractValue(resolutionRoot, path)) ??
    (self ? resolutionRoot : undefined);
  switch (typeof result) {
    case "number":
    case "string":
    case "undefined":
      return result;
    default:
      return JSON.stringify(result);
  }
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

class TableResolverError extends Error {
  constructor(readonly tableName: string, message: string) {
    super(message);
  }

  toString() {
    return `Error in table resolver ${this.tableName}: ${this.message}`;
  }
}
