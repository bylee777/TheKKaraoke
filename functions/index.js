const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { FieldValue } = require('firebase-admin/firestore');
const Stripe = require('stripe');
const nodemailer = require('nodemailer');
const twilio = require('twilio');

const MINUTES_IN_DAY = 24 * 60;
const BUSINESS_TIMEZONE = 'America/Toronto';
const SLOT_INCREMENT_MINUTES = 60;
const MIN_BOOKING_DURATION_MINUTES = 60;
const BUSINESS_SCHEDULE = {
  0: { openTime: '13:00', closeTime: '02:30', label: 'Sunday' },
  1: { openTime: '18:00', closeTime: '02:30', label: 'Monday' },
  2: { openTime: '18:00', closeTime: '02:30', label: 'Tuesday' },
  3: { openTime: '18:00', closeTime: '02:30', label: 'Wednesday' },
  4: { openTime: '18:00', closeTime: '02:30', label: 'Thursday' },
  5: { openTime: '18:00', closeTime: '03:00', label: 'Friday' },
  6: { openTime: '13:00', closeTime: '03:00', label: 'Saturday' },
};
const DEFAULT_SCHEDULE_DAY = 1; // Monday fallback
const TAX_RATE = 0.13;
const WEEKDAY_DEPOSIT_BY_ROOM = {
  small: 20,
  medium: 30,
  large: 50,
  'extra-large': 100,
};
const WEEKEND_DEPOSIT_BY_ROOM = {
  small: 30,
  medium: 60,
  large: 100,
  'extra-large': 150,
};
const twilioAccountSid =
  (functions.config().twilio && functions.config().twilio.account_sid) ||
  process.env.TWILIO_ACCOUNT_SID ||
  null;
const twilioAuthToken =
  (functions.config().twilio && functions.config().twilio.auth_token) ||
  process.env.TWILIO_AUTH_TOKEN ||
  null;
const twilioFromNumber =
  (functions.config().twilio && functions.config().twilio.from) || process.env.TWILIO_FROM || null;
const twilioNotifyNumber =
  (functions.config().twilio && functions.config().twilio.notify_to) ||
  process.env.TWILIO_NOTIFY_TO ||
  null;
const hasTwilioCredentials = twilioAccountSid && twilioAuthToken && twilioFromNumber;
const twilioClient = hasTwilioCredentials ? twilio(twilioAccountSid, twilioAuthToken) : null;

const telegramBotToken =
  (functions.config().telegram && functions.config().telegram.bot_token) ||
  process.env.TELEGRAM_BOT_TOKEN ||
  null;
let telegramChatIds = [];
try {
  const raw =
    (functions.config().telegram && functions.config().telegram.chat_ids) ||
    process.env.TELEGRAM_CHAT_IDS;
  if (raw) {
    telegramChatIds = Array.isArray(raw) ? raw : JSON.parse(raw);
  }
} catch (_) {
  telegramChatIds = [];
}

// Initialize the Firebase Admin SDK to access Firestore
admin.initializeApp();
const db = admin.firestore();

function parseDateFromYMD(dateStr, hours = 12) {
  if (typeof dateStr !== 'string') return null;
  const safe = new Date(`${dateStr}T${String(hours).padStart(2, '0')}:00:00`);
  if (Number.isNaN(safe.getTime())) {
    return null;
  }
  return safe;
}

function formatDateToYMD(dateObj) {
  if (!(dateObj instanceof Date) || Number.isNaN(dateObj.getTime())) {
    return null;
  }
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function shiftDate(dateStr, days) {
  const base = parseDateFromYMD(dateStr);
  if (!base || !Number.isFinite(days)) return dateStr;
  base.setDate(base.getDate() + Number(days));
  return formatDateToYMD(base) || dateStr;
}

function getPreviousDate(dateStr) {
  return shiftDate(dateStr, -1);
}

function timeStringToMinutes(time) {
  if (typeof time !== 'string') return NaN;
  const [h, m] = time.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return NaN;
  return h * 60 + m;
}

function minutesToTimeString(totalMinutes) {
  if (!Number.isFinite(totalMinutes)) return null;
  const normalized = ((totalMinutes % MINUTES_IN_DAY) + MINUTES_IN_DAY) % MINUTES_IN_DAY;
  const hours = String(Math.floor(normalized / 60)).padStart(2, '0');
  const minutes = String(normalized % 60).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function parseDateDay(dateStr) {
  if (typeof dateStr !== 'string') return null;
  const safeDate = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(safeDate.getTime())) return null;
  return safeDate.getDay();
}

function getBusinessScheduleForDate(dateStr) {
  const day = parseDateDay(dateStr);
  const schedule =
    BUSINESS_SCHEDULE[day ?? DEFAULT_SCHEDULE_DAY] || BUSINESS_SCHEDULE[DEFAULT_SCHEDULE_DAY];
  const openMinutes = timeStringToMinutes(schedule.openTime);
  let closeMinutes = timeStringToMinutes(schedule.closeTime);
  if (!Number.isFinite(openMinutes) || !Number.isFinite(closeMinutes)) {
    return null;
  }
  if (closeMinutes <= openMinutes) {
    closeMinutes += MINUTES_IN_DAY;
  }
  return {
    ...schedule,
    openMinutes,
    closeMinutes,
  };
}

function formatTimeLabel(timeStr) {
  if (typeof timeStr !== 'string') return timeStr;
  const [h, m] = timeStr.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return timeStr;
  const period = h >= 12 ? 'PM' : 'AM';
  let hour12 = h % 12;
  if (hour12 === 0) hour12 = 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

function buildBusinessHoursLabel(schedule) {
  if (!schedule) return 'our operating hours';
  return `${formatTimeLabel(schedule.openTime)} and ${formatTimeLabel(schedule.closeTime)}`;
}

function isCarryoverStart(dateStr, startTime) {
  const schedule = getBusinessScheduleForDate(dateStr);
  const minutes = timeStringToMinutes(startTime);
  if (!schedule || !Number.isFinite(minutes)) {
    return false;
  }
  return minutes < schedule.openMinutes;
}

function getActualDaySegments(dateStr) {
  const segments = [];
  const schedule = getBusinessScheduleForDate(dateStr);
  const prevDate = getPreviousDate(dateStr);
  const prevSchedule = prevDate ? getBusinessScheduleForDate(prevDate) : null;

  if (prevSchedule && prevSchedule.closeMinutes > MINUTES_IN_DAY) {
    segments.push({
      type: 'carryover',
      startMinutes: 0,
      closeMinutes: prevSchedule.closeMinutes - MINUTES_IN_DAY,
      businessDate: prevDate,
      schedule: prevSchedule,
    });
  }

  if (schedule) {
    const segmentStart = Math.max(0, Math.min(schedule.openMinutes, MINUTES_IN_DAY));
    segments.push({
      type: 'current',
      startMinutes: segmentStart,
      closeMinutes: schedule.closeMinutes,
      businessDate: dateStr,
      schedule,
    });
  }

  return segments;
}

function determineBusinessDate(dateStr, startTime) {
  const segments = getActualDaySegments(dateStr);
  const start = timeStringToMinutes(startTime);
  if (!Number.isFinite(start)) {
    return dateStr;
  }
  for (const segment of segments) {
    if (segment.type === 'carryover' && start < segment.closeMinutes) {
      return segment.businessDate;
    }
    if (segment.type === 'current' && start >= segment.startMinutes) {
      return segment.businessDate;
    }
  }
  return dateStr;
}

async function fetchActiveRoomBookingsForBusinessDate(roomId, businessDate, transaction = null) {
  const baseQuery = db
    .collection('bookings')
    .where('roomId', '==', roomId)
    .where('status', 'in', ACTIVE_BOOKING_STATUSES)
    .where('businessDate', '==', businessDate);

  const fallbackQuery = db
    .collection('bookings')
    .where('roomId', '==', roomId)
    .where('status', 'in', ACTIVE_BOOKING_STATUSES)
    .where('date', '==', businessDate);

  const baseSnap = transaction ? await transaction.get(baseQuery) : await baseQuery.get();
  const fallbackSnap = transaction
    ? await transaction.get(fallbackQuery)
    : await fallbackQuery.get();

  const docs = new Map();
  baseSnap.forEach((doc) => docs.set(doc.id, doc));
  fallbackSnap.forEach((doc) => docs.set(doc.id, doc));
  return Array.from(docs.values());
}

async function fetchActiveBookingsForBusinessDate(businessDate) {
  const baseQuery = db
    .collection('bookings')
    .where('status', 'in', ACTIVE_BOOKING_STATUSES)
    .where('businessDate', '==', businessDate);
  const fallbackQuery = db
    .collection('bookings')
    .where('status', 'in', ACTIVE_BOOKING_STATUSES)
    .where('date', '==', businessDate);

  const [baseSnap, fallbackSnap] = await Promise.all([baseQuery.get(), fallbackQuery.get()]);
  const docs = new Map();
  baseSnap.forEach((doc) => docs.set(doc.id, doc));
  fallbackSnap.forEach((doc) => docs.set(doc.id, doc));
  return Array.from(docs.values());
}

function ensureWithinBusinessHours(date, startTime, endTime) {
  const startMinutes = timeStringToMinutes(startTime);
  const endMinutesRaw = timeStringToMinutes(endTime);
  if (!Number.isFinite(startMinutes) || !Number.isFinite(endMinutesRaw)) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid time value provided.');
  }

  const segments = getActualDaySegments(date);
  if (!segments.length) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid booking date provided.');
  }

  let normalizedEnd = endMinutesRaw;
  if (normalizedEnd <= startMinutes) {
    normalizedEnd += MINUTES_IN_DAY;
  }

  const matchesSegment = segments.some((segment) => {
    if (segment.type === 'carryover') {
      if (startMinutes < 0 || startMinutes >= segment.closeMinutes) {
        return false;
      }
      return normalizedEnd <= segment.closeMinutes;
    }

    if (startMinutes < segment.startMinutes) {
      return false;
    }
    return normalizedEnd <= segment.closeMinutes;
  });

  if (!matchesSegment) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'Booking must be scheduled during our operating hours for that date.',
    );
  }
}

