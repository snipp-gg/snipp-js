import { SnippError } from './errors.js';

const BASE_URL = 'https://api.snipp.gg';

/**
 * @typedef {Object} SnippClientOptions
 * @property {string} apiKey - Your Snipp API key (starts with `snp_`).
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
 * @property {'public'|'unlisted'|'private'} [privacy] - Post privacy setting.
 * @property {string} [filename] - Filename sent with the upload (defaults to `'upload'`).
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
 * @property {{ code: string, url: string, postPrivacy: string }} [post] - Post metadata.
 */

/**
 * @typedef {Object} UploadEntry
 * @property {string} url
 * @property {number} size - File size in bytes.
 * @property {string} size_formatted - Human-readable file size.
 * @property {string} uploaded - ISO 8601 timestamp.
 */

/**
 * @typedef {Object} PostDetail
 * @property {string} code
 * @property {string|null} url - Direct URL to the file.
 * @property {string|null} title
 * @property {string|null} description
 * @property {string} postPrivacy
 * @property {string|null} created - ISO 8601 timestamp.
 * @property {FileInfo} [file] - File metadata.
 * @property {boolean} [moderated] - Only present for the owner if the post was moderated.
 */

export class SnippClient {
  /** @type {string} */
  #apiKey;

  /**
   * Create a new Snipp API client.
   * @param {SnippClientOptions} options
   */
  constructor({ apiKey }) {
    if (!apiKey) {
      throw new Error('An API key is required.');
    }
    this.#apiKey = apiKey;
  }

  /**
   * Internal helper for making authenticated requests.
   * @param {string} path - API path.
   * @param {RequestInit & { headers?: Record<string, string> }} [options] - Fetch options.
   * @returns {Promise<any>}
   */
  async #request(path, options = {}) {
    const url = `${BASE_URL}${path}`;

    const headers = {
      'api-key': this.#apiKey,
      ...options.headers,
    };

    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      let message;
      try {
        const body = await response.json();
        message = body.message || body.error || response.statusText;
      } catch {
        message = response.statusText;
      }
      throw new SnippError(message, response.status);
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
      params.set('includePosts', String(options.includePosts));
    }
    if (options.postsLimit !== undefined) {
      params.set('postsLimit', String(options.postsLimit));
    }

    const query = params.toString();
    const path = `/users/${encodeURIComponent(id)}${query ? `?${query}` : ''}`;

    return this.#request(path);
  }

  /**
   * Get a post by its share code.
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
      headers['postprivacy'] = options.privacy;
    }

    return this.#request('/upload', {
      method: 'POST',
      headers,
      body: formData,
    });
  }

  /**
   * List recent uploads for the authenticated user.
   * @returns {Promise<{ uploads: UploadEntry[] }>}
   */
  async listUploads() {
    return this.#request('/uploads');
  }

  /**
   * Edit an existing upload.
   * @param {string} code - The share code of the upload to edit.
   * @param {EditUploadOptions} options - Fields to update.
   * @returns {Promise<any>}
   */
  async editUpload(code, options = {}) {
    const headers = { code };

    if (options.title !== undefined) {
      headers['title'] = options.title;
    }
    if (options.description !== undefined) {
      headers['description'] = options.description;
    }
    if (options.privacy !== undefined) {
      headers['postprivacy'] = options.privacy;
    }

    return this.#request('/editUpload', {
      method: 'PATCH',
      headers,
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
   * Browse public uploads.
   * @returns {Promise<any>}
   */
  async discover() {
    return this.#request('/discover');
  }

  /**
   * List blocked users.
   * @returns {Promise<{ blocks: Array<{ userId: string, created: string }> }>}
   */
  async listBlocks() {
    return this.#request('/blocks');
  }

  /**
   * Block a user.
   * @param {string} targetId - The ID of the user to block.
   * @returns {Promise<{ blocked: boolean }>}
   */
  async blockUser(targetId) {
    return this.#request('/block', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetId }),
    });
  }

  /**
   * Unblock a user.
   * @param {string} targetId - The ID of the user to unblock.
   * @returns {Promise<{ blocked: boolean }>}
   */
  async unblockUser(targetId) {
    return this.#request('/unblock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetId }),
    });
  }

  async reportPost(code, reason = '') {
    return this.#request('/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, reason }),
    });
  }
}

export { SnippError } from './errors.js';
