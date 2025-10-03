// BarZunko Karaoke Booking Application
class BarZunkoApp {
  constructor() {
    this.currentPage = 'landing';
    this.currentStep = 1;
    this.maxStep = 5;
    this.bookingData = {};
    this.currentDate = new Date();
    this.selectedDate = null;
    this.selectedTime = null;
    this.selectedRoom = null;
    this.cardElement = null; // for Stripe Elements

    // Business data
    this.businessData = {
      name: 'BarZunko',
      address: '675 Yonge St Basement, Toronto, ON M4Y 2B2',
      phone: '+1-416-968-0909',
      hours: '6:00 PM - 1:00 AM Daily',
      email: 'info@BarZunko.com',
    };

    this.rooms = [
      {
        id: 'small',
        name: 'Small Room',
        capacity: '1-6 people',
        minCapacity: 1,
        maxCapacity: 6,
        hourlyRate: 30,
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
        capacity: '7-12 people',
        minCapacity: 7,
        maxCapacity: 12,
        hourlyRate: 60,
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
        capacity: '13-20 people',
        minCapacity: 13,
        maxCapacity: 20,
        hourlyRate: 90,
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
        capacity: '21+ people',
        minCapacity: 21,
        maxCapacity: 30,
        hourlyRate: 90,
        features: [
          'Concert-grade sound',
          'Stage with spotlights',
          'Song library 50k+',
          'Premium lounge',
          'Full bar service',
          'Dance floor',
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

    if (this.currentPage === 'booking' || document.getElementById('booking-page')) {
      this.goToStep(1); // <--- call it here
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.setupApplication();
      });
    } else {
      this.setupApplication();
    }
  }

  setupApplication() {
    this.setupEventListeners();
    // Render initial landing content so shared components like room cards and testimonials are available when needed
    this.renderLandingPage();
    // Always update the calendar so booking pages have the latest date/time slots
    this.updateCalendar();
    // Show the page based on the currentPage property rather than always defaulting to 'landing'.
    // This allows us to bootstrap individual HTML pages (landing, booking, manage, admin, confirmation)
    // by setting app.currentPage before calling init().
    this.showPage(this.currentPage);
  }

  setupEventListeners() {
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

      if (e.target.id === 'duration') {
        this.updateBookingSummary();
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

  // --- Navigation helpers (ADD THESE) ---
  goToStep(step) {
    // Clamp between 1..5
    this.currentStep = Math.max(1, Math.min(5, step));

    // Toggle step panels
    const steps = document.querySelectorAll('.booking-step');
    steps.forEach((el, idx) => {
      const isActive = idx === this.currentStep - 1;
      el.classList.toggle('active', isActive);
    });

    // Toggle progress bar
    const progressSteps = document.querySelectorAll('.progress-step');
    progressSteps.forEach((el, idx) => {
      el.classList.toggle('active', idx <= this.currentStep - 1);
    });

    // If we’ve arrived at Step 5, make sure Stripe Element is mounted
    if (this.currentStep === 5 && !this.cardElement) {
      this.setupPaymentFormFormatting();
    }

    // Toggle buttons
    this.updateNavigationButtons();

    // Optional: refresh the summary UI each time
    if (typeof this.updateSummary === 'function') {
      this.updateSummary();
    }
  }

  updateNavigationButtons() {
    const nextBtn = document.getElementById('next-btn');
    const backBtn = document.getElementById('back-btn');
    const completeBtn = document.getElementById('complete-booking-btn');

    if (backBtn) backBtn.classList.toggle('hidden', this.currentStep === 1);
    if (nextBtn) nextBtn.classList.toggle('hidden', this.currentStep >= 5);
    if (completeBtn) completeBtn.classList.toggle('hidden', this.currentStep !== 5);
  }

  nextStep() {
    // If you have per-step validation, call it here:
    if (typeof this.validateCurrentStep === 'function') {
      const ok = this.validateCurrentStep();
      if (!ok) return;
    }
    if (this.currentStep < 5) this.goToStep(this.currentStep + 1);
  }

  prevStep() {
    if (this.currentStep > 1) this.goToStep(this.currentStep - 1);
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
        }

        this.bookingData.partySize = partySize;
        this.bookingData.duration = duration;
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
          this.bookingData.customer = {
            firstName: document.getElementById('first-name').value.trim(),
            lastName: document.getElementById('last-name').value.trim(),
            email: email,
            phone: document.getElementById('phone').value.trim(),
            specialRequests: document.getElementById('special-requests')?.value.trim() || '',
          };
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
    this.updateCalendar();
    this.updateTimeSlots();
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
  renderRoomSelection() {
    const roomGrid = document.getElementById('room-selection-grid');
    if (!roomGrid) return;

    roomGrid.innerHTML = '';

    this.rooms.forEach((room) => {
      const roomOption = document.createElement('div');
      roomOption.className = 'room-option';
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
            `;

      roomOption.addEventListener('click', () => {
        this.selectRoom(room);
      });

      if (this.selectedRoom && this.selectedRoom.id === room.id) {
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

  validatePartySize() {
    const partySizeEl = document.getElementById('party-size');
    const validation = document.getElementById('party-validation');

    if (!partySizeEl || !validation) return;

    const partySize = parseInt(partySizeEl.value);

    if (!this.selectedRoom) {
      validation.innerHTML = '<i class="fas fa-info-circle"></i> Select a room first';
      validation.className = 'party-validation';
      return;
    }

    const room = this.selectedRoom;

    if (partySize >= room.minCapacity && partySize <= room.maxCapacity) {
      validation.innerHTML = '<i class="fas fa-check-circle"></i> Perfect fit for ' + room.name;
      validation.className = 'party-validation success';
    } else {
      validation.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${room.name} is for ${room.capacity}`;
      validation.className = 'party-validation error';
    }
  }

  // Summary Methods
  updateBookingSummary() {
    const summaryContent = document.getElementById('booking-summary-content');
    if (!summaryContent) return;

    if (!this.selectedDate || !this.selectedTime || !this.selectedRoom) {
      summaryContent.innerHTML = '<p>Complete the previous steps to see your booking summary.</p>';
      return;
    }

    const room = this.selectedRoom;
    const partySizeEl = document.getElementById('party-size');
    const durationEl = document.getElementById('duration');

    const partySize = partySizeEl ? parseInt(partySizeEl.value) || 1 : 1;
    const duration = durationEl ? parseInt(durationEl.value) || 3 : 3;
    const totalCost = room.hourlyRate * duration;

    // Calculate end time
    const [startHours, startMinutes] = this.selectedTime.split(':').map(Number);
    const endTime = new Date();
    endTime.setHours(startHours + duration, startMinutes, 0, 0);
    const endTimeString = endTime.toTimeString().slice(0, 5);

    summaryContent.innerHTML = `
            <div class="summary-row">
                <span class="summary-label">Date:</span>
                <span class="summary-value">${new Date(this.selectedDate).toLocaleDateString()}</span>
            </div>
            <div class="summary-row">
                <span class="summary-label">Time:</span>
                <span class="summary-value">${this.formatTime(this.selectedTime)} - ${this.formatTime(endTimeString)}</span>
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
                <span class="summary-value">${duration} hours</span>
            </div>
            <div class="summary-row">
                <span class="summary-label">Rate:</span>
                <span class="summary-value">$${room.hourlyRate}/hour</span>
            </div>
            <div class="summary-row">
                <span class="summary-label">Total Cost:</span>
                <span class="summary-value summary-total">$${totalCost}</span>
            </div>
        `;
  }

  updatePaymentSummary() {
    const summaryContent = document.getElementById('payment-summary-content');
    if (!summaryContent || !this.selectedRoom) return;

    const room = this.selectedRoom;
    const durationEl = document.getElementById('duration');
    const duration = durationEl ? parseInt(durationEl.value) : 3;
    const totalCost = room.hourlyRate * duration;
    const depositAmount = Math.round(totalCost * 0.5);
    const remainingBalance = totalCost - depositAmount;

    summaryContent.innerHTML = `
            <div class="summary-row">
                <span class="summary-label">Total Cost:</span>
                <span class="summary-value">$${totalCost}</span>
            </div>
            <div class="summary-row">
                <span class="summary-label">Deposit (50%):</span>
                <span class="summary-value summary-total">$${depositAmount}</span>
            </div>
            <div class="summary-row">
                <span class="summary-label">Remaining Balance:</span>
                <span class="summary-value">$${remainingBalance} (due on arrival)</span>
            </div>
        `;

    this.bookingData.totalCost = totalCost;
    this.bookingData.depositAmount = depositAmount;
    this.bookingData.remainingBalance = remainingBalance;
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

  completeBooking() {
    // Begin the booking process by showing a loading overlay
    this.showLoading('Processing your booking...');

    // Simulate asynchronous processing. In the future this can be replaced by a call
    // to a Firebase Cloud Function (createBooking) which performs double‑booking
    // validation, creates a Stripe PaymentIntent, writes to Firestore, and returns
    // a confirmation. Once the booking is created successfully we persist the
    // bookingData to localStorage and redirect the user to the dedicated
    // confirmation page (confirmation.html).
    setTimeout(() => {
      this.hideLoading();

      // Generate a temporary booking ID using the current timestamp. In a real
      // implementation this would come from Firestore.
      const bookingId = 'BJ' + String(Date.now()).slice(-6);

      this.bookingData.id = bookingId;
      this.bookingData.status = 'confirmed';
      this.bookingData.createdAt = new Date().toISOString();

      const [startHours, startMinutes] = this.bookingData.startTime.split(':').map(Number);
      const endTime = new Date();
      endTime.setHours(startHours + this.bookingData.duration, startMinutes, 0, 0);
      this.bookingData.endTime = endTime.toTimeString().slice(0, 5);

      // Push the booking into the mock bookings array for local lookups. This
      // ensures that the manage booking page still works without a backend.
      this.mockBookings.push({
        id: bookingId,
        customerName: `${this.bookingData.customer.firstName} ${this.bookingData.customer.lastName}`,
        email: this.bookingData.customer.email,
        phone: this.bookingData.customer.phone,
        roomType: this.bookingData.room.id,
        date: this.bookingData.date,
        startTime: this.bookingData.startTime,
        endTime: this.bookingData.endTime,
        duration: this.bookingData.duration,
        partySize: this.bookingData.partySize,
        totalCost: this.bookingData.totalCost,
        depositPaid: this.bookingData.depositAmount,
        status: 'confirmed',
      });

      // Persist bookingData to localStorage so the confirmation page can
      // reconstruct the summary. This avoids relying on hidden DOM pages.
      try {
        localStorage.setItem('barzunkoBooking', JSON.stringify(this.bookingData));
      } catch (err) {
        console.warn('Unable to save booking data to localStorage', err);
      }

      // Redirect the user to the standalone confirmation page. Using
      // window.location ensures a full page reload into confirmation.html.
      window.location.href = 'confirmation.html';
    }, 3000);
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
      btn.addEventListener('click', () => {
        const message = `Just booked an amazing karaoke experience at BarZunko! 🎤✨ #BarZunko #Karaoke #Toronto`;

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
  lookupBooking(e) {
    e.preventDefault();

    const searchInput = document.getElementById('booking-search');
    if (!searchInput) return;

    const searchTerm = searchInput.value.trim().toLowerCase();
    if (!searchTerm) {
      this.showNotification('Please enter a booking reference or email', 'error');
      return;
    }

    this.showLoading('Looking up your booking...');

    setTimeout(() => {
      this.hideLoading();

      const booking = this.mockBookings.find(
        (b) => b.id.toLowerCase() === searchTerm || b.email.toLowerCase() === searchTerm,
      );

      if (booking) {
        this.displayBookingDetails(booking);
      } else {
        this.showNotification(
          'Booking not found. Please check your reference number or email.',
          'error',
        );
      }
    }, 1500);
  }

  displayBookingDetails(booking) {
    const bookingDetails = document.getElementById('booking-details');
    if (!bookingDetails) return;

    const room = this.rooms.find((r) => r.id === booking.roomType);

    const bookingDateTime = new Date(`${booking.date}T${booking.startTime}`);
    const now = new Date();
    const hoursDifference = (bookingDateTime - now) / (1000 * 60 * 60);
    const canCancel = hoursDifference > 24;

    bookingDetails.innerHTML = `
            <h2>Booking Details</h2>
            <div class="booking-card">
                <div class="summary-row">
                    <span class="summary-label">Booking ID:</span>
                    <span class="summary-value">${booking.id}</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">Customer:</span>
                    <span class="summary-value">${booking.customerName}</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">Email:</span>
                    <span class="summary-value">${booking.email}</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">Phone:</span>
                    <span class="summary-value">${booking.phone}</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">Date & Time:</span>
                    <span class="summary-value">${new Date(booking.date).toLocaleDateString()} at ${this.formatTime(booking.startTime)}</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">Room:</span>
                    <span class="summary-value">${room?.name || booking.roomType} (${booking.partySize} people)</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">Duration:</span>
                    <span class="summary-value">${booking.duration} hours</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">Status:</span>
                    <span class="summary-value">
                        <span class="status-${booking.status}">${booking.status.toUpperCase()}</span>
                    </span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">Total Cost:</span>
                    <span class="summary-value">$${booking.totalCost}</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">Deposit Paid:</span>
                    <span class="summary-value">$${booking.depositPaid}</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">Remaining Balance:</span>
                    <span class="summary-value">$${booking.totalCost - booking.depositPaid} (due on arrival)</span>
                </div>
            </div>
            
            <div class="booking-actions">
                ${
                  canCancel && booking.status === 'confirmed'
                    ? `
                    <button class="btn btn--outline" onclick="app.cancelBooking('${booking.id}')">
                        <i class="fas fa-times-circle"></i>
                        Cancel Booking
                    </button>
                    <button class="btn btn--secondary" onclick="app.rebookingFlow('${booking.id}')">
                        <i class="fas fa-edit"></i>
                        Modify Booking
                    </button>
                `
                    : `
                    <div style="padding: var(--space-16); background: rgba(255, 193, 7, 0.1); border-radius: var(--radius-base); border: 1px solid rgba(255, 193, 7, 0.2); text-align: center;">
                        <i class="fas fa-info-circle" style="color: var(--golden-yellow); margin-right: var(--space-8);"></i>
                        <span style="color: var(--golden-yellow);">
                            ${booking.status === 'cancelled' ? 'Booking has been cancelled' : 'Cancellation not available (less than 24 hours before booking)'}
                        </span>
                    </div>
                `
                }
                <button class="btn btn--primary" onclick="window.print()">
                    <i class="fas fa-print"></i>
                    Print Details
                </button>
                <button class="btn btn--outline" onclick="window.location.href='tel:${this.businessData.phone}'">
                    <i class="fas fa-phone"></i>
                    Call Us
                </button>
            </div>
        `;

    bookingDetails.classList.remove('hidden');
  }

  cancelBooking(bookingId) {
    const booking = this.mockBookings.find((b) => b.id === bookingId);
    if (!booking) return;

    const confirmCancel = confirm(
      `Are you sure you want to cancel booking ${bookingId}? Your deposit of $${booking.depositPaid} will be refunded within 3-5 business days.`,
    );

    if (confirmCancel) {
      this.showLoading('Cancelling your booking...');

      setTimeout(() => {
        this.hideLoading();

        booking.status = 'cancelled';
        this.displayBookingDetails(booking);

        this.showNotification(
          'Booking cancelled successfully. Refund will be processed within 3-5 business days.',
          'success',
        );
      }, 2000);
    }
  }

  rebookingFlow(bookingId) {
    this.showNotification('Rebooking feature: Contact us at ' + this.businessData.phone, 'info');
  }

  // Admin Methods
  initAdminPage() {
    const loginForm = document.getElementById('admin-login');
    const dashboard = document.getElementById('admin-dashboard');

    if (loginForm) loginForm.classList.remove('hidden');
    if (dashboard) dashboard.classList.add('hidden');
  }

  adminLogin(e) {
    e.preventDefault();

    const usernameEl = document.getElementById('admin-username');
    const passwordEl = document.getElementById('admin-password');

    if (!usernameEl || !passwordEl) return;

    const username = usernameEl.value.trim();
    const password = passwordEl.value.trim();

    this.showLoading('Authenticating...');

    setTimeout(() => {
      this.hideLoading();

      if (username === 'admin' && password === 'BarZunko123') {
        const loginForm = document.getElementById('admin-login');
        const dashboard = document.getElementById('admin-dashboard');

        if (loginForm) loginForm.classList.add('hidden');
        if (dashboard) dashboard.classList.remove('hidden');

        this.loadAdminDashboard();
        this.showNotification('Welcome to the admin dashboard!', 'success');
      } else {
        this.showNotification('Invalid username or password', 'error');
      }
    }, 1500);
  }

  adminLogout() {
    const loginForm = document.getElementById('admin-login');
    const dashboard = document.getElementById('admin-dashboard');
    const usernameEl = document.getElementById('admin-username');
    const passwordEl = document.getElementById('admin-password');

    if (loginForm) loginForm.classList.remove('hidden');
    if (dashboard) dashboard.classList.add('hidden');

    if (usernameEl) usernameEl.value = '';
    if (passwordEl) passwordEl.value = '';

    this.showNotification('Logged out successfully', 'success');
  }

  loadAdminDashboard() {
    this.renderBookingsTable();
  }

  renderBookingsTable() {
    const tableBody = document.getElementById('bookings-table-body');
    if (!tableBody) return;

    tableBody.innerHTML = '';

    this.mockBookings.forEach((booking) => {
      const room = this.rooms.find((r) => r.id === booking.roomType);
      const row = document.createElement('tr');
      row.innerHTML = `
                <td>${booking.id}</td>
                <td>
                    <div>${booking.customerName}</div>
                    <div style="font-size: var(--font-size-sm); color: var(--color-text-secondary);">${booking.email}</div>
                </td>
                <td>${room?.name || booking.roomType}</td>
                <td>
                    <div>${new Date(booking.date).toLocaleDateString()}</div>
                    <div style="font-size: var(--font-size-sm); color: var(--color-text-secondary);">${this.formatTime(booking.startTime)}</div>
                </td>
                <td><span class="status-${booking.status}">${booking.status.toUpperCase()}</span></td>
                <td>
                    <div class="table-actions">
                        <button class="btn btn--table btn--outline" onclick="app.viewBooking('${booking.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn--table btn--secondary" onclick="app.editBooking('${booking.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </td>
            `;
      tableBody.appendChild(row);
    });
  }

  viewBooking(bookingId) {
    const booking = this.mockBookings.find((b) => b.id === bookingId);
    if (booking) {
      alert(
        `Booking Details:\n\nID: ${booking.id}\nCustomer: ${booking.customerName}\nEmail: ${booking.email}\nDate: ${booking.date}\nRoom: ${booking.roomType}\nStatus: ${booking.status}`,
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
      modal.classList.add('show');
    }
  }

  hideModal() {
    document.querySelectorAll('.modal').forEach((modal) => {
      modal.classList.remove('show');
    });
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
const app = new BarZunkoApp();
app.init();

// Global error handler
window.addEventListener('error', (e) => {
  console.error('Application Error:', e.error);
  if (app && app.showError) {
    app.showError('An unexpected error occurred. Please refresh the page and try again.');
  }
});

// Ensure app is globally accessible for onclick handlers
window.app = app;
