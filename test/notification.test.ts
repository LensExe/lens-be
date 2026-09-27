import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { ServiceUnavailableException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { AxiosService } from '../src/shared/integrations/axios/axios.service';
import { HttpNotificationService } from '../src/shared/integrations/notification/http-notification.service';

const email = {
  to: 'a@lens.vn',
  otp: '123456',
  event: 'FORGOT_PASSWORD',
  expiresInMinutes: 5,
};

/** Dựng adapter với config + axios giả; ghi lại request đã gửi. */
function setup(serviceUrl: string | undefined, fail = false) {
  const sent: { baseURL?: string; url: string; body: unknown }[] = [];
  const config = {
    get: (key: string) =>
      key === 'notification.serviceUrl' ? serviceUrl : undefined,
  } as unknown as ConfigService;
  const axiosService = {
    create: ({ config: c }: { config: { baseURL?: string } }) => ({
      post: (url: string, body: unknown) => {
        sent.push({ baseURL: c.baseURL, url, body });
        return fail
          ? Promise.reject(new Error('connect ECONNREFUSED'))
          : Promise.resolve({ status: 200 });
      },
    }),
  } as unknown as AxiosService;
  return { service: new HttpNotificationService(config, axiosService), sent };
}

test('sendOtpEmail posts the OTP payload to the notification service', async () => {
  const { service, sent } = setup('http://notify.local/');

  await service.sendOtpEmail(email);

  assert.deepEqual(sent, [
    {
      baseURL: 'http://notify.local',
      url: '/api/v1/emails/send-otp',
      body: {
        to: 'a@lens.vn',
        otp: '123456',
        event: 'FORGOT_PASSWORD',
        expired_in_minutes: 5,
      },
    },
  ]);
});

test('sendOtpEmail fails with 503 when the service URL is not configured', async () => {
  const { service, sent } = setup(undefined);

  await assert.rejects(
    service.sendOtpEmail(email),
    ServiceUnavailableException,
  );
  assert.equal(sent.length, 0);
});

test('sendOtpEmail fails with 503 when the service does not respond', async () => {
  const { service } = setup('http://notify.local', true);

  await assert.rejects(
    service.sendOtpEmail(email),
    ServiceUnavailableException,
  );
});
