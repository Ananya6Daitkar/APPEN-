# APPEN P2P Escrow — Complete Website Guide
## All Pages, Links & Features Working

---

## 🚀 SETUP INSTRUCTIONS (DO THIS FIRST)

### Step 1: Start Infrastructure
```bash
# Terminal 1: Start Docker
docker compose up -d

# Wait 30 seconds for services to start
sleep 30

# Check if services are running
docker compose ps
```

### Step 2: Setup Database
```bash
# Terminal 1: Run migrations
npx prisma migrate dev

# Seed database with demo data
npx prisma db seed

# Load analytics demo data
curl http://localhost:3000/api/analytics/demo-seed
```

### Step 3: Start Dev Server
```bash
# Terminal 2: Start Next.js dev server
npm run dev

# Wait for "ready - started server on 0.0.0.0:3000"
```

### Step 4: Verify Everything Works
```bash
# Terminal 3: Test API
curl http://localhost:3000/api/offers

# Should return JSON with offers
```

---

## ✅ ALL WORKING PAGES & LINKS

### 1. **HOME / LANDING PAGE** ✅
**URL:** `http://localhost:3000`
**Features:**
- 3D escrow orbit animation (React Three Fiber)
- Problem section with fake receipt visualization
- How it works (3-layer solution animated)
- Corridor map (global fiat/stablecoin flow)
- Why APPEN section
- CTA section
- Navbar with wallet connect button

**What to show in pitch:**
- Scroll through landing page
- Show 3D orbit animation
- Scroll to "How It Works" section
- Show the 3-layer solution

---

### 2. **MARKETPLACE** ✅
**URL:** `http://localhost:3000/marketplace`
**Features:**
- Offer book with paginated list
- Animated offer cards (glassmorphism)
- Seller reputation badges (animated score rings)
- Offer filters (stablecoin, payment rail, fiat currency)
- Offer details: amount, rate, payment rails
- Click offer to view details
- "Accept Offer" button to create trade

**What to show in pitch:**
- Show offer book with multiple cards
- Highlight seller reputation badge (850/1000 score)
- Show offer details (1000 USDC @ 1.0 USD)
- Show payment rails (bank transfer, mobile money, crypto ramp)
- Click "Accept Offer" to create a trade

---

### 3. **CREATE OFFER** ✅
**URL:** `http://localhost:3000/create-offer`
**Features:**
- Form to create new offer
- Select stablecoin (USDC/USDT)
- Enter amount (10-50,000)
- Select fiat currency
- Enter fiat rate
- Select payment rails
- Connect wallet to create offer
- On-chain escrow lock

**What to show in pitch:**
- Show the create offer form
- Explain the fields
- Show how to lock funds in smart contract

---

### 4. **TRADE DETAIL** ✅ ⭐ THE MAGIC
**URL:** `http://localhost:3000/trade/[id]`
**Features:**
- Trade state timeline (Created → Funded → MarkedPaid → UnderReview → Released/Refunded)
- Buyer and seller information with reputation badges
- KYC tier badges
- Proof uploader (drag-drop zone with animated progress ring)
- OCR results display (extracted fields, confidence scores)
- Risk score display (trust score 0-100)
- Fraud signal checks (green checkmarks)
- Auto-release recommendation
- Confetti animation on release
- Chat thread between buyer and seller
- Dispute actions button
- Evidence hash display (SHA-256)
- Trade details (amount, rate, challenge window, timestamps)

**How to get a trade ID:**
1. Go to `http://localhost:3000/marketplace`
2. Click on any offer
3. Click "Accept Offer"
4. You'll be redirected to `http://localhost:3000/trade/[TRADE_ID]`
5. Copy the TRADE_ID from the URL

**What to show in pitch:**
- Show trade state timeline
- Drag-drop a demo receipt from `public/demo/`
- Watch animated progress ring (0% → 100%)
- See OCR extraction with animated fields
- See confidence scores per field
- See fraud signal checks (green checkmarks)
- See trust score animate from 0 to 87
- See "AUTO-RELEASE" recommendation
- Watch CONFETTI EXPLOSION 🎉
- See "Trade Released" notification
- See on-chain transaction link

---

### 5. **DISPUTES (QUEUE)** ✅
**URL:** `http://localhost:3000/disputes`
**Features:**
- Dispute queue with animated case cards
- Priority badges (red/amber/blue)
- Case information:
  - Case ID and Dispute ID
  - Amount and stablecoin
  - Fiat rate
  - Buyer and seller wallet addresses
  - Time opened (e.g., "5m ago")
  - Assignment status (Assigned to / Unassigned)
- Staggered animation (each card enters with 60ms delay)
- Hover effect (card lifts, "Review →" link appears)
- Sorting by priority (Escalated → High → Normal)
- Pagination (20 cases per page)
- Empty state if no disputes

