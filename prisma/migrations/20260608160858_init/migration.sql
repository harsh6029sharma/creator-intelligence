-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "profileImage" TEXT,
    "refreshToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Channel" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "youtubeChannelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lastFetchedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Channel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "youtubeCommentId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "label" TEXT,
    "confidence" DOUBLE PRECISION,
    "moderationStatus" TEXT NOT NULL DEFAULT 'pending',
    "hiddenAt" TIMESTAMP(3),
    "fetchedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SentimentSnapshot" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "toxicCount" INTEGER NOT NULL DEFAULT 0,
    "safeCount" INTEGER NOT NULL DEFAULT 0,
    "spamCount" INTEGER NOT NULL DEFAULT 0,
    "avgConfidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SentimentSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Channel_youtubeChannelId_key" ON "Channel"("youtubeChannelId");

-- CreateIndex
CREATE UNIQUE INDEX "Comment_youtubeCommentId_key" ON "Comment"("youtubeCommentId");

-- CreateIndex
CREATE INDEX "Comment_channelId_idx" ON "Comment"("channelId");

-- CreateIndex
CREATE INDEX "Comment_videoId_idx" ON "Comment"("videoId");

-- CreateIndex
CREATE INDEX "Comment_label_idx" ON "Comment"("label");

-- CreateIndex
CREATE INDEX "Comment_moderationStatus_idx" ON "Comment"("moderationStatus");

-- CreateIndex
CREATE INDEX "SentimentSnapshot_channelId_idx" ON "SentimentSnapshot"("channelId");

-- CreateIndex
CREATE UNIQUE INDEX "SentimentSnapshot_channelId_date_key" ON "SentimentSnapshot"("channelId", "date");

-- AddForeignKey
ALTER TABLE "Channel" ADD CONSTRAINT "Channel_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SentimentSnapshot" ADD CONSTRAINT "SentimentSnapshot_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