function buildTimeSlotsForDate(dateStr, durationMinutes = MIN_BOOKING_DURATION_MINUTES) {
  const segments = getActualDaySegments(dateStr);
  if (!segments.length) return [];
  const increment = SLOT_INCREMENT_MINUTES;
  const slots = [];
  const seen = new Set();

  segments.forEach((segment) => {
    const start = Math.max(0, segment.startMinutes || 0);
    const dayLimit = segment.closeMinutes;
    let latestStart = Math.min(segment.closeMinutes - durationMinutes, dayLimit);
    if (!Number.isFinite(latestStart) || latestStart < start) {
      return;
    }

    for (let cursor = start; cursor <= latestStart; cursor += increment) {
      if (cursor < 0) continue;
      const label = minutesToTimeString(cursor);
      if (!seen.has(label)) {
        seen.add(label);
        slots.push({ minutes: cursor, label });
      }
    }

    const needsFinalSlot = (latestStart - start) % increment !== 0 && latestStart >= start;
    if (needsFinalSlot) {
      const label = minutesToTimeString(latestStart);
      if (!seen.has(label)) {
        seen.add(label);
        slots.push({ minutes: latestStart, label });
      }
    }
  });

  return slots.sort((a, b) => a.minutes - b.minutes).map((entry) => entry.label);
}

function getZonedDateParts(date, timeZone = BUSINESS_TIMEZONE) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = {};
  formatter.formatToParts(date).forEach(({ type, value }) => {
    if (type !== 'literal') {
      parts[type] = value;
    }
  });
  return parts;
}

function getLatestCompletedBusinessDate(now = new Date()) {
  const parts = getZonedDateParts(now);
  if (!parts.year || !parts.month || !parts.day) {
    return null;
  }
  const todayStr = `${parts.year}-${parts.month}-${parts.day}`;
  const schedule = getBusinessScheduleForDate(todayStr);
  if (!schedule) {
    return todayStr;
  }
  const minutes = Number(parts.hour) * 60 + Number(parts.minute);
  let relativeMinutes = minutes;
  if (relativeMinutes < schedule.openMinutes && schedule.closeMinutes > MINUTES_IN_DAY) {
    relativeMinutes += MINUTES_IN_DAY;
  }
  if (relativeMinutes >= schedule.closeMinutes) {
    return todayStr;
  }
  const base = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)));
  base.setUTCDate(base.getUTCDate() - 1);
  return base.toISOString().slice(0, 10);
}

function getUpcomingFridaySaturdayDates(now = new Date()) {
  const current = new Date(now.getTime());
  const day = current.getDay();
  const thursdayOffset = (4 - day + 7) % 7;
  current.setDate(current.getDate() + thursdayOffset);
  const friday = new Date(current.getTime());
  friday.setDate(friday.getDate() + 1);
  const saturday = new Date(current.getTime());
  saturday.setDate(saturday.getDate() + 2);
  return {
    thursdayDate: current.toISOString().slice(0, 10),
    fridayDate: friday.toISOString().slice(0, 10),
    saturdayDate: saturday.toISOString().slice(0, 10),
  };
}

function ensureNotInPast(date, startTime) {
  const startDate = combineDateTime(date, startTime);
  if (Number.isNaN(startDate.getTime())) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid date or time provided.');
  }
  if (startDate.getTime() < Date.now()) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'Cannot schedule bookings in the past.',
    );
  }
}

const ROOM_CONFIG = {
  small: { inventory: 4, label: 'Small Room' },
  medium: { inventory: 4, label: 'Medium Room' },
  large: { inventory: 1, label: 'Large Room' },
  'extra-large': { inventory: 1, label: 'Extra Large Room' },
};

function getRoomConfig(roomId) {
  return ROOM_CONFIG[roomId] || { inventory: 1, label: 'selected room' };
}

const ACTIVE_BOOKING_STATUSES = ['confirmed', 'pending'];
const CANCEL_WINDOW_HOURS = 48;
const MIN_ADVANCE_HOURS = 6;

const HOURS_TO_MS = 60 * 60 * 1000;

function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

function combineDateTime(date, time) {
  return new Date(`${date}T${time}`);
}

function addDurationMinutes(dateObj, durationHours) {
  const minutesToAdd = Math.round(Number(durationHours) * 60);
  if (!Number.isFinite(minutesToAdd)) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid duration provided.');
  }
  dateObj.setMinutes(dateObj.getMinutes() + minutesToAdd);
  return dateObj;
}

function computeEndTime(date, startTime, duration) {
  const endDate = combineDateTime(date, startTime);
  addDurationMinutes(endDate, duration);
  return {
    endDate,
    endTime: endDate.toTimeString().slice(0, 5),
  };
}

function buildNoAvailabilityMessage(label, inventory) {
  if (inventory > 1) {
    const pluralLabel = label.endsWith('s') ? label : `${label}s`;
    return `All ${pluralLabel} are booked for the selected time. Please choose a different time or room.`;
  }
  return `The ${label} is already booked for the selected time. Please choose a different time or room.`;
}

function sanitizeBookingSnapshot(doc) {
  if (!doc || !doc.exists) {
    return null;
  }

  const booking = doc.data();
  const roomConfig = getRoomConfig(booking.roomId);
  const startDate = combineDateTime(booking.date, booking.startTime);
  const cancelDeadline = new Date(startDate.getTime() - CANCEL_WINDOW_HOURS * HOURS_TO_MS);
  const msUntilStart = startDate.getTime() - Date.now();
  const isActiveStatus = ACTIVE_BOOKING_STATUSES.includes(booking.status);
  const canModify = isActiveStatus && msUntilStart >= 0;
  const canCancel = canModify && msUntilStart >= CANCEL_WINDOW_HOURS * HOURS_TO_MS;
  const canRebook = canModify && msUntilStart >= CANCEL_WINDOW_HOURS * HOURS_TO_MS;

  return {
    id: doc.id,
    roomId: booking.roomId,
    roomName: roomConfig.label,
    date: booking.date,
    businessDate: booking.businessDate || booking.date,
    startTime: booking.startTime,
    endTime: booking.endTime,
    duration: booking.duration,
    status: booking.status,
    paymentStatus: booking.paymentStatus || null,
    paymentIntentId: booking.paymentIntentId || null,
    totalCost: booking.totalCost ?? null,
    totalCostWithTax: booking.totalCostWithTax ?? null,
    depositAmount: booking.depositAmount ?? null,
    depositBeforeTax: booking.depositBeforeTax ?? null,
    depositTax: booking.depositTax ?? null,
    remainingBalance: booking.remainingBalance ?? null,
    remainingBalanceBeforeTax: booking.remainingBalanceBeforeTax ?? null,
    remainingTax: booking.remainingTax ?? null,
    bookingFee: booking.bookingFee ?? null,
    extraGuestFee: booking.extraGuestFee ?? null,
    requiredPurchaseAmount: booking.requiredPurchaseAmount ?? null,
    partySize: booking.partySize ?? null,
    customer: {
      firstName: booking.customerInfo?.firstName || '',
      lastName: booking.customerInfo?.lastName || '',
      email: booking.customerInfo?.email || '',
      phone: booking.customerInfo?.phone || '',
      specialRequests: booking.customerInfo?.specialRequests || '',
    },
    canCancel,
    canRebook,
    cancelableUntil: cancelDeadline.toISOString(),
    startDateTime: startDate.toISOString(),
    createdAt: booking.createdAt?.toDate ? booking.createdAt.toDate().toISOString() : null,
    updatedAt: booking.updatedAt?.toDate ? booking.updatedAt.toDate().toISOString() : null,
  };
}

async function findBookingRefByPaymentIntentId(intentId) {
  if (!intentId) return null;
  const snap = await db
    .collection('bookings')
    .where('paymentIntentId', '==', intentId)
    .limit(1)
    .get();
  if (snap.empty) return null;
  return snap.docs[0].ref;
}

async function ensureRoomAvailability(
  roomId,
  date,
  startTime,
  endTime,
  excludeBookingId,
  transaction,
  options = {},
) {
  const { inventory, label } = getRoomConfig(roomId);
  const schedule = getBusinessScheduleForDate(date);
  if (!schedule) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid booking date supplied.');
  }
  const businessDate = determineBusinessDate(date, startTime);
  const snapshot = await fetchActiveRoomBookingsForBusinessDate(
    roomId,
    businessDate,
    transaction || null,
  );

  let overlapping = 0;
  snapshot.forEach((doc) => {
    if (doc.id === excludeBookingId) {
      return;
    }
    const booking = doc.data();
    if (hasTimeConflict(startTime, endTime, booking.startTime, booking.endTime)) {
      overlapping += 1;
    }
  });

  const reserved = reservedSlotsForWindow(
    roomId,
    businessDate,
    startTime,
    endTime,
    schedule,
    options,
  );
  const effectiveInventory = Math.max(inventory - reserved, 0);
  if (overlapping >= effectiveInventory) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      buildNoAvailabilityMessage(label, inventory),
    );
  }
}

function assertGuestOwnership(booking, email) {
  const bookingEmail = normalizeEmail(booking.customerInfo?.email);
  const supplied = normalizeEmail(email);
  if (!supplied || supplied !== bookingEmail) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Booking not found for that email address.',
    );
  }
}

