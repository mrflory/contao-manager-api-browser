-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "emailVerificationToken" VARCHAR(255),
ADD COLUMN     "passwordResetExpires" TIMESTAMP(3),
ADD COLUMN     "passwordResetToken" VARCHAR(255);

-- CreateIndex
CREATE INDEX "users_passwordResetToken_idx" ON "public"."users"("passwordResetToken");

-- CreateIndex
CREATE INDEX "users_emailVerificationToken_idx" ON "public"."users"("emailVerificationToken");
