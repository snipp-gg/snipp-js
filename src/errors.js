/**
 * Custom error class for Snipp API errors.
 */
export class SnippError extends Error {
  /**
   * @param {string} message - Error message from the API or a default message.
   * @param {number} status - HTTP status code.
   * @param {any} [body] - Parsed JSON error body, or `null` when the response was not JSON. Carries fields the API sends alongside `error`, such as `suspended` on a suspended user or `moderated` on a moderated post.
   */
  constructor(message, status, body = null) {
    super(message);
    this.name = 'SnippError';
    this.status = status;
    this.body = body;
  }
}