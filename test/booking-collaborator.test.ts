import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { Collaboration } from '../src/modules/booking/collaborator.domain';

const invite = {
  bookingStatus: 'accepted',
  galleryPublished: false,
  ownerPhotographerId: 'owner',
  inviteePhotographerId: 'b',
  inviteeVerified: true,
  inviteeActive: true,
  sharePercent: 30,
  existing: [] as {
    photographer_id: string;
    status: string;
    share_percent: number;
  }[],
};

test('invite only while the booking is accepted or in progress and not yet delivered', () => {
  assert.equal(Collaboration.invite(invite).status, 'invited');
  assert.equal(
    Collaboration.invite({ ...invite, bookingStatus: 'in_progress' }).status,
    'invited',
  );
  for (const bookingStatus of ['pending', 'shot', 'completed', 'cancelled'])
    assert.throws(
      () => Collaboration.invite({ ...invite, bookingStatus }),
      /not open for collaborators/,
    );
  assert.throws(
    () => Collaboration.invite({ ...invite, galleryPublished: true }),
    /not open for collaborators/,
  );
});

test('invitee must be another verified, active photographer', () => {
  assert.throws(
    () => Collaboration.invite({ ...invite, inviteePhotographerId: 'owner' }),
    /Cannot invite yourself/,
  );
  for (const bad of [{ inviteeVerified: false }, { inviteeActive: false }])
    assert.throws(
      () => Collaboration.invite({ ...invite, ...bad }),
      /Photographer not found/,
    );
});

test('share is a whole percent from 1 to 100', () => {
  for (const sharePercent of [0, 101, 12.5])
    assert.throws(
      () => Collaboration.invite({ ...invite, sharePercent }),
      /Share must be a whole percent from 1 to 100/,
    );
});

test('one live invitation per photographer; revoked may be invited again, declined may not', () => {
  for (const status of ['invited', 'accepted', 'declined'])
    assert.throws(
      () =>
        Collaboration.invite({
          ...invite,
          existing: [{ photographer_id: 'b', status, share_percent: 10 }],
        }),
      /already invited/,
    );
  assert.equal(
    Collaboration.invite({
      ...invite,
      existing: [
        { photographer_id: 'b', status: 'revoked', share_percent: 10 },
      ],
    }).status,
    'invited',
  );
});

test('total share counts pending and accepted invitations up to 100', () => {
  const existing = [
    { photographer_id: 'c', status: 'accepted', share_percent: 40 },
    { photographer_id: 'd', status: 'invited', share_percent: 30 },
    { photographer_id: 'e', status: 'declined', share_percent: 50 },
    { photographer_id: 'f', status: 'revoked', share_percent: 50 },
  ];
  assert.equal(
    Collaboration.invite({ ...invite, existing, sharePercent: 30 }).status,
    'invited',
  );
  assert.throws(
    () => Collaboration.invite({ ...invite, existing, sharePercent: 31 }),
    /Total share cannot exceed 100%/,
  );
});

test('only a pending invitation can be answered or revoked, while the booking is open', () => {
  const open = { bookingStatus: 'accepted', galleryPublished: false };
  assert.equal(Collaboration.respond('invited', 'accept', open), 'accepted');
  assert.equal(Collaboration.respond('invited', 'decline', open), 'declined');
  assert.equal(Collaboration.respond('invited', 'revoke', open), 'revoked');
  for (const status of ['accepted', 'declined', 'revoked'])
    assert.throws(
      () => Collaboration.respond(status, 'revoke', open),
      /no longer pending/,
    );
  assert.throws(
    () =>
      Collaboration.respond('invited', 'accept', {
        ...open,
        galleryPublished: true,
      }),
    /not open for collaborators/,
  );
});
