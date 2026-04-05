-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CLIENT', 'ARTISAN', 'ADMIN');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'PUBLISHED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PriceBracket" AS ENUM ('UNDER_EXPECTED', 'AS_EXPECTED', 'ABOVE_EXPECTED', 'MUCH_ABOVE');

-- CreateEnum
CREATE TYPE "DeadlinesKept" AS ENUM ('YES', 'PARTIAL', 'NO');

-- CreateEnum
CREATE TYPE "AvailabilityRating" AS ENUM ('EASY', 'OK', 'DIFFICULT');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('BANK_TRANSFER', 'CHECK', 'CASH', 'CARD', 'INSTALLMENTS', 'OTHER');

-- CreateEnum
CREATE TYPE "QuoteAccuracy" AS ENUM ('MATCHED', 'SLIGHTLY_OVER', 'MUCH_OVER', 'UNDER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'CLIENT',
    "passwordHash" TEXT,
    "emailVerified" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArtisanProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "siren" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "phonePublic" TEXT,
    "stripeSubId" TEXT,
    "premiumUntil" TIMESTAMP(3),
    "servesParticuliers" BOOLEAN NOT NULL DEFAULT true,
    "servesProfessionnels" BOOLEAN NOT NULL DEFAULT false,
    "sousActivitesSelection" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArtisanProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "siren" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "ratingOverall" INTEGER NOT NULL,
    "comment" TEXT,
    "priceBracket" "PriceBracket",
    "deadlinesKept" "DeadlinesKept",
    "availability" "AvailabilityRating",
    "paymentType" "PaymentType",
    "quoteVsPaid" "QuoteAccuracy",
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewResponse" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectPhoto" (
    "id" TEXT NOT NULL,
    "artisanId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "caption" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ArtisanProfile_userId_key" ON "ArtisanProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ArtisanProfile_siren_key" ON "ArtisanProfile"("siren");

-- CreateIndex
CREATE INDEX "Review_siren_idx" ON "Review"("siren");

-- CreateIndex
CREATE INDEX "Review_status_idx" ON "Review"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Review_authorId_siren_key" ON "Review"("authorId", "siren");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewResponse_reviewId_key" ON "ReviewResponse"("reviewId");

-- CreateIndex
CREATE INDEX "ProjectPhoto_artisanId_idx" ON "ProjectPhoto"("artisanId");

-- AddForeignKey
ALTER TABLE "ArtisanProfile" ADD CONSTRAINT "ArtisanProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewResponse" ADD CONSTRAINT "ReviewResponse_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectPhoto" ADD CONSTRAINT "ProjectPhoto_artisanId_fkey" FOREIGN KEY ("artisanId") REFERENCES "ArtisanProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
