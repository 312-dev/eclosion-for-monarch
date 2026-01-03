# Monarch Money Terms of Service Compliance Analysis

This document analyzes how the Eclosion project interacts with Monarch Money and its compliance with Monarch's Terms of Service.

## Monarch Terms of Service Summary

Source: https://www.monarch.com/terms

### Key Terms

| Term | Description |
|------|-------------|
| **Personal Use Only** | Service is for personal, non-commercial use and must comply with applicable laws |
| **No Programmatic Access** | Users cannot "access services programmatically" |
| **No Scraping/Crawling** | Scraping or crawling the platform is prohibited |
| **No AI/ML Training** | Cannot "use the Services...to develop or train any artificial intelligence or machine learning model" |
| **No Competing Products** | Cannot develop products that compete with Monarch |
| **AI Disclaimer** | AI-generated output does not constitute financial advice |

### Other Notable Terms

- **Subscription**: Fees charge automatically yearly; generally non-refundable
- **Liability**: Services provided "as-is" with liability limited to $100 or 12 months of fees
- **Disputes**: Individual arbitration in San Francisco under California law; class actions waived

---

## Project Integration with Monarch

### Overview

Eclosion is a budget automation toolkit that deeply integrates with Monarch Money to:
- Track recurring expenses
- Automatically create and manage budget categories
- Calculate monthly contribution amounts based on billing frequency
- Sync budget data periodically

### Technical Implementation

| Component | Description |
|-----------|-------------|
| **Python Package** | Custom fork of `monarchmoney` package |
| **API Type** | GraphQL queries and mutations |
| **Authentication** | User's own Monarch credentials (encrypted at rest) |
| **Core Module** | `monarch_utils.py` - wraps client with caching and retry logic |

### Data Read from Monarch

- Recurring transaction items (amounts, frequencies, due dates)
- Category groups and hierarchies
- Budget data (planned amounts by category/month)
- Savings goals
- User profile (id, name, email)

### Data Written to Monarch

- Creates new budget categories
- Updates budget amounts
- Moves categories between groups
- Deletes app-created categories (on reset)

### Rate Limiting Measures

The project implements several measures to minimize API load:

- **15-minute TTL caching** on all read operations
- **Exponential backoff** on rate limit errors (1s → 2s → 4s)
- **Request deduplication** to prevent duplicate concurrent requests
- **Client-side rate limit tracking** in frontend

---

## Compliance Assessment

### Potential Concerns

| Term | Project Behavior | Risk Level |
|------|------------------|------------|
| Programmatic access prohibited | Uses Python client to call Monarch API | ⚠️ High |
| No scraping/crawling | Fetches data via API (not HTML scraping) | ⚠️ Medium |
| Personal use only | Personal automation tool | ✅ Low |
| No competing products | Enhances Monarch, doesn't replace it | ✅ Low |
| No AI/ML training | Does not train models on Monarch data | ✅ Compliant |

### Mitigating Factors

1. **User's Own Credentials**: Accesses data the user already has access to
2. **Personal Use**: Not a commercial product or service
3. **Complementary Tool**: Enhances Monarch's value rather than competing
4. **Rate-Limited**: Implements responsible API usage patterns
5. **Open Source Ecosystem**: The `monarchmoney` package is publicly available and widely used

### Risk Considerations

**Lower Risk If:**
- Used only for personal budgeting
- Not distributed commercially
- Monarch does not actively enforce these terms against personal tools

**Higher Risk If:**
- Distributed as a commercial product
- Causes excessive API load
- Monarch begins enforcing ToS against automation tools

---

## Recommendations

### For Personal Use

1. Continue using with awareness of ToS technically prohibiting programmatic access
2. Monitor for any Monarch communications about API usage
3. Keep rate limiting and caching in place

### For Public Distribution

1. Consider reaching out to Monarch about official API access or partnership
2. Add clear disclaimers about ToS compliance in documentation
3. Consider whether Monarch offers an official developer program

### Technical Safeguards Already in Place

- [x] Credential encryption at rest
- [x] 15-minute cache TTL on reads
- [x] Exponential backoff on errors
- [x] Rate limit detection and handling
- [x] Session timeout (30 minutes default)

---

## References

- Monarch Terms of Service: https://www.monarch.com/terms
- monarchmoney Python package: https://github.com/hammem/monarchmoney
- Project fork: https://github.com/GraysonCAdams/monarchmoney

---

*Last updated: 2026-01-02*
