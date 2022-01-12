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
    };

export function matches(key: string | number, matcher: Matcher): boolean {
  switch (matcher.type) {
    case "literal":
      return key === matcher.key;
    case "index":
      return typeof key === "number";
    case "regexp":
      return new RegExp(matcher.pattern, matcher.flags).test(key.toString());
  }
}
