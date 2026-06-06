# Lacunose — Growth Plan & Operating Cost Model

> **Version:** 1.3  
> **Date:** 2026-05-08  
> **Scope:** 1-month stability launch + 1-year operational plan (JournalMatch + Core)  
> **Currency:** EGP (Egyptian Pounds)

---

## Executive Summary

| Horizon | Est. Monthly Burn | Key Milestone |
|---------|-------------------|---------------|
| **Month 1** (Stability) | **~9,250 EGP** | Bug fixes & Performance; Pro tier live; DeepSeek usage low. |
| **Months 2-5** (Outreach) | **~10,000–12,000 EGP** | Email marketing starts (Custom Python script); university/journal outreach. |
| **Month 6+** (Scale) | **~25,000–45,000 EGP** | LinkedIn/Facebook Ads ramp-up (LinkedIn priority); JournalMatch extension live. |

*Note: No salary costs included (Revenue/Equity share). VPS remains on KVM 4 indefinitely.*

---

## 1. Architecture & Strategy

### 1.1 Development & Marketing Strategy
- **Month 1**: Stability & Performance. Fix existing bugs and launch with the **Pro Tier**.
- **Marketing (Email)**: Starts in Month 2. No subscription costs. We will use a **custom Python script** to send emails. AI (ChatGPT Pro) will handle copywriting.
- **Marketing (Paid Ads)**: Focus on **LinkedIn** and **Facebook**. LinkedIn is the priority as it targets high-value academic professionals and is expected to provide better ROI.

### 1.2 Infrastructure
- **Hostinger VPS (KVM 4)**: 2,500 EGP/mo ($50). 
- **Scale Note**: The current VPS has "huge margins." No upgrades are planned even after JournalMatch and both websites are fully operational.

---

## 2. Operating Costs (Year 1)

### 2.1 Fixed & Variable Monthly Costs (Month 1)

| Service | Spec / Tier | Monthly Cost (EGP) | Notes |
|---------|-------------|--------------------|-------|
| **Hostinger VPS** | KVM 4 | **2,500 EGP** | No upgrade needed. |
| **ChatGPT Pro** | AI Agent / Dev | **5,000 EGP** | $100/mo. Budgeted for the entire year. |
| **DeepSeek API** | LLM (Month 1) | **1,000 EGP** | Initial low-usage estimate. |
| **OpenAI Embeddings**| Search/Match | **750 EGP** | |
| **Zoho Mail** | Email | **0 EGP** | Already paid. |
| **Marketing** | Organic/Email | **0 EGP** | Using custom Python script. |
| **✅ Month 1 Total** | | **9,250 EGP** | |

### 2.2 Annual AI & Compute Budget
We are setting aside funds for the first year to ensure stability regardless of immediate revenue.

- **DeepSeek API (Year 1)**: **20,000 EGP** (Budget for compute growth).
- **ChatGPT Pro (Year 1)**: **60,000 EGP** (12 months @ $100).
- **ChatGPT Pro (Year 2)**: **120,000 EGP** (Cumulative total for 2 years).

---

## 3. Pricing & Revenue Model

### 3.1 Subscription Tiers

| Tier | Egypt (EGP) | International (USD) |
|------|-------------|--------------------|
| **Pro Monthly** | 500 EGP | $20 |
| **Pro Yearly** | 5,000 EGP | $200 |
| **Premium (Future)**| ~1,500 EGP | ~$60 |

*Note: Premium will be priced at 3x the Pro price (Decoy/Anchor pricing strategy).*

### 3.2 Unit Economics (Egypt Pro Tier)
- **Revenue per User**: 500 EGP
- **Cost per User**: 150 EGP (100 EGP DeepSeek API + 50 EGP DB/Infra).
- **Margin per User**: **350 EGP**

### 3.3 Break-Even Target
To cover the core monthly burn (VPS + ChatGPT + Base API costs), we need:
- **Target**: **~50 Pro Subscribers (Egypt)**
- This covers the regular monthly operating expenses.

---

## 4. Phased Growth Model

| Category | Month 1 | Month 2 | Month 6 | Year 1 Total |
|----------|---------|---------|---------|--------------|
| **Infra (VPS)** | 2,500 | 2,500 | 2,500 | 30,000 EGP |
| **ChatGPT Pro** | 5,000 | 5,000 | 5,000 | 60,000 EGP |
| **DeepSeek API** | 1,000 | 1,200 | 3,000 | 20,000 EGP |
| **Paid Ads** | 0 | 0 | 15,000+ | 80,000+ EGP |
| **Phase Total** | **8,500** | **8,700** | **25,500** | **190,000+** |

---

## 5. Key Recommendations
1.  **LinkedIn Priority**: Allocate 70% of the initial ad budget to LinkedIn. The higher acquisition cost is offset by the higher lifetime value (LTV) of international researchers.
2.  **Custom Email Script**: Use the Python script to automate outreach to universities. This replaces expensive SaaS like Mailchimp or Resend.
3.  **Self-Funding Loop**: As users grow, their subscriptions pay for their own API usage (150 EGP cost vs 500 EGP revenue), creating a sustainable flywheel.
