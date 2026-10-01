-- Booking collaborators: the primary photographer invites others to shoot together and splits the photographer's share.
-- Each photographer may have only one active invitation per booking. Declined invitations cannot be resent; revoked invitations may be sent again.
CREATE TABLE booking_collaborators (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id uuid NOT NULL REFERENCES bookings(id),
    photographer_id uuid NOT NULL REFERENCES photographers(id),
    share_percent smallint NOT NULL CHECK(share_percent BETWEEN 1 AND 100),
    status text NOT NULL DEFAULT 'invited' CHECK(status IN ('invited','accepted','declined','revoked')),
    responded_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX booking_collaborators_one_live
    ON booking_collaborators(booking_id, photographer_id)
    WHERE status IN ('invited','accepted','declined');
CREATE INDEX booking_collaborators_photographer ON booking_collaborators(photographer_id);