// Determine the Stripe secret key from runtime configuration. To set this
// configuration run:
//   firebase functions:config:set stripe.secret_key="sk_live_yourSecretHere"
const stripeSecretKey = functions.config().stripe && functions.config().stripe.secret_key;
if (!stripeSecretKey) {
  throw new Error(
    'Stripe secret key is not configured. Run `firebase functions:config:set stripe.secret_key="..."`.',
  );
}
const stripe = Stripe(stripeSecretKey);
const stripeWebhookSecret =
  (functions.config().stripe && functions.config().stripe.webhook_secret) ||
  process.env.STRIPE_WEBHOOK_SECRET ||
  null;
const gmailUser = (functions.config().gmail && functions.config().gmail.user) || process.env.GMAIL_USER || null;
const gmailPass = (functions.config().gmail && functions.config().gmail.pass) || process.env.GMAIL_PASS || null;
const gmailFrom =
  (functions.config().gmail && functions.config().gmail.from) ||
  process.env.GMAIL_FROM ||
  gmailUser ||
  null;
const mailTransport =
  gmailUser && gmailPass
    ? nodemailer.createTransport({
        service: 'gmail',
        auth: { user: gmailUser, pass: gmailPass },
      })
    : null;

function requireAdmin(context) {
  if (!context || !context.auth || context.auth.token?.isAdmin !== true) {
    throw new functions.https.HttpsError('permission-denied', 'Admin privileges required');
  }
}

function normalizeTimeRange(start, end) {
  const startMinutes = timeStringToMinutes(start);
  let endMinutes = timeStringToMinutes(end);
  if (!Number.isFinite(startMinutes) || !Number.isFinite(endMinutes)) {
    return null;
  }
  if (endMinutes <= startMinutes) {
    endMinutes += MINUTES_IN_DAY;
  }
  return { start: startMinutes, end: endMinutes };
}

// Helper: check time conflict between two bookings. Times are strings in
// 24-hour format (HH:mm). Returns true if they overlap.
function hasTimeConflict(startA, endA, startB, endB) {
  const rangeA = normalizeTimeRange(startA, endA);
  const rangeB = normalizeTimeRange(startB, endB);
  if (!rangeA || !rangeB) {
    return true;
  }
  return rangeA.start < rangeB.end && rangeA.end > rangeB.start;
}

// Reserve policy: keep 1 small and 1 medium room for Fri/Sat 21:00-24:00 (walk-ins)
function isFridayOrSaturday(dateStr) {
  try {
    // Use midday to avoid edge cases around DST
    const d = new Date(`${dateStr}T12:00:00`);
    const day = d.getDay(); // 0=Sun ... 6=Sat
    return day === 5 || day === 6; // Fri or Sat
  } catch (_) {
    return false;
  }
}

function reservedSlotsForWindow(roomId, date, startTime, endTime, schedule, options = {}) {
  if (options.overrideWalkInHold) return 0;
  if (!roomId || !date) return 0;
  const isTargetRoom = roomId === 'small' || roomId === 'medium';
  if (!isTargetRoom) return 0;
  if (!isFridayOrSaturday(date)) return 0;
  // Walk-in hold window: 21:00 - 00:00
  const holdStart = '21:00';
  const holdEnd = '00:00';
  return hasTimeConflict(startTime, endTime, holdStart, holdEnd) ? 1 : 0;
}

function getDepositBaseAmount(roomId, dateStr) {
  if (!roomId || !dateStr) return 0;
  const table = isFridayOrSaturday(dateStr) ? WEEKEND_DEPOSIT_BY_ROOM : WEEKDAY_DEPOSIT_BY_ROOM;
  return table[roomId] || 0;
}

function calculateDepositTotals(roomId, businessDate, totalCostBeforeTax, taxRate = TAX_RATE) {
  const baseBeforeTax = getDepositBaseAmount(roomId, businessDate);
  const safeBase = Number.isFinite(baseBeforeTax) && baseBeforeTax > 0 ? baseBeforeTax : 0;
  const taxMultiplier = 1 + (Number.isFinite(taxRate) ? taxRate : 0);
  const totalCost = Number.isFinite(Number(totalCostBeforeTax))
    ? Math.max(0, Number(totalCostBeforeTax))
    : null;
  const depositTotal = Math.round(safeBase * 100) / 100; // deposit is charged pre-tax
  const totalWithTax = Number.isFinite(totalCost)
    ? Math.round(totalCost * taxMultiplier * 100) / 100
    : null;
  const cappedTotal =
    depositTotal > 0 && Number.isFinite(totalWithTax)
      ? Math.min(depositTotal, totalWithTax)
      : depositTotal;
  const beforeTax = cappedTotal;
  const depositTax = 0;
  return { beforeTax, tax: depositTax, total: cappedTotal, totalCostWithTax: totalWithTax };
}

// Email sending stub. Integrate SendGrid or Mailgun here once credentials are
// provided. These stubs simply log the action so local development succeeds.
async function sendBookingEmail(booking) {
  const to = normalizeEmail(booking?.customerInfo?.email);
  if (!to || !mailTransport) {
    console.log('sendBookingEmail stub:', booking?.id);
    return;
  }
  const subject = 'Your Barzunko booking is confirmed';
  const html = `
    <p>Hi ${booking.customerInfo?.firstName || ''} ${booking.customerInfo?.lastName || ''},</p>
    <p>Thanks for booking with Barzunko! Here are your details:</p>
    <ul>
      <li><strong>Booking ID:</strong> ${booking.id}</li>
      <li><strong>Date & Time:</strong> ${booking.date} at ${booking.startTime}</li>
      <li><strong>Room:</strong> ${booking.roomId}</li>
      <li><strong>Duration:</strong> ${booking.duration} hour${booking.duration === 1 ? '' : 's'}</li>
      <li><strong>Amount Paid:</strong> $${booking.depositAmount ?? booking.totalCost ?? 0}</li>
      ${
        booking.remainingBalance != null
          ? `<li><strong>Remaining Balance:</strong> $${booking.remainingBalance}</li>`
          : ''
      }
    </ul>
    <p>If you need to make changes, reply to this email or call us at 416-968-0909.</p>
    <p>See you soon!</p>
  `;
  try {
    await mailTransport.sendMail({
      to,
      from: gmailFrom,
      subject,
      html,
    });
  } catch (err) {
    console.error('sendBookingEmail failed', err);
  }
}
async function sendCancellationEmail(booking) {
  const to = normalizeEmail(booking?.customerInfo?.email);
  if (!to || !mailTransport) {
    console.log('sendCancellationEmail stub:', booking?.id);
    return;
  }
  const subject = 'Your Barzunko booking has been cancelled';
  const html = `
    <p>Hi ${booking.customerInfo?.firstName || ''} ${booking.customerInfo?.lastName || ''},</p>
    <p>Your booking has been cancelled.</p>
    <ul>
      <li><strong>Booking ID:</strong> ${booking.id}</li>
      <li><strong>Date & Time:</strong> ${booking.date} at ${booking.startTime}</li>
      <li><strong>Room:</strong> ${booking.roomId}</li>
    </ul>
    <p>If this was a mistake, reply to this email or call us at 416-968-0909.</p>
  `;
  try {
    await mailTransport.sendMail({
      to,
      from: gmailFrom,
      subject,
      html,
    });
  } catch (err) {
    console.error('sendCancellationEmail failed', err);
  }
}

// Calendar integration stub. Integrate with the Google Calendar API once
// credentials are provided. For now we just log the event details.
async function addBookingToCalendar(booking) {
  console.log('addBookingToCalendar stub:', booking.id);
  return;
}

async function sendTelegramMessage(text) {
  if (!telegramBotToken || !telegramChatIds.length || !text) return;
  const urlBase = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;
  await Promise.all(
    telegramChatIds.map(async (chatId) => {
      try {
        await fetch(urlBase, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text }),
        });
      } catch (err) {
        console.error('[telegram] Failed to send message to', chatId, err.message || err);
      }
    }),
  );
}

async function sendSms(to, message) {
  if (!to || !message) {
    return;
  }
  if (!twilioClient) {
    console.warn('[sms] Twilio not configured; skipping message for', to);
    return;
  }
  try {
    await twilioClient.messages.create({ to, from: twilioFromNumber, body: message });
  } catch (err) {
    console.error('[sms] Failed to send message', err);
  }
}

async function sendBookingConfirmationSms(bookingDoc) {
  if (!bookingDoc) return;
  const customer = bookingDoc.customerInfo || {};
  const phone = (customer.phone || '').trim();
  if (phone) {
    const firstName = (customer.firstName || '').trim();
    const contactLine = 'Need anything? Call 416-968-0909.';
    const message = firstName
      ? `Hi ${firstName}! Your Barjunko booking is locked in for ${bookingDoc.date} at ${bookingDoc.startTime}. See you soon! ${contactLine}`
      : `Your Barjunko booking is locked in for ${bookingDoc.date} at ${bookingDoc.startTime}. See you soon! ${contactLine}`;
    await sendSms(phone, message);
  }
  if (twilioNotifyNumber) {
    const displayName =
      [customer.firstName, customer.lastName].filter(Boolean).join(' ') ||
      customer.email ||
      bookingDoc.id;
    const summary =
      `New booking ${bookingDoc.id || ''} (${displayName}) on ${bookingDoc.date} ${bookingDoc.startTime} in ${bookingDoc.roomId}`.trim();
    await sendSms(twilioNotifyNumber, summary);
  }
}

async function sendFridaySaturdayReminderSms(bookingDoc) {
  if (!bookingDoc || !isFridayOrSaturday(bookingDoc.date)) {
    return;
  }
  const customer = bookingDoc.customerInfo || {};
  const phone = (customer.phone || '').trim();
  if (!phone) return;
  const firstName = (customer.firstName || '').trim();
  const contactLine = 'Need anything? Call 416-968-0909.';
  const message = firstName
    ? `Reminder: Hi ${firstName}, your BarJunko booking is coming up on ${bookingDoc.date} at ${bookingDoc.startTime}. ${contactLine}`
    : `Reminder: Your BarJunko booking is coming up on ${bookingDoc.date} at ${bookingDoc.startTime}. ${contactLine}`;
  await sendSms(phone, message);
}