**What to show in pitch:**
- Show dispute queue with animated case cards
- Highlight priority badges (red/amber/blue)
- Show case information (amount, traders, time opened)
- Click on a case to view details

---

### 6. **DISPUTE DETAIL** ✅
**URL:** `http://localhost:3000/disputes/[id]`
**Features:**
- Evidence bundle with tabs:
  - Proof viewer (receipt image, zoomable)
  - OCR extraction (JSON with all fields)
  - Risk score breakdown (sub-scores)
  - Buyer profile (reputation, KYC tier, trade history)
  - Seller profile (same)
- AI pre-assessment card:
  - Verdict (Likely Legitimate / Suspicious / Needs Review)
  - Confidence arc (animated)
  - Typewriter reasoning animation
- Resolver decision form:
  - Release / Refund buttons
  - Rationale text field
- Case information (amount, traders, timestamps)

**How to get a dispute ID:**
1. Go to `http://localhost:3000/disputes`
2. Click on any case card
3. You'll be redirected to `http://localhost:3000/disputes/[DISPUTE_ID]`
4. Copy the DISPUTE_ID from the URL

**What to show in pitch:**
- Show evidence bundle tabs
- Show AI pre-assessment card
- Show confidence arc animation
- Show typewriter reasoning
- Show resolver decision form

---

### 7. **ADMIN DASHBOARD** ✅
**URL:** `http://localhost:3000/admin`
**Features:**
- Metrics grid (animated count-up):
  - Total trades
  - Total volume
  - Dispute rate
  - Average trust score
- Audit log table:
  - Action type (TRADE_CREATED, PROOF_UPLOADED, etc.)
  - Actor (wallet address)
  - Entity (trade ID, dispute ID)
  - Timestamp
  - Content hash (SHA-256)
  - Previous hash (chained)
- Audit chain visualizer:
  - Block-by-block chain view
  - Hash integrity check
  - Tamper-evident visualization
- Risk configuration panel:
  - Auto-release cutoff slider
  - Challenge window cutoff slider
  - Manual review cutoff slider
  - Challenge window seconds slider
- User management:
  - Suspend user button
  - KYC approval button
  - User list with status

**What to show in pitch:**
- Show animated metrics (count-up animation)
- Show audit log with chained hashes
- Highlight the chain integrity
- Show risk configuration sliders
- Explain how admins can adjust thresholds

---

### 8. **LEADERBOARD** ✅
**URL:** `http://localhost:3000/leaderboard`
**Features:**
- Animated podium (top 3 traders):
  - Gold medal for 1st place
  - Silver medal for 2nd place
  - Bronze medal for 3rd place
- Rank table with:
  - Rank number
  - Trader address (truncated)
  - Reputation score (with animated score ring)
  - Trade count
  - Total volume
  - Dispute rate (as percentage)
- Animated transitions as traders move up/down
- Sorting by reputation score (descending)

**What to show in pitch:**
- Show animated podium with top 3 traders
- Show rank table with score rings
- Explain the reputation system
- Show how high reputation = higher trading power

---

### 9. **ANALYTICS** ✅
**URL:** `http://localhost:3000/analytics`
**Features:**
- 5 real-time animated charts:
  1. **Trade Volume Chart** (line chart)
     - Volume over time
     - Animated line drawing
  2. **Trust Score Histogram** (bar chart)
     - Distribution of trust scores
     - Animated bars
  3. **Dispute Rate Chart** (gauge)
     - Disputes per 1000 trades
     - Animated gauge needle
  4. **Volume by Stablecoin** (pie chart)
     - USDC vs USDT breakdown
     - Animated pie slices
  5. **Top Traders Leaderboard** (bar chart)
     - Top traders by volume
     - Animated bars
- Demo control panel (floating button, bottom-left):
  - "Walk Through All 8 Trade States" button
  - Auto-advances trade through all states
  - Shows confetti on release
- Real-time updates as trades complete

**What to show in pitch:**
- Show 5 animated charts
- Explain real-time updates
- Show demo control panel
- Click "Walk Through All 8 Trade States" to auto-demo

---

### 10. **MERCHANT PROFILE** ✅
**URL:** `http://localhost:3000/profile/[address]`
**Features:**
- Merchant information:
  - Wallet address
  - Reputation score
  - KYC tier
  - Total trades
  - Total volume
  - Dispute rate
- Trade history (paginated)
- Reputation events (score changes)
- Verification badges

**What to show in pitch:**
- Show merchant profile
- Show reputation score and history
- Show trade history

---

### 11. **PROFILE (MY PROFILE)** ✅
**URL:** `http://localhost:3000/profile/me` (if authenticated)
**Features:**
- Current user profile
- Edit profile information
- KYC submission
- Notification preferences
- Session management

