const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { FieldValue } = require('firebase-admin/firestore');
const Stripe = require('stripe');
const twilio = require('twilio');

const MINUTES_IN_DAY = 24 * 60;
const BUSINESS_OPEN_TIME = '18:00';
const BUSINESS_CLOSE_TIME = '02:00';
const twilioAccountSid = (functions.config().twilio && functions.config().twilio.account_sid) || process.env.TWILIO_ACCOUNT_SID || null;
const twilioAuthToken = (functions.config().twilio && functions.config().twilio.auth_token) || process.env.TWILIO_AUTH_TOKEN || null;
const twilioFromNumber = (functions.config().twilio && functions.config().twilio.from) || process.env.TWILIO_FROM || null;
const twilioNotifyNumber = (functions.config().twilio && functions.config().twilio.notify_to) || process.env.TWILIO_NOTIFY_TO || null;
const hasTwilioCredentials = twilioAccountSid && twilioAuthToken && twilioFromNumber;
const twilioClient = hasTwilioCredentials ? twilio(twilioAccountSid, twilioAuthToken) : null;

// Initialize the Firebase Admin SDK to access Firestore
admin.initializeApp();
const db = admin.firestore();

const DEFAULT_TIMES = [
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00', '23:30', '00:00', '00:30', '01:00', '01:30', '02:00',
];

function timeStringToMinutes(time) {
  if (typeof time !== 'string') return NaN;
  const [h, m] = time.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return NaN;
  return h * 60 + m;
}

const BUSINESS_OPEN_MINUTES = timeStringToMinutes(BUSINESS_OPEN_TIME);

function toBusinessRelativeMinutes(time) {
  let minutes = timeStringToMinutes(time);
  if (!Number.isFinite(minutes)) return NaN;
  if (minutes < BUSINESS_OPEN_MINUTES) {
    minutes += MINUTES_IN_DAY;
  }
  return minutes;
}

const BUSINESS_CLOSE_MINUTES = toBusinessRelativeMinutes(BUSINESS_CLOSE_TIME);

function ensureWithinBusinessHours(startTime, endTime) {
  const start = toBusinessRelativeMinutes(startTime);
  const end = toBusinessRelativeMinutes(endTime);
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid time value provided.');
  }
  if (start < BUSINESS_OPEN_MINUTES || end > BUSINESS_CLOSE_MINUTES) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'Booking must be scheduled between 6:00 PM and 2:00 AM.',
    );
  }
}

function ensureNotInPast(date, startTime) {
  const startDate = combineDateTime(date, startTime);
  if (Number.isNaN(startDate.getTime())) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid date or time provided.');
  }
  if (startDate.getTime() < Date.now()) {
    throw new functions.https.HttpsError('failed-precondition', 'Cannot schedule bookings in the past.');
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

function computeEndTime(date, startTime, duration) {
  const endDate = combineDateTime(date, startTime);
  endDate.setHours(endDate.getHours() + duration);
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
    startTime: booking.startTime,
    endTime: booking.endTime,
    duration: booking.duration,
    status: booking.status,
    totalCost: booking.totalCost ?? null,
    depositAmount: booking.depositAmount ?? null,
    remainingBalance: booking.remainingBalance ?? null,
    bookingFee: booking.bookingFee ?? null,
    extraGuestFee: booking.extraGuestFee ?? null,
    requiredPurchaseAmount: booking.requiredPurchaseAmount ?? null,
    partySize: booking.partySize ?? null,
    customer: {
      firstName: booking.customerInfo?.firstName || '',
      lastName: booking.customerInfo?.lastName || '',
      email: booking.customerInfo?.email || '',
      phone: booking.customerInfo?.phone || '',
    },
    canCancel,
    canRebook,
    cancelableUntil: cancelDeadline.toISOString(),
    startDateTime: startDate.toISOString(),
    createdAt: booking.createdAt?.toDate ? booking.createdAt.toDate().toISOString() : null,
    updatedAt: booking.updatedAt?.toDate ? booking.updatedAt.toDate().toISOString() : null,
  };
}