/**
 * Internal helper to create a booking. Performs double-booking checks,
 * creates a Stripe PaymentIntent for the deposit, writes the booking to
 * Firestore, and optionally calls stubbed integrations. This helper is
 * designed to be reused by the HTTP callable function as well as the
 * rebooking workflow.
 *
 * @param {Object} params Data describing the booking.
 * @param {string} params.roomId The ID of the room being booked.
 * @param {string} params.date The booking date (YYYY-MM-DD).
 * @param {string} params.startTime The start time (HH:mm) in 24-hour format.
 * @param {number} params.duration The duration in hours.
 * @param {number} params.totalCost The total cost of the booking (pre-tax).
 * @param {Object} params.customerInfo Customer details (firstName, lastName, email, phone, specialRequests).
 * @returns {Promise<Object>} The newly created booking record and PaymentIntent details.
 */
async function createBookingInternal(params) {
  const { roomId, date, startTime, duration, totalCost, customerInfo, partySize } = params;

  if (!roomId || !date || !startTime || !duration || !customerInfo) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required booking fields');
  }

  // Enforce maximum booking duration of 3 hours
  const dur = Number(duration);
  if (!Number.isFinite(dur) || dur <= 0) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Duration must be a positive number of hours',
    );
  }
  if (dur > 3) {
    throw new functions.https.HttpsError('invalid-argument', 'Maximum booking duration is 3 hours');
  }

  const { inventory, label } = getRoomConfig(roomId);
  const noAvailabilityMessage = buildNoAvailabilityMessage(label, inventory);

  const normalizedCustomerInfo = {
    ...customerInfo,
    firstName: customerInfo?.firstName
      ? customerInfo.firstName.trim()
      : customerInfo?.firstName || '',
    lastName: customerInfo?.lastName ? customerInfo.lastName.trim() : customerInfo?.lastName || '',
    email: normalizeEmail(customerInfo?.email),
    phone: customerInfo?.phone ? customerInfo.phone.trim() : customerInfo?.phone || '',
  };

  // Compute the end time based on start time and duration
  const dateObj = new Date(`${date}T${startTime}`);
  addDurationMinutes(dateObj, dur);
  const endTime = dateObj.toTimeString().slice(0, 5);

  const schedule = getBusinessScheduleForDate(date);
  if (!schedule) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid booking date provided.');
  }

  ensureWithinBusinessHours(date, startTime, endTime);
  ensureNotInPast(date, startTime);

  const businessDate = determineBusinessDate(date, startTime);

  const totalCostNumber = Number.isFinite(Number(totalCost)) ? Number(totalCost) : null;
  const depositTotals = calculateDepositTotals(roomId, businessDate, totalCostNumber, TAX_RATE);
  const depositToCharge = depositTotals.total;
  if (!Number.isFinite(depositToCharge) || depositToCharge <= 0) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'Unable to determine the required deposit for this booking.',
    );
  }
  const totalCostWithTax =
    totalCostNumber != null
      ? Math.round(totalCostNumber * (1 + TAX_RATE) * 100) / 100
      : null;
  const remainingBalance =
    totalCostWithTax != null ? Math.max(totalCostWithTax - depositToCharge, 0) : null;
  const remainingBalanceBeforeTax =
    totalCostNumber != null ? Math.max(totalCostNumber - depositTotals.beforeTax, 0) : null;
  const remainingTax =
    remainingBalance != null && remainingBalanceBeforeTax != null
      ? Math.max(Math.round((remainingBalance - remainingBalanceBeforeTax) * 100) / 100, 0)
      : null;

  // Quick availability check before creating payment intent
  const existing = await fetchActiveRoomBookingsForBusinessDate(roomId, businessDate);
  let overlappingCount = 0;
  for (const doc of existing) {
    const booking = doc.data();
    if (hasTimeConflict(startTime, endTime, booking.startTime, booking.endTime)) {
      overlappingCount += 1;
    }
  }

  // Apply reserved slot policy (Fri/Sat 21:00-23:00) for small/medium rooms
  const reserved = reservedSlotsForWindow(roomId, businessDate, startTime, endTime, schedule);
  const effectiveInventory = Math.max(inventory - reserved, 0);
  if (overlappingCount >= effectiveInventory) {
    throw new functions.https.HttpsError('failed-precondition', noAvailabilityMessage);
  }

  // Create a PaymentIntent for the required deposit (tax-inclusive)
  let paymentIntent;
  try {
    paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(depositToCharge * 100),
      currency: 'cad',
      payment_method_types: ['card'],
      metadata: {
        roomId,
        date,
        startTime,
        duration: dur,
        deposit_before_tax: depositTotals.beforeTax.toString(),
      },
    });
  } catch (err) {
    console.error('Stripe PaymentIntent creation failed', err);
    throw new functions.https.HttpsError('internal', 'Unable to create payment');
  }

  const bookingDoc = {
    roomId,
    date,
    businessDate,
    startTime,
    endTime,
    duration: dur,
    totalCost: totalCostNumber,
    totalCostWithTax,
    depositAmount: depositToCharge,
    depositBeforeTax: depositTotals.beforeTax,
    depositTax: depositTotals.tax,
    remainingBalance,
    remainingBalanceBeforeTax,
    remainingTax,
    partySize: typeof partySize === 'number' ? partySize : null,
    customerInfo: normalizedCustomerInfo,
    paymentIntentId: paymentIntent.id,
    paymentStatus: 'requires_payment_method',
    calendarEventId: null,
    textSent: {
      booking: false,
      cancellation: false,
      rebooking: false,
    },
    status: 'pending',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  let newBookingRef;
  try {
    await db.runTransaction(async (transaction) => {
      const txnSnapshot = await fetchActiveRoomBookingsForBusinessDate(
        roomId,
        businessDate,
        transaction,
      );
      let txnOverlapping = 0;

      txnSnapshot.forEach((doc) => {
        const booking = doc.data();
        if (hasTimeConflict(startTime, endTime, booking.startTime, booking.endTime)) {
          txnOverlapping += 1;
        }
      });

      const txnReserved = reservedSlotsForWindow(
        roomId,
        businessDate,
        startTime,
        endTime,
        schedule,
      );
      const txnEffectiveInventory = Math.max(inventory - txnReserved, 0);
      if (txnOverlapping >= txnEffectiveInventory) {
        throw new functions.https.HttpsError('failed-precondition', noAvailabilityMessage);
      }

      const docRef = db.collection('bookings').doc();
      transaction.set(docRef, bookingDoc);
      newBookingRef = docRef;
    });
  } catch (err) {
    if (paymentIntent) {
      try {
        await stripe.paymentIntents.cancel(paymentIntent.id);
      } catch (cancelErr) {
        console.error('Failed to cancel PaymentIntent after availability conflict', cancelErr);
      }
    }

    throw err;
  }

  // Email is sent after payment succeeds (see webhook/confirmBooking)
  await addBookingToCalendar({ id: newBookingRef.id, ...bookingDoc });
  await sendBookingConfirmationSms({ id: newBookingRef.id, ...bookingDoc });
  await sendTelegramMessage(
    [
      '📅 New Booking',
      `Date: ${bookingDoc.date} ${bookingDoc.startTime}`,
      `Room: ${bookingDoc.roomId}`,
      `Name: ${bookingDoc.customerInfo?.firstName || ''} ${bookingDoc.customerInfo?.lastName || ''}`,
      `Phone: ${bookingDoc.customerInfo?.phone || 'n/a'}`,
      `Party Size: ${bookingDoc.partySize ?? 'n/a'}`,
      `Deposit: $${bookingDoc.depositAmount ?? 0}`,
    ].join('\n'),
  );

  return {
    id: newBookingRef.id,
    bookingDoc,
    paymentIntent,
  };
}

