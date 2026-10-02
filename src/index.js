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

function appendFile(formData, file, filename, label) {
  if (file instanceof Blob) {
    formData.append('file', file, file.name ?? filename);
  } else if (file instanceof Uint8Array || (typeof Buffer !== 'undefined' && Buffer.isBuffer(file))) {
    formData.append('file', new Blob([file]), filename);
  } else {
    throw new Error(`${label} must be a File, Blob, Buffer, or Uint8Array.`);
  }
}

function uploadHeaders(options) {
  const headers = {};
  if (options.includeMetadata !== undefined) headers['include-metadata'] = String(options.includeMetadata);
  if (options.priority !== undefined) headers['priority'] = String(options.priority);
  return headers;
}

function pageQuery(options) {
  const params = new URLSearchParams();
  if (options.limit !== undefined) params.set('limit', String(options.limit));
  if (options.cursor !== undefined) params.set('cursor', options.cursor);
  const query = params.toString();
  return query ? `?${query}` : '';
}

/**
 * @typedef {Object} SnippClientOptions
 * @property {string} apiKey - Your Snipp API key.
 * @property {'eu-west-1'|'us-west-1'} [region] - Pin requests to a regional endpoint. Uploads run at the same speed either way; this controls which region stores your files. Omit to use `api.snipp.gg`.
 */

/**
 * @typedef {'public'|'unlisted'|'private'} Privacy
 */

/**
 * @typedef {'free'|'plus'|'ultra'} Plan
 */

/**
 * @typedef {Object} ListOptions
 * @property {number} [limit] - Posts per page (1-100, default 30).
 * @property {string} [cursor] - `next_cursor` from the previous page.
 */

/**
 * @typedef {Object} UploadOptions
 * @property {Privacy} [privacy] - Post privacy. Omitted, the server uploads as `private`.
 * @property {string} [filename] - Filename sent with the upload (defaults to `'upload'`). Ignored for a `File`, which carries its own name.
 * @property {string} [title] - Post title (max 30 chars).
 * @property {string} [description] - Post description (max 200 chars).
 * @property {'album'|'individual'} [postType] - Sent as the `post-type` header. Has no effect through `upload()`, which sends a single file; use `addFiles` to build an album.
 * @property {boolean} [includeMetadata] - Keep the file's metadata (EXIF, location, and the like). Omitted, the server strips it.
 * @property {boolean} [priority] - Use priority (adaptive) streaming for videos. Omitted, the server enables it when your plan is eligible.
 */

/**
 * @typedef {Object} UpdatePostOptions
 * @property {string} [title] - New title (max 30 chars). Empty string to clear.
 * @property {string} [description] - New description (max 200 chars). Empty string to clear.
 * @property {Privacy} [privacy] - New privacy. A team post's privacy cannot be changed.
 */

/**
 * @typedef {Object} AddFilesOptions
 * @property {string[]} [filenames] - Filenames, one per entry in `files` (defaults to `'upload'`). Ignored for a `File`, which carries its own name.
 * @property {boolean} [includeMetadata] - Keep the files' metadata (EXIF, location, and the like). Omitted, the server strips it.
 * @property {boolean} [priority] - Use priority (adaptive) streaming for videos. Omitted, the server enables it when your plan is eligible.
 */

/**
 * @typedef {Object} UserRef
 * @property {string} id
 * @property {string|null} username
 * @property {string|null} nickname
 * @property {string} avatar - Avatar URL. Users without one get the default avatar URL.
 * @property {boolean} verified
 * @property {Plan} plan
 */

/**
 * @typedef {Object} UsageWindow
 * @property {number} used - Amount used in the current window (bytes for `usage`, minutes for `priority_minutes`).
 * @property {number} limit - Allowance for the window, in the same unit.
 * @property {number} used_percent - `used` as a percentage of `limit`.
 * @property {string|null} resets_at - ISO 8601 time the window resets, or `null` when no window is open.
 */

/**
 * @typedef {Object} Limits
 * @property {number} max_file_size - Largest single file you can upload, in bytes.
 * @property {UsageWindow} usage - Weekly upload quota.
 * @property {UsageWindow} priority_minutes - Priority (adaptive) streaming minutes.
 */