async function ensureRoomAvailability(
  roomId,
  date,
  startTime,
  endTime,
  excludeBookingId,
  transaction,
) {
  const { inventory, label } = getRoomConfig(roomId);
  const query = db
    .collection('bookings')
    .where('roomId', '==', roomId)
    .where('date', '==', date)
    .where('status', 'in', ACTIVE_BOOKING_STATUSES);

  const snapshot = transaction ? await transaction.get(query) : await query.get();

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

  const reserved = reservedSlotsForWindow(roomId, date, startTime, endTime);
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
//   firebase functions:config:set stripe.secret_key="sk_test_yourSecretHere"
const stripeSecretKey =
  functions.config().stripe && functions.config().stripe.secret_key
    ? functions.config().stripe.secret_key
    : 'sk_test_51SE19lPArasY2JyAooAOIxctJ6eFQld3Y7rdrhAlB8BxeCitTYhK2902cqrOtUzkx67dVgrpjVari9nEBlkxwrIL00Kz81sHmD';
const stripe = Stripe(stripeSecretKey);

function requireAdmin(context) {
  if (!context || !context.auth || context.auth.token?.isAdmin !== true) {
    throw new functions.https.HttpsError('permission-denied', 'Admin privileges required');
  }
}

// Helper: check time conflict between two bookings. Times are strings in
// 24-hour format (HH:mm). Returns true if they overlap.
function hasTimeConflict(startA, endA, startB, endB) {
  const startAMin = toBusinessRelativeMinutes(startA);
  const endAMin = toBusinessRelativeMinutes(endA);
  const startBMin = toBusinessRelativeMinutes(startB);
  const endBMin = toBusinessRelativeMinutes(endB);

  if (!Number.isFinite(startAMin) || !Number.isFinite(endAMin) || !Number.isFinite(startBMin) || !Number.isFinite(endBMin)) {
    return true;
  }

  return startAMin < endBMin && endAMin > startBMin;
}

// Reserve policy: keep 1 small and 1 medium room for Fri/Sat 21:00-23:00 (walk-ins)
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

function reservedSlotsForWindow(roomId, date, startTime, endTime) {
  if (!roomId || !date) return 0;
  const isTargetRoom = roomId === 'small' || roomId === 'medium';
  if (!isTargetRoom) return 0;
  if (!isFridayOrSaturday(date)) return 0;
  // Walk-in hold window: 21:00 - 23:00
  const holdStart = '21:00';
  const holdEnd = '23:00';
  return hasTimeConflict(startTime, endTime, holdStart, holdEnd) ? 1 : 0;
}

// Email sending stub. Integrate SendGrid or Mailgun here once credentials are
// provided. These stubs simply log the action so local development succeeds.
async function sendBookingEmail(booking) {
  console.log('sendBookingEmail stub:', booking.id);
  return;
}
async function sendCancellationEmail(booking) {
  console.log('sendCancellationEmail stub:', booking.id);
  return;
}

// Calendar integration stub. Integrate with the Google Calendar API once
// credentials are provided. For now we just log the event details.
async function addBookingToCalendar(booking) {
  console.log('addBookingToCalendar stub:', booking.id);
  return;
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

async function sendFridaySaturdayBookingSms(bookingDoc) {
  if (!bookingDoc || !isFridayOrSaturday(bookingDoc.date)) {
    return;
  }
  const customer = bookingDoc.customerInfo || {};
  const phone = (customer.phone || '').trim();
  if (phone) {
    const firstName = (customer.firstName || '').trim();
    const friendlyTime = `${bookingDoc.date} ${bookingDoc.startTime}`;
    const message = firstName
      ? `Hi ${firstName}! Your Barjunko booking is locked in for ${bookingDoc.date} at ${bookingDoc.startTime}. See you soon!`
      : `Your Barjunko booking is locked in for ${bookingDoc.date} at ${bookingDoc.startTime}. See you soon!`;
    await sendSms(phone, message);
  }
  if (twilioNotifyNumber) {
    const displayName = [customer.firstName, customer.lastName].filter(Boolean).join(' ') || customer.email || bookingDoc.id;
    const summary = `New booking ${bookingDoc.id || ''} (${displayName}) on ${bookingDoc.date} ${bookingDoc.startTime} in ${bookingDoc.roomId}`.trim();
    await sendSms(twilioNotifyNumber, summary);
  }
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
 * @param {number} params.totalCost The total cost of the booking.
 * @param {number} params.depositAmount The deposit (typically 50% of total).
 * @param {Object} params.customerInfo Customer details (firstName, lastName, email, phone, specialRequests).
 * @returns {Promise<Object>} The newly created booking record and PaymentIntent details.
 */
async function createBookingInternal(params) {
  const { roomId, date, startTime, duration, totalCost, depositAmount, customerInfo, partySize } =
    params;

  if (!roomId || !date || !startTime || !duration || !customerInfo) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required booking fields');
  }

  // Enforce maximum booking duration of 3 hours
  const dur = Number(duration);
  if (!Number.isFinite(dur) || dur <= 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Duration must be a positive number of hours');
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
  dateObj.setHours(dateObj.getHours() + dur);
  const endTime = dateObj.toTimeString().slice(0, 5);

  ensureWithinBusinessHours(startTime, endTime);
  ensureNotInPast(date, startTime);

  const bookingsQuery = db
    .collection('bookings')
    .where('roomId', '==', roomId)
    .where('date', '==', date)
    .where('status', 'in', ACTIVE_BOOKING_STATUSES);

  // Quick availability check before creating payment intent
  const existing = await bookingsQuery.get();
  let overlappingCount = 0;
  for (const doc of existing.docs) {
    const booking = doc.data();
    if (hasTimeConflict(startTime, endTime, booking.startTime, booking.endTime)) {
      overlappingCount += 1;
    }
  }

  // Apply reserved slot policy (Fri/Sat 21:00-23:00) for small/medium rooms
  const reserved = reservedSlotsForWindow(roomId, date, startTime, endTime);
  const effectiveInventory = Math.max(inventory - reserved, 0);
  if (overlappingCount >= effectiveInventory) {
    throw new functions.https.HttpsError('failed-precondition', noAvailabilityMessage);
  }

  // Create a PaymentIntent for the deposit
  let paymentIntent;
  try {
    paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(depositAmount * 100),
      currency: 'cad',
      capture_method: 'manual',
      payment_method_types: ['card'],
      metadata: { roomId, date, startTime, duration: dur },
    });
  } catch (err) {
    console.error('Stripe PaymentIntent creation failed', err);
    throw new functions.https.HttpsError('internal', 'Unable to create payment');
  }

  const bookingDoc = {
    roomId,
    date,
    startTime,
    endTime,
    duration: dur,
    totalCost,
    depositAmount,
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
      const txnSnapshot = await transaction.get(bookingsQuery);
      let txnOverlapping = 0;

      txnSnapshot.forEach((doc) => {
        const booking = doc.data();
        if (hasTimeConflict(startTime, endTime, booking.startTime, booking.endTime)) {
          txnOverlapping += 1;
        }
      });

      const txnReserved = reservedSlotsForWindow(roomId, date, startTime, endTime);
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

  // Call stubs for email and calendar integrations. These return silently.
  await sendBookingEmail({ id: newBookingRef.id, ...bookingDoc });
  await addBookingToCalendar({ id: newBookingRef.id, ...bookingDoc });
  await sendFridaySaturdayBookingSms({ id: newBookingRef.id, ...bookingDoc });

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
}

/**
 * Callable Cloud Function: createBooking
 *
 * Creates a booking with deposit and writes it to Firestore. Anyone can
 * invoke this function (authentication is optional) because all writes are
 * validated server-side.
 */
exports.createBooking = functions.https.onCall(async (data, context) => {
  const { roomId, date, startTime, duration, totalCost, depositAmount, customerInfo, partySize } =
    data || {};
  const result = await createBookingInternal({
    roomId,
    date,
    startTime,
    duration,
    totalCost,
    depositAmount,
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
  endDate.setHours(endDate.getHours() + duration);
  const endTime = endDate.toTimeString().slice(0, 5);

  ensureWithinBusinessHours(startTime, endTime);
  ensureNotInPast(date, startTime);

  const availabilityEntries = await Promise.all(
    roomIds.map(async (roomId) => {
      const { inventory } = getRoomConfig(roomId);
      const snapshot = await db
        .collection('bookings')
        .where('roomId', '==', roomId)
        .where('date', '==', date)
        .where('status', 'in', ACTIVE_BOOKING_STATUSES)
        .get();

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

      const reserved = reservedSlotsForWindow(roomId, date, startTime, endTime);
      const remaining = Math.max(inventory - overlapping - reserved, 0);
      return [roomId, remaining];
    }),
  );

  const availability = Object.fromEntries(availabilityEntries);

  return { availability };
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
    throw new functions.https.HttpsError('invalid-argument', 'Duration must be a positive number of hours');
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
  ensureNotInPast(newDate, newStartTime);
  const { endTime } = computeEndTime(newDate, newStartTime, duration);
  ensureWithinBusinessHours(newStartTime, endTime);
  await db.runTransaction(async (transaction) => {
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
    if (normalizedCustomerInfo) updatePayload.customerInfo = { ...current.customerInfo, ...normalizedCustomerInfo };
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
        throw new functions.https.HttpsError('invalid-argument', 'Duration must be a valid number of hours');
      }

      ensureNotInPast(nextDate, nextStart);
      const end = maybeComputeEnd(nextDate, nextStart, nextDuration);
      if (end) {
        ensureWithinBusinessHours(nextStart, end);
        updatePayload.endTime = end;
      }
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
    ensureWithinBusinessHours(startTime, endTime);
  }
  const newDoc = {
    roomId: String(roomId),
    date: String(date),
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
  if (isFridayOrSaturday(date)) {
    await sendFridaySaturdayBookingSms({ id: ref.id, ...newDoc });
  }
  const created = await ref.get();
  return { message: 'Booking created', booking: sanitizeBookingSnapshot(created) };
});

exports.adminGetBookingsByDate = functions.https.onCall(async (data, context) => {
  requireAdmin(context);
  const { date } = data || {};
  if (!date) {
    throw new functions.https.HttpsError('invalid-argument', 'date is required (YYYY-MM-DD)');
  }
  const snapshot = await db
    .collection('bookings')
    .where('date', '==', date)
    .get();
  const bookings = snapshot.docs
    .map((doc) => sanitizeBookingSnapshot(doc))
    .filter(Boolean)
    .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
  return { bookings };
});

exports.adminGetAvailabilityByDate = functions.https.onCall(async (data, context) => {
  requireAdmin(context);
  const { date, times, duration } = data || {};
  const dur = Number(duration) || 1;
  if (!date) {
    throw new functions.https.HttpsError('invalid-argument', 'date is required (YYYY-MM-DD)');
  }
  const timeList = Array.isArray(times) && times.length ? times.map(String) : DEFAULT_TIMES;
  // Fetch all bookings for date once
  const snap = await db
    .collection('bookings')
    .where('date', '==', date)
    .where('status', 'in', ACTIVE_BOOKING_STATUSES)
    .get();
  const byRoom = {};
  snap.forEach((doc) => {
    const b = doc.data();
    const r = b.roomId;
    if (!byRoom[r]) byRoom[r] = [];
    const start = b.startTime;
    const end = b.endTime || computeEndTime(date, b.startTime, b.duration || 1).endTime;
    byRoom[r].push({ startTime: start, endTime: end });
  });
  const availability = {};
  Object.keys(ROOM_CONFIG).forEach((roomId) => { if (!byRoom[roomId]) byRoom[roomId] = []; });
  timeList.forEach((t) => {
    const [h,m] = t.split(':').map(Number);
    const endD = new Date(`${date}T${t}`);
    endD.setHours(h + dur, m, 0, 0);
    const tEnd = endD.toTimeString().slice(0,5);
    availability[t] = {};
    Object.entries(ROOM_CONFIG).forEach(([roomId, cfg]) => {
      const bookings = byRoom[roomId] || [];
      let overlapping = 0;
      bookings.forEach((b) => { if (hasTimeConflict(t, tEnd, b.startTime, b.endTime)) overlapping += 1; });
      const reserved = reservedSlotsForWindow(roomId, date, t, tEnd);
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
  ensureWithinBusinessHours(newStartTime, endTime);
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

  return { ok: true };
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

    const API_KEY = process.env.GOOGLE_MAPS_API_KEY || (functions.config().google && functions.config().google.api_key);
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
    const fiveStar = reviews.filter((r) => Number(r?.rating) === 5).sort((a, b) => (b?.time || 0) - (a?.time || 0));
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
