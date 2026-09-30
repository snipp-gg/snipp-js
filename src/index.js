import { SnippError } from './errors.js';

const BASE_URL = 'https://api.snipp.gg';
const REGIONS = ['eu-west-1', 'us-west-1'];
const PRIVACY_VALUES = ['public', 'unlisted', 'private'];
const POST_TYPES = ['album', 'individual'];

function assertPrivacy(privacy) {
  if (privacy !== undefined && !PRIVACY_VALUES.includes(privacy)) {
    throw new Error(`Unknown privacy setting. Expected one of: ${PRIVACY_VALUES.join(', ')}`);
  }
}

/**
 * @typedef {Object} SnippClientOptions
 * @property {string} apiKey - Your Snipp API key.
 * @property {'eu-west-1'|'us-west-1'} [region] - Pin requests to a regional endpoint. Uploads run at the same speed either way; this controls which region stores your files. Omit to use `api.snipp.gg`.
 */

/**
 * @typedef {Object} GetUserOptions
 * @property {boolean} [includePosts] - Whether to include the user's posts.
 * @property {number} [postsLimit] - Number of posts to include (1-50).
 */

/**
 * @typedef {Object} EditUploadOptions
 * @property {string} [title] - New title (max 30 chars). Empty string to clear.
 * @property {string} [description] - New description (max 200 chars). Empty string to clear.
 * @property {'public'|'unlisted'|'private'} [privacy] - New privacy setting.
 */

/**
 * @typedef {Object} UploadOptions
 * @property {'public'|'unlisted'|'private'} [privacy] - Post privacy setting. Defaults to the server default (`private`) when omitted.
 * @property {string} [filename] - Filename sent with the upload (defaults to `'upload'`).
 * @property {string} [title] - Optional post title (max 30 chars).
 * @property {string} [description] - Optional post description (max 200 chars).
 * @property {'album'|'individual'} [postType] - Sent as the `post-type` header. Has no effect through `upload()`, which sends a single file; use `appendUpload` to build an album.
 */

/**
 * @typedef {Object} FileDimensions
 * @property {number} width
 * @property {number} height
 */

/**
 * @typedef {Object} FileInfo
 * @property {number} size - File size in bytes.
 * @property {string} size_formatted - Human-readable file size (e.g. `"2.50 MB"`).
 * @property {string} mime_type - MIME type (e.g. `"image/png"`).
 * @property {FileDimensions} [dimensions] - Image dimensions (only for images/GIFs).
 */

/**
 * @typedef {Object} UploadResponse
 * @property {string} message
 * @property {string} url - Direct URL to the uploaded file.
 * @property {FileInfo} file - File metadata.
 * @property {number} processing_time - Server-side processing time in milliseconds.
 * @property {{ code: string, url: string, post_privacy: string, priority: boolean, is_album?: boolean, file_count?: number }} [post] - Post metadata. `is_album` and `file_count` are present on album posts.
 */

/**
 * @typedef {Object} UploadEntry
 * @property {string|null} [code] - Associated share code when a post exists.
 * @property {boolean} is_album - Whether the upload belongs to an album post.
 * @property {string} url
 * @property {string} [thumbnail_url] - Video thumbnail URL, when one exists.
 * @property {string|null} title - Post title.
 * @property {number} size - File size in bytes.
 * @property {string} size_formatted - Human-readable file size.
 * @property {string} uploaded - ISO 8601 timestamp.
 * @property {boolean} priority - Whether the post uses priority (adaptive) streaming.
 */

/**
 * @typedef {Object} PostDetail
 * @property {string} code
 * @property {string|null} url - Direct URL to the file.
 * @property {string[]} [urls] - Direct URLs for album files.
 * @property {boolean} [is_album] - Whether this post is an album.
 * @property {Array<{ index: number, file_name: string, url: string, width?: number, height?: number, mime_type?: string, size?: number, size_formatted?: string }>} [files] - Every file in the post, in order.
 * @property {string} [thumbnail_url] - Video thumbnail URL, when one exists.
 * @property {string|null} title
 * @property {string|null} description
 * @property {string} post_privacy
 * @property {string|null} created - ISO 8601 timestamp.
 * @property {number} views - Total view count.
 * @property {number} [like_count] - Total likes. Omitted on team posts, which cannot be liked.
 * @property {number} comment_count - Total comments.
 * @property {boolean} priority - Whether the post uses priority (adaptive) streaming.
 * @property {FileInfo} [file] - File metadata.
 * @property {boolean} [moderated] - Only present for the owner if the post was moderated.
 * @property {boolean} [restricted] - Only present for the owner if the post was restricted.
 */

export class SnippClient {
  /** @type {string} */
  #apiKey;

  /** @type {string} */
  #baseUrl;

  /**
   * Create a new Snipp API client.
   * @param {SnippClientOptions} options
   */
  constructor({ apiKey, region }) {
    if (!apiKey) {
      throw new Error('An API key is required.');
    }
    if (region !== undefined && !REGIONS.includes(region)) {
      throw new Error(`Unknown region. Expected one of: ${REGIONS.join(', ')}`);
    }
    this.#apiKey = apiKey;
    this.#baseUrl = region ? `https://${region}.api.snipp.gg` : BASE_URL;
  }

  /**
   * Internal helper for making authenticated requests.
   * @param {string} path - API path.
   * @param {RequestInit & { headers?: Record<string, string> }} [options] - Fetch options.
   * @returns {Promise<any>}
   */
  async #request(path, options = {}) {
    const url = `${this.#baseUrl}${path}`;

