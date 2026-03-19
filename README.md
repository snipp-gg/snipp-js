# @snipp-gg/snipp

A lightweight Node.js wrapper for the [Snipp API](https://api.snipp.gg).

## Features

- Zero dependencies — uses native `fetch` and `FormData`
- Upload files, manage uploads, and browse public content
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

### `new SnippClient({ apiKey })`

Create a client instance. The API key is sent via the `api-key` header on every request.

### `client.getUser(id, options?)`

Get a user by ID. Pass `'@me'` to get the authenticated user.

| Option | Type | Description |
|---|---|---|
| `includePosts` | `boolean` | Include the user's posts in the response. |
| `postsLimit` | `number` | Number of posts to return (1--50). |

```js
const user = await client.getUser('@me', { includePosts: true, postsLimit: 10 });
```

### `client.upload(file, options?)`

Upload a file. Accepts a `File`, `Blob`, `Buffer`, or `Uint8Array`.

| Option | Type | Description |
|---|---|---|
| `privacy` | `'public' \| 'unlisted' \| 'private'` | Visibility of the upload. |
| `filename` | `string` | Filename sent with the upload (defaults to `'upload'`). |

```js
import { readFileSync } from 'node:fs';

const buffer = readFileSync('./image.png');
const result = await client.upload(buffer, { privacy: 'unlisted', filename: 'image.png' });
console.log(result.url);
```

### `client.listUploads()`

List recent uploads for the authenticated user.

```js
const uploads = await client.listUploads();
```

### `client.deleteUpload(filename)`

Delete an upload by its filename.

```js
await client.deleteUpload('a3f7b2c91d4e8f0612ab34cd56ef7890.png');
```

### `client.discover()`

Browse public uploads.

```js
const posts = await client.discover();
```

## Error Handling

All API errors throw a `SnippError` with `status` and `message` properties.

```js
import { SnippClient, SnippError } from '@snipp-gg/snipp';

try {
  await client.getUser('nonexistent');
} catch (err) {
  if (err instanceof SnippError) {
    console.error(err.status, err.message);
  }
}
```

## Contributing

We welcome suggestions and improvements:

- Open an issue
- Submit a pull request that adheres to our [Terms of Service](https://snipp.gg/terms) and [Privacy Policy](https://snipp.gg/privacy)

## License

MIT License © 2026 Snipp. See [LICENSE](LICENSE) for full details.