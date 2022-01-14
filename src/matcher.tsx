export type ResolvedValue = number | string | undefined;

/**
 * A matcher is tested against a single JSON object or array key with
 * `matches()`.
 */
export type Matcher =
  | {
      readonly type: "literal";
      readonly key: string | number;
      readonly captureName?: string;
    }
  | {
      readonly type: "index";
      readonly captureName?: string;
    }
  | {
      readonly type: "regexp";
      readonly pattern: string;
      readonly flags: string;
      readonly captureName?: string;
    }
  | {
      readonly type: "**";
      readonly captureName?: string;
      readonly captureDelimiter?: string;
    };

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
  matcher: Matcher,
  captures: Map<string, ResolvedValue>
): Map<string, ResolvedValue> {
  const { type, captureName } = matcher;
  if (!captureName) return captures;

  const result = new Map(captures);
  if (type === "**" && result.has(captureName)) {
    const prev = result.get(captureName)!;
    const delimiter = matcher.captureDelimiter ?? ",";
    result.set(captureName, `${prev}${delimiter}${key}`);
  } else {
    result.set(captureName, key);
  }
  return result;
}
