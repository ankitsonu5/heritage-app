// Move every previously soft-deleted patient into the separate archive collection
// and remove authentication credentials from the live tombstone. Safe to rerun.
require('dotenv').config();
const mongoose = require('mongoose');
const { Patient, ArchivedPatient, Order } = require('./src/models');
const { configureDns } = require('./src/dns');

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');
  configureDns();
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });

  const patients = await Patient.find({ deletedAt: { $ne: null } });
  let migrated = 0;
  for (const patient of patients) {
    const orderIds = await Order.find({ patient: patient._id }).distinct('_id');
    await ArchivedPatient.findOneAndUpdate(
      { originalPatientId: patient._id },
      {
        $set: {
          phone: patient.phone,
          name: patient.name,
          age: patient.age,
          village: patient.village,
          address: patient.address,
          voiceGuidance: patient.voiceGuidance,
          originalCreatedAt: patient.createdAt,
          originalUpdatedAt: patient.updatedAt,
          orderIds,
          orderCount: orderIds.length,
          archivedAt: patient.deletedAt,
        },
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
    );
    patient.password = undefined;
    patient.pushToken = undefined;
    patient.otpHash = undefined;
    patient.otpExpiry = undefined;
    patient.otpAttempts = 0;
    patient.loginAttempts = 0;
    patient.lockedUntil = undefined;
    await patient.save();
    migrated += 1;
  }

  console.log(`Patient archives migrated: ${migrated}/${patients.length}`);
  await mongoose.disconnect();
}

main().catch(async error => {
  console.error(error.message);
  await mongoose.disconnect().catch(() => {});
  process.exitCode = 1;
});
