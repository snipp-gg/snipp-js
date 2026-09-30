# @snipp-gg/snipp

A lightweight Node.js wrapper for the [Snipp API](https://api.snipp.gg).

## Features

- Zero dependencies, uses native `fetch` and `FormData`
- Upload, edit, append, and delete files and album posts
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
const me = await client.getUser('@me');
console.log(me.user.username);
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

### `client.getUser(id, options?)`

Get a user by ID. Pass `'@me'` to get the authenticated user.

| Option | Type | Description |
|---|---|---|
| `includePosts` | `boolean` | Include the user's posts in the response. |
| `postsLimit` | `number` | Number of posts to return (1-50). |

```js
const user = await client.getUser('@me', { includePosts: true, postsLimit: 10 });
```

### `client.getPost(code)`

Get a post by its share code. Team posts are only readable by members of that team, and omit `like_count`.

```js
const { post } = await client.getPost('AbC123');
```

### `client.upload(file, options?)`

Upload a file. Accepts a `File`, `Blob`, `Buffer`, or `Uint8Array`.

| Option | Type | Description |
|---|---|---|
| `privacy` | `'public' \| 'unlisted' \| 'private'` | Visibility of the upload. Defaults to `private` when omitted. |
| `filename` | `string` | Filename sent with the upload (defaults to `'upload'`). |
| `title` | `string` | Optional post title (max 30 chars). |
| `description` | `string` | Optional post description (max 200 chars). |
| `postType` | `'album' \| 'individual'` | Sent as the `post-type` header. Has no effect through `upload()`, which sends a single file; use `appendUpload` to build an album. |

```js
import { readFileSync } from 'node:fs';

const buffer = readFileSync('./image.png');
const result = await client.upload(buffer, { privacy: 'unlisted', filename: 'image.png' });
console.log(result.url);
```

### `client.listUploads(options?)`

List recent uploads for the authenticated user. Each item includes the upload URL, size metadata, the associated post `code` when one exists, and `is_album` when that upload belongs to an album post.

| Option | Type | Description |
|---|---|---|
| `limit` | `number` | Maximum uploads to return (1-1000). |

```js
const uploads = await client.listUploads({ limit: 100 });
```

### `client.editUpload(code, options)`

Edit an existing upload's title, description, or privacy. Empty strings clear the title or description.

```js
await client.editUpload('AbC123', { title: 'New title', privacy: 'public' });
```

### `client.appendUpload(code, files, options?)`

Append 1 or more files to an existing album post. Albums cap at 50 files total.

```js
await client.appendUpload('AbC123', [buffer], { filenames: ['extra.png'] });
```

### `client.deleteUpload(filename)`

Delete an upload by its filename.

```js
await client.deleteUpload('a3f7b2c91d4e8f0612ab34cd56ef7890.png');
```

### `client.reportPost(code, reason?)`

Report a post, with an optional reason (max 200 chars).

```js
await client.reportPost('AbC123', 'Spam');
```

## Error Handling

All API errors throw a `SnippError` with `status`, `message`, and `body` properties. `body` is the parsed JSON error response, or `null` when the response was not JSON. It carries the fields the API sends alongside `error`, such as `suspended` on a suspended user or `moderated` on a moderated post.

```js
import { SnippClient, SnippError } from '@snipp-gg/snipp';

try {
  await client.getUser('987654321098765432');
} catch (err) {
  if (err instanceof SnippError) {
    if (err.body?.suspended) {
      console.error(`${err.body.username} is suspended`);
    } else {
      console.error(err.status, err.message);
    }
  }
}
```

## Contributing

We welcome suggestions and improvements:

- Open an issue
- Submit a pull request that adheres to our [Terms of Service](https://snipp.gg/terms) and [Privacy Policy](https://snipp.gg/privacy)

## License

MIT License © 2026 Snipp. See [LICENSE](LICENSE) for full details.