async function cancelBookingInternal(bookingId) {
  const ref = db.collection('bookings').doc(bookingId);
  const doc = await ref.get();
  if (!doc.exists) {
    throw new functions.https.HttpsError('not-found', 'Booking not found');
  }
  const booking = doc.data();

  // Handle payment reversal through Stripe if a payment intent exists
  if (booking.paymentIntentId) {
    try {
      const intent = await stripe.paymentIntents.retrieve(booking.paymentIntentId);
      if (intent.status === 'requires_capture') {
        // Authorization only, cancel to release hold
        await stripe.paymentIntents.cancel(intent.id);
      } else if (intent.status === 'succeeded' || intent.charges?.data?.length) {
        await stripe.refunds.create({ payment_intent: intent.id });
      }
    } catch (err) {
      console.error('Stripe reversal failed', err);
      throw new functions.https.HttpsError('internal', 'Unable to reverse payment');
    }
  }

  // Update the booking document to cancelled
  await ref.update({
    status: 'cancelled',
    paymentStatus: 'refunded',
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Send cancellation email via stub
  await sendCancellationEmail({ id: bookingId, ...booking });
  await sendTelegramMessage(
    [
      '⚠️ Booking Cancelled',
      `Date: ${booking.date} ${booking.startTime}`,
      `Room: ${booking.roomId}`,
      `Name: ${booking.customerInfo?.firstName || ''} ${booking.customerInfo?.lastName || ''}`,
      `Phone: ${booking.customerInfo?.phone || 'n/a'}`,
      `Status: ${booking.status || 'cancelled'}`,
    ].join('\n'),
  );
}

async function cancelBookingWithoutRefund(bookingId) {
  const ref = db.collection('bookings').doc(bookingId);
  const doc = await ref.get();
  if (!doc.exists) {
    throw new functions.https.HttpsError('not-found', 'Booking not found');
  }
  const booking = doc.data();
  await ref.update({
    status: 'cancelled',
    updatedAt: FieldValue.serverTimestamp(),
  });
  await sendCancellationEmail({ id: bookingId, ...booking });
  await sendTelegramMessage(
    [
      '⚠️ Booking Cancelled (no refund)',
      `Date: ${booking.date} ${booking.startTime}`,
      `Room: ${booking.roomId}`,
      `Name: ${booking.customerInfo?.firstName || ''} ${booking.customerInfo?.lastName || ''}`,
      `Phone: ${booking.customerInfo?.phone || 'n/a'}`,
      `Status: ${booking.status || 'cancelled'}`,
    ].join('\n'),
  );
}

/**
 * Callable Cloud Function: createBooking
 *
 * Creates a booking with deposit and writes it to Firestore. Deposit amounts
 * are calculated server-side based on room type and day of week. Anyone can
 * invoke this function (authentication is optional) because all writes are
 * validated server-side.
 */
exports.createBooking = functions.https.onCall(async (data, context) => {
  const { roomId, date, startTime, duration, totalCost, customerInfo, partySize } = data || {};
  const result = await createBookingInternal({
    roomId,
    date,
    startTime,
    duration,
    totalCost,
    customerInfo,
    partySize,
  });
  return {
    bookingId: result.id,
    clientSecret: result.paymentIntent.client_secret,
    paymentIntentClientSecret: result.paymentIntent.client_secret,
    message: 'Booking created',
  };
});
exports.lookupBooking = functions.https.onCall(async (data) => {
  const bookingRefRaw = typeof data?.bookingRef === 'string' ? data.bookingRef.trim() : '';
  const emailNormalized = normalizeEmail(data?.email);

  if (!emailNormalized) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Email is required to look up a booking.',
    );
  }

  const results = [];
  const refLower = bookingRefRaw.toLowerCase();

  const emailQuerySnapshot = await db
    .collection('bookings')
    .where('customerInfo.email', '==', emailNormalized)
    .get();

  emailQuerySnapshot.forEach((doc) => {
    if (refLower && doc.id.toLowerCase() !== refLower) {
      return;
    }
    const sanitized = sanitizeBookingSnapshot(doc);
    if (sanitized) {
      results.push(sanitized);
    }
  });

  if (results.length === 0 && refLower) {
    const doc = await db.collection('bookings').doc(bookingRefRaw).get();
    if (doc.exists) {
      const booking = doc.data();
      if (normalizeEmail(booking.customerInfo?.email) === emailNormalized) {
        const sanitized = sanitizeBookingSnapshot(doc);
        if (sanitized) {
          results.push(sanitized);
        }
      }
    }
  }

  return { bookings: results };
});

exports.getRoomAvailability = functions.https.onCall(async (data) => {
  const { date, startTime } = data || {};
  const duration = Number(data?.duration);
  const excludeBookingId =
    typeof data?.excludeBookingId === 'string' ? data.excludeBookingId.trim() : '';
  const allowPast = data?.allowPast === true;
  const overrideWalkInHold = data?.overrideWalkInHold === true;
  const roomIds =
    Array.isArray(data?.roomIds) && data.roomIds.length > 0
      ? Array.from(new Set(data.roomIds.map(String)))
      : Object.keys(ROOM_CONFIG);

  if (!date || !startTime || !Number.isFinite(duration) || duration <= 0) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'date, startTime, and duration are required to determine availability.',
    );
  }

  const startDate = new Date(`${date}T${startTime}`);
  if (Number.isNaN(startDate.getTime())) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid date or startTime supplied.');
  }

  const endDate = new Date(startDate.getTime());
  addDurationMinutes(endDate, duration);
  const endTime = endDate.toTimeString().slice(0, 5);

  const schedule = getBusinessScheduleForDate(date);
  if (!schedule) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid booking date supplied.');
  }

  ensureWithinBusinessHours(date, startTime, endTime);
  if (!allowPast) {
    ensureNotInPast(date, startTime);
  }

  const businessDate = determineBusinessDate(date, startTime);

  const availabilityEntries = await Promise.all(
    roomIds.map(async (roomId) => {
      const { inventory } = getRoomConfig(roomId);
      const snapshot = await fetchActiveRoomBookingsForBusinessDate(roomId, businessDate);

      let overlapping = 0;
      snapshot.forEach((doc) => {
        if (excludeBookingId && doc.id === excludeBookingId) {
          return;
        }

        const booking = doc.data();
        if (hasTimeConflict(startTime, endTime, booking.startTime, booking.endTime)) {
          overlapping += 1;
        }
      });

      const reserved = reservedSlotsForWindow(
        roomId,
        businessDate,
        startTime,
        endTime,
        schedule,
        { overrideWalkInHold },
      );
      const remaining = Math.max(inventory - overlapping - reserved, 0);
      return [roomId, remaining];
    }),
  );

  const availability = Object.fromEntries(availabilityEntries);

  return { availability };
});

exports.getMaxAvailableDuration = functions.https.onCall(async (data) => {
  const { roomId, date, startTime } = data || {};
  const allowPast = data?.allowPast === true;
  if (!roomId || !date || !startTime) {
    throw new functions.https.HttpsError('invalid-argument', 'roomId, date, and startTime are required');
  }
  const { inventory } = getRoomConfig(roomId);
  const schedule = getBusinessScheduleForDate(date);
  if (!schedule) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid booking date supplied.');
  }

  if (!allowPast) {
    ensureNotInPast(date, startTime);
  }

  // For room types with multiple inventory, overlapping bookings on one room
  // don't block the entire type. Return the max allowed duration (3h) and
  // rely on the availability check to enforce capacity.
  if (Number.isFinite(inventory) && inventory > 1) {
    return { maxDurationHours: 3 };
  }
  const businessDate = determineBusinessDate(date, startTime);
  const startMinutes = timeStringToMinutes(startTime);
  if (!Number.isFinite(startMinutes)) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid start time supplied.');
  }

  // Compute the latest possible end time based on business hours
  let latestAllowed = schedule.closeMinutes;
  // Fetch active bookings for the business date and find the earliest blocking booking
  const bookings = await fetchActiveRoomBookingsForBusinessDate(roomId, businessDate);
  for (const doc of bookings) {
    const booking = doc.data();
    const bStart = timeStringToMinutes(booking.startTime);
    let bEnd = timeStringToMinutes(booking.endTime);
    if (!Number.isFinite(bStart) || !Number.isFinite(bEnd)) continue;
    if (bEnd <= bStart) {
      bEnd += MINUTES_IN_DAY;
    }
    const normalizedStart = bStart < startMinutes ? bStart + MINUTES_IN_DAY : bStart;
    const normalizedEnd = bEnd < normalizedStart ? bEnd + MINUTES_IN_DAY : bEnd;
    // If the booking overlaps the requested start, block immediately
    if (startMinutes >= normalizedStart && startMinutes < normalizedEnd) {
      latestAllowed = startMinutes; // no availability at this start time
      break;
    }
    // Otherwise, if the booking starts after our start, it limits the window
    if (normalizedStart >= startMinutes) {
      latestAllowed = Math.min(latestAllowed, normalizedStart);
    }
  }

  const gapMinutes = Math.max(latestAllowed - startMinutes, 0);
  const maxByScheduleHours = Math.floor(gapMinutes / 60);
  const maxDurationHours = Math.min(3, Math.max(0, maxByScheduleHours));

  return { maxDurationHours };
});

exports.adminCancelBySecret = functions.https.onCall(async (data, context) => {
  requireAdmin(context);
  const { bookingId } = data || {};
  if (!bookingId) {
    throw new functions.https.HttpsError('invalid-argument', 'bookingId is required');
  }
  await cancelBookingInternal(bookingId);
  const snap = await db.collection('bookings').doc(bookingId).get();
  return { message: 'Booking cancelled', booking: sanitizeBookingSnapshot(snap) };
});

exports.adminCancelWithoutRefund = functions.https.onCall(async (data, context) => {
  requireAdmin(context);
  const { bookingId } = data || {};
  if (!bookingId) {
    throw new functions.https.HttpsError('invalid-argument', 'bookingId is required');
  }
  await cancelBookingWithoutRefund(bookingId);
  const snap = await db.collection('bookings').doc(bookingId).get();
  return { message: 'Booking cancelled (no refund)', booking: sanitizeBookingSnapshot(snap) };
});

exports.adminRebookBySecret = functions.https.onCall(async (data, context) => {
  requireAdmin(context);
  const {
    bookingId,
    newDate,
    newStartTime,
    newDuration,
    roomId,
    partySize,
    customerInfo,
    totalCost,
    depositAmount,
    remainingBalance,
    extraGuestFee,
    bookingFee,
    requiredPurchaseAmount,
  } = data || {};
  if (!bookingId || !newDate || !newStartTime || !Number.isFinite(Number(newDuration))) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'bookingId, newDate, newStartTime, and newDuration are required',
    );
  }
  const duration = Number(newDuration);
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Duration must be a positive number of hours',
    );
  }
  if (duration > 3) {
    throw new functions.https.HttpsError('invalid-argument', 'Maximum booking duration is 3 hours');
  }
  const ref = db.collection('bookings').doc(bookingId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new functions.https.HttpsError('not-found', 'Booking not found');
  }
  const current = snap.data();
  const targetRoomId = roomId || current.roomId;
  if (data?.allowPast !== true) {
    ensureNotInPast(newDate, newStartTime);
  }
  const { endTime } = computeEndTime(newDate, newStartTime, duration);
  ensureWithinBusinessHours(newDate, newStartTime, endTime);
  const businessDate = determineBusinessDate(newDate, newStartTime);
  await db.runTransaction(async (transaction) => {
    await ensureRoomAvailability(
      targetRoomId,
      newDate,
      newStartTime,
      endTime,
      bookingId,
      transaction,
      { overrideWalkInHold: true },
    );
    const updatePayload = {
      roomId: targetRoomId,
      date: newDate,
      businessDate,
      startTime: newStartTime,
      endTime,
      duration,
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (Number.isFinite(Number(partySize))) updatePayload.partySize = Number(partySize);
    if (customerInfo) updatePayload.customerInfo = { ...current.customerInfo, ...customerInfo };
    if (Number.isFinite(Number(totalCost))) updatePayload.totalCost = Number(totalCost);
    if (Number.isFinite(Number(depositAmount))) updatePayload.depositAmount = Number(depositAmount);
    if (Number.isFinite(Number(remainingBalance)))
      updatePayload.remainingBalance = Number(remainingBalance);
    if (Number.isFinite(Number(extraGuestFee))) updatePayload.extraGuestFee = Number(extraGuestFee);
    if (Number.isFinite(Number(bookingFee))) updatePayload.bookingFee = Number(bookingFee);
    if (Number.isFinite(Number(requiredPurchaseAmount)))
      updatePayload.requiredPurchaseAmount = Number(requiredPurchaseAmount);
    transaction.update(ref, updatePayload);
  });
  const updated = await ref.get();
  return { message: 'Booking updated', booking: sanitizeBookingSnapshot(updated) };
});

