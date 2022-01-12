# json-flatten-relational

**[Online demo](https://pschiffmann.github.io/json-flatten-relational/)**

Converts deeply nested JSON data to flat tables.
Stores the path segments of converted objects as table columns, so they can be used later as primary/foreign keys to infer the parent/child relations between nested object collections.

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

| index | post id      | title          | publish date | author id    | author name |
| ----- | ------------ | -------------- | ------------ | ------------ | ----------- |
| 0     | 35a91c93-... | Hello world    | 2021-12-18   | 025309b2-... | jdoe        |
| 1     | 195454cc-... | My opinion ... | 2022-01-05   | 025309b2-... | jdoe        |

**Comment**

| post index | comment id   | content             | author id    | author name |
| ---------- | ------------ | ------------------- | ------------ | ----------- |
| 0          | aacb3ab8-... | Hello back!         | df3506dd-... | dsmith      |
| 0          | 600830c8-... | Nice to meet ...    | 00000000-... | anonymous   |
| 0          | 95745b44-... | Thanks for ...      | 025309b2-... | jdoe        |
| 1          | ed727d60-... | Citation needed ... | df3506dd-... | dsmith      |

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
When a full match is found, that object is used as the root object from which [columns](#resolvercolumns) are resolved.

There are three types of matchers:

1.  `{ "type": "literal", "key": "xyz" }` matches the object key `"xyz"`.
    Key may also be a number, in which case it matches an array index.
2.  `{ "type": "index" }` matches any array index.
3.  `{ "type": "regexp", "pattern": "^\w+$", "flags": "i" }` matches any object key that matches the [regular expression](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions).
    Array indexes are also tested against the pattern, after being converted to strings.

All matchers can have a `"captureName"` of type string.
For each capture name, a new column with that name is added to the output table and filled with the matched keys.

### resolver.columns

A mapping from output table column names to JSON property paths where the column value can be found.
The paths are resolved beginning from the object matched by [path](#resolverpath).
All path segments are tested for exact matches, wildcard patterns are not supported.
