// Barjunko Karaoke Booking Application
class BarjunkoApp {
  constructor() {
    this.currentPage = 'landing';
    this.currentStep = 1;
    this.maxStep = 5;
    this.bookingData = {};
    this.extraGuestAcknowledged = false;
    this.roomAvailability = null;
    this.roomAvailabilityLoading = false;
    this.roomAvailabilityError = false;
    this.roomAvailabilityRequestId = 0;
    this.manageLookupResults = [];
    this.activeManagedBooking = null;
    this.currentManagedEmail = '';

    this.isRebookingFlow = false;
    this.rebookContext = null;
    this.rebookingStorageKey = 'barjunkoRebookContext';

    this.adminBookingsById = {};
    this.adminGridAssignments = {};
    this.adminRescheduleState = null;
    this.adminRescheduleRequestId = 0;
    this.rescheduleFormBound = false;
    this.businessTimeConfig = {
      openMinutes: 18 * 60,
      closeMinutes: (24 + 2) * 60,
    };

    this.adminRoomColumns = [
      { id: 'R1', roomId: 'large', label: 'R1', name: 'Large Room' },
      { id: 'R2', roomId: 'medium', label: 'R2', name: 'Medium Room' },
      { id: 'R3', roomId: 'medium', label: 'R3', name: 'Medium Room' },
      { id: 'R4', roomId: 'small', label: 'R4', name: 'Small Room' },
      { id: 'R5', roomId: 'small', label: 'R5', name: 'Small Room' },
      { id: 'R6', roomId: 'small', label: 'R6', name: 'Small Room' },
      { id: 'R7', roomId: 'extra-large', label: 'R7', name: 'Extra Large Room' },
      { id: 'R8', roomId: 'medium', label: 'R8', name: 'Medium Room' },
      { id: 'R9', roomId: 'small', label: 'R9', name: 'Small Room' },
      { id: 'R10', roomId: 'medium', label: 'R10', name: 'Medium Room' },
    ];
    this.adminRebuildRoomColumnIndex();

    this.adminAuthUnsubscribe = null;
    this.currentAdminUser = null;
    this.adminDashboardInitialized = false;

    this.currentDate = new Date();
    this.adminSelectedDate = null;
    this.selectedDate = null;
    this.selectedTime = null;
    this.selectedRoom = null;
    this.cardElement = null; // for Stripe Elements

    this.listenersBound = false;
    this.applicationInitialized = false;
    this.domReadyHandlerAttached = false;

    // Business data
    this.businessData = {
      name: 'Barjunko',
      address: '675 Yonge St Basement, Toronto, ON M4Y 2B2',
      phone: '+1-416-968-0909',
      hours: '6:00 PM - 1:00 AM Daily',
      email: 'info@Barjunko.com',
    };

    this.rooms = [
      {
        id: 'small',
        name: 'Small Room',
        capacity: '1-4 people (max 5)',
        minCapacity: 1,
        maxCapacity: 5,
        includedGuests: 4,
        hourlyRate: 30,
        bookingFee: 0,
        extraGuestRate: 5,
        inventory: 4,
        features: [
          'Premium sound system',
          'LED lighting',
          'Song library 50k+',
          'Comfortable seating',
        ],
      },
      {
        id: 'medium',
        name: 'Medium Room',
        capacity: '1-8 people (max 12)',
        minCapacity: 1,
        maxCapacity: 12,
        includedGuests: 8,
        hourlyRate: 60,
        bookingFee: 0,
        extraGuestRate: 5,
        inventory: 4,
        features: [
          'Enhanced sound system',
          'Dynamic lighting',
          'Song library 50k+',
          'Party seating',
          'Mini fridge',
        ],
      },
      {
        id: 'large',
        name: 'Large Room',
        capacity: '1-15 people (max 17)',
        minCapacity: 1,
        maxCapacity: 17,
        includedGuests: 15,
        hourlyRate: 90,
        bookingFee: 0,
        extraGuestRate: 5,
        inventory: 1,
        features: [
          'Professional sound system',
          'Stage lighting',
          'Song library 50k+',
          'VIP seating',
          'Full bar service',
        ],
      },
      {
        id: 'extra-large',
        name: 'Extra Large Room',
        capacity: '1-25 people (max 30)',
        minCapacity: 1,
        maxCapacity: 30,
        includedGuests: 25,
        hourlyRate: 150,
        bookingFee: 0,
        extraGuestRate: 5,
        requiredPurchase: {
          description: 'Required house vodka or tequila purchase',
          amount: 100,
        },
        inventory: 1,
        features: [
          'Concert-grade sound',
          'Stage with spotlights',
          'Song library 50k+',
          'Premium lounge',
          'Full bar service',
          'Dance floor',
          'Includes required $100 house vodka or tequila purchase',
        ],
      },
    ];

    this.timeSlots = [
      '18:00',
      '18:30',
      '19:00',
      '19:30',
      '20:00',
      '20:30',
      '21:00',
      '21:30',
      '22:00',
      '22:30',
      '23:00',
      '23:30',
      '00:00',
      '00:30',
      '01:00',
      '01:30',
      '02:00',
    ];

    this.testimonials = [
      {
        name: 'Sarah M.',
        rating: 5,
        text: 'Amazing experience! The neon lights and sound quality made our night unforgettable. Best karaoke in Toronto!',
      },
      {
        name: 'Mike Chen',
        rating: 5,
        text: 'Perfect for our team building event. The large room accommodated everyone and the staff was incredible.',
      },
      {
        name: 'Jessica L.',
        rating: 5,
        text: 'Love the modern vibe and booking system. So easy to reserve online and the rooms are stunning!',
      },
    ];

    this.mockBookings = [
      {
        id: 'BJ001',
        customerName: 'John Smith',
        email: 'john@example.com',
        phone: '416-555-0123',
        roomType: 'medium',
        date: '2025-09-01',
        startTime: '20:00',
        endTime: '23:00',
        duration: 3,
        partySize: 8,
        totalCost: 180,
        depositPaid: 90,
        status: 'confirmed',
      },
      {
        id: 'BJ002',
        customerName: 'Emily Johnson',
        email: 'emily@example.com',
        phone: '416-555-0456',
        roomType: 'large',
        date: '2025-09-02',
        startTime: '19:30',
        endTime: '22:30',
        duration: 3,
        partySize: 15,
        totalCost: 270,
        depositPaid: 135,
        status: 'confirmed',
      },
    ];
  }

  init() {
    this.setupEventListeners();

    if (this.applicationInitialized) {
      this.showPage(this.currentPage);
      return;
    }

    if (document.readyState === 'loading') {
      if (!this.domReadyHandlerAttached) {
        document.addEventListener('DOMContentLoaded', () => {
          this.setupApplication();
        });
        this.domReadyHandlerAttached = true;
      }
    } else {
      this.setupApplication();
    }
  }

  setupApplication() {
    // Render initial landing content so shared components like room cards and testimonials are available when needed
    this.renderLandingPage();
    // Always update the calendar so booking pages have the latest date/time slots
    this.updateCalendar();
    // Show the page based on the currentPage property rather than always defaulting to 'landing'.
    // This allows us to bootstrap individual HTML pages (landing, booking, manage, admin, confirmation)
    // by setting app.currentPage before calling init().
    this.showPage(this.currentPage);
    this.applicationInitialized = true;
    this.domReadyHandlerAttached = false;
  }

  setupEventListeners() {
    if (this.listenersBound) {
      return;
    }
    this.listenersBound = true;

    // Navigation - Use event delegation
    document.addEventListener('click', (e) => {
      const pageLink = e.target.closest('[data-page]');
      if (pageLink) {
        e.preventDefault();
        const page = pageLink.dataset.page;
        this.showPage(page);
        return;
      }

      // Other button handlers
      if (e.target.closest('.hamburger')) {
        this.toggleMobileMenu();
      }

      if (e.target.closest('#view-rooms-btn')) {
        document.getElementById('rooms-section').scrollIntoView({ behavior: 'smooth' });
      }

      if (e.target.closest('#back-btn')) {
        this.previousStep();
      }

      if (e.target.closest('#next-btn')) {
        this.nextStep();
      }

      if (e.target.closest('#complete-booking-btn')) {
        this.completeBooking();
      }

      if (e.target.closest('#prev-month')) {
        this.previousMonth();
      }

      if (e.target.closest('#next-month')) {
        this.nextMonth();
      }

      if (e.target.closest('#decrease-party')) {
        this.decreasePartySize();
      }

      if (e.target.closest('#increase-party')) {
        this.increasePartySize();
      }

      if (e.target.closest('#admin-logout')) {
        this.adminLogout();
      }

      if (e.target.closest('.modal-close')) {
        this.hideModal();
      }

      if (e.target.closest('.toast-close')) {
        this.hideNotification();
      }
    });

    // Form submissions
    document.addEventListener('submit', (e) => {
      if (e.target.id === 'booking-lookup-form') {
        e.preventDefault();
        this.lookupBooking(e);
      }

      if (e.target.id === 'admin-login-form') {
        e.preventDefault();
        this.adminLogin(e);
      }
    });

    // Input changes
    document.addEventListener('change', (e) => {
      if (e.target.id === 'party-size') {
        this.validatePartySize();
      }

      if (e.target.id === 'extra-guest-ack') {
        this.extraGuestAcknowledged = e.target.checked;
      }

      if (e.target.id === 'duration') {
        this.updateBookingSummary();
        this.updateRoomAvailability();
      }
    });

    document.addEventListener('input', (e) => {
      if (e.target.id === 'party-size') {
        this.validatePartySize();
        this.updateBookingSummary();
      }
    });

    // Setup payment form formatting
    this.setupPaymentFormFormatting();
  }

  // Navigation Methods
  showPage(page) {
    console.log('Navigating to page:', page); // Debug log

    // Hide all pages
    document.querySelectorAll('.page').forEach((p) => {
      p.classList.remove('active');
    });

    // Show selected page
    const targetPage = document.getElementById(`${page}-page`);
    if (targetPage) {
      targetPage.classList.add('active');
      this.currentPage = page;

      // Close mobile menu
      this.closeMobileMenu();

      // Scroll to top
      window.scrollTo(0, 0);

      // Page-specific initialization
      if (page === 'booking') {
        this.initBookingFlow();
      } else if (page === 'manage') {
        this.initManagePage();
      } else if (page === 'admin') {
        this.initAdminPage();
      }

      // Update navigation active state
      this.updateNavigationState(page);
    } else {
      console.error('Page not found:', page);
    }
  }

  updateNavigationState(activePage) {
    // Remove active class from all nav links
    document.querySelectorAll('.nav-menu a, .mobile-nav-list a').forEach((link) => {
      link.classList.remove('active');
    });

    // Add active class to current page links
    document.querySelectorAll(`[data-page="${activePage}"]`).forEach((link) => {
      if (link.tagName === 'A') {
        link.classList.add('active');
      }
    });
  }

