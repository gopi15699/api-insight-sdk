/**
 * Seed Stripe products + prices for API Insight's paid plans.
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_test_... npm run seed:stripe
 *
 * Idempotent-ish: it looks for existing products with the same lookup metadata
 * before creating new ones, and reuses existing recurring prices with a
 * matching lookup_key. Prints the four price IDs to paste into your env:
 *
 *   STRIPE_PRICE_PRO_MONTHLY, STRIPE_PRICE_PRO_YEARLY,
 *   STRIPE_PRICE_ULTRA_MONTHLY, STRIPE_PRICE_ULTRA_YEARLY
 */
import 'dotenv/config';
import Stripe from 'stripe';

const SECRET = process.env.STRIPE_SECRET_KEY;
if (!SECRET) {
  console.error('❌ STRIPE_SECRET_KEY is required. Run with STRIPE_SECRET_KEY=sk_test_... npm run seed:stripe');
  process.exit(1);
}

const stripe = new Stripe(SECRET);

// Amounts in USD cents. Yearly = 10x monthly (2 months free).
const CATALOGUE = [
  { key: 'pro', name: 'API Insight Pro', monthly: 1900, yearly: 19000 },
  { key: 'ultra', name: 'API Insight Ultra', monthly: 4900, yearly: 49000 },
] as const;

/** Find an existing product for a plan key, or create one. */
async function ensureProduct(key: string, name: string): Promise<Stripe.Product> {
  const existing = await stripe.products.search({
    query: `metadata['plan_key']:'${key}' AND active:'true'`,
  });
  if (existing.data.length > 0) {
    console.log(`• Reusing product ${existing.data[0].id} (${name})`);
    return existing.data[0];
  }
  const product = await stripe.products.create({
    name,
    metadata: { plan_key: key, app: 'api-insight' },
  });
  console.log(`• Created product ${product.id} (${name})`);
  return product;
}

/** Find an existing recurring price by lookup_key, or create one. */
async function ensurePrice(
  product: Stripe.Product,
  lookupKey: string,
  amount: number,
  interval: 'month' | 'year'
): Promise<Stripe.Price> {
  const existing = await stripe.prices.list({
    product: product.id,
    active: true,
    lookup_keys: [lookupKey],
    limit: 1,
  });
  if (existing.data.length > 0) {
    console.log(`  - Reusing price ${existing.data[0].id} (${lookupKey})`);
    return existing.data[0];
  }
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: amount,
    currency: 'usd',
    recurring: { interval },
    lookup_key: lookupKey,
    metadata: { app: 'api-insight' },
  });
  console.log(`  - Created price ${price.id} (${lookupKey}, $${(amount / 100).toFixed(0)}/${interval})`);
  return price;
}

async function main() {
  console.log(`\n🌱 Seeding Stripe products/prices (${SECRET!.startsWith('sk_live') ? 'LIVE' : 'TEST'} mode)\n`);

  const envLines: string[] = [];

  for (const item of CATALOGUE) {
    const product = await ensureProduct(item.key, item.name);
    const monthly = await ensurePrice(product, `${item.key}_monthly`, item.monthly, 'month');
    const yearly = await ensurePrice(product, `${item.key}_yearly`, item.yearly, 'year');
    envLines.push(`STRIPE_PRICE_${item.key.toUpperCase()}_MONTHLY=${monthly.id}`);
    envLines.push(`STRIPE_PRICE_${item.key.toUpperCase()}_YEARLY=${yearly.id}`);
  }

  console.log('\n✅ Done. Paste these into your backend env (Vercel → Settings → Environment Variables):\n');
  console.log(envLines.join('\n'));
  console.log('');
}

main().catch((err) => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
