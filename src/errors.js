/**
 * Error thrown when the Snipp API responds with a non-2xx status.
 */
export class SnippError extends Error {
  /**
   * @param {string} message - `error.message` from the response, or the HTTP status text when the response did not carry one.
   * @param {number} status - HTTP status code.
   * @param {any} [body] - Parsed JSON response body, or `null` when the response was not JSON.
   * @param {string|null} [type] - `error.type` from the response, such as `not_found` or `quota_exceeded`, or `null` when the response did not carry one.
   */
  constructor(message, status, body = null, type = null) {
    super(message);
    this.name = 'SnippError';
    this.status = status;
    this.type = type;
    this.body = body;
  }
}