/**
 * @typedef {Object} User
 * @property {string} id
 * @property {string|null} username
 * @property {string|null} nickname
 * @property {string} avatar - Avatar URL. Users without one get the default avatar URL.
 * @property {string|null} banner - Banner URL, or `null` when unset.
 * @property {string|null} bio
 * @property {Object|null} socials
 * @property {Plan} plan
 * @property {boolean} verified
 * @property {boolean} staff
 * @property {boolean} partner
 * @property {boolean} translator
 * @property {number} bug_hunter_tier
 * @property {boolean} suspended
 * @property {string|null} created_at - ISO 8601 timestamp, or `null` when unknown.
 * @property {Object|null} custom_embed
 * @property {number} follower_count
 * @property {number} following_count
 * @property {boolean} following - Whether you follow this user. `false` on yourself.
 * @property {boolean} blocking - Whether you block this user. `false` on yourself.
 * @property {string} [api_key] - Your API key. Only on yourself.
 * @property {boolean} [key_has_uploads_access] - Whether your API key can manage uploads. Only on yourself.
 * @property {number} [upload_count] - Your total uploads. Only on yourself.
 * @property {Limits} [limits] - Your plan limits and usage. Only on yourself.
 */

/**
 * @typedef {Object} PostFile
 * @property {string} name - Stored filename (`<32 hex>.<ext>`), used by `deleteFile`.
 * @property {string} url - Direct file URL. Signed with a 24-hour expiry when the post is private.
 * @property {number|null} size - Size in bytes, or `null` when unknown.
 * @property {string|null} mime_type - MIME type, or `null` when unknown.
 * @property {number|null} width - Pixel width, or `null` when unknown.
 * @property {number|null} height - Pixel height, or `null` when unknown.
 * @property {string|null} thumbnail_url - Video thumbnail URL, or `null` when there is none.
 */

/**
 * @typedef {Object} Post
 * @property {string} code - Share code.
 * @property {string} url - Share page URL (`https://snipp.gg/p/<code>`).
 * @property {string|null} title
 * @property {string|null} description
 * @property {Privacy} privacy
 * @property {string} created_at - ISO 8601 timestamp.
 * @property {number} view_count
 * @property {number|null} like_count - `null` on team posts, which cannot be liked.
 * @property {number} comment_count
 * @property {boolean} priority - Whether the post uses priority (adaptive) streaming.
 * @property {number} file_count
 * @property {PostFile[]} files - Every file in the post, in order.
 * @property {string|null} team_id - Owning team, or `null` on personal posts.
 * @property {UserRef|null} author - `null` when the author could not be resolved.
 * @property {boolean|null} liked - Whether you liked the post. `null` on team posts.
 * @property {boolean} [moderated] - Only present for the owner.
 * @property {boolean} [restricted] - Only present for the owner.
 */

/**
 * @typedef {Object} PostList
 * @property {Post[]} posts
 * @property {boolean} has_more - Whether another page exists.
 * @property {string|null} next_cursor - Pass as `cursor` to fetch the next page. `null` on the last page.
 */

/**
 * @typedef {Object} FailedFile
 * @property {number} index - Position of the file in the request.
 * @property {{ type: string, message: string }} error - Why the file failed, in the same shape as a failed request's `error` object, context fields included.
 */

/**
 * @typedef {Object} UploadResponse
 * @property {string} url - Direct URL of the uploaded file.
 * @property {Post} post - The created post.
 */