exports.adminRefundBySecret = functions.https.onCall(async (data, context) => {
  requireAdmin(context);
  const { bookingId } = data || {};
  if (!bookingId) {
    throw new functions.https.HttpsError('invalid-argument', 'bookingId is required');
  }
  const ref = db.collection('bookings').doc(bookingId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new functions.https.HttpsError('not-found', 'Booking not found');
  }
  const booking = snap.data();
  const intentId = booking.paymentIntentId;
  if (!intentId) {
    throw new functions.https.HttpsError('failed-precondition', 'No payment intent to refund');
  }
  let intent;
  try {
    intent = await stripe.paymentIntents.retrieve(intentId);
  } catch (err) {
    console.error('[adminRefund] Retrieve PaymentIntent failed', err);
    throw new functions.https.HttpsError('internal', 'Unable to retrieve payment');
  }

  try {
    if (intent.status === 'requires_capture') {
      await stripe.paymentIntents.cancel(intentId);
    } else if (intent.status === 'canceled') {
      // already canceled, nothing to do
    } else {
      await stripe.refunds.create({ payment_intent: intentId });
    }
  } catch (err) {
    console.error('[adminRefund] Refund failed', err);
    throw new functions.https.HttpsError('internal', 'Refund failed');
  }

  await ref.update({
    paymentStatus: 'refunded',
    updatedAt: FieldValue.serverTimestamp(),
  });

  await sendTelegramMessage(
    [
      '💸 Payment Refunded',
      `Booking: ${bookingId}`,
      `Date: ${booking.date} ${booking.startTime}`,
      `Room: ${booking.roomId}`,
      `Name: ${booking.customerInfo?.firstName || ''} ${booking.customerInfo?.lastName || ''}`,
      `Amount: $${booking.depositAmount ?? booking.totalCost ?? 'n/a'}`,
    ].join('\n'),
  );

  const updated = await ref.get();
  return {
    message: 'Payment refunded',
    booking: sanitizeBookingSnapshot(updated),
  };
});

/**
 * Callable: adminUpsertBySecret
 *
 * Create or update a booking without the standard customer-facing restrictions.
 * Admin callers (custom claim isAdmin=true) can override duration, pricing, etc.
 * Pass a bookingId to update; omit it to create.
 */
exports.adminUpsertBySecret = functions.https.onCall(async (data, context) => {
  requireAdmin(context);
  const {
    bookingId,
    roomId,
    date,
    startTime,
    duration,
    partySize,
    customerInfo,
    totalCost,
    depositAmount,
    bookingFee,
    extraGuestFee,
    requiredPurchaseAmount,
    status,
    paymentStatus,
  } = data || {};

  // Normalize commonly provided values
  const durNum = Number(duration);
  const normalizedCustomerInfo = customerInfo
    ? {
        ...customerInfo,
        firstName: customerInfo?.firstName ? String(customerInfo.firstName).trim() : '',
        lastName: customerInfo?.lastName ? String(customerInfo.lastName).trim() : '',
        email: normalizeEmail(customerInfo?.email),
        phone: customerInfo?.phone ? String(customerInfo.phone).trim() : '',
      }
    : undefined;

  // Helper to compute end time if we have the needed inputs
  function maybeComputeEnd(dateStr, start, dur) {
    if (!dateStr || !start || !Number.isFinite(Number(dur))) return null;
    const { endTime } = computeEndTime(dateStr, start, Number(dur));
    return endTime;
  }

  if (bookingId) {
    // Update existing booking (override)
    const ref = db.collection('bookings').doc(String(bookingId).trim());
    const snap = await ref.get();
    if (!snap.exists) {
      throw new functions.https.HttpsError('not-found', 'Booking not found');
    }

    const current = snap.data() || {};
    const updatePayload = { updatedAt: FieldValue.serverTimestamp() };

    if (roomId) updatePayload.roomId = String(roomId);
    if (date) updatePayload.date = String(date);
    if (startTime) updatePayload.startTime = String(startTime);
    if (Number.isFinite(durNum)) updatePayload.duration = durNum;
    if (Number.isFinite(Number(partySize))) updatePayload.partySize = Number(partySize);
    if (normalizedCustomerInfo)
      updatePayload.customerInfo = { ...current.customerInfo, ...normalizedCustomerInfo };
    if (Number.isFinite(Number(totalCost))) updatePayload.totalCost = Number(totalCost);
    if (Number.isFinite(Number(depositAmount))) updatePayload.depositAmount = Number(depositAmount);
    if (Number.isFinite(Number(bookingFee))) updatePayload.bookingFee = Number(bookingFee);
    if (Number.isFinite(Number(extraGuestFee))) updatePayload.extraGuestFee = Number(extraGuestFee);
    if (Number.isFinite(Number(requiredPurchaseAmount)))
      updatePayload.requiredPurchaseAmount = Number(requiredPurchaseAmount);
    if (typeof status === 'string') updatePayload.status = status;
    if (typeof paymentStatus === 'string') updatePayload.paymentStatus = paymentStatus;

    const dateChanged = Object.prototype.hasOwnProperty.call(updatePayload, 'date');
    const startChanged = Object.prototype.hasOwnProperty.call(updatePayload, 'startTime');
    const durationChanged = Object.prototype.hasOwnProperty.call(updatePayload, 'duration');

    if (dateChanged || startChanged || durationChanged) {
      const nextDate = updatePayload.date || current.date;
      const nextStart = updatePayload.startTime || current.startTime;
      const nextDurationValue = durationChanged ? updatePayload.duration : current.duration;
      const nextDuration = Number(nextDurationValue);
      if (!Number.isFinite(nextDuration)) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'Duration must be a valid number of hours',
        );
      }

      ensureNotInPast(nextDate, nextStart);
      const end = maybeComputeEnd(nextDate, nextStart, nextDuration);
      if (end) {
        ensureWithinBusinessHours(nextDate, nextStart, end);
        updatePayload.endTime = end;
      }
      updatePayload.businessDate = determineBusinessDate(nextDate, nextStart);
    }

    await ref.update(updatePayload);
    const updated = await ref.get();
    return { message: 'Booking upserted', booking: sanitizeBookingSnapshot(updated) };
  }

  // Create new booking (override)
  if (!roomId || !date || !startTime || !Number.isFinite(durNum) || !customerInfo) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'roomId, date, startTime, duration, and customerInfo are required to create a booking',
    );
  }

  ensureNotInPast(date, startTime);
  const endTime = maybeComputeEnd(date, startTime, durNum);
  if (endTime) {
    ensureWithinBusinessHours(date, startTime, endTime);
  }
  const businessDate = determineBusinessDate(date, startTime);
  const newDoc = {
    roomId: String(roomId),
    date: String(date),
    businessDate,
    startTime: String(startTime),
    endTime: endTime,
    duration: durNum,
    partySize: Number.isFinite(Number(partySize)) ? Number(partySize) : null,
    customerInfo: normalizedCustomerInfo,
    totalCost: Number.isFinite(Number(totalCost)) ? Number(totalCost) : null,
    depositAmount: Number.isFinite(Number(depositAmount)) ? Number(depositAmount) : null,
    bookingFee: Number.isFinite(Number(bookingFee)) ? Number(bookingFee) : null,
    extraGuestFee: Number.isFinite(Number(extraGuestFee)) ? Number(extraGuestFee) : null,
    requiredPurchaseAmount: Number.isFinite(Number(requiredPurchaseAmount))
      ? Number(requiredPurchaseAmount)
      : null,
    status: typeof status === 'string' ? status : 'confirmed',
    paymentStatus: typeof paymentStatus === 'string' ? paymentStatus : null,
    paymentIntentId: null,
    calendarEventId: null,
    textSent: { booking: false, cancellation: false, rebooking: false },
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  const ref = db.collection('bookings').doc();
  await ref.set(newDoc);
  await sendBookingConfirmationSms({ id: ref.id, ...newDoc });
  await sendTelegramMessage(
    [
      '📅 New Booking (manual)',
      `Date: ${newDoc.date} ${newDoc.startTime}`,
      `Room: ${newDoc.roomId}`,
      `Name: ${newDoc.customerInfo?.firstName || ''} ${newDoc.customerInfo?.lastName || ''}`,
      `Phone: ${newDoc.customerInfo?.phone || 'n/a'}`,
      `Party Size: ${newDoc.partySize ?? 'n/a'}`,
      `Deposit: $${newDoc.depositAmount ?? 0}`,
    ].join('\n'),
  );
  const created = await ref.get();
  return { message: 'Booking created', booking: sanitizeBookingSnapshot(created) };
});

