// Mock API responses — no backend needed

import {
  DEMO_USERS,
  DEMO_OFFERS,
  DEMO_TRADES,
  DEMO_DISPUTES,
  DEMO_PROOFS,
  DEMO_AUDIT_LOG,
  DEMO_ANALYTICS,
} from './data';

// Simulate network delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const mockApi = {
  // Auth
  async verifySignature(message: string, signature: string) {
    await delay(300);
    // Accept any signature in demo mode
    const address = message.includes('0xBuyer') ? DEMO_USERS.buyer.walletAddress : 
                    message.includes('0xSeller') ? DEMO_USERS.seller.walletAddress :
                    message.includes('0xResolver') ? DEMO_USERS.resolver.walletAddress :
                    message.includes('0xAdmin') ? DEMO_USERS.admin.walletAddress :
                    '0xDemoUser1111111111111111111111111111111';
    
    const user = Object.values(DEMO_USERS).find(u => u.walletAddress === address) || {
      id: 'user_' + Math.random().toString(36).substr(2, 9),
      walletAddress: address,
      kycTier: 0,
      reputationScore: 0,
      totalCompletedTrades: 0,
      totalVolume: 0,
      disputeRate: 0,
      memberSince: new Date().toISOString().split('T')[0],
    };

    return {
      user,
      token: 'mock_jwt_' + Math.random().toString(36).substr(2, 20),
    };
  },

  // Offers
  async getOffers(limit = 10, offset = 0) {
    await delay(200);
    return {
      total: DEMO_OFFERS.length,
      offers: DEMO_OFFERS.slice(offset, offset + limit),
    };
  },

  async createOffer(data: any) {
    await delay(400);
    return {
      id: 'offer_' + Math.random().toString(36).substr(2, 9),
      ...data,
      createdAt: new Date(),
      status: 'ACTIVE',
    };
  },

  async deleteOffer(offerId: string) {
    await delay(300);
    return { success: true };
  },

  // Trades
  async getTrades(limit = 10, offset = 0) {
    await delay(200);
    return {
      total: DEMO_TRADES.length,
      trades: DEMO_TRADES.slice(offset, offset + limit),
    };
  },

  async getTradeDetail(tradeId: string) {
    await delay(300);
    const trade = DEMO_TRADES.find((t) => t.id === tradeId);
    if (!trade) throw new Error('Trade not found');

    const offer = DEMO_OFFERS.find((o) => o.id === trade.offerId);
    const buyer = Object.values(DEMO_USERS).find((u) => u.id === trade.buyerId);
    const seller = Object.values(DEMO_USERS).find((u) => u.id === trade.sellerId);
    const proof = DEMO_PROOFS.find((p) => p.tradeId === tradeId);
    const dispute = DEMO_DISPUTES.find((d) => d.tradeId === tradeId);

    return {
      ...trade,
      offer,
      buyer,
      seller,
      proof,
      dispute,
    };
  },

  async createTrade(offerId: string, buyerId: string) {
    await delay(500);
    const offer = DEMO_OFFERS.find((o) => o.id === offerId);
    if (!offer) throw new Error('Offer not found');

    return {
      id: 'trade_' + Math.random().toString(36).substr(2, 9),
      offerId,
      buyerId,
      sellerId: offer.sellerId,
      amount: offer.amount,
      stablecoin: offer.stablecoin,
      fiatCurrency: offer.fiatCurrency,
      state: 'CREATED',
      createdAt: new Date(),
    };
  },

  async markPaid(tradeId: string) {
    await delay(400);
    const trade = DEMO_TRADES.find((t) => t.id === tradeId);
    if (!trade) throw new Error('Trade not found');

    return {
      ...trade,
      state: 'MARKED_PAID',
      markedPaidAt: new Date(),
      challengeExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };
  },

  async uploadProof(tradeId: string, file: File) {
    await delay(800);
    const hash = '0x' + Math.random().toString(16).substr(2, 8);

    return {
      id: 'proof_' + Math.random().toString(36).substr(2, 9),
      tradeId,
      fileName: file.name,
      mimeType: file.type,
      hash,
      uploadedAt: new Date(),
      ocrResult: {
        amount: 1000,
        currency: 'USD',
        timestamp: new Date().toISOString(),
        senderName: 'John Buyer',
        recipientName: 'Jane Seller',
        bankName: 'Chase Bank',
        transactionId: 'TXN' + Math.random().toString(36).substr(2, 6).toUpperCase(),
        amountConfidence: 0.92,
        timestampConfidence: 0.88,
        senderConfidence: 0.85,
        recipientConfidence: 0.82,
      },
    };
  },

  async raiseDispute(tradeId: string, reason: string) {
    await delay(500);
    return {
      id: 'dispute_' + Math.random().toString(36).substr(2, 9),
      tradeId,
      reason,
      state: 'PENDING',
      createdAt: new Date(),
    };
  },

  // Disputes
  async getDisputes(limit = 10, offset = 0) {
    await delay(200);
    return {
      total: DEMO_DISPUTES.length,
      disputes: DEMO_DISPUTES.slice(offset, offset + limit),
    };
  },

  async getDisputeDetail(disputeId: string) {
    await delay(300);
    const dispute = DEMO_DISPUTES.find((d) => d.id === disputeId);
    if (!dispute) throw new Error('Dispute not found');

    const trade = DEMO_TRADES.find((t) => t.id === dispute.tradeId);
    const proof = DEMO_PROOFS.find((p) => p.tradeId === dispute.tradeId);
    const buyer = Object.values(DEMO_USERS).find((u) => u.id === dispute.buyerId);
    const seller = Object.values(DEMO_USERS).find((u) => u.id === dispute.sellerId);

    return {
      ...dispute,
      trade,
      proof,
      buyer,
      seller,
      aiSummary: `This is a dispute regarding trade ${dispute.tradeId}. The ${dispute.reason}. Based on the evidence provided, the proof shows a transaction of ${trade?.amount} ${trade?.stablecoin} to ${trade?.fiatCurrency}. The OCR confidence is ${proof?.ocrResult.amountConfidence || 0.85}. Recommend ${dispute.state === 'RESOLVED' ? dispute.decision : 'manual review'}.`,
    };
  },

  async resolveDispute(disputeId: string, decision: string, rationale: string) {
    await delay(600);
    return {
      id: disputeId,
      decision,
      rationale,
      resolvedAt: new Date(),
      state: 'RESOLVED',
    };
  },

  // Users
  async getUserProfile(address: string) {
    await delay(200);
    const user = Object.values(DEMO_USERS).find((u) => u.walletAddress === address);
    if (!user) throw new Error('User not found');
    return user;
  },

  async getMyProfile(token: string) {
    await delay(200);
    // Return first user (buyer) for demo
    return DEMO_USERS.buyer;
  },

  // Admin
  async getMetrics(token: string) {
    await delay(300);
    return {
      activeTrades: DEMO_TRADES.filter((t) => ['CREATED', 'FUNDED', 'MARKED_PAID'].includes(t.state)).length,
      lockedStablecoinValue: 45000,
      openDisputeCount: DEMO_DISPUTES.filter((d) => d.state === 'PENDING').length,
      avgResolutionTime: 18.5,
      trustScoreDistribution: DEMO_ANALYTICS.trustScoreDistribution,
    };
  },

  async getAuditLog(limit = 20, offset = 0) {
    await delay(200);
    return {
      total: DEMO_AUDIT_LOG.length,
      entries: DEMO_AUDIT_LOG.slice(offset, offset + limit),
    };
  },

  // Analytics
  async getAnalytics() {
    await delay(300);
    return DEMO_ANALYTICS;
  },

  async getLeaderboard(limit = 5) {
    await delay(200);
    return {
      traders: DEMO_ANALYTICS.topTraders.slice(0, limit),
    };
  },
};