  toggleMobileMenu() {
    const mobileMenu = document.querySelector('.mobile-menu');
    const hamburger = document.querySelector('.hamburger');

    if (mobileMenu && hamburger) {
      mobileMenu.classList.toggle('active');
      hamburger.classList.toggle('active');

      // Animate hamburger lines
      const lines = hamburger.querySelectorAll('.hamburger-line');
      if (hamburger.classList.contains('active')) {
        lines[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
        lines[1].style.opacity = '0';
        lines[2].style.transform = 'rotate(-45deg) translate(7px, -6px)';
      } else {
        lines.forEach((line) => {
          line.style.transform = '';
          line.style.opacity = '';
        });
      }
    }
  }

  closeMobileMenu() {
    const mobileMenu = document.querySelector('.mobile-menu');
    const hamburger = document.querySelector('.hamburger');

    if (mobileMenu) mobileMenu.classList.remove('active');
    if (hamburger) hamburger.classList.remove('active');

    const lines = document.querySelectorAll('.hamburger-line');
    lines.forEach((line) => {
      line.style.transform = '';
      line.style.opacity = '';
    });
  }

  // Landing Page Methods
  renderLandingPage() {
    this.renderRooms();
    this.renderTestimonials();
  }

  renderRooms() {
    const roomsGrid = document.getElementById('rooms-grid');
    if (!roomsGrid) return;

    roomsGrid.innerHTML = '';

    this.rooms.forEach((room) => {
      const roomCard = document.createElement('div');
      roomCard.className = 'room-card';
      roomCard.innerHTML = `
                <div class="room-image">
                    <i class="fas fa-microphone"></i>
                </div>
                <div class="room-content">
                    <div class="room-header">
                        <h3 class="room-title">${room.name}</h3>
                        <div class="room-price">$${room.hourlyRate}/hr</div>
                    </div>
                    <div class="room-capacity">
                        <i class="fas fa-users"></i>
                        ${room.capacity}
                    </div>
                    <ul class="room-features">
                        ${room.features.map((feature) => `<li>${feature}</li>`).join('')}
                    </ul>
                    <button class="btn btn--primary btn--full-width" data-page="booking">
                        <i class="fas fa-calendar-plus"></i>
                        Book This Room
                    </button>
                </div>
            `;

      roomsGrid.appendChild(roomCard);
    });
  }

  renderTestimonials() {
    const carousel = document.getElementById('testimonials-carousel');
    if (!carousel) return;

    carousel.innerHTML = '';

    this.testimonials.forEach((testimonial) => {
      const card = document.createElement('div');
      card.className = 'testimonial-card';
      card.innerHTML = `
                <div class="testimonial-rating">
                    ${Array(testimonial.rating).fill('<i class="fas fa-star star"></i>').join('')}
                </div>
                <p class="testimonial-text">"${testimonial.text}"</p>
                <div class="testimonial-author">- ${testimonial.name}</div>
            `;
      carousel.appendChild(card);
    });
  }

  // Booking Flow Methods
  initBookingFlow() {
    this.currentStep = 1;
    this.bookingData = {};
    this.selectedDate = null;
    this.selectedTime = null;
    this.selectedRoom = null;

    this.updateProgressBar();
    this.showBookingStep(1);
    this.updateCalendar();
    this.tryInitializeRebookingFlow();
  }

  showBookingStep(step) {
    // Hide all steps
    document.querySelectorAll('.booking-step').forEach((s) => {
      s.classList.remove('active');
    });

    // Show current step
    const currentStepEl = document.getElementById(`step-${step}`);
    if (currentStepEl) currentStepEl.classList.add('active');

    // Update controls
    const backBtn = document.getElementById('back-btn');
    const nextBtn = document.getElementById('next-btn');
    const completeBtn = document.getElementById('complete-booking-btn');

    const atFirst = step === 1;
    const atLast = step === this.maxStep;

    if (backBtn) {
      backBtn.classList.toggle('hidden', atFirst);
      backBtn.style.display = atFirst ? 'none' : 'flex';
    }

    if (nextBtn) {
      nextBtn.classList.toggle('hidden', atLast);
      nextBtn.style.display = atLast ? 'none' : 'flex';
    }

    if (completeBtn) {
      completeBtn.classList.toggle('hidden', !atLast);
      completeBtn.style.display = atLast ? 'flex' : 'none';
    }

    // Step-specific updates
    if (step === 2) {
      this.renderRoomSelection();
    } else if (step === 4) {
      this.updateBookingSummary();
    } else if (step === 5) {
      this.updatePaymentSummary();
      // Ensure Stripe Element is mounted at payment step
      if (!this.cardElement) this.setupPaymentFormFormatting();
    }

    this.currentStep = step;
    this.updateProgressBar();
  }

  updateProgressBar() {
    document.querySelectorAll('.progress-step').forEach((step, index) => {
      const stepNumber = index + 1;
      if (stepNumber <= this.currentStep) {
        step.classList.add('active');
      } else {
        step.classList.remove('active');
      }
    });
  }

  nextStep() {
    if (!this.validateCurrentStep()) {
      return;
    }

    if (this.currentStep < this.maxStep) {
      this.showBookingStep(this.currentStep + 1);
    }
  }

  previousStep() {
    if (this.currentStep > 1) {
      this.showBookingStep(this.currentStep - 1);
    }
  }

  validateCurrentStep() {
    switch (this.currentStep) {
      case 1:
        if (!this.selectedDate || !this.selectedTime) {
          this.showNotification('Please select a date and time', 'error');
          return false;
        }

        // Check 6-hour advance rule
        const selectedDateTime = new Date(`${this.selectedDate}T${this.selectedTime}`);
        const sixHoursFromNow = new Date(Date.now() + 6 * 60 * 60 * 1000);

        if (selectedDateTime < sixHoursFromNow) {
          this.showNotification('Bookings must be made at least 6 hours in advance', 'error');
          return false;
        }

        this.bookingData.date = this.selectedDate;
        this.bookingData.startTime = this.selectedTime;
        return true;

      case 2:
        if (!this.selectedRoom) {
          this.showNotification('Please select a room', 'error');
          return false;
        }
        this.bookingData.room = this.selectedRoom;
        return true;

      case 3:
        const partySizeEl = document.getElementById('party-size');
        const durationEl = document.getElementById('duration');

        if (!partySizeEl || !durationEl) return false;

        const partySize = parseInt(partySizeEl.value);
        const duration = parseInt(durationEl.value);

        if (!partySize || partySize < 1) {
          this.showNotification('Please enter a valid party size', 'error');
          return false;
        }

        if (this.selectedRoom) {
          const room = this.rooms.find((r) => r.id === this.selectedRoom.id);
          if (partySize < room.minCapacity || partySize > room.maxCapacity) {
            this.showNotification(
              `Party size must be between ${room.minCapacity}-${room.maxCapacity} for ${room.name}`,
              'error',
            );
            return false;
          }

          const includedGuests = room.includedGuests ?? room.maxCapacity;
          if (partySize > includedGuests && !this.extraGuestAcknowledged) {
            this.showNotification('Please acknowledge the extra guest surcharge before continuing.', 'warning');
            return false;
          }
        }

        this.bookingData.partySize = partySize;
        this.bookingData.duration = duration;
        this.bookingData.extraGuestAcknowledged = this.extraGuestAcknowledged;
        return true;

      case 4:
        const requiredFields = ['first-name', 'last-name', 'email', 'phone'];
        const missingFields = requiredFields.filter((field) => {
          const el = document.getElementById(field);
          return !el || !el.value.trim();
        });

        if (missingFields.length > 0) {
          this.showNotification('Please fill in all required fields', 'error');
          return false;
        }

        // Validate email
        const emailEl = document.getElementById('email');
        if (emailEl) {
          const email = emailEl.value.trim();
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(email)) {
            this.showNotification('Please enter a valid email address', 'error');
            return false;
          }

          // Store customer info
          const termsCheckbox = document.getElementById('terms-checkbox');
          if (!termsCheckbox || !termsCheckbox.checked) {
            this.showNotification('Please review and accept the terms & conditions to continue', 'error');
            return false;
          }

          this.bookingData.customer = {
            firstName: document.getElementById('first-name').value.trim(),
            lastName: document.getElementById('last-name').value.trim(),
            email: email,
            phone: document.getElementById('phone').value.trim(),
            specialRequests: document.getElementById('special-requests')?.value.trim() || '',
            termsAccepted: true,
          };
          this.bookingData.termsAccepted = true;
        }
        return true;

      case 5:
        return true;
    }
    return true;
  }

  // Calendar Methods
  updateCalendar() {
    const calendarGrid = document.getElementById('calendar-grid');
    const calendarTitle = document.getElementById('calendar-title');

    if (!calendarGrid || !calendarTitle) return;

    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();

    // Update title
    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    calendarTitle.textContent = `${monthNames[month]} ${year}`;

    // Clear calendar
    calendarGrid.innerHTML = '';

    // Add day headers
    const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayHeaders.forEach((day) => {
      const dayHeader = document.createElement('div');
      dayHeader.className = 'calendar-day-header';
      dayHeader.textContent = day;
      dayHeader.style.fontWeight = 'bold';
      dayHeader.style.color = 'var(--color-text-secondary)';
      dayHeader.style.fontSize = 'var(--font-size-sm)';
      dayHeader.style.padding = 'var(--space-8)';
      calendarGrid.appendChild(dayHeader);
    });

    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    const sixHoursFromNow = new Date(Date.now() + 6 * 60 * 60 * 1000);

    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      const emptyDay = document.createElement('div');
      emptyDay.className = 'calendar-day empty';
      calendarGrid.appendChild(emptyDay);
    }

    // Add days of month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayElement = document.createElement('div');
      dayElement.className = 'calendar-day';
      dayElement.textContent = day;

      const dayDate = new Date(year, month, day);
      const dayDateString = dayDate.toISOString().split('T')[0];

      // Check if day is available
      const dayStartTime = new Date(dayDate);
      dayStartTime.setHours(18, 0, 0, 0); // 6 PM start time

      if (dayStartTime >= sixHoursFromNow) {
        dayElement.classList.add('available');
        dayElement.addEventListener('click', () => {
          this.selectDate(dayDateString);
        });
      } else {
        dayElement.classList.add('disabled');
      }

      if (this.selectedDate === dayDateString) {
        dayElement.classList.add('selected');
      }

