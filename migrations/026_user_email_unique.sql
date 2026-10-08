-- Keep account emails unique regardless of case or surrounding whitespace.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM users
        GROUP BY lower(btrim(email))
        HAVING count(*) > 1
    ) THEN
        RAISE EXCEPTION
            'Cannot enforce unique user emails: duplicate normalized emails exist';
    END IF;
END $$;

CREATE UNIQUE INDEX users_email_normalized_unique_idx
    ON users (lower(btrim(email)));
