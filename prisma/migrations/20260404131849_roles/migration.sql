-- Add the user role column for authorization flows
ALTER TABLE "User"
ADD COLUMN "role" TEXT NOT NULL DEFAULT 'investor';