    const headers = {
      'api-key': this.#apiKey,
      ...options.headers,
    };

    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      let message;
      let body = null;
      try {
        body = await response.json();
        message = body.error || body.message || response.statusText;
      } catch {
        message = response.statusText;
      }
      throw new SnippError(message, response.status, body);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }

    return response.text();
  }

  /**
   * Get a user by ID.
   * @param {string} id - User ID, or `@me` for the authenticated user.
   * @param {GetUserOptions} [options]
   * @returns {Promise<any>}
   */
  async getUser(id, options = {}) {
    const params = new URLSearchParams();

    if (options.includePosts !== undefined) {
      params.set('include_posts', String(options.includePosts));
    }
    if (options.postsLimit !== undefined) {
      params.set('posts_limit', String(options.postsLimit));
    }

    const query = params.toString();
    const path = `/users/${encodeURIComponent(id)}${query ? `?${query}` : ''}`;

    return this.#request(path);
  }

  /**
   * Get a post by its share code. Team posts are only readable by members of
   * that team, and omit `like_count`.
   * @param {string} code - The share code of the post.
   * @returns {Promise<{ post: PostDetail }>}
   */
  async getPost(code) {
    return this.#request(`/posts/${encodeURIComponent(code)}`);
  }

  /**
   * Upload a file.
   * @param {File|Blob|Buffer|Uint8Array} file - The file to upload.
   * @param {UploadOptions} [options]
   * @returns {Promise<UploadResponse>}
   */
  async upload(file, options = {}) {
    assertPrivacy(options.privacy);
    if (options.postType !== undefined && !POST_TYPES.includes(options.postType)) {
      throw new Error(`Unknown post type. Expected one of: ${POST_TYPES.join(', ')}`);
    }

    const formData = new FormData();
    const filename = options.filename ?? 'upload';

    if (file instanceof Blob) {
      formData.append('file', file, file.name ?? filename);
    } else if (file instanceof Uint8Array || (typeof Buffer !== 'undefined' && Buffer.isBuffer(file))) {
      formData.append('file', new Blob([file]), filename);
    } else {
      throw new Error('file must be a File, Blob, Buffer, or Uint8Array.');
    }

    const headers = {};
    if (options.privacy) {
      headers['post-privacy'] = options.privacy;
    }
    if (options.title !== undefined) {
      formData.append('title', options.title);
    }
    if (options.description !== undefined) {
      formData.append('description', options.description);
    }
    if (options.postType !== undefined) {
      headers['post-type'] = options.postType;
    }

    return this.#request('/upload', {
      method: 'POST',
      headers,
      body: formData,
    });
  }

  /**
   * List recent uploads for the authenticated user.
   * @param {object} [options]
   * @param {number} [options.limit] - Maximum uploads to return (1-1000).
   * @returns {Promise<{ uploads: UploadEntry[] }>}
   */
  async listUploads(options = {}) {
    const params = new URLSearchParams();
    if (options.limit !== undefined) params.set('limit', String(options.limit));
    const qs = params.toString();
    return this.#request(`/uploads${qs ? `?${qs}` : ''}`);
  }

  /**
   * Edit an existing upload.
   * @param {string} code - The share code of the upload to edit.
   * @param {EditUploadOptions} options - Fields to update.
   * @returns {Promise<any>}
   */
  async editUpload(code, options = {}) {
    assertPrivacy(options.privacy);

    const headers = { code };
    const formData = new FormData();

    if (options.title !== undefined) {
      formData.append('title', options.title);
    }
    if (options.description !== undefined) {
      formData.append('description', options.description);
    }
    if (options.privacy !== undefined) {
      headers['post-privacy'] = options.privacy;
    }

    return this.#request('/editUpload', {
      method: 'PATCH',
      headers,
      body: formData,
    });
  }

  /**
   * Append 1 or more files to an existing album post. The post's share code,
   * privacy, title, and description are preserved. Albums cap at 50 files total;
   * requests that would exceed the cap are rejected. New files inherit the
   * post's privacy; returned URLs are signed with a 24-hour expiry for
   * private posts.
   *
   * @param {string} code - The share code of the post to append to.
   * @param {Array<File|Blob|Buffer|Uint8Array>} files - 1 or more files to append.
   * @param {{ filenames?: string[] }} [options] - Optional filenames (one per file in `files`).
   * @returns {Promise<any>}
   */
  async appendUpload(code, files, options = {}) {
    if (!code || typeof code !== 'string') {
      throw new Error('code must be a non-empty string.');
    }
    if (!Array.isArray(files) || files.length === 0) {
      throw new Error('files must be a non-empty array.');
    }

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const filename = options.filenames?.[i] ?? 'upload';

      if (file instanceof Blob) {
        formData.append('file', file, file.name ?? filename);
      } else if (file instanceof Uint8Array || (typeof Buffer !== 'undefined' && Buffer.isBuffer(file))) {
        formData.append('file', new Blob([file]), filename);
      } else {
        throw new Error(`files[${i}] must be a File, Blob, Buffer, or Uint8Array.`);
      }
    }

    return this.#request('/appendUpload', {
      method: 'POST',
      headers: { 'post-code': code },
      body: formData,
    });
  }

  /**
   * Delete an upload by filename.
   * @param {string} filename - The filename of the upload to delete.
   * @returns {Promise<any>}
   */
  async deleteUpload(filename) {
    return this.#request('/deleteUpload', {
      method: 'DELETE',
      headers: {
        file: filename,
      },
    });
  }

  /**
   * Report a post.
   * @param {string} code - The share code of the post to report.
   * @param {string} [reason] - Optional reason for the report (max 200 chars).
   * @returns {Promise<any>}
   */
  async reportPost(code, reason = '') {
    return this.#request('/report-post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, reason }),
    });
  }
}

export { SnippError } from './errors.js';
