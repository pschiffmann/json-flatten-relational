import { PrimitiveValue } from ".";

/**
 * A matcher is tested against a single JSON object or array key with
 * `matches()`.
 */
export type Matcher =
  | {
      readonly type: "literal";
      readonly key: string | number;
      readonly capture?: CaptureOptions;
    }
  | {
      readonly type: "index";
      readonly capture?: CaptureOptions;
    }
  | {
      readonly type: "regexp";
      readonly pattern: string;
      readonly flags: string;
      readonly capture?: CaptureOptions;
    }
  | {
      // TODO: This matches one or more keys, should be zero or more
      readonly type: "**";
      readonly capture?: WildcardCaptureOptions;
    };

/**
 * Used by `Matcher.capture`.
 */
export interface CaptureOptions {
  /**
   * If set, the matched path segment is saved in a column with this name.
   */
  readonly key?: string;
  readonly columns?: Record<string, ValueResolver /* | ValueResolver[] */>;
}

export interface ValueResolver {
  readonly self?: boolean;
  readonly path?: (string | number)[];
  // startAtAncestor?: number;
  // readonly cast?: PrimitiveValueName;
  // readonly type: "boolean" | "number" | "null" | "string";
  // readonly defaultValue: any;
}

export interface WildcardCaptureOptions extends CaptureOptions {
  readonly keyDelimiter?: string;
  readonly columns?: Record<string, WildcardValueResolver>;
}

export interface WildcardValueResolver extends ValueResolver {
  readonly delimiter?: string;
}

export type PrimitiveValueName = "boolean" | "number" | "null" | "string";

export function matches(key: string | number, matcher: Matcher): boolean {
  switch (matcher.type) {
    case "literal":
      return key === matcher.key;
    case "index":
      return typeof key === "number";
    case "regexp":
      return new RegExp(matcher.pattern, matcher.flags).test(key.toString());
    case "**":
      return true;
  }
}

export function resolveCaptures(
  key: string | number,
  data: unknown,
  matcher: Matcher,
  captures: Map<string, PrimitiveValue>
): Map<string, PrimitiveValue> {
  if (!matcher.capture) return captures;

  const result = new Map(captures);
  function addCapture(columnName: string, value: any, delimiter: string = ",") {
    if (matcher.type !== "**") {
      result.set(columnName, value);
    } else if (!result.has(columnName)) {
      result.set(columnName, `${value}`);
    } else {
      const previous = result.get(columnName)!;
      result.set(columnName, `${previous}${delimiter}${value}`);
    }
  }

  if (matcher.capture.key !== undefined) addCapture(matcher.capture.key, key);
  if (matcher.capture.columns) {
    for (const [column, resolver] of Object.entries(matcher.capture.columns)) {
      const value = resolveValue(data, resolver);
      if (value !== undefined || matcher.type === "**") {
        addCapture(
          column,
          value,
          (resolver as WildcardValueResolver).delimiter
        );
      }
    }
  }
  return result;
}

export function resolveValue(data: unknown, resolver: ValueResolver): unknown {
  const pathData = resolver.path && extractValue(data, resolver.path);
  const selfData = resolver.self ? data : undefined;
  return pathData ?? selfData;
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
