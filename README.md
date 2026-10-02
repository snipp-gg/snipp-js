# @snipp-gg/snipp

A lightweight Node.js wrapper for the [Snipp API](https://api.snipp.gg).

## Features

- Zero dependencies, uses native `fetch` and `FormData`
- Upload files, build albums, and manage your posts
- Simple error handling with `SnippError`

## Requirements

- Node.js 18 or higher
- A valid API key from the [Snipp Console](https://snipp.gg/settings/console)

## Installation

```bash
npm install @snipp-gg/snipp
```

## Quick Start

```js
import { SnippClient } from '@snipp-gg/snipp';

const client = new SnippClient({ apiKey: 'YOUR_API_KEY' });

// Get the authenticated user
const { user } = await client.getUser('@me');
console.log(user.username);
```

## API

### `new SnippClient({ apiKey, region? })`

Create a client instance. The API key is sent via the `api-key` header on every request.

| Option | Type | Description |
| --- | --- | --- |
| `apiKey` | `string` | Your Snipp API key. |
| `region` | `'eu-west-1' \| 'us-west-1'` | Optional. Pin requests to a regional endpoint. Uploads run at the same speed either way; this controls which region stores your files. Omit to use `api.snipp.gg`. |

```js
const client = new SnippClient({ apiKey: 'YOUR_API_KEY', region: 'eu-west-1' });
```

### `client.getUser(id)`

Get a user by ID. Pass `'@me'` to get the authenticated user. `api_key`, `key_has_uploads_access`, `upload_count`, and `limits` are only present on yourself.

```js
const { user } = await client.getUser('@me');
console.log(user.plan, user.limits.usage.used_percent);
```

### `client.getUserPosts(id, options?)`

List a user's public posts, newest first. Team, private, unlisted, moderated, and restricted posts are never included. Pass `'@me'` for your own public posts.

| Option | Type | Description |
|---|---|---|
| `limit` | `number` | Posts per page (1-100, default 30). |
| `cursor` | `string` | `next_cursor` from the previous page. |

```js
const { posts, has_more, next_cursor } = await client.getUserPosts('987654321098765432', { limit: 10 });
```

### `client.listPosts(options?)`

List your own posts of every privacy, newest first. Team posts are not included. Takes the same `limit` and `cursor` options as `getUserPosts`. Follow `next_cursor` until it is `null` to walk every page:

```js
let cursor;
do {
  const page = await client.listPosts({ limit: 100, cursor });
  for (const post of page.posts) console.log(post.code, post.privacy);
  cursor = page.next_cursor ?? undefined;
} while (cursor);
```

### `client.getPost(code)`

Get a post by its share code. Team posts are only readable by members of that team, and have `like_count` and `liked` set to `null`.

```js
const { post } = await client.getPost('AbC123');
console.log(post.url, post.files[0].url);
```

### `client.upload(file, options?)`

Upload a file as a new post. Accepts a `File`, `Blob`, `Buffer`, or `Uint8Array`. Resolves to `{ url, post }`, where `url` is the direct file URL and `post.url` is the share page.

| Option | Type | Description |
|---|---|---|
| `privacy` | `'public' \| 'unlisted' \| 'private'` | Visibility of the post. Defaults to `private` when omitted. |
| `filename` | `string` | Filename sent with the upload (defaults to `'upload'`). |
| `title` | `string` | Optional post title (max 30 chars). |
| `description` | `string` | Optional post description (max 200 chars). |
| `postType` | `'album' \| 'individual'` | Sent as the `post-type` header. Has no effect through `upload()`, which sends a single file; use `addFiles` to build an album. |
| `includeMetadata` | `boolean` | Keep the file's metadata (EXIF, location, and the like). Omitted, the server strips it. |
| `priority` | `boolean` | Use priority (adaptive) streaming for videos. Omitted, the server enables it when your plan is eligible. |

```js
import { readFileSync } from 'node:fs';

const buffer = readFileSync('./image.png');
const { url, post } = await client.upload(buffer, { privacy: 'unlisted', filename: 'image.png' });
console.log(url, post.url);
```

### `client.updatePost(code, options)`

Update a post's title, description, or privacy. Only the fields you pass are changed; empty strings clear the title or description. A team post's privacy cannot be changed. Resolves to `{ post }`.

| Option | Type | Description |
|---|---|---|
| `title` | `string` | New title (max 30 chars). |
| `description` | `string` | New description (max 200 chars). |
| `privacy` | `'public' \| 'unlisted' \| 'private'` | New visibility. |

```js
await client.updatePost('AbC123', { title: 'New title', privacy: 'public' });
```

### `client.addFiles(code, files, options?)`

Add 1 or more files to an existing post, turning it into an album. Posts cap at 50 files total. New files inherit the post's privacy. Resolves to `{ post, failed? }`; `failed` lists the files that were rejected, each with its `index` and `error`.

| Option | Type | Description |
|---|---|---|
| `filenames` | `string[]` | Filenames, one per file (defaults to `'upload'`). |
| `includeMetadata` | `boolean` | Keep the files' metadata (EXIF, location, and the like). Omitted, the server strips it. |
| `priority` | `boolean` | Use priority (adaptive) streaming for videos. Omitted, the server enables it when your plan is eligible. |

```js
const { post, failed } = await client.addFiles('AbC123', [buffer], { filenames: ['extra.png'], includeMetadata: true });
console.log(post.file_count, failed ?? []);
```

### `client.deleteFile(code, name)`

Delete one file from a post, by the `name` it has in `post.files`. Deleting a post's only file deletes the post.

```js
const { post } = await client.getPost('AbC123');
await client.deleteFile('AbC123', post.files[1].name);
```

### `client.deletePost(code)`

Delete a post and every file in it.

```js
await client.deletePost('AbC123');
```

### `client.reportPost(code, reason?)`

Report a post, with an optional reason (max 200 chars).

```js
await client.reportPost('AbC123', 'Spam');
```

### `client.reportUser(id, reason?)`

Report a user, with an optional reason (max 200 chars).

```js
await client.reportUser('987654321098765432', 'Impersonation');
```

## Error Handling

All API errors throw a `SnippError` with these properties:

| Property | Type | Description |
|---|---|---|
| `status` | `number` | HTTP status code. |
| `type` | `string \| null` | Error type, such as `not_found`, `rate_limited`, or `quota_exceeded`. `null` when the response did not carry one. |
| `message` | `string` | Human-readable message, or the HTTP status text when the response did not carry one. |
| `body` | `object \| null` | Parsed JSON response, or `null` when it was not JSON. Context fields live under `body.error`, such as `resets_at` on `quota_exceeded`. |

```js
import { SnippClient, SnippError } from '@snipp-gg/snipp';

try {
  await client.upload(buffer, { filename: 'image.png' });
} catch (err) {
  if (err instanceof SnippError && err.type === 'quota_exceeded') {
    console.error(`Weekly quota used up, resets at ${err.body.error.resets_at}`);
  } else {
    throw err;
  }
}
```

## Migrating from 2.x

3.0 follows the reorganized Snipp API. Methods:

| 2.x | 3.0 |
|---|---|
| `listUploads({ limit })` | `listPosts({ limit, cursor })`, cursor-paginated posts |
| `editUpload(code, options)` | `updatePost(code, options)` |
| `appendUpload(code, files, options)` | `addFiles(code, files, options)` |
| `deleteUpload(filename)` | `deleteFile(code, name)`, which now needs the post's share code |
| `getUser(id, { includePosts, postsLimit })` | `getUser(id)` plus `getUserPosts(id, { limit, cursor })` |
| | New: `deletePost(code)`, `reportUser(id, reason?)` |

Responses:

- Posts use one shape everywhere: `privacy` (was `post_privacy`), `created_at` (was `created`), `view_count` (was `views`), `files[].name` (was `file_name`), and `file_count` replaces `is_album`. The top-level `urls`, `file`, and `thumbnail_url` are gone; read `files`.
- `upload()` resolves to `{ url, post }`; `message`, `file`, and `processing_time` are gone.
- Users carry `plan` (`free`, `plus`, or `ultra`) in place of `plus`, `ultra`, and `badges`, `created_at` in place of `created`, and `blocking` in place of `blocked_by_you`.

Errors:

- The API now sends every error as an `error` object with `type`, `message`, and any context fields. `SnippError` gains `type`, and context fields moved from the top of `body` into `body.error`. A check like `err.body?.suspended` becomes `err.type === 'suspended'`.

## Contributing

We welcome suggestions and improvements:

- Open an issue
- Submit a pull request that adheres to our [Terms of Service](https://snipp.gg/terms) and [Privacy Policy](https://snipp.gg/privacy)

## License

MIT License © 2026 Snipp. See [LICENSE](LICENSE) for full details.
