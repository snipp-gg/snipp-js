/**
 * Custom error class for Snipp API errors.
 */
export class SnippError extends Error {
  /**
   * @param {string} message - Error message from the API or a default message.
   * @param {number} status - HTTP status code.
   */
  constructor(message, status) {
    super(message);
    this.name = 'SnippError';
    this.status = status;
  }
}