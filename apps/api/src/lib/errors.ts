export class HttpError extends Error {
  public status: number;
  public type: string;
  public title: string;
  public detail?: string;
  public fields?: Record<string, string[]>;

  constructor(opts: {
    status: number;
    title: string;
    type?: string;
    detail?: string;
    fields?: Record<string, string[]>;
  }) {
    super(opts.title);
    this.status = opts.status;
    this.title = opts.title;
    this.type = opts.type ?? `about:blank`;
    this.detail = opts.detail;
    this.fields = opts.fields;
  }
}

export const badRequest = (detail?: string, fields?: Record<string, string[]>) =>
  new HttpError({ status: 400, title: 'Bad Request', detail, fields });

export const unauthorized = (detail = 'Authentication required') =>
  new HttpError({ status: 401, title: 'Unauthorized', detail });

export const forbidden = (detail = 'Insufficient permissions') =>
  new HttpError({ status: 403, title: 'Forbidden', detail });

export const notFound = (detail = 'Resource not found') =>
  new HttpError({ status: 404, title: 'Not Found', detail });

export const conflict = (detail?: string) =>
  new HttpError({ status: 409, title: 'Conflict', detail });

export const internal = (detail = 'Internal server error') =>
  new HttpError({ status: 500, title: 'Internal Server Error', detail });
