export interface IMailDTO {
  body: string;
  from?: string;
  html?: string;
  subject: string;
  replyTo?: string;
  attachments?: any[];
  to: string | string[];
}

export interface IMailProvider {
  sendMail(data: IMailDTO): Promise<void>;
}
