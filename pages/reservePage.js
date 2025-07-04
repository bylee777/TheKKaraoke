'use client';

import { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';

const timeSlots = ['01:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00', '24:00'];
const roomLimit = 2;

function formatTime(time24) {
  const [hourStr, minute] = time24.split(':');
  let hour = parseInt(hourStr, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12;
  return `${hour}:${minute} ${ampm}`;
}

const ReservePage = () => {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    date: '',
    time: '',
    roomType: 'Small',
  });
  const [loading, setLoading] = useState(false);
  const [calendarSummary, setCalendarSummary] = useState({});
  const [bookedTimes, setBookedTimes] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date('2025-06-01'));

  const minDate = new Date('2025-06-02');
  const maxDate = new Date('2025-12-02');

  const handleChange = e => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, 'bookings'), form);
      alert('✅ Booking confirmed!');
      setForm({
        name: '',
        phone: '',
        date: '',
        time: '',
        roomType: 'Small',
      });
      setSelectedDate('');
    } catch (error) {
      console.error('❌ Error:', error);
      alert('Failed to book. Please try again.');
    }
    setLoading(false);
  };

  useEffect(() => {
    const fetchSummary = async () => {
      const q = query(collection(db, 'bookings'), where('roomType', '==', form.roomType));
      const snapshot = await getDocs(q);
      const summary = {};
      snapshot.docs.forEach(doc => {
        const { date } = doc.data();
        summary[date] = (summary[date] || 0) + 1;
      });
      setCalendarSummary(summary);
    };
    fetchSummary();
  }, [form.roomType]);

  useEffect(() => {
    const fetchBookings = async () => {
      if (!form.date || !form.roomType) return;
      const q = query(
        collection(db, 'bookings'),
        where('date', '==', form.date),
        where('roomType', '==', form.roomType)
      );
      const snapshot = await getDocs(q);
      const times = snapshot.docs.map(doc => doc.data().time);
      setBookedTimes(times);
    };
    fetchBookings();
  }, [form.date, form.roomType]);

  const changeMonth = offset => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + offset);
    setCurrentMonth(newMonth);
    setSelectedDate('');
  };

  const generateMonthGrid = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const lastOfMonth = new Date(year, month + 1, 0);
    const startDate = new Date(firstOfMonth);
    startDate.setDate(startDate.getDate() - startDate.getDay());
    const endDate = new Date(lastOfMonth);
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

    const days = [];
    const current = new Date(startDate);
    while (current <= endDate) {
      const iso = current.toISOString().slice(0, 10);
      const inMonth = current.getMonth() === month;
      const inRange = current >= minDate && current <= maxDate && inMonth;
      const spots = inRange ? Math.max(0, roomLimit - (calendarSummary[iso] || 0)) : 0;
      days.push({
        date: iso,
        dayNum: current.getDate(),
        inMonth,
        inRange,
        spots,
      });
      current.setDate(current.getDate() + 1);
    }
    return days;
  };

  const handleDateSelect = date => {
    setSelectedDate(date);
    setForm(prev => ({ ...prev, date, time: '' }));
  };

  // eslint-disable-next-line implicit-arrow-linebreak
  const isTimeBooked = slot => bookedTimes.filter(t => t === slot).length >= roomLimit;

  return (
    <div className="min-h-screen bg-yellow-200 text-gray-900 p-6 flex flex-col items-center">
      <style>
        {`
    ul { list-style-type: none; padding: 0; }
    .month { padding: 70px 25px; width: 100%; background: #1abc9c; text-align: center; }
    .month ul { margin: 0; padding: 0; }
    .month ul li { color: white; font-size: 20px; text-transform: uppercase; letter-spacing: 3px; }
    .month .prev { float: left; padding-top: 10px; cursor: pointer; }
    .month .next { float: right; padding-top: 10px; cursor: pointer; }
    .weekdays { margin: 0; padding: 10px 0; background-color: #ddd; display: flex; justify-content: space-between; }
    .weekdays li { width: 13.6%; color: #666; text-align: center; }
    .days { padding: 10px 0; background: #eee; margin: 0; display: flex; flex-wrap: wrap; }
    .days li { display: inline-block; width: 13.6%; text-align: center; margin-bottom: 5px; font-size: 12px; color: #777; }
    .days li .active { padding: 5px; background: #1abc9c; color: white !important; }
    .time-slot-container {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      justify-content: center;
    }
    .time-slot-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      border: 2px solid #3b3b3b;
      border-radius: 0.5rem;
      font-weight: 600;
      font-size: 1.1rem;
      background-color: #fdfdfd;
      color: #1a1a1a;
      min-width: 120px;
    }
    .time-slot-button.active {
      background-color: #1abc9c;
      color: white;
      border-color: #16a085;
    }
  `}
      </style>

      <form onSubmit={handleSubmit} className="w-full max-w-6xl bg-white p-6 rounded-lg shadow-lg flex flex-col gap-8">
        <div className="month">
          <ul>
            <li className="prev" onClick={() => changeMonth(-1)}>
              &#10094;
            </li>
            <li className="next" onClick={() => changeMonth(1)}>
              &#10095;
            </li>
            <li>
              {currentMonth.toLocaleString('default', { month: 'long' })} {currentMonth.getFullYear()}
            </li>
          </ul>
        </div>

        <ul className="weekdays">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <li key={d}>{d}</li>
          ))}
        </ul>

        <ul className="days">
          {generateMonthGrid().map(day => (
            <li key={day.date}>
              <button
                type="button"
                onClick={() => day.inRange && handleDateSelect(day.date)}
                disabled={!day.inRange}
                className={selectedDate === day.date ? 'active' : ''}
              >
                {day.dayNum}
                <br />
                {day.inRange ? (day.spots > 0 ? `${day.spots} SPOTS` : 'FULL') : ''}
              </button>
            </li>
          ))}
        </ul>

        {selectedDate && (
          <div className="time-slot-container">
            {timeSlots.map(slot => (
              <button
                key={slot}
                type="button"
                disabled={isTimeBooked(slot)}
                onClick={() => setForm(prev => ({ ...prev, time: slot }))}
                className={`time-slot-button ${form.time === slot ? 'active' : ''} ${
                  isTimeBooked(slot) ? 'opacity-40 cursor-not-allowed' : ''
                }`}
              >
                {formatTime(slot)}
              </button>
            ))}
          </div>
        )}

        <div className="grid gap-4">
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            placeholder="Your Name"
            className="w-full px-4 py-2 rounded border border-gray-300"
          />
          <input
            type="tel"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            required
            placeholder="Phone Number"
            className="w-full px-4 py-2 rounded border border-gray-300"
          />
          <select
            name="roomType"
            value={form.roomType}
            onChange={handleChange}
            className="w-full px-4 py-2 rounded border border-gray-300"
          >
            <option value="Small">Small</option>
            <option value="Medium">Medium</option>
            <option value="Large">Large</option>
          </select>
        </div>

        <div className="text-center">
          <button
            type="submit"
            disabled={loading || !form.date || !form.time}
            className="px-6 py-2 rounded bg-purple-700 text-white hover:bg-purple-800 transition disabled:opacity-50"
          >
            {loading ? 'Booking...' : 'Confirm Booking'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ReservePage;