---

## 🎯 COMPLETE PITCH FLOW (ALL LINKS)

```
0:00–0:05   Opening Hook
            http://localhost:3000

0:05–0:30   Problem & Solution
            http://localhost:3000

0:30–0:45   Landing Page
            http://localhost:3000
            (Show 3D orbit, how it works)

0:45–1:15   Marketplace
            http://localhost:3000/marketplace
            (Show offer book, reputation badges)

1:15–2:30   Trade Detail ⭐ CONFETTI MOMENT
            http://localhost:3000/trade/[TRADE_ID]
            (Proof upload, OCR, confetti 🎉)

2:30–3:15   Disputes
            http://localhost:3000/disputes
            (Show case queue, priority badges)

3:15–3:30   Dispute Detail
            http://localhost:3000/disputes/[DISPUTE_ID]
            (Evidence bundle, AI assessment)

3:30–4:00   Admin Dashboard
            http://localhost:3000/admin
            (Audit log, metrics, chain visualizer)

4:00–4:15   Leaderboard
            http://localhost:3000/leaderboard
            (Animated podium, reputation scores)

4:15–4:30   Analytics
            http://localhost:3000/analytics
            (Real-time charts, demo control panel)

4:30–5:00   Closing
            http://localhost:3000
            (Vision statement)
```

---

## 📋 ALL LINKS QUICK REFERENCE

| # | Page | URL | Status |
|---|------|-----|--------|
| 1 | Landing | `http://localhost:3000` | ✅ |
| 2 | Marketplace | `http://localhost:3000/marketplace` | ✅ |
| 3 | Create Offer | `http://localhost:3000/create-offer` | ✅ |
| 4 | Trade Detail | `http://localhost:3000/trade/[id]` | ✅ |
| 5 | Disputes | `http://localhost:3000/disputes` | ✅ |
| 6 | Dispute Detail | `http://localhost:3000/disputes/[id]` | ✅ |
| 7 | Admin | `http://localhost:3000/admin` | ✅ |
| 8 | Leaderboard | `http://localhost:3000/leaderboard` | ✅ |
| 9 | Analytics | `http://localhost:3000/analytics` | ✅ |
| 10 | Merchant Profile | `http://localhost:3000/profile/[address]` | ✅ |
| 11 | My Profile | `http://localhost:3000/profile/me` | ✅ |

---

## 🔧 TROUBLESHOOTING

### Issue: "Cannot GET /trade/[id]"
**Solution:**
1. Go to `http://localhost:3000/marketplace`
2. Accept an offer to create a trade
3. Copy the trade ID from the URL
4. Use it: `http://localhost:3000/trade/YOUR_TRADE_ID`

### Issue: "Wallet Required"
**Solution:**
1. Click "Demo Login" in the navbar
2. Select a demo wallet
3. Then access the page

### Issue: Pages not loading
**Solution:**
1. Check dev server: `npm run dev`
2. Check Docker: `docker compose ps`
3. Check database: `npx prisma db seed`
4. Restart: `docker compose restart`

### Issue: No offers showing
**Solution:**
1. Run: `curl http://localhost:3000/api/analytics/demo-seed`
2. Refresh the page

### Issue: No disputes showing
**Solution:**
1. Create a trade first
2. Mark it as paid
3. Raise a dispute
4. Then go to disputes page

---

## 🎬 DEMO WALLETS (Pre-seeded)

```
Buyer (KYC Tier 1):
  0xBuyer1111111111111111111111111111111111

Seller (KYC Tier 2):
  0xSeller222222222222222222222222222222222

Resolver:
  0xResolver33333333333333333333333333333

Admin:
  0xAdmin4444444444444444444444444444444444
```

---

## 📁 DEMO FILES

Demo receipts for proof upload:
- `public/demo/receipt_1.jpg`
- `public/demo/receipt_2.png`
- `public/demo/receipt_3.pdf`

---

## ✅ FINAL CHECKLIST

**Before Pitching:**
- [ ] Docker running: `docker compose ps`
- [ ] Database seeded: `npx prisma db seed`
- [ ] Dev server running: `npm run dev`
- [ ] Demo data loaded: `curl http://localhost:3000/api/analytics/demo-seed`
- [ ] All URLs bookmarked
- [ ] Trade ID ready (from marketplace)
- [ ] Dispute ID ready (from disputes page)
- [ ] Demo receipts ready (`public/demo/`)
- [ ] Full run-through completed
- [ ] Timing practiced
- [ ] Confidence is high 🚀

---

## 🚀 YOU'RE READY!

All 11 pages are working. All features are functional. All links are correct.

**Start with landing page, follow the flow, and WIN! 🎉**
