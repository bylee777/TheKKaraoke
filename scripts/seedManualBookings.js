/* eslint-disable no-console */
/**
 * Manual booking seeder.
 *
 * Usage:
 *   node scripts/seedManualBookings.js [/path/to/service-account.json]
 *
 * If you omit the path argument it will try GOOGLE_APPLICATION_CREDENTIALS,
 * otherwise falls back to /Users/simonlee/keys/barzunko-admin.json.
 */
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const DEFAULT_SERVICE_ACCOUNT = '/Users/simonlee/keys/barzunko-admin.json';
const serviceAccountPath =
  process.argv[2] || process.env.GOOGLE_APPLICATION_CREDENTIALS || DEFAULT_SERVICE_ACCOUNT;

if (!fs.existsSync(serviceAccountPath)) {
  console.error(`Service account file not found: ${serviceAccountPath}`);
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(require(path.resolve(serviceAccountPath))),
});

const db = admin.firestore();
const { FieldValue } = admin.firestore;

function shiftDate(dateStr, days) {
  const base = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(base.getTime())) return dateStr;
  base.setDate(base.getDate() + Number(days || 0));
  const year = base.getFullYear();
  const month = String(base.getMonth() + 1).padStart(2, '0');
  const day = String(base.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function determineBusinessDate(dateStr, startTime) {
  const [hours] = String(startTime || '')
    .split(':')
    .map((part) => Number(part));
  if (!Number.isFinite(hours)) {
    return dateStr;
  }
  if (hours < 12) {
    return shiftDate(dateStr, -1);
  }
  return dateStr;
}

const ROOM_MAP = {
  S: 'small',
  M: 'medium',
  L: 'large',
  XL: 'extra-large',
};

const seedBookings = [
  {
    date: '2025-11-18',
    name: 'KATHERINE',
    phone: '6479140341',
    partySize: 10,
    roomCode: 'L',
    startTime: '22:30',
    durationHours: 2,
    deposit: 50,
  },
  {
    date: '2025-11-21',
    name: 'ANDREA',
    phone: '6473383910',
    partySize: 30,
    roomCode: 'XL',
    startTime: '23:00',
    durationHours: 2,
    deposit: 100,
  },
  {
    date: '2025-11-21',
    name: 'MAYA',
    phone: '6478331142',
    partySize: 6,
    roomCode: 'M',
    startTime: '21:00',
    durationHours: 2,
    deposit: 30,
  },
  {
    date: '2025-11-22',
    name: 'LAURA',
    phone: '6472581366',
    partySize: 25,
    roomCode: 'XL',
    startTime: '21:30',
    durationHours: 2,
    deposit: 100,
  },
  {
    date: '2025-11-22',
    name: 'VICTORIA',
    phone: '6473090800',
    partySize: 3,
    roomCode: 'S',
    startTime: '20:00',
    durationHours: 1,
    deposit: 20,
  },
  {
    date: '2025-11-22',
    name: 'ANEESA',
    phone: '6473949778',
    partySize: 7,
    roomCode: 'M',
    startTime: '19:30',
    durationHours: 1.5,
    deposit: 30,
  },
  {
    date: '2025-11-22',
    name: 'SIMONE',
    phone: '6475284840',
    partySize: 12,
    roomCode: 'L',
    startTime: '20:00',
    durationHours: 1.5,
    deposit: 50,
  },
  {
    date: '2025-11-28',
    name: 'SAM',
    phone: '4168164250',
    partySize: 12,
    roomCode: 'L',
    startTime: '22:00',
    durationHours: 2,
    deposit: 50,
  },
  {
    date: '2025-11-28',
    name: 'REID',
    phone: '4372482009',
    partySize: 4,
    roomCode: 'S',
    startTime: '20:00',
    durationHours: 1,
    deposit: 20,
  },
  {
    date: '2025-11-29',
    name: 'JULIA',
    phone: '6474732626',
    partySize: 8,
    roomCode: 'M',
    startTime: '21:00',
    durationHours: 5,
    deposit: 30,
  },
  {
    date: '2025-12-05',
    name: 'JERIC',
    phone: '4164147124',
    partySize: 4,
    roomCode: 'S',
    startTime: '20:30',
    durationHours: 3,
    deposit: 20,
  },
  {
    date: '2025-12-06',
    name: 'JAY',
    phone: '6479993971',
    partySize: 8,
    roomCode: 'M',
    startTime: '22:00',
    durationHours: 3,
    deposit: 30,
  },
  {
    date: '2025-12-06',
    name: 'JUSTIN',
    phone: '6476139361',
    partySize: 15,
    roomCode: 'L',
    startTime: '22:00',
    durationHours: 2,
    deposit: 50,
  },
  {
    date: '2025-12-13',
    name: 'ERIC',
    phone: '2899281595',
    partySize: 17,
    roomCode: 'L',
    startTime: '18:30',
    durationHours: 2,
    deposit: 30,
  },
  {
    date: '2025-12-13',
    name: 'LEVI',
    phone: '4375452244',
    partySize: 20,
    roomCode: 'XL',
    startTime: '21:00',
    durationHours: 3,
    deposit: 100,
  },
];

function normalizeTime(raw) {
  if (!raw) throw new Error('Missing start time');
  let str = String(raw).trim().toLowerCase();
  str = str.replace(/\s+/g, '');
  const hasMeridiem = str.endsWith('am') || str.endsWith('pm');
  let period = null;
  if (hasMeridiem) {
    period = str.slice(-2);
    str = str.slice(0, -2);
  }
  if (!str.includes(':')) {
    str = `${str}:00`;
  }
  let [hourStr, minuteStr] = str.split(':');
  let hours = Number(hourStr);
  let minutes = Number(minuteStr);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    throw new Error(`Invalid time: ${raw}`);
  }
  if (period === 'pm' && hours < 12) hours += 12;
  if (period === 'am' && hours === 12) hours = 0;
  hours = ((hours % 24) + 24) % 24;
  minutes = ((minutes % 60) + 60) % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

function computeEndTime(startTime, durationHours) {
  const [startHours = 0, startMinutes = 0] = String(startTime)
    .split(':')
    .map((part) => Number(part) || 0);
  const durationMinutes = Math.round(Number(durationHours || 0) * 60);
  let totalMinutes = startHours * 60 + startMinutes + durationMinutes;
  const minutesInDay = 24 * 60;
  totalMinutes = ((totalMinutes % minutesInDay) + minutesInDay) % minutesInDay;
  const endHours = Math.floor(totalMinutes / 60);
  const endMinutes = totalMinutes % 60;
  return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
}

async function seed() {
  const batch = db.batch();
  seedBookings.forEach((entry) => {
    const roomId = ROOM_MAP[entry.roomCode];
    if (!roomId) {
      throw new Error(`Unknown room code "${entry.roomCode}" for ${entry.name}`);
    }
    const startTime = normalizeTime(entry.startTime);
    const endTime = computeEndTime(startTime, entry.durationHours);
    const businessDate = determineBusinessDate(entry.date, startTime);
    const [firstName, ...restName] = entry.name.trim().split(/\s+/);
    const lastName = restName.join(' ');
    const emailSlug = entry.name.replace(/\s+/g, '.').toLowerCase();
    const docRef = db.collection('bookings').doc();
    batch.set(docRef, {
      roomId,
      date: entry.date,
      startTime,
      endTime,
      duration: Number(entry.durationHours),
      totalCost: null,
      remainingBalance: null,
      depositAmount: Number(entry.deposit),
      partySize: Number(entry.partySize),
      customerInfo: {
        firstName,
        lastName,
        email: `seed+${emailSlug}@barzunko.test`,
        phone: entry.phone,
      },
      businessDate,
      paymentIntentId: null,
      paymentStatus: 'succeeded',
      calendarEventId: null,
      textSent: {
        booking: true,
        cancellation: false,
        rebooking: false,
      },
      status: 'confirmed',
      source: 'manual-seed',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  await batch.commit();
  console.info(`Seeded ${seedBookings.length} bookings.`);
  process.exit(0);
}

seed().catch((err) => {
  console.error('Failed to seed bookings', err);
  process.exit(1);
});
