## Example

Input JSON:

```json
{
  "posts": [
    {
      "id": "35a91c93-41fa-4b55-a2f9-a8de236d0d00",
      "title": "Hello world",
      "publishDate": "2021-12-18",
      "author": {
        "id": "025309b2-ea1e-4e68-a5a7-c3d2cd25cc98",
        "name": "jdoe"
      },
      "comments": [
        {
          "id": "aacb3ab8-14da-42eb-9c02-ee5f6bf8fbd1",
          "content": "Hello back!",
          "author": {
            "id": "df3506dd-a934-4821-af9f-3b2457d231a5",
            "name": "dsmith"
          }
        },
        {
          "id": "600830c8-517b-4ca2-b7d5-db2870a6feb8",
          "content": "Nice to meet you",
          "author": {
            "id": "00000000-0000-0000-0000-000000000000",
            "name": "anonymous"
          }
        },
        {
          "id": "95745b44-94be-49dd-b340-938794bb586a",
          "content": "Thanks for the comments everyone",
          "author": {
            "id": "025309b2-ea1e-4e68-a5a7-c3d2cd25cc98",
            "name": "jdoe"
          }
        }
      ]
    },
    {
      "id": "195454cc-0490-44e8-91b5-53cc2ae4505d",
      "title": "My opinion on XYZ",
      "publishDate": "2022-01-05",
      "author": {
        "id": "025309b2-ea1e-4e68-a5a7-c3d2cd25cc98",
        "name": "jdoe"
      },
      "comments": [
        {
          "id": "ed727d60-b318-4a6f-9a98-2117b60d8d59",
          "content": "Citation needed for paragraph 5",
          "author": {
            "id": "df3506dd-a934-4821-af9f-3b2457d231a5",
            "name": "dsmith"
          }
        }
      ]
    }
  ]
}
```

<details>
  <summary>schema.json (click to expand)</summary>

```json
{
  "version": "1",
  "tableResolvers": {}
}
```

</details>

Output tables:

Post

| index | post id      | title             | publish date | author id    | author name |
| ----- | ------------ | ----------------- | ------------ | ------------ | ----------- |
| 0     | 35a91c93-... | Hello world       | 2021-12-18   | 025309b2-... | jdoe        |
| 1     | 195454cc-... | My opinion on XYZ | 2022-01-05   | 025309b2-... | jdoe        |

Comment

| post index | comment index | comment id   | content                          | author id    | author name |
| ---------- | ------------- | ------------ | -------------------------------- | ------------ | ----------- |
| 0          | 0             | aacb3ab8-... | Hello back!                      | df3506dd-... | dsmith      |
| 0          | 1             | 600830c8-... | Nice to meet you                 | 00000000-... | anonymous   |
| 0          | 2             | 95745b44-... | Thanks for the comments everyone | 025309b2-... | jdoe        |
| 1          | 0             | ed727d60-... | Citation needed for paragraph 5  | df3506dd-... | dsmith      |
