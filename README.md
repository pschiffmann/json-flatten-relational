# json-flatten-relational

**[Online demo](https://pschiffmann.github.io/json-flatten-relational/)**

Converts deeply nested JSON data to flat tables.
Stores the path segments of converted objects as table columns, so they can be used later as primary/foreign keys to infer the parent/child relationships between nested object collections.

## Example

Let's say we've extracted [this JSON data](https://raw.githubusercontent.com/pschiffmann/json-flatten-relational/main/demo/public/sample-data.json) about our blog, and are trying to process it with another software that only understands flat tables as .xlsx files.
The simple approach – concatenating nested property paths to column names, like below – doesn't work, because each post can have an unlimited number of comments, so this transformation may result in an excessive amount of columns:

| id           | title          | publishDate | author.id    | author.name | comments.0.id | comments.0.content  | ... |
| ------------ | -------------- | ----------- | ------------ | ----------- | ------------- | ------------------- | --- |
| 35a91c93-... | Hello world    | 2021-12-18  | 025309b2-... | jdoe        | aacb3ab8-...  | Hello back!         | ... |
| 195454cc-... | My opinion ... | 2022-01-05  | 025309b2-... | jdoe        | ed727d60-...  | Citation needed ... | ... |

Instead, this package splits nested arrays into separate tables and generates additional columns for each table, so the relationship between table rows can be inferred later.
For the example blog data, it might generate these tables:

**Post**

| post id      | title          | publish date | author id    | author name |
| ------------ | -------------- | ------------ | ------------ | ----------- |
| 35a91c93-... | Hello world    | 2021-12-18   | 025309b2-... | jdoe        |
| 195454cc-... | My opinion ... | 2022-01-05   | 025309b2-... | jdoe        |

**Comment**

| type     | parent id    | comment id   | content               | author id    | author name |
| -------- | ------------ | ------------ | --------------------- | ------------ | ----------- |
| comments | 35a91c93-... | aacb3ab8-... | Hello back!           | df3506dd-... | dsmith      |
| replies  | aacb3ab8-... | 95745b44-... | This might be the ... | 025309b2-... | jdoe        |
| comments | 35a91c93-... | 600830c8-... | Nice to meet you      | 00000000-... | anonymous   |
| comments | 195454cc-... | ed727d60-... | Citation needed ...   | df3506dd-... | dsmith      |

## Schemas

The mapping from JSON properties to table columns must be supplied as a schema configuration, which is also written in JSON.
For now, this package is unable to infer schemas automatically, they must be written by hand.
An example of a full schema can be found [here](https://raw.githubusercontent.com/pschiffmann/json-flatten-relational/main/demo/public/sample-schema.json).

### resolvers

A schema contains one or more resolvers.
Each resolver finds objects at a certain _path_ and writes them to a specified _table_.

Resolvers are executed independently of each other.
If multiple resolvers match the same path, each one writes a row to its own output table; even if they share the same table name.

### resolver.tableName

Specifies the output table to which rows are written when the resolver finds a full match.
Multiple resolvers may write to the same table.

### resolver.path

A list of matchers that are tested against JSON keys.
The first matcher is tested against all keys of the root level object or array.
If the first matcher matches a key and that key contains another object or array, then the second matcher is tested against all keys of that object; and so forth until all matchers have matched.
When a full match is found, that object is used as the root object from which `resolver.columns` are resolved.

There are four types of matchers:

1.  `{ "type": "literal", "key": "xyz" }` matches the object key `"xyz"`.
    Key may also be a number, in which case it matches an array index.
2.  `{ "type": "index" }` matches any array index.
3.  `{ "type": "regexp", "pattern": "^\w+$", "flags": "i" }` matches any object key that matches the [regular expression](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions).
    Array indexes are also tested against the pattern, after being converted to strings.
4.  `{type: "**" }` matches zero to unlimited keys regardless of content, making it useful for resolving recursive JSON structures.
    It must not be the last matcher in a table resolver path, and must not be immediately followed by another `**` matcher.

All matchers can have a `"captureName"` of type string.
For each capture name, a new column with that name is added to the output table and filled with the matched keys.

If a `**` has a capture name, all matched path segments are concatenated and written to the same column.
The default delimiter is `,`, but can be changed by setting the `captureDelimiter` property on the matcher to another string.

### resolver.columns

A mapping from output table column names to value resolver config for this column.

### resolver.columns._{column}_.startAtAncestor

Changes the root object from which `column.path` and `column.self` are resolved.
Setting it to a non-negative integer walks up the JSON hierarchy that many steps; e.g. setting it to 0 changes the root of the direct parent, setting it to 1 to the grandparent, and so on.
Setting it to a negative integer walks the JSON hierarchy down from the root; e.g. setting it to -1 changes to the root to the JSON root object, setting it to -2 to the first nested object on the path from root object to the current path, and so on.

### resolver.columns._{column}_.path

A list of JSON keys where the column value can be found.
All path segments are tested for exact matches, wildcard patterns are not supported.

### resolver.columns._{column}_.self

If set to `true`, then the root object is encoded as JSON and written to this column.
If `path` is also set for this column and the path exists in the root object, that value is used instead.
Useful for debugging.
