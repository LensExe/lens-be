-- Temporarily disable collaboration writes without deleting historical rows.
-- Re-enable later by dropping this trigger and its function in a new migration.
CREATE FUNCTION reject_booking_collaboration_write()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'Booking collaboration is temporarily disabled'
        USING ERRCODE = 'check_violation';
    RETURN NULL;
END;
$$;

CREATE TRIGGER booking_collaboration_disabled
    BEFORE INSERT OR UPDATE OR DELETE ON booking_collaborators
    FOR EACH ROW
    EXECUTE FUNCTION reject_booking_collaboration_write();