      calendarGrid.appendChild(dayElement);
    }

    // Update time slots if date is selected
    if (this.selectedDate) {
      this.updateTimeSlots();
    }
  }

  selectDate(dateString) {
    this.selectedDate = dateString;
    this.selectedTime = null;
    this.roomAvailability = null;
    this.roomAvailabilityLoading = false;
    this.roomAvailabilityError = false;
    this.roomAvailabilityRequestId += 1;
    this.updateCalendar();
    this.updateTimeSlots();
    this.renderRoomSelection();
  }

  updateTimeSlots() {
    const timeGrid = document.getElementById('time-grid');
    const timeSlotsContainer = document.getElementById('time-slots');

    if (!timeGrid || !timeSlotsContainer) return;

    if (!this.selectedDate) {
      timeSlotsContainer.style.display = 'none';
      return;
    }

    timeSlotsContainer.style.display = 'block';
    timeGrid.innerHTML = '';

    const selectedDateTime = new Date(this.selectedDate);
    const sixHoursFromNow = new Date(Date.now() + 6 * 60 * 60 * 1000);

    this.timeSlots.forEach((time) => {
      const timeSlot = document.createElement('div');
      timeSlot.className = 'time-slot';
      timeSlot.textContent = this.formatTime(time);

      // Check if time slot is available
      const [hours, minutes] = time.split(':').map(Number);
      const slotDateTime = new Date(selectedDateTime);
      slotDateTime.setHours(hours, minutes, 0, 0);

      if (slotDateTime >= sixHoursFromNow) {
        timeSlot.classList.add('available');
        timeSlot.addEventListener('click', () => {
          this.selectTime(time);
        });
      } else {
        timeSlot.classList.add('disabled');
      }

      if (this.selectedTime === time) {
        timeSlot.classList.add('selected');
      }

      timeGrid.appendChild(timeSlot);
    });
  }

  selectTime(time) {
    this.selectedTime = time;
    this.updateTimeSlots();
    this.updateRoomAvailability();
  }

  formatTime(time24) {
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  }

  previousMonth() {
    this.currentDate.setMonth(this.currentDate.getMonth() - 1);
    this.updateCalendar();
  }

  nextMonth() {
    this.currentDate.setMonth(this.currentDate.getMonth() + 1);
    this.updateCalendar();
  }

  // Room Selection Methods
  async updateRoomAvailability() {
    if (!this.selectedDate || !this.selectedTime) {
      this.roomAvailabilityRequestId += 1;
      this.roomAvailability = null;
      this.roomAvailabilityLoading = false;
      this.roomAvailabilityError = false;
      this.renderRoomSelection();
      return;
    }

    if (!window.firebaseFunctions || !window.firebaseFunctions.httpsCallable) {
      this.roomAvailabilityRequestId += 1;
      this.roomAvailability = null;
      this.roomAvailabilityError = true;
      this.roomAvailabilityLoading = false;
      this.renderRoomSelection();
      return;
    }

    const requestId = ++this.roomAvailabilityRequestId;
    this.roomAvailabilityLoading = true;
    this.roomAvailabilityError = false;
    this.renderRoomSelection();

    const durationEl = document.getElementById('duration');
    const duration = durationEl ? parseInt(durationEl.value, 10) || 1 : Number(this.bookingData.duration) || 1;

    try {
      const getAvailability = window.firebaseFunctions.httpsCallable('getRoomAvailability');
      const response = await getAvailability({
        date: this.selectedDate,
        startTime: this.selectedTime,
        duration,
        roomIds: this.rooms.map((room) => room.id),
        excludeBookingId: this.isRebookingFlow && this.rebookContext ? this.rebookContext.booking.id : null,
      });

      if (requestId !== this.roomAvailabilityRequestId) {
        return;
      }

      this.roomAvailabilityLoading = false;
      this.roomAvailabilityError = false;
      this.roomAvailability = response.data?.availability || {};

      const selectedUnavailable = this.selectedRoom && Number(this.roomAvailability?.[this.selectedRoom.id] || 0) <= 0;
      let shouldClearSelectedRoom = selectedUnavailable;
      if (selectedUnavailable && this.isRebookingFlow && this.rebookContext) {
        const orig = this.rebookContext.booking || {};
        if (this.selectedRoom.id === orig.roomId && this.selectedDate === orig.date && this.selectedTime === orig.startTime) {
          shouldClearSelectedRoom = false;
        }
      }
      if (shouldClearSelectedRoom) {
        const roomName = this.selectedRoom ? this.selectedRoom.name : 'Selected room';
        this.showNotification(`${roomName} is no longer available at that time. Please choose another room.`, 'warning');
        this.selectedRoom = null;
        this.bookingData.room = null;
        this.validatePartySize();
      }
    } catch (error) {
      console.error('Failed to load room availability', error);
      if (requestId !== this.roomAvailabilityRequestId) {
        return;
      }
      this.roomAvailabilityLoading = false;
      this.roomAvailabilityError = true;
      this.roomAvailability = null;
    }

    this.renderRoomSelection();
  }

  getRoomAvailabilityStatus(roomId) {
    if (!this.selectedDate || !this.selectedTime) {
      return {
        message: 'Select a date & time to check availability',
        className: 'info',
        selectable: false,
        notifyMessage: 'Select a date and time first to see availability.',
        notifyType: 'info',
      };
    }

    if (this.roomAvailabilityLoading) {
      return {
        message: 'Checking availability...',
        className: 'info',
        selectable: false,
        notifyMessage: 'Checking availability. Please wait.',
        notifyType: 'info',
      };
    }

    if (this.roomAvailabilityError) {
      return {
        message: 'Availability unavailable. You can try again or continue.',
        className: 'warning',
        selectable: true,
      };
    }

    if (!this.roomAvailability || typeof this.roomAvailability[roomId] === 'undefined') {
      return {
        message: 'Availability pending',
        className: 'info',
        selectable: true,
      };
    }

    const available = Number(this.roomAvailability[roomId]) || 0;
    if (available > 0) {
      const label = available === 1 ? 'room' : 'rooms';
      return {
        message: `${available} ${label} available`,
        className: 'success',
        selectable: true,
      };
    }

    const room = this.rooms.find((r) => r.id === roomId);
    const roomName = room ? room.name : 'This room';
    return {
      message: 'Unavailable at selected time',
      className: 'error',
      selectable: false,
      notifyMessage: `${roomName} is fully booked for the selected time.`,
      notifyType: 'warning',
    };
  }

  getStoredRebookingContext() {

    try {

      const raw = localStorage.getItem(this.rebookingStorageKey);

      if (!raw) return null;

      return JSON.parse(raw);

    } catch (error) {

      console.warn('Failed to parse rebooking context', error);

      try {

        localStorage.removeItem(this.rebookingStorageKey);

      } catch (removeError) {

        console.warn('Failed to clear rebooking context', removeError);

      }

      return null;

    }

  }



  clearRebookingContext({ removeQueryParam = false } = {}) {

    try {

      localStorage.removeItem(this.rebookingStorageKey);

    } catch (error) {

      console.warn('Unable to clear rebooking context from storage', error);

    }



    this.rebookContext = null;

    this.isRebookingFlow = false;



    if (removeQueryParam && typeof window !== 'undefined') {

      const url = new URL(window.location.href);

      if (url.searchParams.has('rebook')) {

        url.searchParams.delete('rebook');

        window.history.replaceState({}, document.title, url.toString());

      }

    }

  }



  tryInitializeRebookingFlow() {

    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);

    if (!params.has('rebook')) {

      return;

    }



    const context = this.getStoredRebookingContext();

    if (!context || !context.booking) {

      this.showNotification('Your rebooking session expired. Please start again from Manage Booking.', 'warning');

      this.clearRebookingContext({ removeQueryParam: true });

      return;

    }



    this.enterRebookingMode(context);

  }



  enterRebookingMode(context) {

    this.isRebookingFlow = true;

    this.rebookContext = context;



    const booking = context.booking;

    const room = this.rooms.find((r) => r.id === booking.roomId) || null;

    this.selectedRoom = room || null;

    if (room) {

      this.bookingData.room = room;

    }



    this.selectedDate = booking.date;
    this.selectedTime = booking.startTime;
    this.bookingData.date = booking.date;
    this.bookingData.startTime = booking.startTime;
    this.bookingData.duration = booking.duration;

    this.bookingData.partySize = booking.partySize || (room?.minCapacity ?? 1);

    this.bookingData.totalCost = booking.totalCost ?? null;
    this.bookingData.depositAmount = booking.depositAmount ?? null;
    this.bookingData.remainingBalance = booking.remainingBalance ?? (booking.totalCost != null && booking.depositAmount != null
      ? booking.totalCost - booking.depositAmount
      : null);



    this.bookingData.customer = {

      firstName: booking.customer?.firstName || '',

      lastName: booking.customer?.lastName || '',

      email: booking.customer?.email || context.email || '',

      phone: booking.customer?.phone || '',

      specialRequests: '',

      termsAccepted: true,

    };

    this.bookingData.termsAccepted = true;



    const includedGuests = room?.includedGuests ?? room?.maxCapacity ?? this.bookingData.partySize;

    this.extraGuestAcknowledged = this.bookingData.partySize <= includedGuests;



    this.updateCalendar();

    this.updateTimeSlots();

    this.renderRoomSelection();

    this.updateRoomAvailability();



    const durationEl = document.getElementById('duration');

    if (durationEl) {

      durationEl.value = String(this.bookingData.duration);

    }



    const partyInput = document.getElementById('party-size');

    if (partyInput) {

      partyInput.value = this.bookingData.partySize;

    }



    this.applyRebookingCustomerPrefill(this.bookingData.customer);



    this.validatePartySize();

    this.updateBookingSummary();

    this.updatePaymentSummary();



    this.showNotification(`Rescheduling booking ${booking.id}. Update your details and confirm.`, 'info');

  }



  applyRebookingCustomerPrefill(customer) {

    const firstNameEl = document.getElementById('first-name');

    if (firstNameEl) firstNameEl.value = customer.firstName || '';



    const lastNameEl = document.getElementById('last-name');

    if (lastNameEl) lastNameEl.value = customer.lastName || '';



    const emailEl = document.getElementById('email');

    if (emailEl) emailEl.value = customer.email || '';



    const phoneEl = document.getElementById('phone');

    if (phoneEl) phoneEl.value = customer.phone || '';



    const termsCheckbox = document.getElementById('terms-checkbox');

    if (termsCheckbox) termsCheckbox.checked = true;

  }



  renderRoomSelection() {
    const roomGrid = document.getElementById('room-selection-grid');
    if (!roomGrid) return;

    roomGrid.innerHTML = '';

    this.rooms.forEach((room) => {
      const status = this.getRoomAvailabilityStatus(room.id);
      const roomOption = document.createElement('div');
      roomOption.className = 'room-option';

      if (!status.selectable) {
        roomOption.classList.add('room-option--unavailable');
        roomOption.setAttribute('aria-disabled', 'true');
      }

      roomOption.innerHTML = `
                <div class="room-option-header">
                    <h3 class="room-option-title">${room.name}</h3>
                    <div class="room-option-price">$${room.hourlyRate}/hr</div>
                </div>
                <div class="room-capacity">
                    <i class="fas fa-users"></i>
                    ${room.capacity}
                </div>
                <ul class="room-features">
                    ${room.features
                      .slice(0, 3)
                      .map((feature) => `<li>${feature}</li>`)
                      .join('')}
                </ul>
                <div class="room-availability room-availability--${status.className || 'info'}">
                    ${status.message}
                </div>
            `;

      roomOption.addEventListener('click', () => {
        const currentStatus = this.getRoomAvailabilityStatus(room.id);
        if (!currentStatus.selectable) {
          if (currentStatus.notifyMessage) {
            this.showNotification(currentStatus.notifyMessage, currentStatus.notifyType || 'info');
          }
          return;
        }

        this.selectRoom(room);
      });

      if (status.selectable && this.selectedRoom && this.selectedRoom.id === room.id) {
        roomOption.classList.add('selected');
      }

      roomGrid.appendChild(roomOption);
    });
  }

  selectRoom(room) {
    this.selectedRoom = room;
    this.renderRoomSelection();
    this.validatePartySize();
  }

  // Party Size Methods
  increasePartySize() {
    const input = document.getElementById('party-size');
    if (input) {
      const currentValue = parseInt(input.value) || 1;
      input.value = Math.min(currentValue + 1, 30);
      this.validatePartySize();
      this.updateBookingSummary();
    }
  }

  decreasePartySize() {
    const input = document.getElementById('party-size');
    if (input) {
      const currentValue = parseInt(input.value) || 1;
      input.value = Math.max(currentValue - 1, 1);
      this.validatePartySize();
      this.updateBookingSummary();
    }
  }

  toggleExtraGuestAcknowledgement(show) {
    const container = document.getElementById('extra-guest-ack-container');
    const checkbox = document.getElementById('extra-guest-ack');

    if (!container || !checkbox) {
      return;
    }

    if (show) {
      container.classList.remove('hidden');
    } else {
      container.classList.add('hidden');
      checkbox.checked = false;
      this.extraGuestAcknowledged = false;
    }
  }

  validatePartySize() {
    const partySizeEl = document.getElementById('party-size');
    const validation = document.getElementById('party-validation');

    if (!partySizeEl || !validation) return;

    const partySize = parseInt(partySizeEl.value, 10);

    if (!this.selectedRoom) {
      validation.innerHTML = '<i class="fas fa-info-circle"></i> Select a room first';
      validation.className = 'party-validation';
      this.toggleExtraGuestAcknowledgement(false);
      return;
    }

    const room = this.selectedRoom;
    const includedGuests = room.includedGuests ?? room.maxCapacity;
    const extraGuestRate = room.extraGuestRate || 0;
    const minCapacity = room.minCapacity ?? 1;
    const maxCapacity = room.maxCapacity ?? includedGuests;

    if (!Number.isFinite(partySize) || partySize < minCapacity) {
      const minLabel = `${minCapacity} guest${minCapacity === 1 ? '' : 's'}`;
      validation.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${room.name} requires at least ${minLabel}.`;
      validation.className = 'party-validation error';
      this.toggleExtraGuestAcknowledgement(false);
      return;
    }

    if (partySize > maxCapacity) {
      validation.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${room.name} fits up to ${maxCapacity} guests. Extra guests are $${extraGuestRate} per person per hour and may require a larger room.`;
      validation.className = 'party-validation error';
      this.toggleExtraGuestAcknowledgement(false);
      return;
    }

    if (partySize > includedGuests) {
      const extraGuests = partySize - includedGuests;
      const guestLabel = extraGuests === 1 ? 'guest' : 'guests';
      let surchargeText = 'Additional guests may require approval.';

      if (extraGuestRate > 0) {
        const totalExtraPerHour = extraGuestRate * extraGuests;
        const totalBreakdown = extraGuests > 0 ? ` (currently +$${totalExtraPerHour}/hr for ${extraGuests} ${guestLabel})` : '';
        surchargeText = `Each additional guest costs $${extraGuestRate} per person per hour${totalBreakdown}.`;
      }

      validation.innerHTML = `<i class="fas fa-exclamation-circle"></i> Party size exceeds the recommended ${includedGuests} guests for ${room.name}. ${surchargeText} Please acknowledge below.`;
      validation.className = 'party-validation warning';
      this.toggleExtraGuestAcknowledgement(true);
      const checkbox = document.getElementById('extra-guest-ack');
      if (checkbox) {
        this.extraGuestAcknowledged = checkbox.checked;
      }
      return;
    }

    validation.innerHTML = '<i class="fas fa-check-circle"></i> Perfect fit for ' + room.name;
    validation.className = 'party-validation success';
    this.toggleExtraGuestAcknowledgement(false);
  }

  // Summary Methods
  updateBookingSummary() {

    const summaryContent = document.getElementById('booking-summary-content');

    if (!summaryContent) return;



    // Helper for currency display

    const formatCurrency = (value) => (typeof value === "number" && isFinite(value) ? `$${value.toFixed(2)}` : "—");



    // Use live selections with fallbacks from bookingData (for rebooking)

    const date = this.selectedDate || this.bookingData.date || null;

    const time = this.selectedTime || this.bookingData.startTime || null;

    const room = this.selectedRoom || this.bookingData.room || null;



    if (!date || !time || !room) {

      summaryContent.innerHTML = '<p>Complete the previous steps to see your booking summary.</p>';

      return;

    }



    const partySizeEl = document.getElementById('party-size');

    const durationEl = document.getElementById('duration');

    const partySize = partySizeEl ? (parseInt(partySizeEl.value, 10) || 1) : (this.bookingData.partySize || 1);

    const duration = durationEl ? (parseInt(durationEl.value, 10) || (this.bookingData.duration || 1)) : (this.bookingData.duration || 1);



    const baseCost = room.hourlyRate * duration;

    const bookingFee = room.bookingFee || 0;

    const includedGuests = room.includedGuests ?? room.maxCapacity;

    const extraGuestRate = room.extraGuestRate || 0;

    const extraGuests = Math.max(0, partySize - includedGuests);

    const extraGuestFee = extraGuestRate * extraGuests * duration;

    const requiredPurchaseAmount = room.requiredPurchase ? room.requiredPurchase.amount : 0;

    const totalCost = baseCost + bookingFee + extraGuestFee + requiredPurchaseAmount;



    const [startHours, startMinutes] = time.split(':').map(Number);

    const endTime = new Date();

    endTime.setHours(startHours + duration, startMinutes, 0, 0);

    const endTimeString = endTime.toTimeString().slice(0, 5);



    const extraRows = [];

    if (bookingFee) {

      extraRows.push(`

            <div class="summary-row">

                <span class="summary-label">Booking Fee:</span>

                <span class="summary-value">${formatCurrency(bookingFee)}</span>

            </div>`);

    }

    if (extraGuestFee) {

      extraRows.push(`

            <div class="summary-row">

                <span class="summary-label">Extra Guests (${extraGuests} &times; $${extraGuestRate}/hr &times; ${duration}h):</span>

                <span class="summary-value">${formatCurrency(extraGuestFee)}</span>

            </div>`);

    }

    if (requiredPurchaseAmount) {

      const description = room.requiredPurchase?.description || "Required purchase";

      extraRows.push(`

            <div class="summary-row">

                <span class="summary-label">${description}:</span>

                <span class="summary-value">${formatCurrency(requiredPurchaseAmount)}</span>

            </div>`);

    }



    summaryContent.innerHTML = `

            <div class="summary-row">

                <span class="summary-label">Date:</span>

                <span class="summary-value">${new Date(date).toLocaleDateString()}</span>

            </div>

            <div class="summary-row">

                <span class="summary-label">Time:</span>

                <span class="summary-value">${this.formatTime(time)} - ${this.formatTime(endTimeString)}</span>

            </div>

            <div class="summary-row">

                <span class="summary-label">Room:</span>

                <span class="summary-value">${room.name}</span>

            </div>

            <div class="summary-row">

                <span class="summary-label">Party Size:</span>

                <span class="summary-value">${partySize} people</span>

            </div>

            <div class="summary-row">

                <span class="summary-label">Duration:</span>

                <span class="summary-value">${duration} hour${duration > 1 ? "s" : ""}</span>

            </div>

            <div class="summary-row">

                <span class="summary-label">Room Rate:</span>

                <span class="summary-value">$${room.hourlyRate}/hour</span>

            </div>

            <div class="summary-row">

                <span class="summary-label">Room Subtotal:</span>

                <span class="summary-value">${formatCurrency(baseCost)}</span>

            </div>

            ${extraRows.join('')}

            <div class="summary-row">

                <span class="summary-label">Total Cost:</span>

                <span class="summary-value summary-total">${formatCurrency(totalCost)}</span>

            </div>

        `;



    this.bookingData.roomSubtotal = baseCost;

    this.bookingData.extraGuestFee = extraGuestFee;

    this.bookingData.requiredPurchaseAmount = requiredPurchaseAmount;

    this.bookingData.bookingFee = bookingFee;

  }



  updatePaymentSummary() {

    const summaryContent = document.getElementById('payment-summary-content');

    if (!summaryContent || !this.selectedRoom) return;



    const isRebooking = this.isRebookingFlow && !!this.rebookContext;

    const formatCurrency = (value) => (Number.isFinite(value) ? `$${value.toFixed(2)}` : 'N/A');

    const room = this.selectedRoom;

    const durationEl = document.getElementById('duration');

    const duration = durationEl ? parseInt(durationEl.value, 10) || 1 : 1;

    const baseCost = room.hourlyRate * duration;

    const bookingFee = room.bookingFee || 0;

    const includedGuests = room.includedGuests ?? room.maxCapacity;

    const extraGuestRate = room.extraGuestRate || 0;

    const partySizeEl = document.getElementById('party-size');

    const partySize = partySizeEl ? parseInt(partySizeEl.value, 10) || 1 : 1;

    const extraGuests = Math.max(0, partySize - includedGuests);

    const extraGuestFee = extraGuestRate * extraGuests * duration;

    const requiredPurchaseAmount = room.requiredPurchase ? room.requiredPurchase.amount : 0;

    const totalCost = baseCost + bookingFee + extraGuestFee + requiredPurchaseAmount;

    const originalDeposit = this.rebookContext?.booking?.depositAmount;

    let depositAmount = Math.round(totalCost * 0.5);

    if (isRebooking && Number.isFinite(originalDeposit)) {

      depositAmount = originalDeposit;

    }

    const safeDepositAmount = Number.isFinite(depositAmount) ? depositAmount : 0;

    const remainingBalance = Math.max(totalCost - safeDepositAmount, 0);



    const extraRows = [];

    if (bookingFee) {

      extraRows.push(`

            <div class="summary-row">

                <span class="summary-label">Booking Fee:</span>

                <span class="summary-value">${formatCurrency(bookingFee)}</span>

            </div>`);

    }

    if (extraGuestFee) {

      extraRows.push(`

            <div class="summary-row">

                <span class="summary-label">Extra Guests (${extraGuests} &times; $${extraGuestRate}/hr &times; ${duration}h):</span>

                <span class="summary-value">${formatCurrency(extraGuestFee)}</span>

            </div>`);

    }

    if (requiredPurchaseAmount) {

      const description = room.requiredPurchase?.description || 'Required purchase';

      extraRows.push(`

            <div class="summary-row">

                <span class="summary-label">${description}:</span>

                <span class="summary-value">${formatCurrency(requiredPurchaseAmount)}</span>

            </div>`);

    }



    const noteRows = [];
    if (isRebooking) {
      const depositText = Number.isFinite(depositAmount)
        ? `Your original deposit of ${formatCurrency(depositAmount)} stays on file.`
        : 'Your original deposit remains on file.';
      noteRows.push(`<div class="summary-note">${depositText} No additional payment is required to reschedule.</div>`);
    }



    summaryContent.innerHTML = `

            <div class="summary-row">

                <span class="summary-label">Room Subtotal:</span>

                <span class="summary-value">${formatCurrency(baseCost)}</span>

            </div>

            ${extraRows.join('')}

            <div class="summary-row">

                <span class="summary-label">Total Cost:</span>

                <span class="summary-value">${formatCurrency(totalCost)}</span>

            </div>

            <div class="summary-row">

                <span class="summary-label">${isRebooking ? 'Deposit on file' : 'Deposit (50%)'}:</span>

                <span class="summary-value summary-total">${formatCurrency(depositAmount)}</span>

            </div>

            <div class="summary-row">

                <span class="summary-label">Remaining Balance:</span>

                <span class="summary-value">${formatCurrency(remainingBalance)} (due on arrival)</span>

            </div>

            ${noteRows.join('')}

        `;



    this.bookingData.totalCost = totalCost;

    this.bookingData.depositAmount = Number.isFinite(depositAmount) ? depositAmount : null;

    this.bookingData.remainingBalance = remainingBalance;

    this.bookingData.extraGuestFee = extraGuestFee;

    this.bookingData.bookingFee = bookingFee;

    this.bookingData.requiredPurchaseAmount = requiredPurchaseAmount;



    const paymentForm = document.querySelector('.payment-form');

    if (paymentForm) {

      paymentForm.style.display = isRebooking ? 'none' : '';

    }



    const stepDescription = document.querySelector('#step-5 .step-description');

    if (stepDescription) {

      stepDescription.textContent = isRebooking

        ? 'Confirm your updated reservation details'

        : 'Secure your reservation with a 50% deposit';

    }

    const stepHeading = document.querySelector('#step-5 h2');

    if (stepHeading) {

      stepHeading.textContent = isRebooking ? 'Confirm Your Updated Booking' : 'Complete Your Booking';

    }

    const completeBtn = document.getElementById('complete-booking-btn');

    if (completeBtn) {

      completeBtn.textContent = isRebooking ? 'Confirm Changes' : 'Complete Booking';

    }

  }



  // Payment Methods
  setupPaymentFormFormatting() {
    setTimeout(() => {
      const mountEl = document.getElementById('card-element');
      if (!mountEl || !window.stripe) return;

      const elements = window.stripe.elements();
      this.cardElement = elements.create('card', { hidePostalCode: true });
      this.cardElement.mount('#card-element');

      this.cardElement.on('change', (event) => {
        const el = document.getElementById('card-errors');
        if (el) el.textContent = event.error ? event.error.message : '';
      });
    }, 100);
  }

  async completeBooking() {
    // Validate the current step (ensures date/room/customer info are filled)
    if (!this.validateCurrentStep()) return;

    if (this.isRebookingFlow) {
      this.showLoading('Updating your booking...');
      await this.completeRebookingFlow();
      return;
    }

    // Show a loading overlay
    this.showLoading('Processing your booking...');

    try {
      // Build the payload for the Cloud Function
      const payload = {
        roomId: this.selectedRoom.id,
        date: this.selectedDate,
        startTime: this.selectedTime,
        duration: this.bookingData.duration,
        totalCost: this.bookingData.totalCost,
        depositAmount: this.bookingData.depositAmount,
        partySize: this.bookingData.partySize,
        // Use "customerInfo" because the Cloud Function expects that field.
        customerInfo: this.bookingData.customer,
      };

      // 1) Call your createBooking Cloud Function
      const createBookingFn = window.firebaseFunctions.httpsCallable('createBooking');
      const response = await createBookingFn(payload);
      const { bookingId, clientSecret, paymentIntentClientSecret } = response.data;
      // Use whichever key exists (clientSecret or paymentIntentClientSecret)
      const clientSecretToUse = clientSecret || paymentIntentClientSecret;

      // 2) Confirm the payment on the client using Stripe.js
      const cardholderName =
        document.getElementById('cardholder-name').value ||
        `${this.bookingData.customer.firstName} ${this.bookingData.customer.lastName}`;

      const { error, paymentIntent } = await window.stripe.confirmCardPayment(clientSecretToUse, {
        payment_method: {
          card: this.cardElement,
          billing_details: {
            name: cardholderName,
            email: this.bookingData.customer.email,
            phone: this.bookingData.customer.phone,
          },
        },
      });

      if (error) {
        // Show an error and stop
        this.hideLoading();
        this.showError(error.message || 'Payment failed');
        return;
      }

      // 3) (Optional but recommended) Tell the backend to mark the booking as confirmed
      //    This calls the confirmBooking Cloud Function defined in functions/index.js.
      try {
        const confirmFn = window.firebaseFunctions.httpsCallable('confirmBooking');
        await confirmFn({ bookingId, paymentIntentId: paymentIntent.id });
      } catch (err) {
        console.warn('confirmBooking failed or not deployed:', err);
      }

      // 4) Update local booking data and redirect to confirmation page
      this.bookingData.id = bookingId;
      this.bookingData.status = 'confirmed';
      this.bookingData.createdAt = new Date().toISOString();
      this.bookingData.paymentIntentId = paymentIntent.id;

      localStorage.setItem('barjunkoBooking', JSON.stringify(this.bookingData));
      this.hideLoading();
      window.location.href = 'confirmation.html';
    } catch (err) {
      this.hideLoading();
      this.showError(err.message || 'Error completing booking');
    }
  }

  async completeRebookingFlow() {

    if (!window.firebaseFunctions || !window.firebaseFunctions.httpsCallable) {

      this.hideLoading();

      this.showError('Booking management is unavailable right now. Please try again later.');

      return;

    }



    if (!this.rebookContext || !this.rebookContext.booking) {

      this.hideLoading();

      this.showError('Rebooking session expired. Please start again from Manage Booking.');

      return;

    }



    try {

      const rebookFn = window.firebaseFunctions.httpsCallable('rebookBookingGuest');

      const payload = {
        bookingId: this.rebookContext.booking.id,
        email: this.rebookContext.email || this.bookingData.customer?.email || '',
        newDate: this.bookingData.date,
        newStartTime: this.bookingData.startTime,
        newDuration: this.bookingData.duration,
        roomId: this.selectedRoom ? this.selectedRoom.id : this.rebookContext.booking.roomId,
        partySize: this.bookingData.partySize,
        customerInfo: this.bookingData.customer,
        totalCost: this.bookingData.totalCost,
        depositAmount: this.bookingData.depositAmount,
        remainingBalance: this.bookingData.remainingBalance,
        extraGuestFee: this.bookingData.extraGuestFee,
        bookingFee: this.bookingData.bookingFee,
        requiredPurchaseAmount: this.bookingData.requiredPurchaseAmount,
      };

      const response = await rebookFn(payload);

      const updatedBooking = response.data?.booking;
      const bookingIdForRedirect = updatedBooking?.id || payload.bookingId;

      this.hideLoading();
      this.clearRebookingContext({ removeQueryParam: true });
      this.showNotification('Booking updated successfully! Redirecting you to manage bookings...', 'success');

      setTimeout(() => {
        const manageUrl = new URL('manage.html', window.location.href);
        const email = payload.email || this.currentManagedEmail || '';

        if (email) {
          manageUrl.searchParams.set('email', email);
        }

        if (bookingIdForRedirect) {
          manageUrl.searchParams.set('bookingId', bookingIdForRedirect);
        }

        manageUrl.searchParams.set('rebookSuccess', '1');
        window.location.href = manageUrl.toString();
      }, 1500);

    } catch (error) {

      console.error('completeRebookingFlow error', error);

      this.hideLoading();

      this.showError(error.message || 'Unable to update your booking right now.');

    }

  }



  showConfirmationPage() {
    this.showPage('confirmation');

    const confirmationDetails = document.getElementById('confirmation-details');
    if (!confirmationDetails || !this.bookingData.room) return;

    const room = this.bookingData.room;

    confirmationDetails.innerHTML = `
            <div class="summary-row">
                <span class="summary-label">Booking ID:</span>
                <span class="summary-value">${this.bookingData.id}</span>
            </div>
            <div class="summary-row">
                <span class="summary-label">Customer:</span>
                <span class="summary-value">${this.bookingData.customer.firstName} ${this.bookingData.customer.lastName}</span>
            </div>
            <div class="summary-row">
                <span class="summary-label">Email:</span>
                <span class="summary-value">${this.bookingData.customer.email}</span>
            </div>
            <div class="summary-row">
                <span class="summary-label">Date & Time:</span>
                <span class="summary-value">${new Date(this.bookingData.date).toLocaleDateString()} at ${this.formatTime(this.bookingData.startTime)}</span>
            </div>
            <div class="summary-row">
                <span class="summary-label">Room:</span>
                <span class="summary-value">${room.name} (${this.bookingData.partySize} people)</span>
            </div>
            <div class="summary-row">
                <span class="summary-label">Duration:</span>
                <span class="summary-value">${this.bookingData.duration} hours</span>
            </div>
            <div class="summary-row">
                <span class="summary-label">Deposit Paid:</span>
                <span class="summary-value summary-total">$${this.bookingData.depositAmount}</span>
            </div>
            <div class="summary-row">
                <span class="summary-label">Remaining Balance:</span>
                <span class="summary-value">$${this.bookingData.remainingBalance} (due on arrival)</span>
            </div>
            <div style="margin-top: var(--space-20); padding: var(--space-16); background: rgba(139, 92, 246, 0.1); border-radius: var(--radius-base); border: 1px solid rgba(139, 92, 246, 0.2);">
                <h4 style="margin: 0 0 var(--space-8) 0; color: var(--neon-purple);">Important Notes:</h4>
                <ul style="margin: 0; padding-left: var(--space-16); color: var(--color-text-secondary);">
                    <li>Please arrive 15 minutes early for check-in</li>
                    <li>Cancellations allowed up to 24 hours before your booking</li>
                    <li>Confirmation email sent to ${this.bookingData.customer.email}</li>
                    <li>Questions? Call us at ${this.businessData.phone}</li>
                </ul>
            </div>
        `;

    this.setupSocialShare();
  }

  setupSocialShare() {
    const shareButtons = document.querySelectorAll('.share-btn');
    shareButtons.forEach((btn) => {
      if (btn.dataset.bound === 'true') {
        return;
      }
      btn.dataset.bound = 'true';
      btn.addEventListener('click', () => {
        const message = `Just booked an amazing karaoke experience at Barjunko! #Barjunko #Karaoke #Toronto`;

        if (btn.classList.contains('facebook')) {
          window.open(
            `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}&quote=${encodeURIComponent(message)}`,
            '_blank',
          );
        } else if (btn.classList.contains('twitter')) {
          window.open(
            `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}&url=${encodeURIComponent(window.location.href)}`,
            '_blank',
          );
        } else if (btn.classList.contains('instagram')) {
          navigator.clipboard?.writeText(message).then(() => {
            this.showNotification('Message copied! Share on Instagram', 'success');
          });
        }
      });
    });
  }

  // Manage Booking Methods
  async lookupBooking(e) {
    e.preventDefault();

    if (!window.firebaseFunctions || !window.firebaseFunctions.httpsCallable) {
      this.showError('Booking management is unavailable right now. Please try again later.');
      return;
    }

    const referenceInput = document.getElementById('booking-reference');
    const emailInput = document.getElementById('booking-email');

    if (!emailInput) return;

    const bookingRef = referenceInput ? referenceInput.value.trim() : '';
    const email = emailInput.value.trim();

    if (!email) {
      this.showNotification('Please enter the email you used when booking.', 'error');
      return;
    }

    this.showLoading('Looking up your booking...');

    try {
      const lookupFn = window.firebaseFunctions.httpsCallable('lookupBooking');
      const response = await lookupFn({
        bookingRef: bookingRef || null,
        email,
      });

      const bookings = response.data?.bookings || [];
      this.manageLookupResults = bookings;
      this.currentManagedEmail = email;

      if (bookings.length === 0) {
        this.activeManagedBooking = null;
        this.renderBookingSearchResults([]);
        this.showNotification('No bookings found for that email/reference.', 'warning');
        return;
      }

      if (!bookingRef && bookings.length > 1) {
        this.activeManagedBooking = null;
        this.renderBookingSearchResults(bookings);
        this.showNotification('We found multiple bookings. Select one below to manage it.', 'info');
        return;
      }

      const matchedBooking =
        bookingRef
          ? bookings.find((b) => b.id.toLowerCase() === bookingRef.toLowerCase()) || bookings[0]
          : bookings[0];

      this.displayBookingDetails(matchedBooking);
    } catch (error) {
      console.error('lookupBooking error', error);
      this.showError(error.message || 'Unable to find your booking. Please try again.');
    } finally {
      this.hideLoading();
    }
  }

  initManagePage() {

    if (typeof window === 'undefined') return;



    const params = new URLSearchParams(window.location.search);

    const email = params.get('email') || params.get('lookupEmail') || '';

    const bookingId = params.get('bookingId') || params.get('reference') || '';

    const rebookSuccess = params.get('rebookSuccess') === '1';



    if (email) {

      const emailInput = document.getElementById('booking-email');

      if (emailInput) {

        emailInput.value = email;

      }

      this.currentManagedEmail = email;

    }



    if (bookingId) {

      const referenceInput = document.getElementById('booking-reference');

      if (referenceInput) {

        referenceInput.value = bookingId;

      }

    }



    if (rebookSuccess) {

      this.showNotification('Booking updated successfully!', 'success');

    }



    if (email && bookingId) {

      const form = document.getElementById('booking-lookup-form');

      if (form) {

        setTimeout(() => {

          if (typeof form.requestSubmit === 'function') {

            form.requestSubmit();

          } else {

            form.dispatchEvent(new Event('submit', { cancelable: true }));

          }

        }, 300);

      }

    }



    if (rebookSuccess) {

      const url = new URL(window.location.href);

      url.searchParams.delete('rebookSuccess');

      window.history.replaceState({}, document.title, url.toString());

    }

  }



  renderBookingSearchResults(bookings) {

    const bookingDetails = document.getElementById('booking-details');

    if (!bookingDetails) return;



    if (!bookings.length) {

      bookingDetails.classList.add('hidden');

      bookingDetails.innerHTML = '';

      return;

    }



    bookingDetails.classList.remove('hidden');



    const cardsHtml = bookings

      .map((booking) => `

            <div class="booking-card booking-card--selectable" data-booking-id="${booking.id}">

                <div class="summary-row">

                    <span class="summary-label">Booking ID:</span>

                    <span class="summary-value">${booking.id}</span>

                </div>

                <div class="summary-row">

                    <span class="summary-label">Date:</span>

                    <span class="summary-value">${new Date(booking.date).toLocaleDateString()} at ${this.formatTime(booking.startTime)}</span>

                </div>

                <div class="summary-row">

                    <span class="summary-label">Room:</span>

                    <span class="summary-value">${booking.roomName}</span>

                </div>

                <div class="summary-row">

                    <span class="summary-label">Status:</span>

                    <span class="summary-value">${booking.status ? booking.status.charAt(0).toUpperCase() + booking.status.slice(1) : 'Unknown'}</span>

                </div>

            </div>

        `)

      .join('');



    bookingDetails.innerHTML = `

        <h2>Select a Booking</h2>

        ${cardsHtml}

      `;



    bookingDetails.querySelectorAll('[data-booking-id]').forEach((card) => {

      card.addEventListener('click', () => {

        const bookingId = card.getAttribute('data-booking-id');

        const selected = this.manageLookupResults.find((b) => b.id === bookingId);

        if (selected) {

          this.displayBookingDetails(selected);

        }

      });

    });

  }



  updateManagedBookingInState(updatedBooking) {

    this.manageLookupResults = this.manageLookupResults.map((booking) =>

      booking.id === updatedBooking.id ? updatedBooking : booking,

    );

    this.activeManagedBooking = updatedBooking;

  }



  displayBookingDetails(booking) {

    const bookingDetails = document.getElementById('booking-details');

    if (!bookingDetails) return;

    const formatCurrency = (value) => (typeof value === 'number' ? `$${value.toFixed(2)}` : '—');



    const startDisplay = `${new Date(booking.date).toLocaleDateString()} at ${this.formatTime(booking.startTime)}`;

    const canCancel = Boolean(booking.canCancel);

    const canRebook = Boolean(booking.canRebook);

    const statusSlug = (booking.status || 'unknown').toLowerCase();

    const statusLabel = statusSlug.charAt(0).toUpperCase() + statusSlug.slice(1);



    const cancelDeadlineDisplay = booking.cancelableUntil
      ? new Date(booking.cancelableUntil).toLocaleString()
      : 'the cancellation deadline has passed';
    const cancelMessage = canCancel
      ? `Free cancellation available until ${cancelDeadlineDisplay}.`
      : 'Cancellations are no longer available online. Please contact the venue for assistance.';



    bookingDetails.classList.remove('hidden');

    bookingDetails.innerHTML = `

        <h2>Booking Details</h2>

        <div class="booking-card">

            <div class="summary-row">

                <span class="summary-label">Booking ID:</span>

                <span class="summary-value">${booking.id}</span>

            </div>

            <div class="summary-row">

                <span class="summary-label">Status:</span>

                <span class="summary-value status-badge status-badge--${statusSlug}">${statusLabel}</span>

            </div>

            <div class="summary-row">

                <span class="summary-label">Name:</span>

                <span class="summary-value">${booking.customer.firstName} ${booking.customer.lastName}</span>

            </div>

            <div class="summary-row">

                <span class="summary-label">Email:</span>

                <span class="summary-value">${booking.customer.email}</span>

            </div>

            <div class="summary-row">

                <span class="summary-label">Room:</span>

                <span class="summary-value">${booking.roomName}</span>

            </div>

            <div class="summary-row">

                <span class="summary-label">Date & Time:</span>

                <span class="summary-value">${startDisplay}</span>

            </div>

            <div class="summary-row">

                <span class="summary-label">Duration:</span>

                <span class="summary-value">${booking.duration} hour${booking.duration > 1 ? 's' : ''}</span>

            </div>

            ${
              booking.partySize
                ? `<div class="summary-row">
                      <span class="summary-label">Party Size:</span>
                      <span class="summary-value">${booking.partySize} guests</span>
                   </div>`
                : ''
            }
            ${
              booking.totalCost != null
                ? `<div class="summary-row">
                      <span class="summary-label">Total Cost:</span>
                      <span class="summary-value">${formatCurrency(booking.totalCost)}</span>
                   </div>`
                : ''
            }
            ${
              booking.depositAmount != null
                ? `<div class="summary-row">
                      <span class="summary-label">Deposit Paid:</span>
                      <span class="summary-value">${formatCurrency(booking.depositAmount)}</span>
                   </div>`
                : ''
            }
            ${
              booking.remainingBalance != null
                ? `<div class="summary-row">
                      <span class="summary-label">Remaining Balance:</span>
                      <span class="summary-value">${formatCurrency(booking.remainingBalance)}</span>
                   </div>`
                : ''
            }

        </div>

        <div class="booking-actions">

            <button class="btn btn--danger" id="cancel-booking-btn" ${canCancel ? '' : 'disabled'}>

                <i class="fas fa-times-circle"></i>

                Cancel Booking

            </button>

            <button class="btn btn--secondary" id="start-rebook-btn" ${canRebook ? '' : 'disabled'}>

                <i class="fas fa-calendar-alt"></i>

                Reschedule

            </button>

            <button class="btn btn--outline" id="print-booking-btn">

                <i class="fas fa-print"></i>

                Print Summary

            </button>

        </div>

        <div class="booking-guidelines">

            <i class="fas fa-info-circle"></i>

            <span>${cancelMessage}</span>

        </div>

      `;



    this.activeManagedBooking = booking;



    const cancelBtn = document.getElementById('cancel-booking-btn');

    if (cancelBtn && canCancel) {

      cancelBtn.addEventListener('click', () => this.handleBookingCancellation());

    }



    const rebookBtn = document.getElementById('start-rebook-btn');

    if (rebookBtn && canRebook) {

      rebookBtn.addEventListener('click', () => this.startRebookingFlow(booking));

    }



    const printBtn = document.getElementById('print-booking-btn');

    if (printBtn) {

      printBtn.addEventListener('click', () => window.print());

    }

  }



  startRebookingFlow(booking) {
    if (!booking) return;

    const context = {
      booking,
      email: this.currentManagedEmail || booking.customer.email || '',
    };

    this.clearRebookingContext();

    try {
      localStorage.setItem(this.rebookingStorageKey, JSON.stringify(context));
    } catch (error) {
      console.warn('Unable to cache rebooking context', error);
    }

    const url = new URL('booking.html', window.location.href);
    url.searchParams.set('rebook', '1');
    window.location.href = url.toString();
  }


  async handleBookingCancellation() {

    if (!this.activeManagedBooking) return;

    const confirmation = confirm(

      'Are you sure you want to cancel this booking? This action cannot be undone.',

    );

    if (!confirmation) {

      return;

    }



    if (!window.firebaseFunctions || !window.firebaseFunctions.httpsCallable) {

      this.showError('Booking management is unavailable right now. Please try again later.');

      return;

    }



    this.showLoading('Cancelling your booking...');



    try {

      const cancelFn = window.firebaseFunctions.httpsCallable('cancelBookingGuest');

      const response = await cancelFn({

        bookingId: this.activeManagedBooking.id,

        email: this.currentManagedEmail || this.activeManagedBooking.customer.email,

      });



      const updatedBooking = response.data?.booking;

      if (updatedBooking) {

        this.updateManagedBookingInState(updatedBooking);

        this.displayBookingDetails(updatedBooking);

      }



      this.showNotification('Booking cancelled successfully.', 'success');

    } catch (error) {

      console.error('cancel booking error', error);

      this.showError(error.message || 'Unable to cancel this booking right now.');

    } finally {

      this.hideLoading();

    }

  }



