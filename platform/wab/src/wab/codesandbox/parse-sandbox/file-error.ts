export default class FileError extends Error {
  public path: string;
  public isBinary: boolean;

  /**
   * Creates an instance of FileError.
   * @param {string} message
   * @param {string} path
   * @param {boolean} [isBinary=false] Whether the error was caused because the file is binary
   * @memberof FileError
   */
  constructor(message: string, path: string, isBinary = false) {
    super(message);

    this.path = path;
    this.isBinary = isBinary;
  }
}
