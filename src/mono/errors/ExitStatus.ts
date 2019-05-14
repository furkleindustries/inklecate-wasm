export class ExitStatus extends Error {
  public readonly name = 'ExitStatus';
  public readonly message = `Program terminated with exit(${this.status}).`;
  constructor(public readonly status: number) {
    super(String(status));
  }
}
