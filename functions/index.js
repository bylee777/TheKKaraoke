const functions = require('firebase-functions');
const admin = require('firebase-admin');
const Stripe = require('stripe');

// Initialize the Firebase Admin SDK to access Firestore
admin.initializeApp();
const db = admin.firestore();

// Determine the Stripe secret key from runtime configuration. To set this
// configuration run:
//   firebase functions:config:set stripe.secret_key="sk_test_yourSecretHere"
const stripeSecretKey = functions.config().stripe && functions.config().stripe.secret_key
  ? functions.config().stripe.secret_key
  : 'sk_test_1234567890abcdef';
const stripe = Stripe(stripeSecretKey);

// Helper: check time conflict between two bookings. Times are strings in
// 24‑hour format (HH:mm). Returns true if they overlap.
function hasTimeConflict(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
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

/**
 * Internal helper to create a booking. Performs double‑booking checks,
 * creates a Stripe PaymentIntent for the deposit, writes the booking to
 * Firestore, and optionally calls stubbed integrations. This helper is
 * designed to be reused by the HTTP callable function as well as the
 * rebooking workflow.
 *
 * @param {Object} params Data describing the booking.
 * @param {string} params.roomId The ID of the room being booked.
 * @param {string} params.date The booking date (YYYY‑MM‑DD).
 * @param {string} params.startTime The start time (HH:mm) in 24‑hour format.
 * @param {number} params.duration The duration in hours.
 * @param {number} params.totalCost The total cost of the booking.
 * @param {number} params.depositAmount The deposit (typically 50% of total).
 * @param {Object} params.customerInfo Customer details (firstName, lastName, email, phone, specialRequests).
 * @returns {Promise<Object>} The newly created booking record and PaymentIntent details.
 */
async function createBookingInternal(params) {
  const {
    roomId,
    date,
    startTime,
    duration,
    totalCost,
    depositAmount,
    customerInfo,
  } = params;

  if (!roomId || !date || !startTime || !duration || !customerInfo) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required booking fields');
  }

  // Compute the end time based on start time and duration
  const dateObj = new Date(`${date}T${startTime}`);
  dateObj.setHours(dateObj.getHours() + duration);
  const endTime = dateObj.toTimeString().slice(0, 5);

  // Double‑booking check: ensure no confirmed or pending booking overlaps this slot
  const existing = await db.collection('bookings')
    .where('roomId', '==', roomId)
    .where('date', '==', date)
    .where('status', 'in', ['confirmed', 'pending'])
    .get();
  for (const doc of existing.docs) {
    const b = doc.data();
    if (hasTimeConflict(startTime, endTime, b.startTime, b.endTime)) {
      throw new functions.https.HttpsError('failed-precondition', 'Time slot already booked');
    }
  }

  // Create a PaymentIntent for the deposit
  let paymentIntent;
  try {
    paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(depositAmount * 100),
      currency: 'usd',
      metadata: {
        roomId,
        date,
        startTime,
        duration,
      },
    });
  } catch (err) {
    console.error('Stripe PaymentIntent creation failed', err);
    throw new functions.https.HttpsError('internal', 'Unable to create payment');
  }

  // Assemble the booking document
  const bookingDoc = {
    roomId,
    date,
    startTime,
    endTime,
    duration,
    totalCost,
    depositAmount,
    customerInfo,
    paymentIntentId: paymentIntent.id,
    paymentStatus: 'requires_payment_method',
    calendarEventId: null,
    textSent: {
      booking: false,
      cancellation: false,
      rebooking: false,
    },
    status: 'pending',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  // Persist booking to Firestore
  const ref = await db.collection('bookings').add(bookingDoc);

  // Call stubs for email and calendar integrations. These return silently.
  await sendBookingEmail({ id: ref.id, ...bookingDoc });
  await addBookingToCalendar({ id: ref.id, ...bookingDoc });

  return {
    id: ref.id,
    bookingDoc,
    paymentIntent,
  };
}

/**
 * Internal helper to cancel a booking. Updates the booking status and issues
 * a Stripe refund if necessary. Intended to be used by both the callable
 * cancelBooking function and the rebooking workflow.
 *
 * @param {string} bookingId The ID of the booking document to cancel.
 * @returns {Promise<void>}
 */
async function cancelBookingInternal(bookingId) {
  const ref = db.collection('bookings').doc(bookingId);
  const doc = await ref.get();
  if (!doc.exists) {
    throw new functions.https.HttpsError('not-found', 'Booking not found');
  }
  const booking = doc.data();

  // Issue refund through Stripe if a payment intent exists
  if (booking.paymentIntentId) {
    try {
      await stripe.refunds.create({ payment_intent: booking.paymentIntentId });
    } catch (err) {
      console.error('Stripe refund failed', err);
      throw new functions.https.HttpsError('internal', 'Unable to issue refund');
    }
  }

  // Update the booking document to cancelled
  await ref.update({
    status: 'cancelled',
    paymentStatus: 'refunded',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Send cancellation email via stub
  await sendCancellationEmail({ id: bookingId, ...booking });
}

/**
 * Callable Cloud Function: createBooking
 *
 * Creates a booking with deposit and writes it to Firestore. Anyone can
 * invoke this function (authentication is optional) because all writes are
 * validated server‑side.
 */
exports.createBooking = functions.https.onCall(async (data, context) => {
  const { roomId, date, startTime, duration, totalCost, depositAmount, customerInfo } = data;
  const result = await createBookingInternal({
    roomId,
    date,
    startTime,
    duration,
    totalCost,
    depositAmount,
    customerInfo,
  });
  return {
    bookingId: result.id,
    paymentIntentClientSecret: result.paymentIntent.client_secret,
    message: 'Booking created',
  };
});

/**
 * Callable Cloud Function: cancelBooking
 *
 * Only callers with the admin custom claim can cancel bookings. Cancels
 * the specified booking, issues a refund, and updates Firestore.
 */
exports.cancelBooking = functions.https.onCall(async (data, context) => {
  if (!context.auth || !context.auth.token || context.auth.token.admin !== true) {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can cancel bookings');
  }
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
  if (!context.auth || !context.auth.token || context.auth.token.admin !== true) {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can rebook bookings');
  }
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