/**
 * @typedef {Object} AddFilesResponse
 * @property {Post} post - The post after the files were added.
 * @property {FailedFile[]} [failed] - Files that were rejected. Present only when some files failed.
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

  async #request(path, options = {}) {
    const response = await fetch(`${this.#baseUrl}${path}`, {
      ...options,
      headers: { 'api-key': this.#apiKey, ...options.headers },
    });

    if (!response.ok) {
      let body = null;
      try {
        body = await response.json();
      } catch {}
      const error = body?.error;
      throw new SnippError(
        typeof error?.message === 'string' ? error.message : response.statusText,
        response.status,
        body,
        typeof error?.type === 'string' ? error.type : null,
      );
    }

    return response.json();
  }

  #json(path, method, body) {
    return this.#request(path, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  /**
   * Get a user by ID.
   * @param {string} id - User ID, or `@me` for the authenticated user.
   * @returns {Promise<{ user: User }>}
   */
  async getUser(id) {
    return this.#request(`/users/${encodeURIComponent(id)}`);
  }

  /**
   * List a user's public posts, newest first. Team, private, unlisted,
   * moderated, and restricted posts are never included.
   * @param {string} id - User ID, or `@me` for the authenticated user.
   * @param {ListOptions} [options]
   * @returns {Promise<PostList>}
   */
  async getUserPosts(id, options = {}) {
    return this.#request(`/users/${encodeURIComponent(id)}/posts${pageQuery(options)}`);
  }

  /**
   * List the authenticated user's own posts of every privacy, newest first.
   * Team posts are not included.
   * @param {ListOptions} [options]
   * @returns {Promise<PostList>}
   */
  async listPosts(options = {}) {
    return this.#request(`/posts${pageQuery(options)}`);
  }

  /**
   * Get a post by its share code. Team posts are only readable by members of
   * that team.
   * @param {string} code - Share code of the post.
   * @returns {Promise<{ post: Post }>}
   */
  async getPost(code) {
    return this.#request(`/posts/${encodeURIComponent(code)}`);
  }

  /**
   * Upload a file as a new post.
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
    appendFile(formData, file, options.filename ?? 'upload', 'file');
    if (options.title !== undefined) {
      formData.append('title', options.title);
    }
    if (options.description !== undefined) {
      formData.append('description', options.description);
    }

    const headers = uploadHeaders(options);
    if (options.privacy !== undefined) {
      headers['post-privacy'] = options.privacy;
    }
    if (options.postType !== undefined) {
      headers['post-type'] = options.postType;
    }

    return this.#request('/upload', { method: 'POST', headers, body: formData });
  }

  /**
   * Update a post's title, description, or privacy. Only the fields you pass
   * are changed. A team post's privacy cannot be changed.
   * @param {string} code - Share code of the post.
   * @param {UpdatePostOptions} options - Fields to update.
   * @returns {Promise<{ post: Post }>}
   */
  async updatePost(code, options = {}) {
    assertPrivacy(options.privacy);
    const { title, description, privacy } = options;
    return this.#json(`/posts/${encodeURIComponent(code)}`, 'PATCH', { title, description, privacy });
  }

  /**
   * Add 1 or more files to an existing post, turning it into an album. The
   * post's share code, privacy, title, and description are preserved. Posts
   * cap at 50 files total; requests that would exceed the cap are rejected.
   * New files inherit the post's privacy.
   * @param {string} code - Share code of the post.
   * @param {Array<File|Blob|Buffer|Uint8Array>} files - 1 or more files to add.
   * @param {AddFilesOptions} [options]
   * @returns {Promise<AddFilesResponse>}
   */
  async addFiles(code, files, options = {}) {
    if (!code || typeof code !== 'string') {
      throw new Error('code must be a non-empty string.');
    }
    if (!Array.isArray(files) || files.length === 0) {
      throw new Error('files must be a non-empty array.');
    }

    const formData = new FormData();
    files.forEach((file, i) => appendFile(formData, file, options.filenames?.[i] ?? 'upload', `files[${i}]`));

    return this.#request(`/posts/${encodeURIComponent(code)}/files`, {
      method: 'POST',
      headers: uploadHeaders(options),
      body: formData,
    });
  }

  /**
   * Delete one file from a post. Deleting a post's only file deletes the post.
   * @param {string} code - Share code of the post.
   * @param {string} name - Stored filename, as in `post.files[].name`.
   * @returns {Promise<{ name: string, deleted: true }>}
   */
  async deleteFile(code, name) {
    return this.#request(`/posts/${encodeURIComponent(code)}/files/${encodeURIComponent(name)}`, { method: 'DELETE' });
  }

  /**
   * Delete a post and every file in it.
   * @param {string} code - Share code of the post.
   * @returns {Promise<{ code: string, deleted: true }>}
   */
  async deletePost(code) {
    return this.#request(`/posts/${encodeURIComponent(code)}`, { method: 'DELETE' });
  }

  /**
   * Report a post to Snipp moderation.
   * @param {string} code - Share code of the post.
   * @param {string} [reason] - Reason for the report (max 200 chars).
   * @returns {Promise<{ reported: true }>}
   */
  async reportPost(code, reason) {
    return this.#json(`/posts/${encodeURIComponent(code)}/report`, 'POST', { reason });
  }

  /**
   * Report a user to Snipp moderation.
   * @param {string} id - User ID.
   * @param {string} [reason] - Reason for the report (max 200 chars).
   * @returns {Promise<{ reported: true }>}
   */
  async reportUser(id, reason) {
    return this.#json(`/users/${encodeURIComponent(id)}/report`, 'POST', { reason });
  }
}

export { SnippError } from './errors.js';