exports.adminGetBookingsByDate = functions.https.onCall(async (data, context) => {
  const { date } = data || {};
  if (!date) {
    throw new functions.https.HttpsError('invalid-argument', 'date is required (YYYY-MM-DD)');
  }
  const snapshot = await db.collection('bookings').where('date', '==', date).get();
  const bookings = snapshot.docs
    .map((doc) => sanitizeBookingSnapshot(doc))
    .filter(Boolean)
    .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
  return { bookings };
});

exports.adminGetAvailabilityByDate = functions.https.onCall(async (data, context) => {
  const { date, times, duration } = data || {};
  const dur = Number(duration) || 1;
  if (!date) {
    throw new functions.https.HttpsError('invalid-argument', 'date is required (YYYY-MM-DD)');
  }
  const schedule = getBusinessScheduleForDate(date);
  if (!schedule) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid date provided.');
  }
  const prevDate = getPreviousDate(date);
  const prevSchedule = prevDate ? getBusinessScheduleForDate(prevDate) : null;
  const slotDurationMinutes = Math.max(
    MIN_BOOKING_DURATION_MINUTES,
    Math.round(dur * 60) || MIN_BOOKING_DURATION_MINUTES,
  );
  const timeList =
    Array.isArray(times) && times.length
      ? times.map(String)
      : buildTimeSlotsForDate(date, slotDurationMinutes);

  const businessDatesToFetch = new Set([date]);
  if (prevDate) {
    businessDatesToFetch.add(prevDate);
  }
  const byRoomByBusinessDate = {};
  await Promise.all(
    Array.from(businessDatesToFetch).map(async (bizDate) => {
      const docs = await fetchActiveBookingsForBusinessDate(bizDate);
      docs.forEach((doc) => {
        const booking = doc.data();
        if (!byRoomByBusinessDate[bizDate]) {
          byRoomByBusinessDate[bizDate] = {};
        }
        const roomId = booking.roomId;
        if (!byRoomByBusinessDate[bizDate][roomId]) {
          byRoomByBusinessDate[bizDate][roomId] = [];
        }
        const endValue =
          booking.endTime ||
          computeEndTime(booking.date, booking.startTime, booking.duration || 1).endTime;
        byRoomByBusinessDate[bizDate][roomId].push({
          startTime: booking.startTime,
          endTime: endValue,
        });
      });
    }),
  );

  const availability = {};
  timeList.forEach((t) => {
    const endD = new Date(`${date}T${t}`);
    addDurationMinutes(endD, dur);
    const tEnd = endD.toTimeString().slice(0, 5);
    const timeMinutes = timeStringToMinutes(t);
    const usePrev = Number.isFinite(timeMinutes) && timeMinutes < schedule.openMinutes;
    const bizDateForSlot = usePrev ? prevDate : date;
    const segmentSchedule = usePrev ? prevSchedule : schedule;
    const roomMap = bizDateForSlot ? byRoomByBusinessDate[bizDateForSlot] || {} : {};
    availability[t] = {};
    Object.entries(ROOM_CONFIG).forEach(([roomId, cfg]) => {
      const bookings = roomMap[roomId] || [];
      let overlapping = 0;
      bookings.forEach((b) => {
        if (hasTimeConflict(t, tEnd, b.startTime, b.endTime)) overlapping += 1;
      });
      const reserved = bizDateForSlot
        ? reservedSlotsForWindow(roomId, bizDateForSlot, t, tEnd, segmentSchedule)
        : 0;
      const remain = Math.max((cfg.inventory || 0) - overlapping - reserved, 0);
      availability[t][roomId] = remain;
    });
  });
  return { times: timeList, availability };
});

exports.cancelBookingGuest = functions.https.onCall(async (data) => {
  const bookingId = typeof data?.bookingId === 'string' ? data.bookingId.trim() : '';
  const email = data?.email;

  if (!bookingId || !email) {
    throw new functions.https.HttpsError('invalid-argument', 'bookingId and email are required.');
  }

  const bookingRef = db.collection('bookings').doc(bookingId);
  const bookingSnap = await bookingRef.get();
  if (!bookingSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Booking not found.');
  }

  const booking = bookingSnap.data();
  assertGuestOwnership(booking, email);

  if (!ACTIVE_BOOKING_STATUSES.includes(booking.status)) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'Only active bookings can be cancelled.',
    );
  }

  const startDate = combineDateTime(booking.date, booking.startTime);
  if (startDate.getTime() - Date.now() < CANCEL_WINDOW_HOURS * HOURS_TO_MS) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      `Cancellations require at least ${CANCEL_WINDOW_HOURS} hours notice. Please contact the venue directly.`,
    );
  }

  await cancelBookingInternal(bookingId);
  const updatedSnapshot = await bookingRef.get();

  return {
    message: 'Booking cancelled',
    booking: sanitizeBookingSnapshot(updatedSnapshot),
  };
});

exports.rebookBookingGuest = functions.https.onCall(async (data) => {
  const bookingId = typeof data?.bookingId === 'string' ? data.bookingId.trim() : '';
  const email = data?.email;
  const newDate = typeof data?.newDate === 'string' ? data.newDate.trim() : '';
  const newStartTime = typeof data?.newStartTime === 'string' ? data.newStartTime.trim() : '';
  const duration = Number(data?.newDuration);
  const requestedRoomId = typeof data?.roomId === 'string' ? data.roomId.trim() : '';
  const requestedPartySize = Number(data?.partySize);
  const customerInfo = data?.customerInfo || null;
  const totalCost = Number(data?.totalCost);
  const depositAmountOverride = Number(data?.depositAmount);
  const remainingBalance = Number(data?.remainingBalance);
  const extraGuestFee = Number(data?.extraGuestFee);
  const bookingFee = Number(data?.bookingFee);
  const requiredPurchaseAmount = Number(data?.requiredPurchaseAmount);

  if (
    !bookingId ||
    !email ||
    !newDate ||
    !newStartTime ||
    !Number.isFinite(duration) ||
    duration <= 0
  ) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'bookingId, email, newDate, newStartTime, and newDuration are required.',
    );
  }

  if (duration > 3) {
    throw new functions.https.HttpsError('invalid-argument', 'Maximum booking duration is 3 hours');
  }

  const bookingRef = db.collection('bookings').doc(bookingId);
  const bookingSnap = await bookingRef.get();
  if (!bookingSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Booking not found.');
  }

  const booking = bookingSnap.data();
  assertGuestOwnership(booking, email);

  if (!ACTIVE_BOOKING_STATUSES.includes(booking.status)) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'Only active bookings can be rebooked.',
    );
  }

  const originalStart = combineDateTime(booking.date, booking.startTime);
  if (originalStart.getTime() - Date.now() < CANCEL_WINDOW_HOURS * HOURS_TO_MS) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      `Rebooking requires at least ${CANCEL_WINDOW_HOURS} hours notice. Please contact the venue directly.`,
    );
  }

  const newStart = combineDateTime(newDate, newStartTime);
  ensureNotInPast(newDate, newStartTime);

  const { endTime } = computeEndTime(newDate, newStartTime, duration);
  ensureWithinBusinessHours(newDate, newStartTime, endTime);
  const businessDate = determineBusinessDate(newDate, newStartTime);
  const targetRoomId = requestedRoomId || booking.roomId;

  const normalizedCustomerInfo = customerInfo
    ? {
        ...booking.customerInfo,
        ...customerInfo,
        firstName: customerInfo?.firstName
          ? customerInfo.firstName.trim()
          : booking.customerInfo?.firstName || '',
        lastName: customerInfo?.lastName
          ? customerInfo.lastName.trim()
          : booking.customerInfo?.lastName || '',
        email: normalizeEmail(customerInfo?.email) || normalizeEmail(booking.customerInfo?.email),
        phone: customerInfo?.phone ? customerInfo.phone.trim() : booking.customerInfo?.phone || '',
      }
    : booking.customerInfo;

  await db.runTransaction(async (transaction) => {
    const current = await transaction.get(bookingRef);
    if (!current.exists) {
      throw new functions.https.HttpsError('not-found', 'Booking not found.');
    }

    const currentData = current.data();
    assertGuestOwnership(currentData, email);

    if (!ACTIVE_BOOKING_STATUSES.includes(currentData.status)) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Only active bookings can be rebooked.',
      );
    }

    await ensureRoomAvailability(
      targetRoomId,
      newDate,
      newStartTime,
      endTime,
      bookingId,
      transaction,
    );

    const updatePayload = {
      roomId: targetRoomId,
      date: newDate,
      businessDate,
      startTime: newStartTime,
      endTime,
      duration,
      partySize: Number.isFinite(requestedPartySize)
        ? requestedPartySize
        : (currentData.partySize ?? null),
      customerInfo: normalizedCustomerInfo,
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (Number.isFinite(totalCost)) {
      updatePayload.totalCost = totalCost;
    }

    if (Number.isFinite(depositAmountOverride)) {
      updatePayload.depositAmount = depositAmountOverride;
    }

    if (Number.isFinite(remainingBalance)) {
      updatePayload.remainingBalance = remainingBalance;
    }

    if (Number.isFinite(extraGuestFee)) {
      updatePayload.extraGuestFee = extraGuestFee;
    }

    if (Number.isFinite(bookingFee)) {
      updatePayload.bookingFee = bookingFee;
    }

    if (Number.isFinite(requiredPurchaseAmount)) {
      updatePayload.requiredPurchaseAmount = requiredPurchaseAmount;
    }

    transaction.update(bookingRef, updatePayload);
  });

  const updatedSnapshot = await bookingRef.get();
  await addBookingToCalendar({ id: bookingId, ...updatedSnapshot.data() });

  return {
    message: 'Booking updated',
    booking: sanitizeBookingSnapshot(updatedSnapshot),
  };
});

/**
 * Callable Cloud Function: cancelBooking
 *
 * Only callers with the admin custom claim can cancel bookings. Cancels
 * the specified booking, issues a refund, and updates Firestore.
 */
exports.cancelBooking = functions.https.onCall(async (data, context) => {
  requireAdmin(context);
  const { bookingId } = data;
  if (!bookingId) {
    throw new functions.https.HttpsError('invalid-argument', 'bookingId is required');
  }
  await cancelBookingInternal(bookingId);
  return { message: 'Booking cancelled' };
});

/**
 * Callable Cloud Function: rebookBooking
 *
 * Only callers with the admin custom claim can rebook. This function
 * cancels the existing booking and creates a new one for the requested
 * date and time. It returns the ID of the new booking.
 */
exports.rebookBooking = functions.https.onCall(async (data, context) => {
  requireAdmin(context);
  const { bookingId, newDate, newStartTime, newDuration, newTotalCost, newDepositAmount } = data;
  if (!bookingId || !newDate || !newStartTime || !newDuration) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required rebooking fields');
  }
  // Fetch the old booking to retrieve customer and room info
  const oldRef = db.collection('bookings').doc(bookingId);
  const oldDoc = await oldRef.get();
  if (!oldDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Original booking not found');
  }
  const oldBooking = oldDoc.data();

  // Cancel the existing booking (this issues a refund and updates its status)
  await cancelBookingInternal(bookingId);

  // Create the new booking using the existing room and customer info. Allow
  // overriding totalCost and depositAmount if provided, otherwise reuse the
  // old values. The end time is computed internally.
  const result = await createBookingInternal({
    roomId: oldBooking.roomId,
    date: newDate,
    startTime: newStartTime,
    duration: newDuration,
    totalCost: newTotalCost || oldBooking.totalCost,
    depositAmount: newDepositAmount || oldBooking.depositAmount,
    customerInfo: oldBooking.customerInfo,
  });
  return {
    message: 'Booking rebooked',
    newBookingId: result.id,
  };
});

exports.confirmBooking = functions.https.onCall(async (data, context) => {
  const { bookingId, paymentIntentId } = data || {};
  if (!bookingId || !paymentIntentId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Missing bookingId or paymentIntentId',
    );
  }

  const ref = db.collection('bookings').doc(bookingId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new functions.https.HttpsError('not-found', 'Booking not found');
  }

  // Verify the PaymentIntent is actually paid (or capturable/processing)
  const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
  const okStatuses = ['succeeded', 'requires_capture', 'processing'];
  if (!okStatuses.includes(intent.status)) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      `Payment not completed. Status: ${intent.status}`,
    );
  }

  await ref.update({
    status: 'confirmed',
    paymentStatus: intent.status,
    paymentIntentId: intent.id,
    updatedAt: FieldValue.serverTimestamp(),
  });

  if (intent.status === 'succeeded') {
    const fresh = await ref.get();
    await sendBookingEmail({ id: ref.id, ...fresh.data() });
  }

  return { ok: true };
});

exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }
  if (!stripeWebhookSecret) {
    console.error('[stripeWebhook] Missing webhook secret');
    return res.status(500).send('Webhook not configured');
  }

  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, stripeWebhookSecret);
  } catch (err) {
    console.error('[stripeWebhook] Signature verification failed', err.message || err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const intent = event.data?.object;
  if (!intent || !intent.id) {
    return res.json({ received: true });
  }

  async function updateBookingPayment(status) {
    const ref = await findBookingRefByPaymentIntentId(intent.id);
    if (!ref) return;
    const updatePayload = {
      paymentStatus: status,
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (status === 'succeeded' || status === 'processing' || status === 'requires_capture') {
      updatePayload.status = 'confirmed';
    }
    await ref.update(updatePayload);
    if (status === 'succeeded') {
      const fresh = await ref.get();
      await sendBookingEmail({ id: ref.id, ...fresh.data() });
    }
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
      case 'payment_intent.processing':
      case 'payment_intent.requires_capture':
        await updateBookingPayment(intent.status);
        break;
      case 'payment_intent.payment_failed':
      case 'charge.refunded':
        await updateBookingPayment(intent.status || 'payment_failed');
        break;
      default:
        break;
    }
  } catch (err) {
    console.error('[stripeWebhook] Handler failed', event.type, intent.id, err);
    return res.status(500).send('Webhook handler error');
  }

  return res.json({ received: true });
});

exports.sendWeekendReminderTexts = functions.pubsub
  .schedule('every thursday 10:00')
  .timeZone(BUSINESS_TIMEZONE)
  .onRun(async () => {
    const { fridayDate, saturdayDate } = getUpcomingFridaySaturdayDates(new Date());
    const targets = [fridayDate, saturdayDate].filter(Boolean);
    if (!targets.length) {
      console.warn('[reminder] No target dates for weekend reminders.');
      return null;
    }

    const snap = await db
      .collection('bookings')
      .where('date', 'in', targets)
      .where('status', 'in', ACTIVE_BOOKING_STATUSES)
      .get();

    if (snap.empty) {
      console.log('[reminder] No bookings found for upcoming weekend.');
      return null;
    }

    let notified = 0;
    await Promise.all(
      snap.docs.map(async (doc) => {
        try {
          await sendFridaySaturdayReminderSms({ id: doc.id, ...doc.data() });
          notified += 1;
        } catch (err) {
          console.error('[reminder] Failed to send reminder for booking', doc.id, err);
        }
      }),
    );

    console.log(
      `[reminder] Sent reminders for ${notified} bookings on ${fridayDate} and ${saturdayDate}.`,
    );
    return null;
  });

/**
 * Callable: adminCaptureBySecret
 *
 * Captures an authorized PaymentIntent for a booking.
 * Only callers with the admin custom claim can invoke this function.
 */
exports.adminCaptureBySecret = functions.https.onCall(async (data, context) => {
  requireAdmin(context);
  const { bookingId } = data || {};
  if (!bookingId) {
    throw new functions.https.HttpsError('invalid-argument', 'bookingId is required');
  }

  const ref = db.collection('bookings').doc(bookingId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new functions.https.HttpsError('not-found', 'Booking not found');
  }
  const booking = snap.data();
  const intentId = booking.paymentIntentId;
  if (!intentId) {
    throw new functions.https.HttpsError('failed-precondition', 'No payment intent to capture');
  }

  let intent;
  try {
    intent = await stripe.paymentIntents.retrieve(intentId);
  } catch (err) {
    console.error('Retrieve PaymentIntent failed', err);
    throw new functions.https.HttpsError('internal', 'Unable to retrieve payment');
  }

  if (intent.status !== 'requires_capture') {
    throw new functions.https.HttpsError(
      'failed-precondition',
      `PaymentIntent not capturable (status: ${intent.status})`,
    );
  }

  try {
    const captured = await stripe.paymentIntents.capture(intentId);
    await ref.update({
      paymentStatus: captured.status,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { ok: true, status: captured.status };
  } catch (err) {
    console.error('Capture PaymentIntent failed', err);
    throw new functions.https.HttpsError('internal', 'Capture failed');
  }
});

/**
 * HTTPS Function: getGoogleReviews
 *
 * Finds the Place ID for Bar Zunko & Karaoke (675 Yonge St, Toronto),
 * fetches Google reviews, and returns the three latest best reviews.
 *
 * Configure API key via one of:
 *  - Environment variable: GOOGLE_MAPS_API_KEY
 *  - Functions config: firebase functions:config:set google.api_key=YOUR_KEY
 */
exports.getGoogleReviews = functions.https.onRequest(async (req, res) => {
  try {
    res.set('Cache-Control', 'public, max-age=600, s-maxage=600');
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    const API_KEY =
      process.env.GOOGLE_MAPS_API_KEY ||
      (functions.config().google && functions.config().google.api_key);
    if (!API_KEY) {
      res.status(503).json({ error: 'Google API key not configured' });
      return;
    }

    const placeQuery = 'BAR ZUNKO & KARAOKE, 675 Yonge St, Toronto, ON M4Y 2B2';
    const findUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(
      placeQuery,
    )}&inputtype=textquery&fields=place_id&key=${API_KEY}`;

    const findResp = await fetch(findUrl);
    const findData = await findResp.json();
    const placeId = findData?.candidates?.[0]?.place_id;
    if (!placeId) {
      res.status(404).json({ error: 'Place not found' });
      return;
    }

    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,user_ratings_total,rating,reviews,url&reviews_no_translations=true&reviews_sort=newest&key=${API_KEY}`;
    const detailsResp = await fetch(detailsUrl);
    const details = await detailsResp.json();
    const reviews = Array.isArray(details?.result?.reviews) ? details.result.reviews : [];

    // Prioritize 5-star reviews by recency, fall back to 4-star if needed.
    const fiveStar = reviews
      .filter((r) => Number(r?.rating) === 5)
      .sort((a, b) => (b?.time || 0) - (a?.time || 0));
    let selected = fiveStar.slice(0, 3);
    if (selected.length < 3) {
      const fourStar = reviews
        .filter((r) => Number(r?.rating) === 4)
        .sort((a, b) => (b?.time || 0) - (a?.time || 0));
      selected = [...selected, ...fourStar].slice(0, 3);
    }

    // Shape response for the UI
    const shaped = selected.map((r) => ({
      author: r?.author_name || 'Google User',
      rating: Number(r?.rating) || 0,
      text: r?.text || '',
      time: r?.time ? new Date(r.time * 1000).toISOString() : null,
      relativeTime: r?.relative_time_description || null,
      profilePhotoUrl: r?.profile_photo_url || null,
    }));

    res.json({
      placeId,
      name: details?.result?.name || 'BAR ZUNKO & KARAOKE',
      totalRatings: details?.result?.user_ratings_total || 0,
      rating: details?.result?.rating || null,
      url: details?.result?.url || null,
      reviews: shaped,
    });
  } catch (err) {
    console.error('getGoogleReviews error', err);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});
