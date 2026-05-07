import { PrismaClient, TradeState, VerificationStatus, DisputeDecision } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hash(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

// ─── Fixed demo addresses ─────────────────────────────────────────────────────

const BUYER_ADDR   = '0xBuyer1111111111111111111111111111111111';
const SELLER_ADDR  = '0xSeller222222222222222222222222222222222';
const RESOLVER_ADDR = '0xResolver33333333333333333333333333333';
const ADMIN_ADDR   = '0xAdmin4444444444444444444444444444444444';

const STABLECOINS = ['USDC', 'USDT'];
const RAILS = ['bank_transfer', 'mobile_money', 'wire_transfer'];
const FIAT_CURRENCIES = ['USD', 'EUR', 'GBP', 'NGN', 'KES'];

async function main() {
  console.log('🌱 Starting seed — clearing existing data...');

  // Clear in reverse dependency order
  await prisma.resolverCase.deleteMany();
  await prisma.dispute.deleteMany();
  await prisma.riskScore.deleteMany();
  await prisma.oCRResult.deleteMany();
  await prisma.proof.deleteMany();
  await prisma.reputationEvent.deleteMany();
  await prisma.reputation.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.trade.deleteMany();
  await prisma.offer.deleteMany();
  await prisma.riskConfig.deleteMany();
  await prisma.user.deleteMany();

  console.log('✅ Cleared existing data');

  // ─── 1. Create demo users ──────────────────────────────────────────────────

  console.log('👤 Creating demo users...');

  const buyer = await prisma.user.create({
    data: { walletAddress: BUYER_ADDR, kycTier: 1 },
  });
  const seller = await prisma.user.create({
    data: { walletAddress: SELLER_ADDR, kycTier: 2 },
  });
  const resolver = await prisma.user.create({
    data: { walletAddress: RESOLVER_ADDR, kycTier: 3 },
  });
  const admin = await prisma.user.create({
    data: { walletAddress: ADMIN_ADDR, kycTier: 3 },
  });

  console.log('✅ Created 4 demo users');

  // ─── 2. Reputation records ─────────────────────────────────────────────────

  console.log('⭐ Creating reputation records...');

  const [buyerRep, sellerRep] = await Promise.all([
    prisma.reputation.create({ data: { userId: buyer.id, score: 500 } }),
    prisma.reputation.create({ data: { userId: seller.id, score: 500 } }),
    prisma.reputation.create({ data: { userId: resolver.id, score: 500 } }),
    prisma.reputation.create({ data: { userId: admin.id, score: 500 } }),
  ]);

  console.log('✅ Created reputation records');

  // ─── 3. RiskConfig ─────────────────────────────────────────────────────────

  console.log('⚙️  Creating RiskConfig...');

  await prisma.riskConfig.create({
    data: {
      autoReleaseCutoff: 80,
      challengeWindowCutoff: 50,
      manualReviewCutoff: 50,
      challengeWindowSeconds: 1800,
      updatedBy: admin.id,
    },
  });

  console.log('✅ Created RiskConfig');

  // ─── 4. Active offers ──────────────────────────────────────────────────────

  console.log('📋 Creating 10 active offers...');

  for (let i = 0; i < 10; i++) {
    const coin = STABLECOINS[i % 2];
    const rail = RAILS[i % 3];
    const fiat = FIAT_CURRENCIES[i % FIAT_CURRENCIES.length];
    await prisma.offer.create({
      data: {
        sellerId: seller.id,
        stablecoin: coin,
        amount: randomBetween(100, 5000),
        fiatCurrency: fiat,
        fiatRate: 1.0 + (i * 0.01),
        paymentRails: [rail],
        isActive: true,
        onChainId: `0xoffer${i.toString().padStart(4, '0')}`,
      },
    });
  }

  console.log('✅ Created 10 active offers');

  // ─── 5. Completed trades (50) ──────────────────────────────────────────────

  console.log('✅ Creating 50 completed trades...');

  for (let i = 0; i < 50; i++) {
    const coin = STABLECOINS[i % 2];
    const rail = RAILS[i % 3];
    const fiat = FIAT_CURRENCIES[i % FIAT_CURRENCIES.length];
    const amount = randomBetween(50, 2000);
    const createdAt = daysAgo(randomBetween(5, 90));
    const releasedAt = new Date(createdAt.getTime() + 3600_000);

    // Offer for this trade
    const offer = await prisma.offer.create({
      data: {
        sellerId: seller.id,
        stablecoin: coin,
        amount,
        fiatCurrency: fiat,
        fiatRate: 1.0,
        paymentRails: [rail],
        isActive: false,
        createdAt,
      },
    });

    // Trade
    const trade = await prisma.trade.create({
      data: {
        offerId: offer.id,
        buyerId: buyer.id,
        sellerId: seller.id,
        stablecoin: coin,
        amount,
        fiatCurrency: fiat,
        fiatRate: 1.0,
        state: TradeState.RELEASED,
        onChainId: `0xtrade_completed_${i}`,
        markedPaidAt: new Date(createdAt.getTime() + 1800_000),
        challengeExpiresAt: new Date(createdAt.getTime() + 5400_000),
        releasedAt,
        createdAt,
      },
    });

    // Proof
    const proofHash = hash(`completed-proof-${i}-${Date.now()}`);
    const proof = await prisma.proof.create({
      data: {
        tradeId: trade.id,
        uploaderId: buyer.id,
        evidenceHash: proofHash,
        storageKey: `trades/${trade.id}/proof_${i}.jpg`,
        mimeType: 'image/jpeg',
        fileSizeBytes: randomBetween(50_000, 2_000_000),
        createdAt,
      },
    });

    // OCRResult — high confidence, VERIFIED
    const confidence = (randomBetween(80, 99)) / 100;
    await prisma.oCRResult.create({
      data: {
        proofId: proof.id,
        amount,
        currency: fiat,
        timestamp: createdAt,
        transactionId: `TXN${i.toString().padStart(6, '0')}`,
        payerName: 'Demo Buyer',
        payeeName: 'Demo Seller',
        paymentRail: rail,
        bankName: 'Demo Bank',
        fieldConfidences: { amount: confidence, timestamp: confidence, transactionId: confidence },
        overallConfidence: confidence,
        verificationStatus: VerificationStatus.VERIFIED,
        explanation: 'All fields match with high confidence.',
        resolverSummary: 'Payment verified successfully.',
        createdAt,
      },
    });

    // RiskScore — high trust, auto_release
    const trustScore = randomBetween(80, 95);
    await prisma.riskScore.create({
      data: {
        proofId: proof.id,
        userId: buyer.id,
        trustScore,
        recommendation: 'auto_release',
        fraudFlags: [],
        subScores: {
          amount_match: 0.9,
          timestamp: 0.85,
          kyc_tier: 0.75,
          buyer_dispute: 0.95,
          seller_dispute: 0.95,
          ocr_confidence: confidence,
        },
        auditPayload: { tradeId: trade.id, computedAt: createdAt.toISOString() },
        createdAt,
      },
    });

    // ReputationEvents for buyer and seller
    await prisma.reputationEvent.createMany({
      data: [
        {
          reputationId: buyerRep.id,
          tradeId: trade.id,
          delta: randomBetween(5, 10),
          reason: 'trade_completed',
          createdAt: releasedAt,
        },
        {
          reputationId: sellerRep.id,
          tradeId: trade.id,
          delta: randomBetween(5, 10),
          reason: 'trade_completed',
          createdAt: releasedAt,
        },
      ],
    });
  }

  console.log('✅ Created 50 completed trades with proofs, OCR, risk scores, and reputation events');

  // ─── 6. Disputed trades (5) ────────────────────────────────────────────────

  console.log('⚠️  Creating 5 disputed trades...');

  for (let i = 0; i < 5; i++) {
    const coin = STABLECOINS[i % 2];
    const rail = RAILS[i % 3];
    const fiat = FIAT_CURRENCIES[i % FIAT_CURRENCIES.length];
    const amount = randomBetween(200, 3000);
    const createdAt = daysAgo(randomBetween(1, 10));

    // Offer
    const offer = await prisma.offer.create({
      data: {
        sellerId: seller.id,
        stablecoin: coin,
        amount,
        fiatCurrency: fiat,
        fiatRate: 1.0,
        paymentRails: [rail],
        isActive: false,
        createdAt,
      },
    });

    // Trade
    const trade = await prisma.trade.create({
      data: {
        offerId: offer.id,
        buyerId: buyer.id,
        sellerId: seller.id,
        stablecoin: coin,
        amount,
        fiatCurrency: fiat,
        fiatRate: 1.0,
        state: TradeState.DISPUTED,
        onChainId: `0xtrade_disputed_${i}`,
        markedPaidAt: new Date(createdAt.getTime() + 1800_000),
        challengeExpiresAt: new Date(createdAt.getTime() + 5400_000),
        createdAt,
      },
    });

    // Proof
    const proofHash = hash(`disputed-proof-${i}-${Date.now()}`);
    const proof = await prisma.proof.create({
      data: {
        tradeId: trade.id,
        uploaderId: buyer.id,
        evidenceHash: proofHash,
        storageKey: `trades/${trade.id}/proof_disputed_${i}.jpg`,
        mimeType: 'image/jpeg',
        fileSizeBytes: randomBetween(50_000, 2_000_000),
        createdAt,
      },
    });

    // OCRResult — low confidence, SUSPICIOUS
    const confidence = (randomBetween(20, 45)) / 100;
    await prisma.oCRResult.create({
      data: {
        proofId: proof.id,
        amount: amount * 0.8, // mismatched amount
        currency: fiat,
        timestamp: createdAt,
        transactionId: `DISP${i.toString().padStart(6, '0')}`,
        payerName: 'Unknown',
        payeeName: 'Demo Seller',
        paymentRail: rail,
        fieldConfidences: { amount: confidence, timestamp: confidence, transactionId: confidence },
        overallConfidence: confidence,
        verificationStatus: VerificationStatus.SUSPICIOUS,
        explanation: 'Amount mismatch detected. Low confidence in extracted fields.',
        resolverSummary: 'Suspicious payment — manual review required.',
        createdAt,
      },
    });

    // RiskScore — low trust, manual_review
    const trustScore = randomBetween(20, 45);
    await prisma.riskScore.create({
      data: {
        proofId: proof.id,
        userId: buyer.id,
        trustScore,
        recommendation: 'manual_review',
        fraudFlags: ['amount_mismatch', 'low_ocr_confidence'],
        subScores: {
          amount_match: 0.2,
          timestamp: 0.5,
          kyc_tier: 0.5,
          buyer_dispute: 0.3,
          seller_dispute: 0.3,
          ocr_confidence: confidence,
        },
        auditPayload: { tradeId: trade.id, computedAt: createdAt.toISOString() },
        createdAt,
      },
    });

    // Dispute
    const dispute = await prisma.dispute.create({
      data: {
        tradeId: trade.id,
        raisedById: seller.id,
        decision: DisputeDecision.PENDING,
        createdAt,
      },
    });

    // ResolverCase
    await prisma.resolverCase.create({
      data: {
        disputeId: dispute.id,
        assignedToId: resolver.id,
        assignedAt: new Date(createdAt.getTime() + 600_000),
        decision: DisputeDecision.PENDING,
        aiSummary: `Disputed trade #${i + 1}: Buyer claims payment was sent but OCR detected amount mismatch. Seller disputes receipt. Manual review required.`,
        createdAt,
      },
    });
  }

  console.log('✅ Created 5 disputed trades with proofs, OCR, risk scores, disputes, and resolver cases');

  console.log('\n🎉 Seed complete!');
  console.log(`   Buyer:    ${BUYER_ADDR}`);
  console.log(`   Seller:   ${SELLER_ADDR}`);
  console.log(`   Resolver: ${RESOLVER_ADDR}`);
  console.log(`   Admin:    ${ADMIN_ADDR}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
