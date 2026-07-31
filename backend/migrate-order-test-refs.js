// Backfill TestCatalog ObjectId references on old orders without changing their
// immutable test-name/rate snapshots. Safe to run repeatedly.
require('dotenv').config();
const mongoose = require('mongoose');
const { Order, TestCatalog } = require('./src/models');
const { configureDns } = require('./src/dns');

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');
  configureDns();
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });

  const catalog = await TestCatalog.find({}).select('_id name').lean();
  const byName = new Map(catalog.map(test => [test.name.trim().toLocaleLowerCase('en-IN'), test._id]));
  const orders = await Order.find({ tests: { $exists: true, $ne: [] } }).select('tests testCatalogItems');
  let updated = 0;

  for (const order of orders) {
    const refs = [...new Set((order.tests || [])
      .map(name => byName.get(String(name).trim().toLocaleLowerCase('en-IN')))
      .filter(Boolean)
      .map(String))];
    const current = (order.testCatalogItems || []).map(String).sort();
    if (JSON.stringify([...refs].sort()) === JSON.stringify(current)) continue;
    order.testCatalogItems = refs;
    await order.save();
    updated += 1;
  }

  console.log(`Order test references migrated: ${updated}/${orders.length}`);
  await mongoose.disconnect();
}

main().catch(async error => {
  console.error(error.message);
  await mongoose.disconnect().catch(() => {});
  process.exitCode = 1;
});
