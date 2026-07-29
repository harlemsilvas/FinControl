import nodemailer from 'nodemailer';
import type { Environment } from '../../config/environment.js';

interface SmtpSentMessage {
  messageId?: string;
}

export interface EmailMessage {
  to: string;
  recipientName: string | null;
  subject: string;
  text: string;
  html: string | null;
}

export interface EmailSendResult {
  providerMessageId: string | null;
}

export interface EmailSender {
  readonly enabled: boolean;
  send(message: EmailMessage): Promise<EmailSendResult>;
}

export class DisabledEmailSender implements EmailSender {
  readonly enabled = false;

  send(): Promise<EmailSendResult> {
    return Promise.resolve({ providerMessageId: null });
  }
}

export class SmtpEmailSender implements EmailSender {
  readonly enabled = true;
  private readonly transporter: nodemailer.Transporter<SmtpSentMessage>;
  private readonly from: string;

  constructor(environment: Environment) {
    if (!environment.SMTP_HOST || !environment.SMTP_FROM_EMAIL) {
      throw new Error('SMTP_HOST and SMTP_FROM_EMAIL are required when SMTP is enabled');
    }

    this.from = `"${this.escapeAddressName(environment.SMTP_FROM_NAME)}" <${environment.SMTP_FROM_EMAIL}>`;
    this.transporter = nodemailer.createTransport({
      host: environment.SMTP_HOST,
      port: environment.SMTP_PORT,
      secure: environment.SMTP_SECURE,
      auth: environment.SMTP_USER ? { user: environment.SMTP_USER, pass: environment.SMTP_PASSWORD ?? '' } : undefined,
    });
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    const result = await this.transporter.sendMail({
      from: this.from,
      to: message.recipientName ? `"${this.escapeAddressName(message.recipientName)}" <${message.to}>` : message.to,
      subject: message.subject,
      text: message.text,
      html: message.html ?? undefined,
    });

    return { providerMessageId: result.messageId ?? null };
  }

  private escapeAddressName(value: string): string {
    return value.replace(/["\\]/g, '');
  }
}

export function createEmailSender(environment: Environment): EmailSender {
  return environment.SMTP_ENABLED ? new SmtpEmailSender(environment) : new DisabledEmailSender();
}
