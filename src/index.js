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
 * @typedef {Object} UploadOptions
 * @property {'public'|'unlisted'|'private'} [privacy] - Post privacy setting.
 * @property {string} [filename] - Filename sent with the upload (defaults to `'upload'`).
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
   * Upload a file.
   * @param {File|Blob|Buffer|Uint8Array} file - The file to upload.
   * @param {UploadOptions} [options]
   * @returns {Promise<any>}
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
   * @returns {Promise<any>}
   */
  async listUploads() {
    return this.#request('/uploads');
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
}

export { SnippError } from './errors.js';
