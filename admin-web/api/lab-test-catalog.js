import { MongoClient, ObjectId } from 'mongodb';
import dns from 'node:dns';

const API_ORIGIN = process.env.HERITAGE_API_ORIGIN || 'https://heritage-hospital-1.onrender.com';
const MONGODB_URI = process.env.MONGODB_URI;

let clientPromise;

if (process.env.DNS_SERVERS) {
  dns.setServers(process.env.DNS_SERVERS.split(',').map(value => value.trim()).filter(Boolean));
}

function database() {
  if (!MONGODB_URI) throw new Error('MONGODB_URI is not configured');
  clientPromise ||= new MongoClient(MONGODB_URI).connect();
  return clientPromise.then(client => client.db());
}

function send(res, status, body) {
  res.status(status).json(body);
}

async function authorize(req) {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) return false;

  const response = await fetch(`${API_ORIGIN}/api/auth/me`, {
    headers: { authorization },
  });
  if (!response.ok) return false;
  const user = await response.json();
  return user.role === 'lab' || user.role === 'admin';
}

function publicTest(test) {
  return {
    _id: String(test._id),
    name: test.name,
    category: test.category || '',
    amount: test.amount,
  };
}

export default async function handler(req, res) {
  try {
    if (!await authorize(req)) {
      return send(res, 401, { code: 'invalid_credentials', message: 'Session expired. Please log in again.' });
    }

    const db = await database();
    const tests = db.collection('testcatalogs');

    if (req.method === 'GET') {
      const rows = await tests.find({ isActive: true }).sort({ category: 1, name: 1 }).toArray();
      return send(res, 200, rows.map(publicTest));
    }

    if (req.method !== 'PATCH') {
      res.setHeader('Allow', 'GET, PATCH');
      return send(res, 405, { code: 'forbidden', message: 'Method not allowed.' });
    }

    const id = String(req.query.id || '');
    if (!ObjectId.isValid(id)) return send(res, 404, { code: 'not_found', message: 'Test not found.' });

    const current = await tests.findOne({ _id: new ObjectId(id), isActive: true });
    if (!current) return send(res, 404, { code: 'not_found', message: 'Test not found.' });

    const name = String(req.body?.name ?? current.name).trim();
    const category = String(req.body?.category ?? current.category ?? '').trim();
    const amount = Number(req.body?.amount ?? current.amount);
    if (name.length < 2) return send(res, 400, { code: 'name_required', message: 'Please enter a test name.' });
    if (!Number.isFinite(amount) || amount < 0) return send(res, 400, { code: 'invalid_amount', message: 'Please enter a valid rate.' });

    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const duplicate = await tests.findOne({
      _id: { $ne: current._id },
      name: { $regex: `^${escaped}$`, $options: 'i' },
    });
    if (duplicate) return send(res, 409, { code: 'test_exists', message: 'This test already exists in the catalog.' });

    await tests.updateOne(
      { _id: current._id },
      { $set: { name, category, amount, updatedAt: new Date() } },
    );
    return send(res, 200, publicTest({ ...current, name, category, amount }));
  } catch (error) {
    console.error('lab-test-catalog', error);
    return send(res, 500, { code: 'server_error', message: 'Could not update the test. Please try again.' });
  }
}
