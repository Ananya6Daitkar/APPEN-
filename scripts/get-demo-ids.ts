import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('\n[DEMO TRADE IDs]\n');
  
  // Get 10 completed trades
  const completedTrades = await prisma.trade.findMany({
    where: { state: 'RELEASED' },
    take: 10,
    select: {
      id: true,
      amount: true,
      stablecoin: true,
      fiatCurrency: true,
      state: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  console.log('Completed Trades (RELEASED):');
  completedTrades.forEach((trade, i) => {
    console.log(`  ${i + 1}. ${trade.id}`);
    console.log(`     ${trade.amount} ${trade.stablecoin} @ ${trade.fiatCurrency}`);
  });

  // Get disputed trades
  const disputedTrades = await prisma.trade.findMany({
    where: { state: 'DISPUTED' },
    select: {
      id: true,
      amount: true,
      stablecoin: true,
      fiatCurrency: true,
      state: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  console.log('\nDisputed Trades:');
  disputedTrades.forEach((trade, i) => {
    console.log(`  ${i + 1}. ${trade.id}`);
    console.log(`     ${trade.amount} ${trade.stablecoin} @ ${trade.fiatCurrency}`);
  });

  // Get all disputes with their resolver cases
  const disputes = await prisma.dispute.findMany({
    include: {
      resolverCase: true,
      trade: {
        select: {
          id: true,
          amount: true,
          stablecoin: true,
          fiatCurrency: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  console.log('\nDispute IDs (for /disputes/[id] pages):');
  disputes.forEach((dispute, i) => {
    const caseId = dispute.resolverCase?.id || 'no-case';
    console.log(`  ${i + 1}. Dispute ID: ${dispute.id}`);
    console.log(`     Resolver Case ID: ${caseId}`);
    console.log(`     Trade: ${dispute.trade.amount} ${dispute.trade.stablecoin}`);
    console.log(`     Decision: ${dispute.decision}`);
  });

  console.log('\nSummary:');
  console.log(`  Total Completed Trades: ${completedTrades.length}`);
  console.log(`  Total Disputed Trades: ${disputedTrades.length}`);
  console.log(`  Total Disputes: ${disputes.length}`);
  console.log(`  Total Resolver Cases: ${disputes.filter(d => d.resolverCase).length}`);
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
