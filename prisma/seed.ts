import {prisma} from '../src/lib/prisma';
import { faker } from '@faker-js/faker';

const safeComments = [
  'Great video, learned a lot!',
  'This helped me understand the concept so easily ',
  'Please make a part 2 on this topic',
  'Subscribed! Your explanations are so clear.',
  'Can you share the code for this project?',
];

const spamComments = [
  'Check out my channel for free giveaways!!!',
  'Click here to win an iPhone: bit.ly/xyz123',
  'Make $500/day working from home, DM me',
  'Follow me back and I will follow you',
];

const toxicComments = [
  'This is the dumbest video I have ever seen',
  'You have no idea what you are talking about, quit YouTube',
  'Nobody asked for this garbage content',
  'You are an embarrassment to this platform',
];

function randomComment() {
  const bucket = faker.helpers.weightedArrayElement([
    { value: 'safe', weight: 70 },
    { value: 'spam', weight: 15 },
    { value: 'toxic', weight: 15 },
  ]);

  let text: string;
  let confidence: number;

  if (bucket === 'safe') {
    text = faker.helpers.arrayElement(safeComments);
    confidence = faker.number.float({ min: 0.6, max: 0.99, fractionDigits: 2 });
  } else if (bucket === 'spam') {
    text = faker.helpers.arrayElement(spamComments);
    confidence = faker.number.float({ min: 0.7, max: 0.98, fractionDigits: 2 });
  } else {
    text = faker.helpers.arrayElement(toxicComments);
    confidence = faker.number.float({ min: 0.75, max: 0.99, fractionDigits: 2 });
  }

  const isAutoHidden = bucket === 'toxic' && confidence >= 0.9;

  return {
    label: bucket,
    confidence,
    text,
    moderationStatus: isAutoHidden ? 'hidden' : 'visible',
    hiddenAt: isAutoHidden ? faker.date.recent({ days: 1 }) : null,
  };
}

async function main() {
  console.log('Seeding database...');

  await prisma.sentimentSnapshot.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.channel.deleteMany();
  await prisma.user.deleteMany();

  const user = await prisma.user.create({
    data: {
      email: 'demo.creator@gmail.com',
      name: 'Demo Creator',
      profileImage: faker.image.avatar(),
    },
  });

  const channels = await Promise.all(
    ['Tech With Demo', 'Demo Vlogs'].map((name) =>
      prisma.channel.create({
        data: {
          userId: user.id,
          youtubeChannelId: faker.string.alphanumeric(24),
          name,
          lastFetchedAt: new Date(),
        },
      })
    )
  );

  for (const channel of channels) {
    const videoIds = Array.from({ length: 3 }, () => faker.string.alphanumeric(11));

    // 40 comments spread across last 7 days
    const comments = Array.from({ length: 40 }).map(() => {
      const c = randomComment();
      const fetchedAt = faker.date.recent({ days: 7 });
      return {
        channelId: channel.id,
        videoId: faker.helpers.arrayElement(videoIds),
        youtubeCommentId: faker.string.alphanumeric(20),
        fetchedAt,
        ...c,
      };
    });

    await prisma.comment.createMany({ data: comments });

    // Daily SentimentSnapshot for last 7 days (matches your schema — no totalComments field)
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const dayComments = comments.filter(
        (c) => c.fetchedAt.toDateString() === date.toDateString()
      );

      if (dayComments.length === 0) continue;

      await prisma.sentimentSnapshot.create({
        data: {
          channelId: channel.id,
          date,
          toxicCount: dayComments.filter((c) => c.label === 'toxic').length,
          spamCount: dayComments.filter((c) => c.label === 'spam').length,
          safeCount: dayComments.filter((c) => c.label === 'safe').length,
          avgConfidence:
            dayComments.reduce((sum, c) => sum + c.confidence, 0) / dayComments.length,
        },
      });
    }
  }

  console.log('Seed complete:', {
    user: user.email,
    channels: channels.length,
  });
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });