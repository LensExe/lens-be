import { Injectable } from '@nestjs/common';
import nodemailer from 'nodemailer';
import { GoogleAuth } from 'google-auth-library';
import { NotificationDelivery } from '../../database/unit-of-work/unit-of-work.port';
import { DomainError } from '../../platform/exceptions/domain.error';

@Injectable()
export class SmtpFcmDelivery extends NotificationDelivery {
  private readonly googleAuth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
  });
  async send(input: {
    eventId: string;
    userId: string;
    email: string;
    tokens: string[];
    title: string;
    body: string;
  }) {
    const channels = (process.env.NOTIFICATION_CHANNELS ?? '').split(',');
    const invalidTokens: string[] = [];
    if (channels.includes('email')) {
      // TODO: INSERT_SMTP_HOST / INSERT_SMTP_USER / INSERT_SMTP_PASSWORD / INSERT_SMTP_FROM.
      if (!process.env.SMTP_HOST || !process.env.SMTP_FROM)
        throw new DomainError(
          'unavailable',
          'SMTP delivery selected but not configured',
        );
      const transport = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: process.env.SMTP_SECURE === 'true',
        requireTLS: process.env.SMTP_SECURE !== 'true',
        auth: process.env.SMTP_USER
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
          : undefined,
        connectionTimeout: 10000,
        socketTimeout: 15000,
      });
      try {
        await transport.sendMail({
          from: process.env.SMTP_FROM,
          to: input.email,
          subject: input.title,
          text: input.body,
          messageId: `<${input.eventId}.${input.userId}@lens.notifications>`,
        });
      } finally {
        transport.close();
      }
    }
    if (channels.includes('push') && input.tokens.length) {
      // TODO: INSERT_FCM_PROJECT_ID and GOOGLE_APPLICATION_CREDENTIALS (service account file).
      const project = process.env.FCM_PROJECT_ID;
      if (!project)
        throw new DomainError(
          'unavailable',
          'FCM delivery selected but not configured',
        );
      const client = await this.googleAuth.getClient();
      for (const token of input.tokens) {
        try {
          await client.request({
            url: `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(project)}/messages:send`,
            method: 'POST',
            timeout: 15000,
            data: {
              message: {
                token,
                notification: {
                  title: input.title,
                  body: input.body.slice(0, 500),
                },
                data: { event_id: input.eventId },
                android: { collapse_key: input.eventId },
                apns: { headers: { 'apns-collapse-id': input.eventId } },
              },
            },
          });
        } catch (error) {
          const details = (
            error as {
              response?: {
                data?: { error?: { details?: { errorCode?: string }[] } };
              };
            }
          ).response?.data?.error?.details;
          if (details?.some((d) => d.errorCode === 'UNREGISTERED'))
            invalidTokens.push(token);
          else
            throw new DomainError(
              'unavailable',
              'FCM delivery failed; event will retry',
            );
        }
      }
    }
    return { invalidTokens };
  }
}