// Admin Methods
  initAdminPage() {
    this.adminShowLoginForm();
    this.adminEnsureAuthListener();
  }

  adminEnsureAuthListener() {
    if (this.adminAuthUnsubscribe || !window.firebaseAuth) {
      if (!window.firebaseAuth) {
        console.warn('[admin] Firebase Auth not available');
      }
      return;
    }

    this.adminAuthUnsubscribe = window.firebaseAuth.onAuthStateChanged(async (user) => {
      const loginForm = document.getElementById('admin-login');
      const dashboard = document.getElementById('admin-dashboard');
      if (!loginForm || !dashboard) {
        return;
      }

      if (!user) {
        this.currentAdminUser = null;
        this.adminShowLoginForm();
        return;
      }

      try {
        const tokenResult = await user.getIdTokenResult(true);
        if (tokenResult.claims?.isAdmin) {
          this.currentAdminUser = user;
          this.adminShowDashboard();
        } else {
          await window.firebaseAuth.signOut();
          this.showNotification('Account not authorized for admin access.', 'error');
        }
      } catch (err) {
        console.error('admin auth listener', err);
        this.showNotification('Unable to verify admin access. Please try again.', 'error');
        await window.firebaseAuth.signOut().catch(() => {});
      }
    });
  }

  adminShowLoginForm() {
    const loginForm = document.getElementById('admin-login');
    const dashboard = document.getElementById('admin-dashboard');
    const emailEl = document.getElementById('admin-email') || document.getElementById('admin-username');
    const passwordEl = document.getElementById('admin-password');

    if (loginForm) loginForm.classList.remove('hidden');
    if (dashboard) dashboard.classList.add('hidden');
    if (emailEl) emailEl.value = '';
    if (passwordEl) passwordEl.value = '';

    this.adminResetRescheduleState();
    this.adminDashboardInitialized = false;
  }

  adminShowDashboard() {
    const loginForm = document.getElementById('admin-login');
    const dashboard = document.getElementById('admin-dashboard');

    if (loginForm) loginForm.classList.add('hidden');
    if (dashboard) dashboard.classList.remove('hidden');

    this.loadAdminDashboard();
    if (!this.adminDashboardInitialized) {
      this.showNotification('Welcome to the admin dashboard!', 'success');
      this.adminDashboardInitialized = true;
    }
  }

  async adminLogin(e) {
    e.preventDefault();

    const emailEl = document.getElementById('admin-email') || document.getElementById('admin-username');
    const passwordEl = document.getElementById('admin-password');

    if (!emailEl || !passwordEl) return;

    const email = emailEl.value.trim();
    const password = passwordEl.value;

    if (!email || !password) {
      this.showNotification('Enter your email and password.', 'warning');
      return;
    }

    if (!window.firebaseAuth) {
      this.showNotification('Authentication unavailable. Please refresh the page.', 'error');
      return;
    }

    this.showLoading('Signing in...');
    try {
      await window.firebaseAuth.signInWithEmailAndPassword(email, password);
    } catch (err) {
      console.error('adminLogin', err);
      let message = 'Unable to sign in. Please check your credentials.';
      const code = err?.code;
      if (code === 'auth/invalid-email') {
        message = 'Invalid email address.';
      } else if (code === 'auth/user-disabled') {
        message = 'This account has been disabled.';
      } else if (code === 'auth/user-not-found') {
        message = 'No admin account found for that email.';
      } else if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        message = 'Incorrect email or password.';
      }
      this.showNotification(message, 'error');
    } finally {
      this.hideLoading();
    }
  }

  async adminLogout() {
    if (!window.firebaseAuth) {
      this.adminShowLoginForm();
      return;
    }

    try {
      await window.firebaseAuth.signOut();
      this.showNotification('Logged out successfully', 'success');
    } catch (err) {
      console.error('adminLogout', err);
      this.showNotification('Unable to log out. Please try again.', 'error');
    }
  }

  loadAdminDashboard() {
    this.adminInitDashboard();
  }

  adminInitDashboard() {
    this.adminResetRescheduleState();
    const today = new Date();
    this.adminSelectedDate = this.adminFormatYMD(today);
    this.adminBindDateControls();
    this.adminRenderDateLabel();
    this.adminFetchForSelectedDate();
  }

  adminFormatYMD(d) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  adminBindDateControls() {
    const prevBtn = document.getElementById('admin-prev-day');
    const nextBtn = document.getElementById('admin-next-day');
    const todayBtn = document.getElementById('admin-today');
    const dateInput = document.getElementById('admin-date');

    if (prevBtn) prevBtn.onclick = () => this.adminChangeSelectedDate(-1);
    if (nextBtn) nextBtn.onclick = () => this.adminChangeSelectedDate(1);
    if (todayBtn) todayBtn.onclick = () => { this.adminSelectedDate = this.adminFormatYMD(new Date()); this.adminOnDateChanged(); };
    if (dateInput) {
      dateInput.value = this.adminSelectedDate || this.adminFormatYMD(new Date());
      dateInput.onchange = () => { this.adminSelectedDate = dateInput.value; this.adminOnDateChanged(); };
    }
  }

  adminRenderDateLabel() {
    const label = document.getElementById('admin-date-label');
    const input = document.getElementById('admin-date');
    if (label) label.textContent = this.adminSelectedDate || '';
    if (input && this.adminSelectedDate) input.value = this.adminSelectedDate;
  }

  adminChangeSelectedDate(days) {
    try {
      const parts = (this.adminSelectedDate || this.adminFormatYMD(new Date())).split('-').map(Number);
      const d = new Date(parts[0], parts[1]-1, parts[2]);
      d.setDate(d.getDate() + days);
      this.adminSelectedDate = this.adminFormatYMD(d);
      this.adminOnDateChanged();
    } catch (e) {
      this.adminSelectedDate = this.adminFormatYMD(new Date());
      this.adminOnDateChanged();
    }
  }

  adminOnDateChanged() {
    this.adminRenderDateLabel();
    this.adminFetchForSelectedDate();
  }

  async adminFetchForSelectedDate() {
    this.adminResetRescheduleState();
    const tableBody = document.getElementById('bookings-table-body');
    const dateStr = this.adminSelectedDate || this.adminFormatYMD(new Date());
    if (!window.firebaseFunctions || !window.firebaseFunctions.httpsCallable) {
      if (tableBody) tableBody.innerHTML = '<tr><td colspan="6">Functions not available</td></tr>';
      return;
    }
    try {
      const fn = window.firebaseFunctions.httpsCallable('adminGetBookingsByDate');
      const res = await fn({ date: dateStr });
      const bookings = res.data?.bookings || [];
      this.renderAdminBookingsTable(bookings);
      this.adminFetchAvailability();
    } catch (err) {
      console.error('adminFetchForSelectedDate error', err);
      this.showNotification("Unable to load bookings for selected day", 'error');
    }
  }
  async adminFetchAvailability() {
    if (!window.firebaseFunctions || !window.firebaseFunctions.httpsCallable) return;
    const dateStr = this.adminSelectedDate || this.adminFormatYMD(new Date());
    const times = this.timeSlots || [];
    try {
      const fn = window.firebaseFunctions.httpsCallable('adminGetAvailabilityByDate');
      const res = await fn({ date: dateStr, times, duration: 1 });
      const grid = res.data || {};
      this.adminRenderAvailabilityGrid(grid.times || times, grid.availability || {});
    } catch (err) {
      console.error('adminFetchAvailability error', err);
      this.adminRenderAvailabilityGrid(times, {});
    }
  }

  normalizeRoomId(roomId) {
    const key = String(roomId || '').trim().toLowerCase();
    if (!key) return '';
    const map = {
      small: 'small',
      medium: 'medium',
      large: 'large',
      'extra-large': 'extra-large',
      xlarge: 'extra-large',
      'extra large': 'extra-large',
      xl: 'extra-large',
      'extra_large': 'extra-large',
      'extra-large-room': 'extra-large',
    };
    if (map[key]) return map[key];
    return key.replace(/\s+/g, '-');
  }

  adminRoomNameFromId(roomId) {
    const map = {
      small: 'Small Room',
      medium: 'Medium Room',
      large: 'Large Room',
      'extra-large': 'Extra Large Room',
    };
    if (map[roomId]) return map[roomId];
    if (!roomId) return 'Room';
    return (
      roomId
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase()) + ' Room'
    );
  }

  adminRebuildRoomColumnIndex() {
    this.adminRoomColumnsByType = (this.adminRoomColumns || []).reduce((acc, col) => {
      if (!acc[col.roomId]) acc[col.roomId] = [];
      acc[col.roomId].push(col);
      return acc;
    }, {});
  }

  adminAddColumn(roomId) {
    const normalized = this.normalizeRoomId(roomId);
    if (!normalized) return null;
    if (!Array.isArray(this.adminRoomColumns)) this.adminRoomColumns = [];
    const label = `R${this.adminRoomColumns.length + 1}`;
    const column = {
      id: label,
      roomId: normalized,
      label,
      name: this.adminRoomNameFromId(normalized),
    };
    this.adminRoomColumns = [...this.adminRoomColumns, column];
    this.adminRebuildRoomColumnIndex();
    return column;
  }

  adminEnsureColumnsFromBookings(bookings) {
    if (!Array.isArray(bookings)) return;
    bookings.forEach((booking) => {
      const normalized = this.normalizeRoomId(booking.roomId);
      if (!normalized) return;
      if (!this.adminRoomColumnsByType || !this.adminRoomColumnsByType[normalized]) {
        this.adminAddColumn(normalized);
      }
    });
  }

  adminAssignBookingsToColumns(bookings) {
    const assignments = {};
    if (!Array.isArray(bookings) || bookings.length === 0) {
      this.adminEnsureColumnsFromBookings([]);
      (this.adminRoomColumns || []).forEach((col) => {
        assignments[col.id] = [];
      });
      return assignments;
    }

    const normalizedBookings = bookings.map((booking) => ({
      ...booking,
      roomId: this.normalizeRoomId(booking.roomId),
    }));

    const assignableBookings = normalizedBookings.filter(
      (booking) => (booking.status || '').toLowerCase() !== 'cancelled',
    );

    this.adminEnsureColumnsFromBookings(assignableBookings);

    (this.adminRoomColumns || []).forEach((col) => {
      assignments[col.id] = [];
    });

    const sorted = [...assignableBookings].sort(
      (a, b) =>
        (this.toBusinessRelativeMinutes(a.startTime) || 0) -
        (this.toBusinessRelativeMinutes(b.startTime) || 0),
    );

    sorted.forEach((booking) => {
      const roomId = booking.roomId || this.normalizeRoomId(booking.roomId);
      let cols =
        (this.adminRoomColumnsByType && this.adminRoomColumnsByType[roomId]) || [];
      if (!cols.length) {
        const newCol = this.adminAddColumn(roomId);
        if (newCol) {
          assignments[newCol.id] = [];
          cols = [newCol];
        } else {
          return;
        }
      }
      const startMinutes = this.toBusinessRelativeMinutes(booking.startTime);
      const rawEnd =
        booking.endTime || this.adminComputeEndTime(booking.startTime, booking.duration || 1);
      const endMinutes = this.toBusinessRelativeMinutes(rawEnd);
      if (!Number.isFinite(startMinutes) || !Number.isFinite(endMinutes)) return;
      for (const col of cols) {
        if (!assignments[col.id]) assignments[col.id] = [];
        const list = assignments[col.id];
        const conflict = list.some(
          (entry) => startMinutes < entry.endMinutes && endMinutes > entry.startMinutes,
        );
        if (!conflict) {
          list.push({ booking, startMinutes, endMinutes });
          break;
        }
      }
    });

    return assignments;
  }

  adminComputeEndTime(startTime, durationHours) {
    const parts = String(startTime || '').split(':');
    const h = Number(parts[0]);
    const m = Number(parts[1]);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return startTime || '00:00';
    let total = h * 60 + m + Number(durationHours || 1) * 60;
    total = ((total % (24 * 60)) + (24 * 60)) % (24 * 60);
    const hh = String(Math.floor(total / 60)).padStart(2, '0');
    const mm = String(total % 60).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  adminBuildGridTimes(times) {
    const baseTimes = Array.isArray(times) && times.length ? times : ['18:00','19:00','20:00','21:00','22:00','23:00','00:00','01:00','02:00'];
    const hourly = [];
    baseTimes.forEach((time) => {
      if (typeof time === 'string' && time.endsWith(':00') && !hourly.includes(time)) {
        hourly.push(time);
      }
    });
    if (!hourly.length) {
      hourly.push('18:00','19:00','20:00','21:00','22:00','23:00','00:00','01:00','02:00');
    }
    return hourly.map((start) => {
      const end = this.adminComputeEndTime(start, 1);
      return {
        start,
        end,
        startMinutes: this.toBusinessRelativeMinutes(start),
        endMinutes: this.toBusinessRelativeMinutes(end),
        label: this.adminFormatTimeRange(start, end),
      };
    });
  }

  adminFormatTimeRange(start, end) {
    const formatPart = (time) => {
      const [hh] = time.split(':').map(Number);
      if (!Number.isFinite(hh)) return time;
      let hour = hh % 12;
      if (hour === 0) hour = 12;
      return String(hour);
    };
    return `${formatPart(start)}-${formatPart(end)}`;
  }

  adminFindBookingForSlot(entries, startMinutes, endMinutes) {
    if (!Array.isArray(entries)) return null;
    return entries.find((entry) => startMinutes < entry.endMinutes && endMinutes > entry.startMinutes) || null;
  }

  adminRenderAvailabilityGrid(times, availability) {
    const container = document.getElementById('admin-availability-grid');
    if (!container) return;
    const columns = this.adminRoomColumns || [];
    if (!columns.length) {
      container.innerHTML = '<p class="admin-grid-empty">No room layout configured.</p>';
      return;
    }

    const rows = this.adminBuildGridTimes(times);
    const assignments = this.adminGridAssignments || {};

    let html = '<table class="admin-schedule-table"><thead><tr><th class="time-head">Time</th>';
    columns.forEach((col) => {
      html += `<th><div class="room-label">${col.label}</div><div class="room-sub">${col.name}</div></th>`;
    });
    html += '</tr></thead><tbody>';

    rows.forEach((row) => {
      html += `<tr><td class="time-cell">${row.label}</td>`;
      columns.forEach((col) => {
        const bookingEntry = this.adminFindBookingForSlot(assignments[col.id] || [], row.startMinutes, row.endMinutes);
        if (bookingEntry) {
          const booking = bookingEntry.booking || {};
          const customer = booking.customer || booking.customerInfo || {};
          const nameParts = [customer.firstName || '', customer.lastName || ''].map((part) => part.trim()).filter(Boolean);
          const name = nameParts.join(' ') || customer.email || booking.id || 'Booking';
          const phone = customer.phone || '';
          const party = Number(booking.partySize) ? `${Number(booking.partySize)} ppl` : '';
          const status = booking.status || 'pending';
          const endTime = booking.endTime || this.adminComputeEndTime(booking.startTime, booking.duration || 1);
          html += '<td class="slot booked status-' + status + '"><div class="booking-card">';
          html += '<div class="booking-name">' + name + '</div>';
          if (party) html += '<div class="booking-detail">' + party + '</div>';
          if (phone) html += '<div class="booking-detail">' + phone + '</div>';
          html += '<div class="booking-detail">' + this.formatTime(booking.startTime) + ' - ' + this.formatTime(endTime) + '</div>';
          html += '</div></td>';
        } else {
          html += '<td class="slot available"><span>Available</span></td>';
        }
      });
      html += '</tr>';
    });
    html += '</tbody></table>';
    container.innerHTML = html;
  }


  async adminFetchTodayBookings() {
    const tableBody = document.getElementById('bookings-table-body');
    if (!tableBody || !window.firestore) return;

    tableBody.innerHTML = '';

    try {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const todayStr = `${yyyy}-${mm}-${dd}`;

      const snapshot = await window.firestore
        .collection('bookings')
        .where('date', '==', todayStr)
        .orderBy('startTime')
        .get();

      const bookings = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      this.renderAdminBookingsTable(bookings);
      this.adminFetchAvailability();
    } catch (err) {
      console.error('adminFetchTodayBookings error', err);
      this.showNotification("Unable to load today's bookings", 'error');
    }
  }

  renderAdminBookingsTable(bookings) {
    const tableBody = document.getElementById('bookings-table-body');
    if (!tableBody) return;

    tableBody.innerHTML = '';
    this.adminBookingsById = {};

    if (!Array.isArray(bookings) || bookings.length === 0) {
      this.adminGridAssignments = this.adminAssignBookingsToColumns([]);
      const row = document.createElement('tr');
      row.innerHTML = `<td colspan="7" style="text-align:center;color:var(--color-text-secondary)">No bookings today</td>`;
      tableBody.appendChild(row);
      return;
    }

    this.adminEnsureColumnsFromBookings(bookings);

    bookings.forEach((booking) => {
      const normalizedRoomId = this.normalizeRoomId(booking.roomId);
      booking.roomId = normalizedRoomId;
      const room = this.rooms.find((r) => r.id === normalizedRoomId);
      const displayRoom = room?.name || this.adminRoomNameFromId(normalizedRoomId);

      const row = document.createElement('tr');
      row.dataset.bookingId = booking.id;
      row.classList.add('admin-booking-row');
      row.tabIndex = 0;
      const startDisplay = `${new Date(booking.date).toLocaleDateString()} ${this.formatTime(booking.startTime)}`;
      const status = booking.status || 'pending';
      const customerName = booking.customerInfo ? `${booking.customerInfo.firstName || ''} ${booking.customerInfo.lastName || ''}`.trim() : '';
      const customerEmail = booking.customerInfo?.email || '';
      const guestsDisplay = Number(booking.partySize) ? String(Number(booking.partySize)) : '-';

      this.adminBookingsById[booking.id] = booking;

      const canCancel = (status || '').toLowerCase() !== 'cancelled';
      row.innerHTML = `
        <td>
          <div>${booking.id}</div>
          <div class="table-hint">Click row to reschedule</div>
        </td>
        <td>
          <div>${customerName || '-'}</div>
          <div style="font-size: var(--font-size-sm); color: var(--color-text-secondary);">${customerEmail}</div>
        </td>
        <td>${displayRoom}</td>
        <td>
          <div>${startDisplay}</div>
          <div style="font-size: var(--font-size-sm); color: var(--color-text-secondary);">${booking.duration || 1}h</div>
        </td>
        <td data-field="guests">${guestsDisplay}</td>
        <td><span class="status-badge status-badge--${status}">${status}</span></td>
        <td>
          <div class="table-actions">
            ${canCancel ? `<button class="btn btn--table btn--outline" data-action="admin-cancel" data-id="${booking.id}"><i class="fas fa-times"></i></button>` : ''}
          </div>
        </td>
      `;

      tableBody.appendChild(row);
    });

    this.adminGridAssignments = this.adminAssignBookingsToColumns(bookings);

    try {
      const bookingsCount = Array.isArray(bookings) ? bookings.length : 0;
      const totalGuests = (Array.isArray(bookings) ? bookings : []).reduce((acc, b) => acc + (Number(b.partySize) || 0), 0);
      const totalRevenue = (Array.isArray(bookings) ? bookings : []).reduce((acc, b) => acc + (Number(b.depositAmount) || 0), 0);

      const totalBookedHours = (Array.isArray(bookings) ? bookings : []).reduce((acc, b) => acc + (Number(b.duration) || 0), 0);
      let openHours = 8;
      try {
        const times = this.timeSlots || [];
        const tmin = times[0];
        const tmax = times[times.length - 1];
        const [sh, sm] = (tmin || '18:00').split(':').map(Number);
        const [eh, em] = (tmax || '02:00').split(':').map(Number);
        let startM = sh * 60 + sm;
        let endM = eh * 60 + em;
        if (endM <= startM) endM += 24 * 60;
        openHours = Math.max(1, Math.round((endM - startM) / 60));
      } catch (_) {}
      const totalRooms = (this.rooms || []).reduce((acc, r) => acc + (Number(r.inventory) || 0), 0) || 1;
      const totalCapacityHours = openHours * totalRooms;
      const occupancyPct = Math.min(100, Math.round((totalBookedHours / totalCapacityHours) * 100));

      const bookingsEl = document.getElementById('admin-stat-bookings');
      const guestsEl = document.getElementById('admin-stat-guests');
      const revenueEl = document.getElementById('admin-stat-revenue');
      const occEl = document.getElementById('admin-stat-occupancy');
      if (bookingsEl) bookingsEl.textContent = String(bookingsCount);
      if (guestsEl) guestsEl.textContent = String(totalGuests);
      if (revenueEl) revenueEl.textContent = `$${totalRevenue.toFixed(2)}`;
      if (occEl) occEl.textContent = `${isFinite(occupancyPct) ? occupancyPct : 0}%`;
    } catch (e) {
      console.warn('Failed to update admin stats', e);
    }

    tableBody.querySelectorAll('[data-action="admin-cancel"]').forEach((btn) => {
      btn.addEventListener('click', () => this.adminCancelBooking(btn.getAttribute('data-id')));
    });

    if (!tableBody.__adminManageBound) {
      tableBody.__adminManageBound = true;
      tableBody.addEventListener('click', (event) => {
        if (event.target.closest('[data-action]')) return;
        const row = event.target.closest('tr[data-booking-id]');
        if (!row) return;
        this.adminOpenModifyModal(row.dataset.bookingId);
      });
      tableBody.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        if (event.target.closest('[data-action]')) return;
        const row = event.target.closest('tr[data-booking-id]');
        if (!row) return;
        event.preventDefault();
        this.adminOpenModifyModal(row.dataset.bookingId);
      });
    }
  }

  async adminCancelBooking(bookingId) {
    if (!bookingId) return;
    if (!window.firebaseFunctions) return this.showNotification('Functions not available', 'error');

    const ok = confirm(`Cancel booking ${bookingId}? This cannot be undone.`);
    if (!ok) return;

    try {
      this.showLoading('Cancelling booking...');
      const fn = window.firebaseFunctions.httpsCallable('adminCancelBySecret');
      await fn({ bookingId });
      this.hideLoading();
      this.showNotification('Booking cancelled', 'success');
      this.adminFetchForSelectedDate();
    } catch (err) {
      this.hideLoading();
      console.error('adminCancelBooking', err);
      this.showError(err.message || 'Unable to cancel booking');
    }
  }

  toBusinessRelativeMinutes(time) {
    if (!time) return null;
    const parts = String(time).split(':');
    if (parts.length !== 2) return null;
    const h = Number(parts[0]);
    const m = Number(parts[1]);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
    let total = h * 60 + m;
    const base = this.businessTimeConfig?.openMinutes ?? 0;
    if (total < base) total += 24 * 60;
    return total;
  }

  adminIsWithinBusinessHours(startTime, durationHours) {
    const startMinutes = this.toBusinessRelativeMinutes(startTime);
    if (!Number.isFinite(startMinutes)) return false;
    const durationMinutes = Number(durationHours) * 60;
    if (!Number.isFinite(durationMinutes)) return false;
    const endMinutes = startMinutes + durationMinutes;
    const { openMinutes, closeMinutes } = this.businessTimeConfig;
    return startMinutes >= openMinutes && endMinutes <= closeMinutes;
  }

  adminPopulateRescheduleTimes(selectEl, selected) {
    if (!selectEl) return;
    selectEl.innerHTML = '';
    const slots = this.timeSlots || [];
    slots.forEach((slot) => {
      const option = document.createElement('option');
      option.value = slot;
      option.textContent = this.formatTime(slot);
      if (slot === selected) option.selected = true;
      selectEl.appendChild(option);
    });
    if (selected && !selectEl.value) {
      const option = document.createElement('option');
      option.value = selected;
      option.textContent = this.formatTime(selected);
      option.selected = true;
      selectEl.appendChild(option);
    }
  }

  adminEnsureRescheduleFormBound() {
    if (this.rescheduleFormBound) return;
    const form = document.getElementById('admin-reschedule-form');
    if (!form) return;
    form.addEventListener('submit', (event) => this.adminHandleRescheduleSubmit(event));
    ['resched-date', 'resched-start', 'resched-duration'].forEach((id) => {
      const input = document.getElementById(id);
      if (input) {
        input.addEventListener('change', () => this.adminEvaluateRescheduleAvailability());
      }
    });
    const cancelBtn = document.getElementById('resched-cancel');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        this.hideModal();
        this.adminResetRescheduleState();
      });
    }
    this.rescheduleFormBound = true;
  }

  adminOpenModifyModal(bookingId) {
    if (!bookingId) return;
    const booking = this.adminBookingsById ? this.adminBookingsById[bookingId] : null;
    if (!booking) return;

    this.adminEnsureRescheduleFormBound();

    this.adminRescheduleState = {
      bookingId,
      roomId: booking.roomId,
      originalDate: booking.date,
      originalStartTime: booking.startTime,
      duration: booking.duration || 1,
      validPayload: null,
    };
    this.adminRescheduleRequestId += 1;

    const idEl = document.getElementById('resched-booking-id');
    if (idEl) idEl.value = bookingId;

    const codeEl = document.getElementById('resched-booking-code');
    if (codeEl) codeEl.value = bookingId;

    const roomEl = document.getElementById('resched-room');
    if (roomEl) {
      const room = this.rooms.find((r) => r.id === booking.roomId);
      roomEl.value = room ? room.name : booking.roomId;
    }

    const dateEl = document.getElementById('resched-date');
    if (dateEl) dateEl.value = booking.date;

    const durationEl = document.getElementById('resched-duration');
    if (durationEl) {
      const durationValue = String(booking.duration || 1);
      Array.from(durationEl.options).forEach((opt) => {
        if (!['1', '2', '3'].includes(opt.value)) opt.remove();
      });
      durationEl.value = durationValue;
      if (durationEl.value !== durationValue) {
        const opt = document.createElement('option');
        opt.value = durationValue;
        opt.textContent = `${durationValue} hour${durationValue === '1' ? '' : 's'}`;
        opt.selected = true;
        durationEl.appendChild(opt);
      }
    }

    const timeSelect = document.getElementById('resched-start');
    if (timeSelect) {
      this.adminPopulateRescheduleTimes(timeSelect, booking.startTime);
    }

    const statusEl = document.getElementById('resched-status');
    if (statusEl) statusEl.textContent = 'Select a new date and time.';

    const submitBtn = document.getElementById('resched-submit');
    if (submitBtn) submitBtn.disabled = true;

    this.showModal('admin-reschedule-modal');
    this.adminEvaluateRescheduleAvailability();
  }

  async adminEvaluateRescheduleAvailability() {
    const state = this.adminRescheduleState;
    const statusEl = document.getElementById('resched-status');
    const submitBtn = document.getElementById('resched-submit');
    if (!state) {
      if (statusEl) statusEl.textContent = '';
      if (submitBtn) submitBtn.disabled = true;
      return;
    }

    const dateEl = document.getElementById('resched-date');
    const timeEl = document.getElementById('resched-start');
    const durationEl = document.getElementById('resched-duration');
    if (!dateEl || !timeEl || !durationEl) return;

    const date = dateEl.value;
    const startTime = timeEl.value;
    const duration = Number(durationEl.value || state.duration || 1);

    this.adminRescheduleState.validPayload = null;

    if (!date || !startTime || !Number.isFinite(duration)) {
      if (statusEl) statusEl.textContent = 'Select date, time, and duration.';
      if (submitBtn) submitBtn.disabled = true;
      return;
    }

    if (!this.adminIsWithinBusinessHours(startTime, duration)) {
      if (statusEl) statusEl.textContent = 'Outside business hours.';
      if (submitBtn) submitBtn.disabled = true;
      return;
    }

    const candidateStart = new Date(`${date}T${startTime}`);
    if (Number.isNaN(candidateStart.getTime())) {
      if (statusEl) statusEl.textContent = 'Invalid date/time.';
      if (submitBtn) submitBtn.disabled = true;
      return;
    }

    if (candidateStart.getTime() < Date.now()) {
      if (statusEl) statusEl.textContent = 'Selected time is in the past.';
      if (submitBtn) submitBtn.disabled = true;
      return;
    }

    if (!window.firebaseFunctions || !window.firebaseFunctions.httpsCallable) {
      if (statusEl) statusEl.textContent = 'Functions unavailable.';
      if (submitBtn) submitBtn.disabled = true;
      return;
    }

    const requestId = ++this.adminRescheduleRequestId;
    if (statusEl) statusEl.textContent = 'Checking availability...';
    if (submitBtn) submitBtn.disabled = true;

    try {
      const fn = window.firebaseFunctions.httpsCallable('getRoomAvailability');
      const response = await fn({
        date,
        startTime,
        duration,
        roomIds: [state.roomId],
        excludeBookingId: state.bookingId,
      });
      if (requestId !== this.adminRescheduleRequestId) return;

      const remaining = Number(response?.data?.availability?.[state.roomId]);
      if (Number.isFinite(remaining) && remaining > 0) {
        if (statusEl) statusEl.textContent = 'Slot available.';
        if (submitBtn) submitBtn.disabled = false;
        this.adminRescheduleState.validPayload = { date, startTime, duration };
      } else {
        if (statusEl) statusEl.textContent = 'Selected time is unavailable.';
        if (submitBtn) submitBtn.disabled = true;
      }
    } catch (error) {
      if (requestId !== this.adminRescheduleRequestId) return;
      console.error('adminEvaluateRescheduleAvailability', error);
      if (statusEl) statusEl.textContent = error?.message || 'Unable to verify availability.';
      if (submitBtn) submitBtn.disabled = true;
    }
  }

  async adminHandleRescheduleSubmit(event) {
    event.preventDefault();
    const state = this.adminRescheduleState;
    if (!state || !state.validPayload) {
      this.showNotification('Select an available time before saving.', 'warning');
      return;
    }

    if (!window.firebaseFunctions || !window.firebaseFunctions.httpsCallable) {
      this.showNotification('Functions not available', 'error');
      return;
    }

    try {
      this.showLoading('Updating booking...');
      const fn = window.firebaseFunctions.httpsCallable('adminRebookBySecret');
      await fn({
        bookingId: state.bookingId,
        newDate: state.validPayload.date,
        newStartTime: state.validPayload.startTime,
        newDuration: state.validPayload.duration,
        roomId: state.roomId,
      });
      this.hideLoading();
      this.hideModal();
      this.adminResetRescheduleState();
      this.showNotification('Booking updated', 'success');
      this.adminFetchForSelectedDate();
    } catch (err) {
      this.hideLoading();
      console.error('adminHandleRescheduleSubmit', err);
      this.showError(err.message || 'Unable to update booking');
    }
  }

  adminResetRescheduleState() {
    this.adminRescheduleState = null;
    this.adminRescheduleRequestId += 1;
    const statusEl = document.getElementById('resched-status');
    if (statusEl) statusEl.textContent = '';
    const submitBtn = document.getElementById('resched-submit');
    if (submitBtn) submitBtn.disabled = true;
  }


  viewBooking(bookingId) {
    const booking = this.mockBookings.find((b) => b.id === bookingId);
    if (booking) {
      alert(
        `Booking Details:\r\n\r\nID: ${booking.id}\r\nCustomer: ${booking.customerName}\r\nEmail: ${booking.email}\r\nDate: ${booking.date}\r\nRoom: ${booking.roomType}\r\nStatus: ${booking.status}`,
      );
    }
  }

  editBooking(bookingId) {
    this.showNotification('Booking edit feature: Contact development team', 'info');
  }

  // Utility Methods
  showLoading(message = 'Loading...') {
    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingText = document.querySelector('.loading-text');

    if (loadingOverlay && loadingText) {
      loadingText.textContent = message;
      loadingOverlay.classList.remove('hidden');
    }
  }

  hideLoading() {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
      loadingOverlay.classList.add('hidden');
    }
  }

  showNotification(message, type = 'info') {
    const toast = document.getElementById('notification-toast');
    const icon = document.querySelector('.toast-icon');
    const messageEl = document.querySelector('.toast-message');

    if (!toast || !icon || !messageEl) return;

    const icons = {
      success: 'fas fa-check-circle',
      error: 'fas fa-exclamation-triangle',
      warning: 'fas fa-exclamation-circle',
      info: 'fas fa-info-circle',
    };

    icon.className = `toast-icon ${icons[type]}`;
    messageEl.textContent = message;

    const colors = {
      success: 'var(--color-success)',
      error: 'var(--color-error)',
      warning: 'var(--color-warning)',
      info: 'var(--neon-purple)',
    };

    icon.style.color = colors[type];
    toast.classList.add('show');

    setTimeout(() => {
      this.hideNotification();
    }, 5000);
  }

  hideNotification() {
    const toast = document.getElementById('notification-toast');
    if (toast) {
      toast.classList.remove('show');
    }
  }

  showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('hidden');
      // Use rAF so CSS transitions fire consistently
      requestAnimationFrame(() => modal.classList.add('show'));
    }
  }

  hideModal() {
    document.querySelectorAll('.modal').forEach((modal) => {
      modal.classList.remove('show');
      modal.classList.add('hidden');
    });
    this.adminResetRescheduleState();
  }

  showError(message) {
    const errorMessage = document.getElementById('error-message');
    if (errorMessage) {
      errorMessage.textContent = message;
      this.showModal('error-modal');
    }
  }
}

// Initialize the application
const app = new BarjunkoApp();
app.init();

// Ensure app is globally accessible for onclick handlers
window.app = app;

// Global error handler
window.addEventListener('error', (e) => {
  console.error('Application Error:', e.error);
  if (app && app.showError) {
    app.showError('An unexpected error occurred. Please refresh the page and try again.');
  }
});


















