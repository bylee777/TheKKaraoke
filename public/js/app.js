// Barzunko Karaoke Booking Application
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_ALLOWED_CHARS = /^[0-9+\-().\s]+$/;
class BarzunkoApp {
  constructor() {
    this.currentPage = 'landing';
    this.currentStep = 1;
    this.maxStep = 5;
    this.bookingData = { duration: 1 };
    this.extraGuestAcknowledged = false;
    this.roomAvailability = null;
    this.roomAvailabilityLoading = false;
    this.roomAvailabilityError = false;
    this.roomAvailabilityRequestId = 0;
    this.availableSlotsCache = {};
    this.timeSlotsRequestId = 0;
    this.manageLookupResults = [];
    this.activeManagedBooking = null;
    this.currentManagedEmail = '';

    this.isRebookingFlow = false;
    this.rebookContext = null;
    this.rebookingStorageKey = 'barzunkoRebookContext';
    this.taxRate = 0.13;

    this.adminBookingsById = {};
    this.adminGridAssignments = {};
    this.adminRescheduleState = null;
    this.adminRescheduleRequestId = 0;
    this.rescheduleFormBound = false;
    this.adminModifierBound = false;
    this.slotIncrementMinutes = 60;
    this.adminScheduleIncrementMinutes = 30;
    this.minBookingDurationMinutes = 60;
    this.businessHoursByDay = {
      0: { open: '13:00', close: '02:30' }, // Sunday
      1: { open: '18:00', close: '02:30' }, // Monday
      2: { open: '18:00', close: '02:30' },
      3: { open: '18:00', close: '02:30' },
      4: { open: '18:00', close: '02:30' },
      5: { open: '18:00', close: '03:00' }, // Friday
      6: { open: '13:00', close: '03:00' }, // Saturday
    };
    const today = new Date();
    const defaultDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    this.businessTimeConfig = this.buildBusinessTimeConfig(defaultDateStr);

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
    this.staffAuthUnsubscribe = null;
    this.currentStaffUser = null;
    this.staffDashboardInitialized = false;
    this.staffSelectedDate = null;
    this.adminAutoAdvanceTimer = null;

    this.currentDate = new Date();
    this.adminSelectedDate = null;
    this.selectedDate = null;
    this.selectedTime = null;
    this.selectedRoom = null;
    this.cardElement = null; // for Stripe Elements

    this.listenersBound = false;
    this.applicationInitialized = false;
    this.domReadyHandlerAttached = false;

    this.navigationCooldownMs = 2000;
    this.lastNavigationTime = 0;
    this.submitCooldownMs = 5000;
    this.lastSubmitTime = 0;

    // Business data
    this.businessData = {
      name: 'Barzunko',
      address: '675 Yonge St Basement, Toronto, ON M4Y 2B2',
      phone: '+1-416-968-0909',
      hours:
        'Mon-Thu: 6:00 PM - 2:30 AM | Fri: 6:00 PM - 3:00 AM | Sat: 1:00 PM - 3:00 AM | Sun: 1:00 PM - 2:30 AM',
      email: 'barzunko@gmail.com',
    };

    this.rooms = [
      {
        id: 'small',
        name: 'Small Room',
        capacity: '1-4 people',
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
        photos: [
          'small/KakaoTalk_Photo_2025-11-04-20-57-23 001.jpeg',
          'small/KakaoTalk_Photo_2025-11-04-20-57-23 002.jpeg',
          'small/KakaoTalk_Photo_2025-11-04-20-57-23 003.jpeg',
          'small/KakaoTalk_Photo_2025-11-04-20-57-26 004.jpeg',
        ],
      },
      {
        id: 'medium',
        name: 'Medium Room',
        capacity: '1-8 people',
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
        ],
        photos: [
          'medium/KakaoTalk_Photo_2025-11-04-20-56-39 001.jpeg',
          'medium/KakaoTalk_Photo_2025-11-04-20-56-40 002.jpeg',
          'medium/KakaoTalk_Photo_2025-11-04-20-56-43 003.jpeg',
          'medium/KakaoTalk_Photo_2025-11-04-20-56-46 004.jpeg',
        ],
      },
      {
        id: 'large',
        name: 'Large Room',
        capacity: '1-15 people (max 17)',
        minCapacity: 1,
        maxCapacity: 17,
        includedGuests: 15,
        hourlyRate: 100,
        bookingFee: 0,
        extraGuestRate: 5,
        inventory: 1,
        features: ['Professional sound system', 'Stage lighting', 'Song library 50k+'],
        photos: ['large.jpeg'],
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
          description:
            'Required house vodka or tequila purchase on Fri/Sat only (for under age it can be foods or drinks)',
          amount: 120,
        },
        inventory: 1,
        features: [
          'Stage with spotlights',
          'Song library 50k+',
          'Premium lounge',
          'Dance floor',
          'Required house vodka or tequila purchase on Fri/Sat only (for under age it can be foods or drinks)',
        ],
        photos: ['xlarge.jpeg'],
      },
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

  async ensureDurationAvailable() {
    if (
      !this.selectedRoom ||
      !window.firebaseFunctions ||
      !window.firebaseFunctions.httpsCallable
    ) {
      return true;
    }
    if (!this.selectedDate || !this.selectedTime) {
      // Only enforce once date/time is chosen
      return true;
    }
    try {
      const durationEl = document.getElementById('duration');
      const currentDuration = durationEl
        ? this.normalizeCustomerDuration(durationEl.value, this.bookingData.duration || 1)
        : this.normalizeCustomerDuration(this.bookingData.duration, 1);

      const fn = window.firebaseFunctions.httpsCallable('getMaxAvailableDuration');
      const res = await fn({
        roomId: this.selectedRoom.id,
        date: this.selectedDate,
        startTime: this.selectedTime,
      });
      const maxHours = Number(res.data?.maxDurationHours);
      if (!Number.isFinite(maxHours)) {
        return true;
      }
      if (maxHours <= 0) {
        this.showNotification(
          'That start time is no longer available. Please pick a different time.',
          'warning',
        );
        return false;
      }
      if (currentDuration > maxHours) {
        const clamped = Math.floor(maxHours);
        const hourLabel = clamped === 1 ? 'hour' : 'hours';
        this.showNotification(
          `Only ${clamped} ${hourLabel} are available starting at this time.`,
          'warning',
        );
        if (durationEl) {
          durationEl.value = String(clamped);
        }
        this.bookingData.duration = clamped;
        this.updatePaymentSummary();
        this.updateBookingSummary();
        return false;
      }
      return true;
    } catch (err) {
      console.warn('ensureDurationAvailable failed', err);
      return true;
    }
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

      if (e.target.closest('#admin-modifier')) {
        e.preventDefault();
        this.openAdminModifierModal();
      }

      if (e.target.closest('#admin-export-schedule')) {
        e.preventDefault();
        this.adminExportSchedule();
      }

      if (e.target.closest('#staff-logout')) {
        this.staffLogout();
      }

      if (e.target.closest('.modal-close')) {
        const modalEl = e.target.closest('.modal');
        if (modalEl && modalEl.id) {
          this.hideModal(modalEl.id);
        } else {
          this.hideModal();
        }
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

      if (e.target.id === 'staff-login-form') {
        e.preventDefault();
        this.staffLogin(e);
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
        this.bookingData.duration = this.normalizeCustomerDuration(
          e.target.value,
          this.bookingData.duration || 1,
        );
        this.selectedTime = null;
        this.availableSlotsCache = {};
        this.timeSlotsRequestId += 1;
        this.updateBookingSummary();
        this.updateRoomAvailability();
        this.updatePaymentSummary();
        this.updateCalendar();
        this.updateTimeSlots();
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
      } else if (page === 'staff') {
        this.initStaffPage();
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
      const photoPaths = Array.isArray(room.photos) ? room.photos : [];
      const hasPhotos = photoPaths.length > 0;
      const roomCard = document.createElement('div');
      roomCard.className = 'room-card';
      let galleryMarkup;

      if (hasPhotos) {
        galleryMarkup = `
          <div class="room-gallery" data-room="${room.id}">
            <div class="room-gallery__stage">
              <button type="button" class="room-gallery__nav room-gallery__nav--prev" aria-label="Previous photo"${photoPaths.length === 1 ? ' disabled' : ''}>
                <i class="fas fa-chevron-left"></i>
              </button>
              <img src="${encodeURI(photoPaths[0])}" alt="${room.name} photo 1" class="room-gallery__image" loading="lazy" />
              <button type="button" class="room-gallery__nav room-gallery__nav--next" aria-label="Next photo"${photoPaths.length === 1 ? ' disabled' : ''}>
                <i class="fas fa-chevron-right"></i>
              </button>
            </div>
            <div class="room-gallery__thumbnails">
              ${photoPaths
                .map(
                  (photo, idx) => `
                <button
                  type="button"
                  class="room-gallery__thumb${idx === 0 ? ' is-active' : ''}"
                  data-index="${idx}"
                  aria-label="Show ${room.name} photo ${idx + 1}"
                  aria-pressed="${idx === 0 ? 'true' : 'false'}"
                >
                  <img src="${encodeURI(photo)}" alt="${room.name} thumbnail ${idx + 1}" loading="lazy" />
                </button>
              `,
                )
                .join('')}
            </div>
          </div>
        `;
      } else {
        galleryMarkup = `
          <div class="room-gallery room-gallery--empty">
            <div class="room-gallery__stage">
              <div class="room-gallery__placeholder">
                <i class="fas fa-microphone"></i>
              </div>
            </div>
          </div>
        `;
      }

      roomCard.innerHTML = `
        ${galleryMarkup}
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
        </div>
      `;

      roomsGrid.appendChild(roomCard);
      if (hasPhotos) {
        this.attachRoomGalleryHandlers(roomCard, room);
      }
    });
  }

  attachRoomGalleryHandlers(roomCard, room) {
    const photoPaths = Array.isArray(room.photos) ? room.photos : [];
    if (!photoPaths.length) return;

    const mainImg = roomCard.querySelector('.room-gallery__image');
    if (!mainImg) return;

    const prevBtn = roomCard.querySelector('.room-gallery__nav--prev');
    const nextBtn = roomCard.querySelector('.room-gallery__nav--next');
    const thumbButtons = Array.from(roomCard.querySelectorAll('.room-gallery__thumb'));

    let currentIndex = 0;

    const updateImage = (index) => {
      currentIndex = Math.max(0, Math.min(index, photoPaths.length - 1));
      const src = encodeURI(photoPaths[currentIndex]);
      mainImg.src = src;
      mainImg.setAttribute('alt', `${room.name} photo ${currentIndex + 1}`);

      thumbButtons.forEach((btn, idx) => {
        const isActive = idx === currentIndex;
        btn.classList.toggle('is-active', isActive);
        btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });

      if (prevBtn) prevBtn.disabled = currentIndex === 0;
      if (nextBtn) nextBtn.disabled = currentIndex === photoPaths.length - 1;
    };

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        updateImage(currentIndex - 1);
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        updateImage(currentIndex + 1);
      });
    }

    thumbButtons.forEach((btn, idx) => {
      btn.addEventListener('click', () => {
        updateImage(idx);
      });
    });

    updateImage(0);
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
    this.bookingData = { duration: 1 };
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
    if (step === 1) {
      this.renderRoomSelection();
    } else if (step === 3) {
      this.updateCalendar();
      this.updateTimeSlots();
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

  temporarilyDisableButton(buttonId, durationMs) {
    const button = document.getElementById(buttonId);
    if (!button) return;
    button.disabled = true;
    window.setTimeout(() => {
      button.disabled = false;
    }, durationMs);
  }

  async nextStep() {
    const now = Date.now();
    if (now < this.lastNavigationTime + this.navigationCooldownMs) {
      this.showNotification('Please wait a moment before continuing.', 'warning');
      return;
    }

    if (!this.validateCurrentStep()) {
      return;
    }

    // Prevent advancing if the selected duration overbooks the slot
    if (!(await this.ensureDurationAvailable())) {
      return;
    }

    if (this.currentStep < this.maxStep) {
      this.lastNavigationTime = now;
      this.temporarilyDisableButton('next-btn', this.navigationCooldownMs);
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
      case 1: {
        const partySizeEl = document.getElementById('party-size');
        if (!partySizeEl) return false;

        const partySize = Number.parseInt(partySizeEl.value, 10);
        if (!Number.isFinite(partySize) || partySize <= 0) {
          this.showNotification('Please enter a valid party size', 'error');
          return false;
        }

        if (!this.selectedRoom) {
          this.showNotification('Please select a room', 'error');
          return false;
        }
        this.bookingData.room = this.selectedRoom;

        const room = this.rooms.find((r) => r.id === this.selectedRoom.id);
        if (room) {
          if (partySize < room.minCapacity || partySize > room.maxCapacity) {
            this.showNotification(
              `Party size must be between ${room.minCapacity}-${room.maxCapacity} for ${room.name}`,
              'error',
            );
            return false;
          }

          const includedGuests = room.includedGuests ?? room.maxCapacity;
          if (partySize > includedGuests && !this.extraGuestAcknowledged) {
            this.showNotification(
              'Please acknowledge the extra guest surcharge before continuing.',
              'warning',
            );
            return false;
          }
        }

        this.bookingData.partySize = partySize;
        this.bookingData.extraGuestAcknowledged = this.extraGuestAcknowledged;
        return true;
      }

      case 2: {
        const durationEl = document.getElementById('duration');
        const duration = this.normalizeCustomerDuration(
          durationEl ? durationEl.value : this.bookingData.duration,
          1,
        );
        if (!Number.isFinite(duration) || duration < 1) {
          this.showNotification('Please select a duration', 'error');
          return false;
        }
        if (duration > 3) {
          this.showNotification('Maximum booking duration is 3 hours.', 'error');
          return false;
        }
        this.bookingData.duration = duration;
        return true;
      }

      case 3: {
        if (!this.selectedDate || !this.selectedTime) {
          this.showNotification('Please select a date and time', 'error');
          return false;
        }

        const selectedDateTime = new Date(`${this.selectedDate}T${this.selectedTime}`);
        const sixHoursFromNow = new Date(Date.now() + 6 * 60 * 60 * 1000);

        if (selectedDateTime < sixHoursFromNow) {
          this.showNotification('Bookings must be made at least 6 hours in advance', 'error');
          return false;
        }

        this.bookingData.date = this.selectedDate;
        this.bookingData.startTime = this.selectedTime;
        return true;
      }

      case 4: {
        const customerInfo = this.collectCustomerInfo({ requireTerms: true, showErrors: true });
        if (!customerInfo) {
          return false;
        }
        this.bookingData.customer = customerInfo;
        this.bookingData.termsAccepted = true;
        return true;
      }

      case 5:
        return true;
    }
    return true;
  }

  isValidEmail(value) {
    const email = (value || '').trim();
    if (!email) return false;
    return EMAIL_REGEX.test(email);
  }

  isValidPhone(value) {
    if (typeof value !== 'string') return false;
    const trimmed = value.trim();
    if (!trimmed || !PHONE_ALLOWED_CHARS.test(trimmed)) {
      return false;
    }
    const digitsOnly = trimmed.replace(/\D/g, '');
    return digitsOnly.length >= 10 && digitsOnly.length <= 15;
  }

  collectCustomerInfo({ requireTerms = true, showErrors = true } = {}) {
    if (showErrors) {
      this.clearContactFieldErrors();
    }
    const firstNameEl = document.getElementById('first-name');
    const lastNameEl = document.getElementById('last-name');
    const emailEl = document.getElementById('email');
    const phoneEl = document.getElementById('phone');
    const specialRequestsEl = document.getElementById('special-requests');

    if (!firstNameEl || !lastNameEl || !emailEl || !phoneEl) {
      if (showErrors) {
        this.showNotification(
          'Contact form is unavailable. Please refresh the page and try again.',
          'error',
        );
      }
      return null;
    }

    const firstName = firstNameEl.value.trim();
    const lastName = lastNameEl.value.trim();
    const email = emailEl.value.trim();
    const phoneRaw = phoneEl.value.trim();
    const specialRequests = specialRequestsEl?.value.trim() || '';

    if (!firstName || !lastName || !email || !phoneRaw) {
      if (showErrors) {
        if (!firstName) this.showFieldError('first-name', 'First name is required');
        if (!lastName) this.showFieldError('last-name', 'Last name is required');
        if (!email) this.showFieldError('email', 'Email is required');
        if (!phoneRaw) this.showFieldError('phone', 'Phone number is required');
        this.showNotification('Please fill in all required contact fields', 'error');
      }
      return null;
    }

    if (!this.isValidEmail(email)) {
      if (showErrors) {
        this.showFieldError(
          'email',
          'Please enter a valid email (e.g., name@example.com) before continuing.',
        );
        this.showNotification('Please correct your email before continuing.', 'error');
      }
      return null;
    }

    if (!this.isValidPhone(phoneRaw)) {
      if (showErrors) {
        this.showFieldError(
          'phone',
          'Please enter a valid phone number with 10-15 digits so we can reach you.',
        );
        this.showNotification('Please correct your phone number before continuing.', 'error');
      }
      return null;
    }

    if (requireTerms) {
      const termsCheckbox = document.getElementById('terms-checkbox');
      if (!termsCheckbox || !termsCheckbox.checked) {
        if (showErrors) {
          this.showFieldError('terms-checkbox', 'Please review and accept the terms to continue.');
          this.showNotification(
            'Please review and accept the terms & conditions to continue',
            'error',
          );
        }
        return null;
      }
    }

    return {
      firstName,
      lastName,
      email,
      phone: phoneRaw.trim(),
      specialRequests,
      termsAccepted: true,
    };
  }

  mapContactInfoError(error) {
    if (!error) return null;
    const code = String(error.code || error?.details?.code || '').toLowerCase();
    const rawMessage = String(error.message || error?.details || '').trim();
    const message = rawMessage || '';
    const lower = message.toLowerCase();
    const looksLikeContactIssue =
      lower.includes('customer email') ||
      lower.includes('customer phone') ||
      lower.includes('contact information') ||
      lower.includes('valid email') ||
      lower.includes('valid phone');
    const isInvalidArgument = code === 'functions/invalid-argument' || code === 'invalid-argument';
    if (!looksLikeContactIssue && !isInvalidArgument) {
      return null;
    }

    if (lower.includes('email')) {
      return 'Please enter a valid email address so we can send your confirmation.';
    }
    if (lower.includes('phone')) {
      return 'Please enter a valid phone number (10-15 digits) so we can reach you.';
    }
    return 'Please double-check your email and phone number, then try again.';
  }

  showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    field.classList.add('has-error');
    const wrapper =
      field.closest('.form-group') || field.closest('.terms-consent') || field.parentElement;
    if (!wrapper) return;
    wrapper.classList.add('has-error');
    let errorEl = wrapper.querySelector('.form-error');
    if (!errorEl) {
      errorEl = document.createElement('div');
      errorEl.className = 'form-error';
      wrapper.appendChild(errorEl);
    }
    errorEl.textContent = message;
  }

  clearFieldError(fieldId) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    field.classList.remove('has-error');
    const wrapper =
      field.closest('.form-group') || field.closest('.terms-consent') || field.parentElement;
    if (wrapper) {
      wrapper.classList.remove('has-error');
      const errorEl = wrapper.querySelector('.form-error');
      if (errorEl) errorEl.remove();
    }
  }

  clearContactFieldErrors() {
    ['first-name', 'last-name', 'email', 'phone', 'terms-checkbox'].forEach((id) =>
      this.clearFieldError(id),
    );
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
    const sixHoursFromNow = new Date(Date.now() + 6 * 60 * 60 * 1000);

    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      const emptyDay = document.createElement('div');
      emptyDay.className = 'calendar-day empty';
      calendarGrid.appendChild(emptyDay);
    }

    // Add days of month
    const cacheKey = this.getAvailabilityCacheKey(
      this.selectedRoom ? this.selectedRoom.id : null,
      this.bookingData.duration || 1,
    );

    for (let day = 1; day <= daysInMonth; day++) {
      const dayElement = document.createElement('div');
      dayElement.className = 'calendar-day';
      dayElement.textContent = day;

      const dayDate = new Date(year, month, day);
      const dayDateString = this.formatDateToYMD(dayDate);
      if (!dayDateString) continue;

      // Check if day is available
      let hasAvailableSlot = false;
      const cachedSlots =
        cacheKey && this.availableSlotsCache[cacheKey]
          ? this.availableSlotsCache[cacheKey][dayDateString]
          : null;

      if (Array.isArray(cachedSlots)) {
        hasAvailableSlot = cachedSlots.length > 0;
      } else {
        const dayTimeSlots = this.getTimeSlotsForDate(
          dayDateString,
          this.bookingData.duration || 1,
        );
        hasAvailableSlot = dayTimeSlots.some((slot) => {
          const [slotHours, slotMinutes] = slot.split(':').map(Number);
          const slotDateTime = new Date(dayDate);
          slotDateTime.setHours(slotHours, slotMinutes, 0, 0);
          return slotDateTime >= sixHoursFromNow;
        });
      }

      if (hasAvailableSlot) {
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
    this.applyBusinessHoursForDate(dateString);
    this.selectedTime = null;
    this.roomAvailability = null;
    this.roomAvailabilityLoading = false;
    this.roomAvailabilityError = false;
    this.roomAvailabilityRequestId += 1;
    this.updateCalendar();
    this.updateTimeSlots();
    this.renderRoomSelection();
  }

  async updateTimeSlots() {
    const timeGrid = document.getElementById('time-grid');
    const timeSlotsContainer = document.getElementById('time-slots');

    if (!timeGrid || !timeSlotsContainer) return;

    const durationEl = document.getElementById('duration');
    const duration = durationEl
      ? this.normalizeCustomerDuration(durationEl.value, this.bookingData.duration || 1)
      : this.normalizeCustomerDuration(this.bookingData.duration, 1);
    this.bookingData.duration = duration;

    if (!this.selectedDate || !this.selectedRoom) {
      timeSlotsContainer.style.display = 'block';
      timeGrid.innerHTML =
        '<div class="time-slot disabled">Select a room and duration to see availability.</div>';
      return;
    }

    timeSlotsContainer.style.display = 'block';
    timeGrid.innerHTML = '<div class="time-slot disabled">Checking availability...</div>';

    const selectedDateTime = this.parseDateFromYMD(this.selectedDate);
    if (!selectedDateTime) {
      console.warn('[booking] Unable to parse selected date', this.selectedDate);
      return;
    }
    const sixHoursFromNow = new Date(Date.now() + 6 * 60 * 60 * 1000);

    let slots = this.getTimeSlotsForDate(this.selectedDate, duration || 1);
    // Filter out slots that cannot fit within business hours for the chosen duration
    slots = slots.filter((time) => this.slotFitsBusinessHours(this.selectedDate, time, duration));
    const weekday = selectedDateTime.getDay();
    const filteredSlots = slots.filter((time) => {
      if (weekday === 5 && (time === '01:00' || time === '02:00')) return false;
      if (weekday === 0 && time === '01:30') return false;
      return true;
    });
    const cacheKey = this.getAvailabilityCacheKey(this.selectedRoom.id, duration);
    const cachedSlots =
      cacheKey && this.availableSlotsCache[cacheKey]
        ? this.availableSlotsCache[cacheKey][this.selectedDate]
        : null;
    const requestId = ++this.timeSlotsRequestId;

    const renderSlots = (availableSlots) => {
      if (requestId !== this.timeSlotsRequestId) return;
      timeGrid.innerHTML = '';
      if (!availableSlots.length) {
        const empty = document.createElement('div');
        empty.className = 'time-slot disabled';
        empty.textContent = 'No times available';
        timeGrid.appendChild(empty);
        return;
      }

      availableSlots.forEach((slot) => {
        const time = typeof slot === 'object' && slot?.time ? slot.time : slot;
        const slotDateTime = new Date(selectedDateTime.getTime());
        const [hours, minutes] = time.split(':').map(Number);
        slotDateTime.setHours(hours, minutes, 0, 0);

        const timeSlot = document.createElement('div');
        timeSlot.className = 'time-slot';
        timeSlot.textContent = this.formatTime(time);
        // Check if time slot meets minimum notice requirement
        if (slotDateTime >= sixHoursFromNow) {
          const isAvailable = typeof slot === 'object' ? slot.available !== false : true;
          if (isAvailable) {
            timeSlot.classList.add('available');
            timeSlot.addEventListener('click', () => {
              this.selectTime(time);
            });
          } else {
            timeSlot.classList.add('disabled');
          }
        } else {
          timeSlot.classList.add('disabled');
        }

        if (this.selectedTime === time) {
          timeSlot.classList.add('selected');
        }

        timeGrid.appendChild(timeSlot);
      });
    };

    if (Array.isArray(cachedSlots)) {
      renderSlots(cachedSlots);
      return;
    }

    if (!window.firebaseFunctions || !window.firebaseFunctions.httpsCallable) {
      renderSlots(filteredSlots);
      return;
    }

    try {
      const getAvailability = window.firebaseFunctions.httpsCallable('getRoomAvailability');
      const getMaxDuration = window.firebaseFunctions.httpsCallable('getMaxAvailableDuration');
      const availableSlots = [];
      const partySize =
        this.bookingData.partySize ||
        parseInt(document.getElementById('party-size')?.value, 10) ||
        null;
      for (const time of filteredSlots) {
        try {
          const [availabilityRes, maxDurationRes] = await Promise.all([
            getAvailability({
              date: this.selectedDate,
              startTime: time,
              duration,
              roomIds: [this.selectedRoom.id],
              excludeBookingId:
                this.isRebookingFlow && this.rebookContext ? this.rebookContext.booking.id : null,
              partySize,
            }),
            getMaxDuration({
              roomId: this.selectedRoom.id,
              date: this.selectedDate,
              startTime: time,
            }),
          ]);
          if (requestId !== this.timeSlotsRequestId) return;

          const remainingRaw = Number(availabilityRes?.data?.availability?.[this.selectedRoom.id]);
          const remaining = Number.isFinite(remainingRaw) ? remainingRaw : 0;
          const maxHours = Number(maxDurationRes?.data?.maxDurationHours);
          const canFitDuration = Number.isFinite(maxHours) ? maxHours >= duration : false;

          if (remaining > 0 && canFitDuration) {
            availableSlots.push({
              time,
              available: true,
            });
          }
        } catch (slotErr) {
          console.warn('Skipping slot due to availability error', time, slotErr);
          continue;
        }
      }

      if (cacheKey) {
        if (!this.availableSlotsCache[cacheKey]) {
          this.availableSlotsCache[cacheKey] = {};
        }
        this.availableSlotsCache[cacheKey][this.selectedDate] = availableSlots;
      }

      renderSlots(availableSlots);
    } catch (error) {
      console.warn('Failed to load slot availability', error);
      renderSlots([]); // show "No times available" on error instead of stale slots
    }
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

  getAvailabilityCacheKey(roomId, duration) {
    if (!roomId) return null;
    const d = Number(duration);
    if (!Number.isFinite(d) || d <= 0) return null;
    return `${roomId}|${d}`;
  }

  formatPaymentStatus(status) {
    const value = typeof status === 'string' ? status.trim().toLowerCase() : '';
    switch (value) {
      case '':
        return 'Pending';
      case 'requires_capture':
        return 'Authorized - needs capture';
      case 'succeeded':
        return 'Captured';
      case 'processing':
        return 'Processing';
      case 'canceled':
      case 'cancelled':
        return 'Canceled';
      default: {
        const cleaned = value.replace(/_/g, ' ').trim();
        return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
      }
    }
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
    const duration = durationEl
      ? this.normalizeCustomerDuration(durationEl.value, this.bookingData.duration || 1)
      : this.normalizeCustomerDuration(this.bookingData.duration, 1);

    this.bookingData.duration = duration;

    try {
      const getAvailability = window.firebaseFunctions.httpsCallable('getRoomAvailability');
      const response = await getAvailability({
        date: this.selectedDate,
        startTime: this.selectedTime,
        duration,
        roomIds: this.rooms.map((room) => room.id),
        excludeBookingId:
          this.isRebookingFlow && this.rebookContext ? this.rebookContext.booking.id : null,
      });

      if (requestId !== this.roomAvailabilityRequestId) {
        return;
      }

      this.roomAvailabilityLoading = false;
      this.roomAvailabilityError = false;
      this.roomAvailability = response.data?.availability || {};
      await this.clampDurationToAvailability();

      const selectedUnavailable =
        this.selectedRoom && Number(this.roomAvailability?.[this.selectedRoom.id] || 0) <= 0;
      if (selectedUnavailable) {
        const roomName = this.selectedRoom ? this.selectedRoom.name : 'Selected room';
        this.showNotification(
          `${roomName} is not available at that time. Please choose a different time.`,
          'warning',
        );
        this.selectedTime = null;
        this.bookingData.startTime = null;
        this.updateTimeSlots();
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

  async clampDurationToAvailability() {
    if (
      !this.selectedRoom ||
      !this.selectedDate ||
      !this.selectedTime ||
      !window.firebaseFunctions ||
      !window.firebaseFunctions.httpsCallable
    ) {
      return;
    }
    try {
      const fn = window.firebaseFunctions.httpsCallable('getMaxAvailableDuration');
      const res = await fn({
        roomId: this.selectedRoom.id,
        date: this.selectedDate,
        startTime: this.selectedTime,
      });
      const maxHours = Number(res.data?.maxDurationHours);
      if (!Number.isFinite(maxHours)) return;

      const durationEl = document.getElementById('duration');
      const currentDuration = durationEl
        ? this.normalizeCustomerDuration(durationEl.value, this.bookingData.duration || 1)
        : this.normalizeCustomerDuration(this.bookingData.duration, 1);

      const clamped = Math.max(1, Math.min(currentDuration, Math.floor(maxHours)));
      if (clamped < currentDuration) {
        this.showNotification(
          `Only ${clamped} hour${clamped === 1 ? '' : 's'} available for that time.`,
          'warning',
        );
        if (durationEl) {
          durationEl.value = String(clamped);
        }
        this.bookingData.duration = clamped;
        this.updatePaymentSummary();
        this.updateBookingSummary();
      }
    } catch (err) {
      console.warn('clampDurationToAvailability failed', err);
    }
  }

  getRoomAvailabilityStatus(roomId) {
    if (!this.selectedDate || !this.selectedTime) {
      return {
        message: 'Select a date & time next to confirm availability',
        className: 'info',
        selectable: true,
        notifyMessage:
          'You can pick a room now; availability will be confirmed after you choose date & time.',
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
      this.showNotification(
        'Your rebooking session expired. Please start again from Manage Booking.',
        'warning',
      );

      this.clearRebookingContext({ removeQueryParam: true });

      return;
    }

    this.enterRebookingMode(context);
  }

  enterRebookingMode(context) {
    this.isRebookingFlow = true;

    this.rebookContext = context;

    const booking = context.booking;

    const preferenceRoomId =
      typeof context.preferences?.preferredRoomId === 'string'
        ? context.preferences.preferredRoomId
        : null;
    let room = this.rooms.find((r) => r.id === booking.roomId) || null;
    if (preferenceRoomId) {
      const preferredRoom = this.rooms.find((r) => r.id === preferenceRoomId);
      if (preferredRoom) {
        room = preferredRoom;
      }
    }

    this.selectedRoom = room || null;

    if (room) {
      this.bookingData.room = room;
    }

    this.selectedDate = booking.date;
    this.selectedTime = booking.startTime;
    this.bookingData.date = booking.date;
    this.bookingData.startTime = booking.startTime;
    this.bookingData.duration = this.normalizeCustomerDuration(booking.duration, 1);

    const preferredPartySize = Number(context.preferences?.preferredPartySize);
    const defaultPartySize = booking.partySize || (room?.minCapacity ?? 1);
    this.bookingData.partySize =
      Number.isFinite(preferredPartySize) && preferredPartySize > 0
        ? preferredPartySize
        : defaultPartySize;

    const totalCostBeforeTax = Number.isFinite(Number(booking.totalCost))
      ? Number(booking.totalCost)
      : null;
    const totalCostWithTaxFromDoc = Number.isFinite(Number(booking.totalCostWithTax))
      ? Number(booking.totalCostWithTax)
      : null;
    const totalCostWithTax =
      totalCostWithTaxFromDoc ??
      (totalCostBeforeTax != null
        ? Math.round(totalCostBeforeTax * (1 + this.taxRate) * 100) / 100
        : null);

    this.bookingData.totalCost = totalCostBeforeTax;
    this.bookingData.totalCostWithTax = totalCostWithTax;
    this.bookingData.depositAmount = Number.isFinite(Number(booking.depositAmount))
      ? Number(booking.depositAmount)
      : null;
    this.bookingData.remainingBalance = Number.isFinite(Number(booking.remainingBalance))
      ? Number(booking.remainingBalance)
      : totalCostWithTax != null && this.bookingData.depositAmount != null
        ? Math.max(totalCostWithTax - this.bookingData.depositAmount, 0)
        : null;

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

    this.showNotification(
      `Rescheduling booking ${booking.id}. Update your details and confirm.`,
      'info',
    );
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

  isUpcomingBooking(booking) {
    if (!booking) return false;
    if (booking.startDateTime) {
      const parsed = new Date(booking.startDateTime);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.getTime() >= Date.now();
      }
    }
    if (booking.date && booking.startTime) {
      const local = new Date(`${booking.date}T${booking.startTime}`);
      if (!Number.isNaN(local.getTime())) {
        return local.getTime() >= Date.now();
      }
    }
    return false;
  }

  renderRoomSelection() {
    const roomGrid = document.getElementById('room-selection-grid');
    if (!roomGrid) return;

    roomGrid.innerHTML = '';
    let defaultRoom = null;

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
      if (status.selectable && !this.selectedRoom && !defaultRoom) {
        defaultRoom = room;
        roomOption.classList.add('selected');
      }

      roomGrid.appendChild(roomOption);
    });

    if (!this.selectedRoom && defaultRoom) {
      this.selectedRoom = defaultRoom;
      this.bookingData.room = defaultRoom;
      this.selectedTime = null;
      this.roomAvailability = null;
      this.roomAvailabilityLoading = false;
      this.roomAvailabilityError = false;
      this.availableSlotsCache = {};
      this.timeSlotsRequestId += 1;
      this.validatePartySize();
      this.updateBookingSummary();
      this.updatePaymentSummary();
      this.updateCalendar();
      this.updateTimeSlots();
      // Re-render once to reflect selection styling
      this.renderRoomSelection();
    }
  }

  selectRoom(room) {
    this.selectedRoom = room;
    this.bookingData.room = room;
    this.selectedTime = null;
    this.roomAvailability = null;
    this.roomAvailabilityLoading = false;
    this.roomAvailabilityError = false;
    this.availableSlotsCache = {};
    this.timeSlotsRequestId += 1;
    // Adjust party size if it exceeds new room capacity
    const partyInput = document.getElementById('party-size');
    const partySize = partyInput ? parseInt(partyInput.value, 10) || 1 : this.bookingData.partySize;
    if (room && partySize > room.maxCapacity) {
      const clamped = room.maxCapacity;
      if (partyInput) {
        partyInput.value = clamped;
      }
      this.bookingData.partySize = clamped;
      this.showNotification(
        `Party size adjusted to ${clamped} to fit ${room.name}'s capacity.`,
        'info',
      );
    }
    this.renderRoomSelection();
    this.validatePartySize();
    this.updateBookingSummary();
    this.updatePaymentSummary();
    this.updateCalendar();
    this.updateTimeSlots();
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
        const totalBreakdown =
          extraGuests > 0
            ? ` (currently +$${totalExtraPerHour}/hr for ${extraGuests} ${guestLabel})`
            : '';
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

    const formatCurrency = (value) =>
      typeof value === 'number' && isFinite(value) ? `$${value.toFixed(2)}` : '—';

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

    const partySize = partySizeEl
      ? parseInt(partySizeEl.value, 10) || 1
      : this.bookingData.partySize || 1;

    const duration = durationEl
      ? this.normalizeCustomerDuration(durationEl.value, this.bookingData.duration || 1)
      : this.normalizeCustomerDuration(this.bookingData.duration, 1);

    this.bookingData.duration = duration;

    const baseCost = room.hourlyRate * duration;

    const bookingFee = room.bookingFee || 0;

    const includedGuests = room.includedGuests ?? room.maxCapacity;

    const extraGuestRate = room.extraGuestRate || 0;

    const extraGuests = Math.max(0, partySize - includedGuests);

    const extraGuestFee = extraGuestRate * extraGuests * duration;

    const requiredPurchaseAmount = this.getRequiredPurchaseAmount(room, this.selectedDate, time);

    const totalCost = baseCost + bookingFee + extraGuestFee + requiredPurchaseAmount;
    const taxRate = this.taxRate || 0;
    const taxRateLabel = Math.round(taxRate * 100);
    const depositTaxRateLabel = 0;
    const totalTax = Math.round(totalCost * taxRate * 100) / 100;
    const totalWithTax = Math.round((totalCost + totalTax) * 100) / 100;

    const rawDepositAmount = this.computeDepositAmount({
      room,
      date: this.selectedDate,
      startTime: time,
      duration,
      extraGuests,
      bookingFee,
      extraGuestRate,
      totalCostWithTax: totalWithTax,
    });
    const {
      beforeTax: depositBeforeTax,
      tax: depositTax,
      total: depositAmount,
    } = this.getDepositBreakdown(rawDepositAmount);
    const remainingPreTax = Math.max(totalCost - depositBeforeTax, 0);
    const rawRemainingBalance = Math.max(totalWithTax - depositAmount, 0);
    const remainingBalance = Math.round(rawRemainingBalance * 100) / 100;
    const remainingTax = Math.max(Math.round((remainingBalance - remainingPreTax) * 100) / 100, 0);
    const remainingBalanceNote = remainingBalance > 0 ? 'due on arrival' : 'paid in full';
    this.bookingData.depositAmount = depositAmount;
    this.bookingData.depositBeforeTax = depositBeforeTax;
    this.bookingData.depositTax = depositTax;
    this.bookingData.remainingBalance = remainingBalance;
    this.bookingData.remainingBalanceBeforeTax = remainingPreTax;
    this.bookingData.remainingTax = remainingTax;

    const [startHours, startMinutes] = time.split(':').map(Number);

    const durationMinutes = Math.round(duration * 60);
    const endTime = new Date();
    endTime.setHours(startHours, startMinutes, 0, 0);
    endTime.setMinutes(endTime.getMinutes() + durationMinutes);

    const endTimeString = endTime.toTimeString().slice(0, 5);

    const extraRows = [];
    const durationLabel = this.formatDurationLabel(duration);
    const durationSuffix = duration === 1 ? '' : 's';

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

                <span class="summary-label">Extra Guests (${extraGuests} &times; $${extraGuestRate}/hr &times; ${durationLabel}h):</span>

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

    summaryContent.innerHTML = `

            <div class="summary-row">
                <span class="summary-label">Date:</span>
                <span class="summary-value">${this.formatDateDisplay(date)}</span>
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

                <span class="summary-value">${durationLabel} hour${durationSuffix}</span>

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
                <span class="summary-label">Total Cost (before tax):</span>
                <span class="summary-value">${formatCurrency(totalCost)}</span>
            </div>

            <div class="summary-row">
                <span class="summary-label">Tax (${taxRateLabel}%):</span>
                <span class="summary-value">${formatCurrency(totalTax)}</span>
            </div>

            <div class="summary-row">
                <span class="summary-label">Total (incl. tax):</span>
                <span class="summary-value summary-total">${formatCurrency(totalWithTax)}</span>
            </div>

            <div class="summary-row">
                <span class="summary-label">Deposit (before tax):</span>
                <span class="summary-value">${formatCurrency(depositBeforeTax)}</span>
            </div>

            <div class="summary-row">
                <span class="summary-label">Deposit tax (${depositTaxRateLabel}%):</span>
                <span class="summary-value">${formatCurrency(depositTax)}</span>
            </div>

            <div class="summary-row">
                <span class="summary-label">Deposit Paid Today (incl. tax):</span>
                <span class="summary-value">${formatCurrency(depositAmount)}</span>
            </div>

            <div class="summary-row">
                <span class="summary-label">Remaining Balance (incl. tax):</span>
                <span class="summary-value">${formatCurrency(remainingBalance)} (${remainingBalanceNote})</span>
            </div>

        `;

    this.bookingData.totalCost = totalCost;
    this.bookingData.totalCostBeforeTax = totalCost;
    this.bookingData.totalTax = totalTax;
    this.bookingData.totalCostWithTax = totalWithTax;
    this.bookingData.roomSubtotal = baseCost;
    this.bookingData.extraGuestFee = extraGuestFee;
    this.bookingData.requiredPurchaseAmount = requiredPurchaseAmount;
    this.bookingData.bookingFee = bookingFee;
    this.bookingData.remainingBalanceBeforeTax = remainingPreTax;
    this.bookingData.remainingTax = remainingTax;
    this.bookingData.remainingBalance = remainingBalance;
  }

  getDepositBaseAmount(roomId, dateStr) {
    if (!roomId) return 0;
    const safeDate =
      typeof dateStr === 'string' && dateStr ? new Date(`${dateStr}T12:00:00`) : null;
    const day = safeDate && !Number.isNaN(safeDate.getTime()) ? safeDate.getDay() : null; // 0=Sun
    const isWeekend = day === 5 || day === 6; // Fri/Sat
    const weekdayDeposits = {
      small: 20,
      medium: 30,
      large: 50,
      'extra-large': 100,
    };
    const weekendDeposits = {
      small: 30,
      medium: 60,
      large: 100,
      'extra-large': 150,
    };
    const table = isWeekend ? weekendDeposits : weekdayDeposits;
    return table[roomId] ?? 0;
  }

  getRequiredPurchaseAmount(room, dateStr, startTime) {
    if (!room || !room.requiredPurchase) return 0;
    if (room.id !== 'extra-large') return room.requiredPurchase.amount || 0;
    const businessDate = dateStr ? this.determineBusinessDate(dateStr, startTime) : null;
    const safeDate = businessDate ? new Date(`${businessDate}T12:00:00`) : null;
    const day = safeDate && !Number.isNaN(safeDate.getTime()) ? safeDate.getDay() : null; // 0=Sun
    const isWeekend = day === 5 || day === 6;
    return isWeekend ? room.requiredPurchase.amount || 0 : 0;
  }

  computeDepositAmount({ room, date, startTime, totalCostWithTax }) {
    if (this.isRebookingFlow && Number.isFinite(this.rebookContext?.booking?.depositAmount)) {
      return Math.round(this.rebookContext.booking.depositAmount * 100) / 100;
    }
    const bookingDate = date || this.selectedDate || this.bookingData?.date || null;
    const bookingTime = startTime || this.selectedTime || this.bookingData?.startTime || null;
    const businessDate = bookingDate ? this.determineBusinessDate(bookingDate, bookingTime) : null;
    const roomId = room?.id || this.selectedRoom?.id || this.bookingData?.room?.id;
    const baseBeforeTax = this.getDepositBaseAmount(roomId, businessDate || bookingDate);
    if (!Number.isFinite(baseBeforeTax) || baseBeforeTax <= 0) {
      return 0;
    }
    const depositTotal = Math.round(baseBeforeTax * 100) / 100;
    if (!Number.isFinite(totalCostWithTax) || totalCostWithTax <= 0) {
      return depositTotal;
    }
    const cappedTotal = Math.min(depositTotal, Math.round(totalCostWithTax * 100) / 100);
    return cappedTotal;
  }

  getDepositBreakdown(depositAmount) {
    const safeAmount = Number.isFinite(depositAmount) ? depositAmount : 0;
    const roundedTotal = Math.round(safeAmount * 100) / 100;
    return {
      beforeTax: roundedTotal,
      tax: 0,
      total: roundedTotal,
    };
  }

  updatePaymentSummary() {
    const summaryContent = document.getElementById('payment-summary-content');

    if (!summaryContent || !this.selectedRoom) return;

    const isRebooking = this.isRebookingFlow && !!this.rebookContext;

    const formatCurrency = (value) => (Number.isFinite(value) ? `$${value.toFixed(2)}` : 'N/A');

    const room = this.selectedRoom;
    const date = this.selectedDate || this.bookingData.date || null;
    const startTime = this.selectedTime || this.bookingData.startTime || null;

    const durationEl = document.getElementById('duration');

    const duration = durationEl
      ? this.normalizeCustomerDuration(durationEl.value, this.bookingData.duration || 1)
      : this.normalizeCustomerDuration(this.bookingData.duration, 1);

    this.bookingData.duration = duration;

    const baseCost = room.hourlyRate * duration;

    const bookingFee = room.bookingFee || 0;

    const includedGuests = room.includedGuests ?? room.maxCapacity;

    const extraGuestRate = room.extraGuestRate || 0;

    const partySizeEl = document.getElementById('party-size');

    const partySize = partySizeEl ? parseInt(partySizeEl.value, 10) || 1 : 1;

    const extraGuests = Math.max(0, partySize - includedGuests);

    const extraGuestFee = extraGuestRate * extraGuests * duration;

    const requiredPurchaseAmount = this.getRequiredPurchaseAmount(room, date, startTime);

    const totalCost = baseCost + bookingFee + extraGuestFee + requiredPurchaseAmount;

    const taxRate = this.taxRate || 0;

    const taxRateLabel = Math.round(taxRate * 100);
    const depositTaxRateLabel = 0;

    const totalTax = Math.round(totalCost * taxRate * 100) / 100;

    const totalWithTax = Math.round((totalCost + totalTax) * 100) / 100;

    const rawDepositAmount = this.computeDepositAmount({
      room,
      date,
      startTime,
      duration,
      extraGuests,
      bookingFee,
      extraGuestRate,
      totalCostWithTax: totalWithTax,
    });
    const {
      beforeTax: depositBeforeTax,
      tax: depositTax,
      total: depositAmount,
    } = this.getDepositBreakdown(rawDepositAmount);
    const remainingPreTax = Math.max(totalCost - depositBeforeTax, 0);
    const rawRemainingBalance = Math.max(totalWithTax - depositAmount, 0);
    const remainingBalance = Math.round(rawRemainingBalance * 100) / 100;
    const remainingTax = Math.max(Math.round((remainingBalance - remainingPreTax) * 100) / 100, 0);
    const remainingBalanceNote = remainingBalance > 0 ? 'due on arrival' : 'paid in full';
    const paymentLabelBeforeTax = isRebooking ? 'Deposit on file' : 'Deposit (before tax)';
    const paymentTaxLabel = `${isRebooking ? 'Deposit' : 'Deposit'} tax (${depositTaxRateLabel}%)`;
    const paymentTotalLabel = isRebooking
      ? 'Deposit on file (incl. tax)'
      : 'Deposit Paid Today (incl. tax)';

    const extraRows = [];

    if (bookingFee) {
      extraRows.push(`

            <div class="summary-row">

                <span class="summary-label">Booking Fee:</span>

                <span class="summary-value">${formatCurrency(bookingFee)}</span>

            </div>`);
    }

    const durationLabel = this.formatDurationLabel(duration);

    if (extraGuestFee) {
      extraRows.push(`

            <div class="summary-row">

                <span class="summary-label">Extra Guests (${extraGuests} &times; $${extraGuestRate}/hr &times; ${durationLabel}h):</span>

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
        ? `Your original payment of ${formatCurrency(depositAmount)} stays on file.`
        : 'Your original payment remains on file.';
      noteRows.push(
        `<div class="summary-note">${depositText} No additional payment is required to reschedule.</div>`,
      );
    }

    summaryContent.innerHTML = `

            <div class="summary-row">

                <span class="summary-label">Room Subtotal:</span>

                <span class="summary-value">${formatCurrency(baseCost)}</span>

            </div>

            ${extraRows.join('')}

            <div class="summary-row">

                <span class="summary-label">Total Cost (before tax):</span>

                <span class="summary-value">${formatCurrency(totalCost)}</span>

            </div>

            <div class="summary-row">

                <span class="summary-label">Tax (${taxRateLabel}%):</span>

                <span class="summary-value">${formatCurrency(totalTax)}</span>

            </div>

            <div class="summary-row">

                <span class="summary-label">Total (incl. tax):</span>

                <span class="summary-value summary-total">${formatCurrency(totalWithTax)}</span>

            </div>

            <div class="summary-row">
                <span class="summary-label">${paymentLabelBeforeTax}:</span>
                <span class="summary-value">${formatCurrency(depositBeforeTax)}</span>
            </div>

            <div class="summary-row">
                <span class="summary-label">${paymentTaxLabel}:</span>
                <span class="summary-value">${formatCurrency(depositTax)}</span>
            </div>

            <div class="summary-row">
                <span class="summary-label">${paymentTotalLabel}:</span>
                <span class="summary-value summary-total">${formatCurrency(depositAmount)}</span>
            </div>

            <div class="summary-row">
                <span class="summary-label">Remaining Balance (incl. tax):</span>
                <span class="summary-value">${formatCurrency(remainingBalance)} (${remainingBalanceNote})</span>
            </div>

            ${noteRows.join('')}

        `;

    this.bookingData.totalCost = totalCost;
    this.bookingData.totalCostBeforeTax = totalCost;
    this.bookingData.totalTax = totalTax;
    this.bookingData.totalCostWithTax = totalWithTax;
    this.bookingData.depositAmount = depositAmount;
    this.bookingData.depositBeforeTax = depositBeforeTax;
    this.bookingData.depositTax = depositTax;
    this.bookingData.remainingBalanceBeforeTax = remainingPreTax;
    this.bookingData.remainingTax = remainingTax;
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
        : 'Secure your reservation with a deposit';
    }

    const stepHeading = document.querySelector('#step-5 h2');

    if (stepHeading) {
      stepHeading.textContent = isRebooking
        ? 'Confirm Your Updated Booking'
        : 'Complete Your Booking';
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
      const cardStyle = {
        base: {
          color: '#ffffff',
          fontFamily: 'inherit',
          iconColor: '#ffffff',
          '::placeholder': {
            color: 'rgba(255, 255, 255, 0.8)',
          },
        },
        invalid: {
          color: '#ff4d4f',
          iconColor: '#ff4d4f',
        },
      };

      this.cardElement = elements.create('card', { hidePostalCode: true, style: cardStyle });
      this.cardElement.mount('#card-element');

      this.cardElement.on('change', (event) => {
        const el = document.getElementById('card-errors');
        if (el) el.textContent = event.error ? event.error.message : '';
      });
    }, 100);
  }

  async completeBooking() {
    const now = Date.now();
    if (now < this.lastSubmitTime + this.submitCooldownMs) {
      this.showNotification('Please wait a moment before submitting again.', 'warning');
      return;
    }
    // Validate the current step (ensures date/room/customer info are filled)
    if (!this.validateCurrentStep()) return;
    // Ensure the requested duration fits before submitting
    if (!(await this.ensureDurationAvailable())) return;

    const customerInfo = this.collectCustomerInfo({ requireTerms: true, showErrors: true });
    if (!customerInfo) {
      this.showBookingStep(4);
      return;
    }
    this.bookingData.customer = customerInfo;
    this.bookingData.termsAccepted = true;

    if (this.isRebookingFlow) {
      this.lastSubmitTime = now;
      this.temporarilyDisableButton('complete-booking-btn', this.submitCooldownMs);
      this.showLoading('Updating your booking...');
      await this.completeRebookingFlow();
      return;
    }

    this.lastSubmitTime = now;
    this.temporarilyDisableButton('complete-booking-btn', this.submitCooldownMs);
    // Show a loading overlay
    this.showLoading('Processing your booking...');

    try {
      // Build the payload for the prepare/finalize flow
      const payload = {
        roomId: this.selectedRoom.id,
        date: this.selectedDate,
        startTime: this.selectedTime,
        duration: this.bookingData.duration,
        totalCost: this.bookingData.totalCost,
        depositAmount: this.bookingData.depositAmount,
        partySize: this.bookingData.partySize,
        customerInfo: this.bookingData.customer,
      };

      // 1) Prepare payment (creates PaymentIntent only)
      const prepareFn = window.firebaseFunctions.httpsCallable('prepareBookingPayment');
      const prepRes = await prepareFn(payload);
      const clientSecretToUse = prepRes.data?.clientSecret;
      const paymentIntentId = prepRes.data?.paymentIntentId;
      if (!clientSecretToUse || !paymentIntentId) {
        throw new Error('Unable to start payment. Please try again.');
      }

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
        this.hideLoading();
        this.showError(error.message || 'Payment incomplete, please retry.');
        return;
      }

      const okStatuses = ['succeeded', 'requires_capture', 'processing'];
      if (!paymentIntent || !okStatuses.includes(paymentIntent.status)) {
        this.hideLoading();
        this.showError('Payment incomplete, please retry.');
        return;
      }

      // 3) Finalize booking (creates booking doc after payment success)
      const finalizeFn = window.firebaseFunctions.httpsCallable('finalizeBooking');
      const finalizeRes = await finalizeFn({
        ...payload,
        paymentIntentId: paymentIntent.id,
      });
      const bookingId = finalizeRes.data?.bookingId;

      // 4) Update local booking data and redirect to confirmation page
      this.bookingData.id = bookingId;
      this.bookingData.status = 'confirmed';
      this.bookingData.createdAt = new Date().toISOString();
      this.bookingData.paymentIntentId = paymentIntent.id;

      localStorage.setItem('barzunkoBooking', JSON.stringify(this.bookingData));
      this.hideLoading();
      window.location.href = 'confirmation.html';
    } catch (err) {
      this.hideLoading();
      const contactMessage = this.mapContactInfoError(err);
      if (contactMessage) {
        this.showNotification(contactMessage, 'error');
        this.showBookingStep(4);
        return;
      }
      this.showError(err.message || 'Error completing booking');
    }
  }

  async cancelPendingBookingSilently(bookingId, email) {
    if (
      !bookingId ||
      !email ||
      !window.firebaseFunctions ||
      !window.firebaseFunctions.httpsCallable
    ) {
      return;
    }
    try {
      const cancelFn = window.firebaseFunctions.httpsCallable('cancelBookingGuest');
      await cancelFn({ bookingId, email });
    } catch (err) {
      console.warn('Failed to cancel pending booking', err);
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
      this.showNotification(
        'Booking updated successfully! Redirecting you to manage bookings...',
        'success',
      );

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
      const contactMessage = this.mapContactInfoError(error);
      if (contactMessage) {
        this.showNotification(contactMessage, 'error');
        this.showBookingStep(4);
        return;
      }

      this.showError(error.message || 'Unable to update your booking right now.');
    }
  }

  showConfirmationPage() {
    this.showPage('confirmation');

    const confirmationDetails = document.getElementById('confirmation-details');
    if (!confirmationDetails || !this.bookingData.room) return;

    const room = this.bookingData.room;

    const remainingNote =
      Number(this.bookingData.remainingBalance) > 0 ? 'due on arrival' : 'paid in full';

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
                <span class="summary-value">${this.formatDateDisplay(this.bookingData.date)} at ${this.formatTime(this.bookingData.startTime)}</span>
            </div>
            <div class="summary-row">
                <span class="summary-label">Room:</span>
                <span class="summary-value">${room.name} (${this.bookingData.partySize} people)</span>
            </div>
            <div class="summary-row">
                <span class="summary-label">Duration:</span>
                <span class="summary-value">${this.formatDurationLabel(this.bookingData.duration)} hour${this.bookingData.duration === 1 ? '' : 's'}</span>
            </div>
            <div class="summary-row">
                <span class="summary-label">Deposit Paid:</span>
                <span class="summary-value summary-total">$${this.bookingData.depositAmount}</span>
            </div>
            <div class="summary-row">
                <span class="summary-label">Remaining Balance:</span>
                <span class="summary-value">$${this.bookingData.remainingBalance} (${remainingNote})</span>
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
        const message = `Just booked an amazing karaoke experience at Barzunko! #Barzunko #Karaoke #Toronto`;

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
      const upcomingBookings = bookings.filter((booking) => this.isUpcomingBooking(booking));
      this.manageLookupResults = upcomingBookings;
      this.currentManagedEmail = email;

      if (upcomingBookings.length === 0) {
        this.activeManagedBooking = null;
        this.renderBookingSearchResults([]);
        this.showNotification('No upcoming bookings found for that email/reference.', 'warning');
        return;
      }

      if (!bookingRef && upcomingBookings.length > 1) {
        this.activeManagedBooking = null;
        this.renderBookingSearchResults(upcomingBookings);
        this.showNotification('We found multiple bookings. Select one below to manage it.', 'info');
        return;
      }

      const matchedBooking = bookingRef
        ? upcomingBookings.find((b) => b.id.toLowerCase() === bookingRef.toLowerCase()) ||
          upcomingBookings[0]
        : upcomingBookings[0];

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

      .map(
        (booking) => `

            <div class="booking-card booking-card--selectable" data-booking-id="${booking.id}">

                <div class="summary-row">

                    <span class="summary-label">Booking ID:</span>

                    <span class="summary-value">${booking.id}</span>

                </div>

                <div class="summary-row">

                    <span class="summary-label">Date:</span>

                    <span class="summary-value">${this.formatDateDisplay(booking.date)} at ${this.formatTime(booking.startTime)}</span>

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

        `,
      )

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

    const startDisplay = `${this.formatDateDisplay(booking.date)} at ${this.formatTime(booking.startTime)}`;

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

    const rebookRoomOptions = [
      `<option value="" selected>Keep current (${booking.roomName || booking.roomId})</option>`,
      ...(this.rooms || []).map(
        (roomOption) => `<option value="${roomOption.id}">${roomOption.name}</option>`,
      ),
    ].join('');

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

                <span class="summary-value">${this.formatDurationLabel(booking.duration)} hour${booking.duration === 1 ? '' : 's'}</span>

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
              booking.customer?.specialRequests
                ? `<div class="summary-row summary-row--note">
                      <span class="summary-label">Special Inquiry:</span>
                      <span class="summary-value">${booking.customer.specialRequests}</span>
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

        ${
          canRebook
            ? `<div class="booking-rebook-preferences">
                  <h3>Rebooking Preferences</h3>
                  <p class="booking-rebook-hint">Need a different room or guest count? Tell us before rescheduling.</p>
                  <div class="form-row">
                    <div class="form-group">
                      <label class="form-label">Preferred Room Type</label>
                      <select id="rebook-room-select" class="form-control">
                        ${rebookRoomOptions}
                      </select>
                    </div>
                    <div class="form-group">
                      <label class="form-label">Updated Party Size</label>
                      <input
                        type="number"
                        id="rebook-party-size"
                        class="form-control"
                        min="1"
                        max="30"
                        placeholder="${
                          booking.partySize ? `Current: ${booking.partySize}` : 'Enter new size'
                        }"
                      />
                      <small class="form-hint">Leave blank to keep the same number of guests.</small>
                    </div>
                  </div>
                </div>`
            : ''
        }

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
    const rebookRoomSelect = document.getElementById('rebook-room-select');
    const rebookPartyInput = document.getElementById('rebook-party-size');

    if (rebookBtn && canRebook) {
      rebookBtn.addEventListener('click', () => {
        const preferences = {
          preferredRoomId:
            rebookRoomSelect && rebookRoomSelect.value ? rebookRoomSelect.value : null,
          preferredPartySize:
            rebookPartyInput && rebookPartyInput.value ? Number(rebookPartyInput.value) : null,
        };
        this.startRebookingFlow(booking, preferences);
      });
    }

    const printBtn = document.getElementById('print-booking-btn');

    if (printBtn) {
      printBtn.addEventListener('click', () => window.print());
    }
  }

  startRebookingFlow(booking, preferences = {}) {
    if (!booking) return;

    const normalizedPreferences = {
      preferredRoomId:
        typeof preferences.preferredRoomId === 'string' && preferences.preferredRoomId.trim() !== ''
          ? preferences.preferredRoomId.trim()
          : null,
      preferredPartySize:
        Number.isFinite(Number(preferences.preferredPartySize)) &&
        Number(preferences.preferredPartySize) > 0
          ? Number(preferences.preferredPartySize)
          : null,
    };

    const context = {
      booking,
      email: this.currentManagedEmail || booking.customer.email || '',
      preferences: normalizedPreferences,
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
    this.adminStopAutoAdvanceTimer();
    const loginForm = document.getElementById('admin-login');
    const dashboard = document.getElementById('admin-dashboard');
    const emailEl =
      document.getElementById('admin-email') || document.getElementById('admin-username');
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

    this.adminBindModifierModal();

    this.loadAdminDashboard();
    if (!this.adminDashboardInitialized) {
      this.showNotification('Welcome to the admin dashboard!', 'success');
      this.adminDashboardInitialized = true;
    }
  }

  async adminLogin(e) {
    e.preventDefault();

    const emailEl =
      document.getElementById('admin-email') || document.getElementById('admin-username');
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

  initStaffPage() {
    this.staffShowLoginForm();
    this.staffEnsureAuthListener();
  }

  userHasStaffAccess(claims) {
    if (!claims) return false;
    return claims.isAdmin === true || claims.isStaff === true;
  }

  staffEnsureAuthListener() {
    if (this.staffAuthUnsubscribe || !window.firebaseAuth) {
      if (!window.firebaseAuth) {
        console.warn('[staff] Firebase Auth not available');
      }
      return;
    }
    const loginContainer = document.getElementById('staff-login');
    const dashboard = document.getElementById('staff-dashboard');
    if (!loginContainer || !dashboard) {
      return;
    }

    this.staffAuthUnsubscribe = window.firebaseAuth.onAuthStateChanged(async (user) => {
      if (!loginContainer || !dashboard) {
        return;
      }
      if (!user) {
        this.currentStaffUser = null;
        this.staffShowLoginForm();
        return;
      }
      try {
        const tokenResult = await user.getIdTokenResult(true);
        if (this.userHasStaffAccess(tokenResult.claims)) {
          this.currentStaffUser = user;
          this.staffShowDashboard();
        } else {
          await window.firebaseAuth.signOut();
          this.showNotification('Account not authorized for staff access.', 'error');
        }
      } catch (err) {
        console.error('staff auth listener', err);
        this.showNotification('Unable to verify staff access. Please try again.', 'error');
        await window.firebaseAuth.signOut().catch(() => {});
      }
    });
  }

  staffShowLoginForm() {
    const loginForm = document.getElementById('staff-login');
    const dashboard = document.getElementById('staff-dashboard');
    const emailEl = document.getElementById('staff-email');
    const passwordEl = document.getElementById('staff-password');

    if (loginForm) loginForm.classList.remove('hidden');
    if (dashboard) dashboard.classList.add('hidden');
    if (emailEl) emailEl.value = '';
    if (passwordEl) passwordEl.value = '';

    this.staffDashboardInitialized = false;
    this.staffSelectedDate = null;
  }

  staffShowDashboard() {
    const loginForm = document.getElementById('staff-login');
    const dashboard = document.getElementById('staff-dashboard');

    if (loginForm) loginForm.classList.add('hidden');
    if (dashboard) dashboard.classList.remove('hidden');

    if (!this.staffDashboardInitialized) {
      this.staffInitDashboard();
      this.showNotification('Schedule ready for viewing.', 'success');
      this.staffDashboardInitialized = true;
    } else {
      this.staffFetchForSelectedDate();
    }
  }

  async staffLogin(e) {
    e.preventDefault();
    const emailEl = document.getElementById('staff-email');
    const passwordEl = document.getElementById('staff-password');
    if (!emailEl || !passwordEl) return;
    const email = emailEl.value.trim();
    const password = passwordEl.value;
    if (!email || !password) {
      this.showNotification('Enter your email and password.', 'warning');
      return;
    }
    if (!window.firebaseAuth) {
      this.showNotification('Authentication unavailable. Please try again later.', 'error');
      return;
    }
    try {
      await window.firebaseAuth.signInWithEmailAndPassword(email, password);
    } catch (err) {
      console.error('staffLogin', err);
      let message = 'Unable to sign in. Please try again.';
      const code = err?.code;
      if (code === 'auth/invalid-email') {
        message = 'Invalid email address.';
      } else if (code === 'auth/user-not-found') {
        message = 'No staff account found for that email.';
      } else if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        message = 'Incorrect email or password.';
      }
      this.showNotification(message, 'error');
    }
  }

  async staffLogout() {
    if (!window.firebaseAuth) {
      this.staffShowLoginForm();
      return;
    }
    try {
      await window.firebaseAuth.signOut();
      this.staffShowLoginForm();
      this.showNotification('Logged out successfully', 'success');
    } catch (err) {
      console.error('staffLogout', err);
      this.showNotification('Unable to log out. Please try again.', 'error');
    }
  }

  staffInitDashboard() {
    const today = new Date();
    this.staffSelectedDate = this.adminFormatYMD(today);
    this.staffBindDateControls();
    this.staffFetchForSelectedDate();
  }

  staffBindDateControls() {
    const prevBtn = document.getElementById('staff-prev-day');
    const nextBtn = document.getElementById('staff-next-day');
    const todayBtn = document.getElementById('staff-today');
    const dateInput = document.getElementById('staff-date');

    if (prevBtn) prevBtn.onclick = () => this.staffChangeSelectedDate(-1);
    if (nextBtn) nextBtn.onclick = () => this.staffChangeSelectedDate(1);
    if (todayBtn)
      todayBtn.onclick = () => {
        this.staffSelectedDate = this.adminFormatYMD(new Date());
        this.staffOnDateChanged();
      };
    if (dateInput) {
      dateInput.value = this.staffSelectedDate || this.adminFormatYMD(new Date());
      dateInput.onchange = () => {
        this.staffSelectedDate = dateInput.value;
        this.staffOnDateChanged();
      };
    }
  }

  staffChangeSelectedDate(days) {
    try {
      const parts = (this.staffSelectedDate || this.adminFormatYMD(new Date()))
        .split('-')
        .map((n) => Number(n));
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      d.setDate(d.getDate() + Number(days || 0));
      this.staffSelectedDate = this.adminFormatYMD(d);
    } catch (_) {
      this.staffSelectedDate = this.adminFormatYMD(new Date());
    }
    this.staffOnDateChanged();
  }

  staffOnDateChanged() {
    const dateInput = document.getElementById('staff-date');
    if (dateInput && this.staffSelectedDate) {
      dateInput.value = this.staffSelectedDate;
    }
    this.staffFetchForSelectedDate();
  }

  async staffFetchForSelectedDate() {
    if (!window.firebaseFunctions || !window.firebaseFunctions.httpsCallable) {
      return;
    }
    const dateStr = this.staffSelectedDate || this.adminFormatYMD(new Date());
    const times = this.getTimeSlotsForDate(dateStr);
    this.applyBusinessHoursForDate(dateStr);
    try {
      const fn = window.firebaseFunctions.httpsCallable('adminGetBookingsByDate');
      const res = await fn({ date: dateStr });
      const bookings = res.data?.bookings || [];
      this.adminGridAssignments = this.adminAssignBookingsToColumns(bookings);
      await this.staffFetchAvailability(times, dateStr);
    } catch (err) {
      console.error('staffFetchForSelectedDate error', err);
      this.adminGridAssignments = this.adminAssignBookingsToColumns([]);
      this.adminRenderAvailabilityGrid(times, {}, { containerId: 'staff-availability-grid' });
      this.showNotification('Unable to load bookings for that day.', 'error');
    }
  }

  async staffFetchAvailability(timesArg, dateOverride) {
    if (!window.firebaseFunctions || !window.firebaseFunctions.httpsCallable) {
      return;
    }
    const dateStr = dateOverride || this.staffSelectedDate || this.adminFormatYMD(new Date());
    const times = timesArg || this.getTimeSlotsForDate(dateStr);
    try {
      const fn = window.firebaseFunctions.httpsCallable('adminGetAvailabilityByDate');
      const res = await fn({ date: dateStr, times, duration: 1 });
      const grid = res.data || {};
      this.adminRenderAvailabilityGrid(grid.times || times, grid.availability || {}, {
        containerId: 'staff-availability-grid',
      });
    } catch (err) {
      console.error('staffFetchAvailability error', err);
      this.adminRenderAvailabilityGrid(times, {}, { containerId: 'staff-availability-grid' });
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
    this.adminStartAutoAdvanceTimer();
  }

  adminStartAutoAdvanceTimer() {
    this.adminStopAutoAdvanceTimer();
    this.adminAutoAdvanceTimer = window.setInterval(() => {
      this.adminAutoAdvanceDateIfNeeded();
    }, 60 * 1000);
  }

  adminStopAutoAdvanceTimer() {
    if (this.adminAutoAdvanceTimer) {
      clearInterval(this.adminAutoAdvanceTimer);
      this.adminAutoAdvanceTimer = null;
    }
  }

  adminAutoAdvanceDateIfNeeded() {
    const todayStr = this.adminFormatYMD(new Date());
    if (!this.adminSelectedDate) {
      this.adminSelectedDate = todayStr;
      this.adminRenderDateLabel();
      this.adminFetchForSelectedDate();
      return;
    }
    if (this.adminSelectedDate < todayStr) {
      this.adminSelectedDate = todayStr;
      this.adminRenderDateLabel();
      this.adminFetchForSelectedDate();
    }
  }

  adminBindModifierModal() {
    if (this.adminModifierBound) return;
    const openBtn = document.getElementById('admin-modifier');
    if (openBtn) {
      openBtn.addEventListener('click', () => this.openAdminModifierModal());
    }
    const form = document.getElementById('admin-modifier-form');
    if (form) {
      form.addEventListener('submit', (event) => this.handleAdminModifierSubmit(event));
    }
    const bookingIdInput = document.getElementById('mod-booking-id');
    if (bookingIdInput) {
      bookingIdInput.addEventListener('change', () => {
        const id = bookingIdInput.value.trim();
        if (!id) {
          bookingIdInput.value = '';
          this.resetAdminModifierForm();
          return;
        }
        bookingIdInput.value = id;
        this.prefillAdminModifierById(id);
      });
    }
    const dateInput = document.getElementById('mod-date');
    const startSelect = document.getElementById('mod-start-time');
    const durationInput = document.getElementById('mod-duration');
    if (dateInput) {
      dateInput.addEventListener('change', () => {
        this.adminPopulateModifierStartTimes(dateInput.value, startSelect ? startSelect.value : '');
      });
    }
    if (durationInput) {
      durationInput.addEventListener('change', () => {
        const dateValue = dateInput && dateInput.value ? dateInput.value : '';
        this.adminPopulateModifierStartTimes(dateValue, startSelect ? startSelect.value : '');
      });
    }
    if (startSelect) {
      const ensureOptions = () => {
        const dateValue = dateInput && dateInput.value ? dateInput.value : '';
        this.adminPopulateModifierStartTimes(dateValue, startSelect.value || '');
      };
      startSelect.addEventListener('focus', ensureOptions);
      startSelect.addEventListener('click', ensureOptions);
    }
    const defaultDate =
      (dateInput && dateInput.value) || this.adminSelectedDate || this.adminFormatYMD(new Date());
    this.adminPopulateModifierStartTimes(defaultDate, startSelect ? startSelect.value : '');
    this.adminModifierBound = true;
  }

  resetAdminModifierForm() {
    const fields = [
      'mod-booking-id',
      'mod-room-id',
      'mod-date',
      'mod-start-time',
      'mod-duration',
      'mod-party-size',
      'mod-first-name',
      'mod-last-name',
      'mod-email',
      'mod-phone',
      'mod-total-cost',
      'mod-deposit',
      'mod-status',
    ];
    fields.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (el.tagName === 'SELECT') {
        el.value = '';
      } else {
        el.value = '';
      }
    });
    const dateEl = document.getElementById('mod-date');
    if (dateEl) {
      dateEl.value = this.adminSelectedDate || this.adminFormatYMD(new Date());
    }
    const durationEl = document.getElementById('mod-duration');
    if (durationEl) durationEl.value = '1';
    this.adminPopulateModifierStartTimes(dateEl ? dateEl.value : '', '');
    this.clearAdminModifierErrors();
  }

  clearAdminModifierErrors() {
    [
      'mod-booking-id',
      'mod-room-id',
      'mod-date',
      'mod-start-time',
      'mod-duration',
      'mod-party-size',
      'mod-first-name',
      'mod-last-name',
      'mod-email',
      'mod-phone',
      'mod-total-cost',
      'mod-deposit',
      'mod-status',
    ].forEach((id) => this.clearFieldError(id));
  }

  async prefillAdminModifierById(bookingId) {
    try {
      const local = this.adminBookingsById ? this.adminBookingsById[bookingId] : null;
      if (local) {
        this.fillAdminModifierFields(local);
        return;
      }
      if (!window.firestore) {
        this.showNotification('Cannot load booking details right now.', 'warning');
        return;
      }
      const snap = await window.firestore.collection('bookings').doc(bookingId).get();
      if (!snap.exists) {
        this.showNotification('Booking not found.', 'warning');
        return;
      }
      this.fillAdminModifierFields({ id: snap.id, ...snap.data() });
    } catch (err) {
      console.error('prefillAdminModifierById', err);
      this.showNotification('Unable to load that booking.', 'error');
    }
  }

  fillAdminModifierFields(booking) {
    if (!booking) return;
    const setters = {
      'mod-booking-id': booking.id || '',
      'mod-room-id': booking.roomId || '',
      'mod-date': booking.date || '',
      'mod-start-time': booking.startTime || '',
      'mod-duration': booking.duration || '',
      'mod-party-size': booking.partySize || '',
      'mod-first-name': booking.customer?.firstName || booking.customerInfo?.firstName || '',
      'mod-last-name': booking.customer?.lastName || booking.customerInfo?.lastName || '',
      'mod-email': booking.customer?.email || booking.customerInfo?.email || '',
      'mod-phone': booking.customer?.phone || booking.customerInfo?.phone || '',
      'mod-total-cost': booking.totalCost ?? '',
      'mod-deposit': booking.depositAmount ?? '',
      'mod-status': booking.status || '',
    };
    Object.entries(setters).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (!el || value === undefined || value === null) return;
      el.value = value;
    });
    this.adminPopulateModifierStartTimes(booking.date || '', booking.startTime || '', {
      allowCustomFallback: true,
    });
  }

  openAdminModifierModal(bookingId = '') {
    this.resetAdminModifierForm();
    if (bookingId) {
      const input = document.getElementById('mod-booking-id');
      if (input) input.value = bookingId;
      this.prefillAdminModifierById(bookingId);
    }
    this.showModal('admin-modifier-modal');
  }

  collectAdminModifierPayload() {
    this.clearAdminModifierErrors();
    const getVal = (id) => {
      const el = document.getElementById(id);
      return el ? el.value : '';
    };

    const parseNumberField = (id) => {
      const raw = getVal(id);
      return raw === '' ? NaN : Number(raw);
    };

    const bookingId = getVal('mod-booking-id').trim();
    const roomId = getVal('mod-room-id');
    const date = getVal('mod-date');
    const startTime = getVal('mod-start-time');
    const duration = parseNumberField('mod-duration');
    const partySize = parseNumberField('mod-party-size');
    const firstName = getVal('mod-first-name').trim();
    const lastName = getVal('mod-last-name').trim();
    const email = getVal('mod-email').trim();
    const phone = getVal('mod-phone').trim();
    const totalCost = parseNumberField('mod-total-cost');
    const depositAmount = parseNumberField('mod-deposit');
    const statusSel = getVal('mod-status');

    let valid = true;
    if (!roomId) {
      this.showFieldError('mod-room-id', 'Room is required.');
      valid = false;
    }
    if (!date) {
      this.showFieldError('mod-date', 'Date is required.');
      valid = false;
    }
    if (!startTime) {
      this.showFieldError('mod-start-time', 'Start time is required.');
      valid = false;
    }
    if (!Number.isFinite(duration) || duration <= 0) {
      this.showFieldError('mod-duration', 'Enter a valid duration (hours).');
      valid = false;
    }
    if (!firstName) {
      this.showFieldError('mod-first-name', 'First name is required.');
      valid = false;
    }
    if (!lastName) {
      this.showFieldError('mod-last-name', 'Last name is required.');
      valid = false;
    }
    if (!this.isValidEmail(email)) {
      this.showFieldError('mod-email', 'Enter a valid customer email.');
      valid = false;
    }
    if (!this.isValidPhone(phone)) {
      this.showFieldError('mod-phone', 'Enter a valid customer phone (10-15 digits).');
      valid = false;
    }

    if (!valid) {
      this.showNotification('Please fix the highlighted fields before saving.', 'error');
      return null;
    }

    const payload = {
      roomId,
      date,
      startTime,
      duration,
      customerInfo: { firstName, lastName, email, phone },
    };

    if (bookingId) payload.bookingId = bookingId;
    if (Number.isFinite(partySize) && partySize > 0) payload.partySize = partySize;
    if (Number.isFinite(totalCost) && totalCost >= 0) payload.totalCost = totalCost;
    if (Number.isFinite(depositAmount) && depositAmount >= 0) payload.depositAmount = depositAmount;
    if (statusSel) payload.status = statusSel;
    // Admin override: allow past bookings
    payload.allowPast = true;

    return payload;
  }

  async handleAdminModifierSubmit(event) {
    event.preventDefault();
    if (this.adminModifierSubmitting) return;
    this.adminModifierSubmitting = true;

    if (!window.firebaseFunctions) {
      this.showNotification('Functions unavailable. Please try again later.', 'error');
      this.adminModifierSubmitting = false;
      return;
    }
    const submitBtn = document.querySelector('#admin-modifier-form button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;
    const payload = this.collectAdminModifierPayload();
    if (!payload) {
      if (submitBtn) submitBtn.disabled = false;
      this.adminModifierSubmitting = false;
      return;
    }
    try {
      this.showLoading('Saving booking...');
      const fn = window.firebaseFunctions.httpsCallable('adminUpsertBySecret');
      await fn(payload);
      this.resetAdminModifierForm();
      this.showNotification('Booking saved successfully.', 'success');
      this.adminFetchForSelectedDate();
    } catch (err) {
      console.error('handleAdminModifierSubmit', err);
      this.showError(err.message || 'Unable to save booking.');
    } finally {
      this.hideLoading();
      this.hideModal('admin-modifier-modal');
      this.hideModal('admin-reschedule-modal');
      if (submitBtn) submitBtn.disabled = false;
      this.adminModifierSubmitting = false;
    }
  }

  adminFormatYMD(d) {
    return this.formatDateToYMD(d);
  }

  adminBindDateControls() {
    const prevBtn = document.getElementById('admin-prev-day');
    const nextBtn = document.getElementById('admin-next-day');
    const todayBtn = document.getElementById('admin-today');
    const dateInput = document.getElementById('admin-date');

    if (prevBtn) prevBtn.onclick = () => this.adminChangeSelectedDate(-1);
    if (nextBtn) nextBtn.onclick = () => this.adminChangeSelectedDate(1);
    if (todayBtn)
      todayBtn.onclick = () => {
        this.adminSelectedDate = this.adminFormatYMD(new Date());
        this.adminOnDateChanged();
      };
    if (dateInput) {
      dateInput.value = this.adminSelectedDate || this.adminFormatYMD(new Date());
      dateInput.onchange = () => {
        this.adminSelectedDate = dateInput.value;
        this.adminOnDateChanged();
      };
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
      const parts = (this.adminSelectedDate || this.adminFormatYMD(new Date()))
        .split('-')
        .map(Number);
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
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
    this.applyBusinessHoursForDate(dateStr);
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
      this.showNotification('Unable to load bookings for selected day', 'error');
    }
  }
  async adminFetchAvailability() {
    if (!window.firebaseFunctions || !window.firebaseFunctions.httpsCallable) return;
    const dateStr = this.adminSelectedDate || this.adminFormatYMD(new Date());
    const times = this.getTimeSlotsForDate(dateStr);
    this.applyBusinessHoursForDate(dateStr);
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
    const key = String(roomId || '')
      .trim()
      .toLowerCase();
    if (!key) return '';
    const map = {
      small: 'small',
      medium: 'medium',
      large: 'large',
      'extra-large': 'extra-large',
      xlarge: 'extra-large',
      'extra large': 'extra-large',
      xl: 'extra-large',
      extra_large: 'extra-large',
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
    return roomId.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) + ' Room';
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

    const assignableBookings = bookings
      .map((booking) => ({
        ...booking,
        roomId: this.normalizeRoomId(booking.roomId),
      }))
      .filter((booking) => (booking.status || '').toLowerCase() !== 'cancelled');

    this.adminEnsureColumnsFromBookings(assignableBookings);

    (this.adminRoomColumns || []).forEach((col) => {
      assignments[col.id] = [];
    });

    const bookingsWithRanges = assignableBookings
      .map((booking) => {
        const rawEnd =
          booking.endTime || this.adminComputeEndTime(booking.startTime, booking.duration || 1);
        const range = this.adminNormalizeBookingRange(booking.startTime, rawEnd);
        if (!range) return null;
        return {
          booking,
          startMinutes: range.startMinutes,
          endMinutes: range.endMinutes,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.startMinutes - b.startMinutes);

    bookingsWithRanges.forEach((entry) => {
      const booking = entry.booking;
      const { startMinutes, endMinutes } = entry;
      const roomId = booking.roomId || this.normalizeRoomId(booking.roomId);
      let cols = (this.adminRoomColumnsByType && this.adminRoomColumnsByType[roomId]) || [];
      if (!cols.length) {
        const newCol = this.adminAddColumn(roomId);
        if (newCol) {
          assignments[newCol.id] = [];
          cols = [newCol];
        } else {
          return;
        }
      }
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
    total = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
    const hh = String(Math.floor(total / 60)).padStart(2, '0');
    const mm = String(total % 60).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  adminNormalizeBookingRange(startTime, endTime) {
    const start = this.timeStringToMinutes(startTime);
    let end = this.timeStringToMinutes(endTime);
    if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
    if (end <= start) {
      end += 24 * 60;
    }
    return { startMinutes: start, endMinutes: end };
  }

  adminBuildGridTimes(times) {
    const increment = this.adminScheduleIncrementMinutes || 30;
    const dateStr =
      this.adminSelectedDate ||
      this.staffSelectedDate ||
      this.selectedDate ||
      this.adminFormatYMD(new Date());
    this.applyBusinessHoursForDate(dateStr);
    const segments = this.getActualDaySegments(dateStr);
    const rows = [];
    segments.forEach((segment) => {
      const start = Math.max(0, segment.startMinutes || 0);
      const endLimit = segment.closeMinutes;
      for (let cursor = start; cursor < endLimit; cursor += increment) {
        const rowEnd = Math.min(cursor + increment, endLimit);
        const startStr = this.minutesToTimeString(cursor);
        const endStr = this.minutesToTimeString(rowEnd);
        rows.push({
          start: startStr,
          end: endStr,
          startMinutes: cursor,
          endMinutes: rowEnd,
          label: this.adminFormatTimeRange(startStr, endStr),
        });
      }
    });
    return rows;
  }

  adminFormatTimeRange(start, end) {
    return `${this.formatTime(start)} - ${this.formatTime(end)}`;
  }

  adminFindBookingForSlot(entries, startMinutes, endMinutes) {
    if (!Array.isArray(entries)) return null;
    return (
      entries.find((entry) => startMinutes < entry.endMinutes && endMinutes > entry.startMinutes) ||
      null
    );
  }

  adminRenderAvailabilityGrid(times, availability, options = {}) {
    const containerId = options.containerId || 'admin-availability-grid';
    const container = document.getElementById(containerId);
    if (!container) return;
    const columns = options.columns || this.adminRoomColumns || [];
    if (!columns.length) {
      container.innerHTML = '<p class="admin-grid-empty">No room layout configured.</p>';
      return;
    }

    const rows = this.adminBuildGridTimes(times);
    const availabilityMap = availability && typeof availability === 'object' ? availability : {};
    const baseAssignments = options.assignments || this.adminGridAssignments || {};
    const assignments = { ...availabilityMap, ...baseAssignments };

    let headerHtml =
      '<table class="admin-schedule-table admin-schedule-header"><thead><tr><th class="time-head">Time</th>';
    columns.forEach((col) => {
      headerHtml += `<th><div class="room-label">${col.label}</div><div class="room-sub">${col.name}</div></th>`;
    });
    headerHtml += '</tr></thead></table>';

    let html =
      '<div class="admin-schedule-body-scroll"><table class="admin-schedule-table admin-schedule-body"><tbody>';

    const rowSpanTracker = {};
    rows.forEach((row) => {
      html += `<tr><td class="time-cell">${row.label}</td>`;
      for (let i = 0; i < columns.length; i += 1) {
        const col = columns[i];
        const colId = col.id;
        if (rowSpanTracker[colId] && rowSpanTracker[colId] > 0) {
          rowSpanTracker[colId] -= 1;
          continue;
        }

        const columnEntries = assignments[colId] || [];
        const bookingEntry = this.adminFindBookingForSlot(
          columnEntries,
          row.startMinutes,
          row.endMinutes,
        );
        if (bookingEntry) {
          const startIsRowStart =
            Math.round(row.startMinutes) === Math.round(bookingEntry.startMinutes);
          if (!startIsRowStart) {
            continue;
          }
          const booking = bookingEntry.booking || {};
          const customer = booking.customer || booking.customerInfo || {};
          const nameParts = [customer.firstName || '', customer.lastName || '']
            .map((part) => part.trim())
            .filter(Boolean);
          const name = nameParts.join(' ') || customer.email || booking.id || 'Booking';
          const phone = customer.phone || '';
          const party = Number(booking.partySize) ? `${Number(booking.partySize)} ppl` : '';
          const depositValue = Number(booking.depositAmount);
          const depositLine = Number.isFinite(depositValue)
            ? `Deposit: $${depositValue.toFixed(2)}`
            : '';
          const special =
            booking.customer?.specialRequests || booking.customerInfo?.specialRequests || '';
          const status = booking.status || 'pending';
          const endTime =
            booking.endTime || this.adminComputeEndTime(booking.startTime, booking.duration || 1);
          const slotMinutes =
            row.endMinutes - row.startMinutes || this.adminScheduleIncrementMinutes || 30;
          const totalMinutes = Math.max(
            bookingEntry.endMinutes - bookingEntry.startMinutes,
            slotMinutes,
          );
          const span = Math.max(1, Math.round(totalMinutes / slotMinutes));
          if (span > 1) {
            rowSpanTracker[colId] = span - 1;
          }
          const tooltip = [
            name ? `Name: ${name}` : '',
            party ? `Party: ${party}` : '',
            phone ? `Phone: ${phone}` : '',
            depositLine || '',
            special ? `Request: ${special}` : '',
            `Time: ${this.formatTime(booking.startTime)} - ${this.formatTime(endTime)}`,
          ]
            .filter(Boolean)
            .join('\n');

          html += `<td rowspan="${span}"><div class="slot booked status-${status}"><div class="booking-card">`;
          html += '<div class="booking-name">' + name + '</div>';
          if (party) html += '<div class="booking-detail">' + party + '</div>';
          html +=
            '<div class="booking-detail">' +
            this.formatTime(booking.startTime) +
            ' - ' +
            this.formatTime(endTime) +
            '</div>';
          if (depositLine) html += '<div class="booking-detail">' + depositLine + '</div>';
          if (phone) html += '<div class="booking-detail">' + phone + '</div>';
          if (special) {
            const trimmed = special.length > 80 ? special.slice(0, 77) + '…' : special;
            html += '<div class="booking-detail booking-special">' + trimmed + '</div>';
          }
          html += '</div></div></td>';
        } else {
          html += '<td><div class="slot available"><span>Available</span></div></td>';
        }
      }
      html += '</tr>';
    });
    html += '</tbody></table></div>';
    container.innerHTML = headerHtml + html;
  }

  adminBuildScheduleExportData() {
    const columns = Array.isArray(this.adminRoomColumns) ? this.adminRoomColumns : [];
    if (!columns.length) return null;
    const dateStr = this.adminSelectedDate || this.adminFormatYMD(new Date());
    const slots = this.getTimeSlotsForDate(dateStr, 1, {
      incrementMinutes: this.adminScheduleIncrementMinutes || 30,
    });
    const rows = this.adminBuildGridTimes(slots);
    if (!rows.length) return null;
    const headers = ['Time', ...columns.map((col) => `${col.label} - ${col.name || col.label}`)];
    const assignments = this.adminGridAssignments || {};
    const csvRows = rows.map((row) => {
      const cells = [row.label];
      columns.forEach((col) => {
        const columnEntries = assignments[col.id] || [];
        const bookingEntry = this.adminFindBookingForSlot(
          columnEntries,
          row.startMinutes,
          row.endMinutes,
        );
        if (bookingEntry && bookingEntry.booking) {
          const booking = bookingEntry.booking;
          const customer = booking.customer || booking.customerInfo || {};
          const name = [customer.firstName, customer.lastName].filter(Boolean).join(' ').trim();
          const endTime =
            booking.endTime || this.adminComputeEndTime(booking.startTime, booking.duration || 1);
          const depositValue = Number(booking.depositAmount);
          const depositText = Number.isFinite(depositValue)
            ? `Deposit $${depositValue.toFixed(2)}`
            : null;
          const parts = [
            booking.id ? `#${booking.id}` : null,
            name || customer.email || null,
            booking.partySize ? `${booking.partySize} ppl` : null,
            `${this.formatTime(booking.startTime)} - ${this.formatTime(endTime)}`,
            booking.status || null,
            depositText,
          ].filter(Boolean);
          cells.push(parts.join(' | '));
        } else {
          cells.push('Available');
        }
      });
      return cells;
    });
    return { date: dateStr, headers, rows: csvRows };
  }

  adminExportSchedule() {
    const data = this.adminBuildScheduleExportData();
    if (!data || !data.rows.length) {
      this.showNotification('No schedule data available to export.', 'warning');
      return;
    }
    const csv = this.buildCsv(data.headers, data.rows);
    const filename = `daily-schedule-${data.date}.csv`;
    this.downloadTextFile(csv, filename, 'text/csv;charset=utf-8;');
    this.showNotification('Schedule exported.', 'success');
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

      const status = booking.status || 'pending';
      const row = document.createElement('tr');
      row.dataset.bookingId = booking.id;
      row.dataset.paymentStatus = booking.paymentStatus || '';
      row.dataset.bookingStatus = status;
      row.classList.add('admin-booking-row');
      row.tabIndex = 0;
      const startDisplay = `${this.formatDateDisplay(booking.date)} ${this.formatTime(booking.startTime)}`;
      const paymentStatusRaw = booking.paymentStatus || '';
      const paymentStatus = paymentStatusRaw.toLowerCase();
      const paymentLabel = `Payment: ${this.formatPaymentStatus(paymentStatusRaw)}`;
      const paymentStatusClass =
        paymentStatus === 'succeeded'
          ? ' is-success'
          : paymentStatus === 'requires_capture' || paymentStatus === 'processing'
            ? ' is-warning'
            : paymentStatus === 'canceled'
              ? ' is-error'
              : '';
      const customer = booking.customerInfo || booking.customer || {};
      const customerName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim();
      const customerEmail = customer.email || '';
      const guestsDisplay = Number(booking.partySize) ? String(Number(booking.partySize)) : '-';

      this.adminBookingsById[booking.id] = booking;

      const statusLower = (status || '').toLowerCase();
      const paymentStatusLower = (booking.paymentStatus || '').toLowerCase();
      const canCancel = statusLower !== 'cancelled';
      const canCapture = paymentStatusLower === 'requires_capture';
      const canRefund =
        paymentStatusLower === 'succeeded' ||
        paymentStatusLower === 'processing' ||
        paymentStatusLower === 'requires_capture';
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
        <td>
          <span class="status-badge status-badge--${status}">${status}</span>
          <div class="table-hint table-hint--payment${paymentStatusClass}">${paymentLabel}</div>
        </td>
        <td>
          <div class="table-actions">
            <button class="btn btn--table btn--primary" data-action="admin-capture" data-id="${booking.id}" ${canCapture ? '' : 'disabled'} title="Capture Payment">
              <i class="fas fa-credit-card"></i>
            </button>
            <button class="btn btn--table btn--outline" data-action="admin-cancel-nr" data-id="${booking.id}" ${canCancel ? '' : 'disabled'} title="Cancel (No Refund)">
              <i class="fas fa-ban"></i>
            </button>
            <button class="btn btn--table btn--danger" data-action="admin-refund" data-id="${booking.id}" ${canRefund ? '' : 'disabled'} title="Refund Payment">
              <i class="fas fa-undo-alt"></i>
            </button>
          </div>
        </td>
      `;

      tableBody.appendChild(row);
    });

    this.adminGridAssignments = this.adminAssignBookingsToColumns(bookings);

    try {
      const bookingsCount = Array.isArray(bookings) ? bookings.length : 0;
      const totalGuests = (Array.isArray(bookings) ? bookings : []).reduce(
        (acc, b) => acc + (Number(b.partySize) || 0),
        0,
      );
      const totalRevenue = (Array.isArray(bookings) ? bookings : []).reduce(
        (acc, b) => acc + (Number(b.depositAmount) || 0),
        0,
      );

      const totalBookedHours = (Array.isArray(bookings) ? bookings : []).reduce(
        (acc, b) => acc + (Number(b.duration) || 0),
        0,
      );
      let openHours = 8;
      try {
        const config = this.buildBusinessTimeConfig(
          this.adminSelectedDate || this.adminFormatYMD(new Date()),
        );
        if (config?.openMinutes != null && config?.closeMinutes != null) {
          const span = config.closeMinutes - config.openMinutes;
          openHours = Math.max(1, Math.round(span / 60));
        }
      } catch (err) {
        console.warn('Failed to compute open hours', err);
      }
      const totalRooms =
        (this.rooms || []).reduce((acc, r) => acc + (Number(r.inventory) || 0), 0) || 1;
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

    tableBody.querySelectorAll('[data-action="admin-cancel-nr"]').forEach((btn) => {
      if (btn.disabled) return;
      btn.addEventListener('click', () =>
        this.adminCancelBookingNoRefund(btn.getAttribute('data-id')),
      );
    });
    tableBody.querySelectorAll('[data-action="admin-capture"]').forEach((btn) => {
      if (btn.disabled) return;
      btn.addEventListener('click', () => this.adminCapturePayment(btn.getAttribute('data-id')));
    });
    tableBody.querySelectorAll('[data-action="admin-refund"]').forEach((btn) => {
      if (btn.disabled) return;
      btn.addEventListener('click', () => this.adminRefundPayment(btn.getAttribute('data-id')));
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

  async adminCancelBookingNoRefund(bookingId) {
    if (!bookingId) return;
    if (!window.firebaseFunctions) return this.showNotification('Functions not available', 'error');

    const ok = confirm(`Cancel booking ${bookingId} without issuing a refund?`);
    if (!ok) return;

    try {
      this.showLoading('Cancelling booking...');
      const fn = window.firebaseFunctions.httpsCallable('adminCancelWithoutRefund');
      await fn({ bookingId });
      this.hideLoading();
      this.showNotification('Booking cancelled without refund', 'success');
      this.adminFetchForSelectedDate();
    } catch (err) {
      this.hideLoading();
      console.error('adminCancelBookingNoRefund', err);
      this.showError(err.message || 'Unable to cancel booking');
    }
  }

  async adminCapturePayment(bookingId) {
    if (!bookingId) return;
    if (!window.firebaseFunctions) return this.showNotification('Functions not available', 'error');

    const ok = confirm(`Capture payment for booking ${bookingId}?`);
    if (!ok) return;

    try {
      this.showLoading('Capturing payment...');
      const fn = window.firebaseFunctions.httpsCallable('adminCaptureBySecret');
      await fn({ bookingId });
      this.hideLoading();
      this.showNotification('Payment captured', 'success');
      this.adminFetchForSelectedDate();
    } catch (err) {
      this.hideLoading();
      console.error('adminCapturePayment', err);
      this.showError(err.message || 'Unable to capture payment');
    }
  }

  async adminRefundPayment(bookingId) {
    if (!bookingId) return;
    if (!window.firebaseFunctions) return this.showNotification('Functions not available', 'error');

    const ok = confirm(`Refund payment for booking ${bookingId}?`);
    if (!ok) return;

    try {
      this.showLoading('Refunding payment...');
      const fn = window.firebaseFunctions.httpsCallable('adminRefundBySecret');
      await fn({ bookingId });
      this.hideLoading();
      this.showNotification('Payment refunded', 'success');
      this.adminFetchForSelectedDate();
    } catch (err) {
      this.hideLoading();
      console.error('adminRefundPayment', err);
      this.showError(err.message || 'Unable to refund payment');
    }
  }

  parseDateFromYMD(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return null;
    const parts = dateStr.split('-').map((part) => Number(part));
    if (parts.length !== 3 || parts.some((val) => !Number.isFinite(val))) {
      return null;
    }
    const [year, month, day] = parts;
    return new Date(year, month - 1, day);
  }

  formatDateToYMD(dateObj) {
    if (!(dateObj instanceof Date) || Number.isNaN(dateObj.getTime())) {
      return '';
    }
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  shiftDate(dateStr, days) {
    const base = this.parseDateFromYMD(dateStr);
    if (!base || !Number.isFinite(days)) return dateStr;
    base.setDate(base.getDate() + Number(days));
    return this.formatDateToYMD(base);
  }

  getActualDaySegments(dateStr) {
    const segments = [];
    const schedule = this.getBusinessScheduleForDate(dateStr);
    const prevDate = this.shiftDate(dateStr, -1);
    const prevSchedule = prevDate ? this.getBusinessScheduleForDate(prevDate) : null;

    if (prevSchedule && prevSchedule.closeMinutes > 24 * 60) {
      segments.push({
        type: 'carryover',
        startMinutes: 0,
        closeMinutes: prevSchedule.closeMinutes - 24 * 60,
        businessDate: prevDate,
      });
    }

    if (schedule) {
      const startMinutes = Math.max(0, Math.min(schedule.openMinutes, 24 * 60));
      segments.push({
        type: 'current',
        startMinutes,
        closeMinutes: schedule.closeMinutes,
        businessDate: dateStr,
      });
    }

    return segments;
  }

  determineBusinessDate(dateStr, startTime) {
    const segments = this.getActualDaySegments(dateStr);
    const startMinutes = this.timeStringToMinutes(startTime);
    if (!Number.isFinite(startMinutes)) return dateStr;
    for (const segment of segments) {
      if (segment.type === 'carryover' && startMinutes < segment.closeMinutes) {
        return segment.businessDate;
      }
      if (segment.type === 'current' && startMinutes >= segment.startMinutes) {
        return segment.businessDate;
      }
    }
    return dateStr;
  }

  normalizeDuration(value, fallback = 1) {
    const parsed = Number.parseFloat(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return fallback;
    }
    return parsed;
  }

  normalizeCustomerDuration(value, fallback = 1) {
    const normalized = this.normalizeDuration(value, fallback);
    const clamped = Math.min(3, Math.max(1, normalized));
    return Math.round(clamped);
  }

  formatDurationLabel(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return '';
    if (Number.isInteger(num)) return String(num);
    return num.toFixed(1).replace(/\.0$/, '');
  }

  slotFitsBusinessHours(dateStr, startTime, durationHours) {
    const segments = this.getActualDaySegments(dateStr);
    if (!segments || !segments.length) return false;
    const start = this.timeStringToMinutes(startTime);
    const end = start + Number(durationHours || 0) * 60;
    if (!Number.isFinite(start) || !Number.isFinite(end)) return false;
    return segments.some((seg) => {
      const segStart = seg.startMinutes || 0;
      const segEnd = seg.closeMinutes || 0;
      return start >= segStart && end <= segEnd;
    });
  }

  formatDateDisplay(dateStr, options) {
    const dateObj = this.parseDateFromYMD(dateStr);
    if (!dateObj) {
      return dateStr || '';
    }
    try {
      return dateObj.toLocaleDateString(undefined, options);
    } catch (err) {
      console.warn('formatDateDisplay failed', err);
      return dateStr;
    }
  }

  buildBusinessTimeConfig(dateStr) {
    const schedule = this.getBusinessScheduleForDate(dateStr);
    const prevDate = this.shiftDate(dateStr, -1);
    const prevSchedule = prevDate ? this.getBusinessScheduleForDate(prevDate) : null;
    const carryoverMinutes =
      prevSchedule && prevSchedule.closeMinutes > 24 * 60 ? prevSchedule.closeMinutes - 24 * 60 : 0;
    if (!schedule) {
      return {
        schedule: null,
        openMinutes: 18 * 60,
        closeMinutes: (24 + 2) * 60,
        carryoverMinutes,
        segments: this.getActualDaySegments(dateStr),
      };
    }
    return {
      schedule,
      openMinutes: schedule.openMinutes,
      closeMinutes: schedule.closeMinutes,
      carryoverMinutes,
      segments: this.getActualDaySegments(dateStr),
    };
  }

  applyBusinessHoursForDate(dateStr) {
    const targetDate =
      dateStr ||
      this.selectedDate ||
      this.adminSelectedDate ||
      this.staffSelectedDate ||
      this.adminFormatYMD(new Date());
    this.businessTimeConfig = this.buildBusinessTimeConfig(targetDate);
    return this.businessTimeConfig;
  }

  getBusinessScheduleForDate(dateStr) {
    const map = this.businessHoursByDay || {};
    const fallback = map[1] || { open: '18:00', close: '02:30' };
    if (dateStr === '2026-01-01') {
      return null;
    }
    let baseSchedule = fallback;
    if (dateStr) {
      const safeDate = new Date(`${dateStr}T12:00:00`);
      if (!Number.isNaN(safeDate.getTime())) {
        const day = safeDate.getDay();
        if (Object.prototype.hasOwnProperty.call(map, day)) {
          baseSchedule = map[day];
        }
      }
    }
    const openMinutes = this.timeStringToMinutes(baseSchedule.open);
    let closeMinutes = this.timeStringToMinutes(baseSchedule.close);
    if (!Number.isFinite(openMinutes) || !Number.isFinite(closeMinutes)) {
      return null;
    }
    if (closeMinutes <= openMinutes) {
      closeMinutes += 24 * 60;
    }
    return {
      ...baseSchedule,
      openMinutes,
      closeMinutes,
    };
  }

  getTimeSlotsForDate(dateStr, durationHours = 1, options = {}) {
    const targetDate =
      dateStr ||
      this.selectedDate ||
      this.adminSelectedDate ||
      this.staffSelectedDate ||
      this.adminFormatYMD(new Date());
    const segments = this.getActualDaySegments(targetDate);
    if (!segments.length) return [];
    const durationMinutes = Math.max(
      this.minBookingDurationMinutes,
      Math.round(Number(durationHours) * 60) || this.minBookingDurationMinutes,
    );
    const customIncrement = Number(options.incrementMinutes);
    const increment =
      Number.isFinite(customIncrement) && customIncrement > 0
        ? customIncrement
        : this.slotIncrementMinutes || 30;
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
        const label = this.minutesToTimeString(cursor);
        if (!seen.has(label)) {
          seen.add(label);
          slots.push({ minutes: cursor, label });
        }
      }

      const needsFinalSlot = (latestStart - start) % increment !== 0 && latestStart >= start;
      if (needsFinalSlot) {
        const label = this.minutesToTimeString(latestStart);
        if (!seen.has(label)) {
          seen.add(label);
          slots.push({ minutes: latestStart, label });
        }
      }
    });

    return slots.sort((a, b) => a.minutes - b.minutes).map((entry) => entry.label);
  }

  timeStringToMinutes(time) {
    if (!time) return NaN;
    const parts = String(time).split(':');
    if (parts.length !== 2) return NaN;
    const h = Number(parts[0]);
    const m = Number(parts[1]);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return NaN;
    return h * 60 + m;
  }

  minutesToTimeString(totalMinutes) {
    if (!Number.isFinite(totalMinutes)) return '00:00';
    const normalized = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
    const hh = String(Math.floor(normalized / 60)).padStart(2, '0');
    const mm = String(normalized % 60).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  buildCsv(headers, rows) {
    const encode = (value) => {
      if (value == null) return '';
      const str = String(value).replace(/\r?\n|\r/g, ' ');
      if (/[",\n]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };
    const data = [headers, ...rows];
    return data.map((row) => row.map(encode).join(',')).join('\r\n');
  }

  downloadTextFile(content, filename, mimeType = 'text/plain') {
    try {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('downloadTextFile error', err);
      this.showNotification('Unable to download file. Please try again.', 'error');
    }
  }

  adminIsWithinBusinessHours(startTime, durationHours) {
    const startMinutes = this.timeStringToMinutes(startTime);
    if (!Number.isFinite(startMinutes)) return false;
    const durationMinutes = Number(durationHours) * 60;
    if (!Number.isFinite(durationMinutes)) return false;
    const endMinutes = startMinutes + durationMinutes;
    const segments = this.businessTimeConfig?.segments || [];
    return segments.some((segment) => {
      if (segment.type === 'carryover') {
        if (startMinutes < 0 || startMinutes >= segment.closeMinutes) {
          return false;
        }
        return endMinutes <= segment.closeMinutes;
      }
      if (startMinutes < segment.startMinutes) {
        return false;
      }
      return endMinutes <= segment.closeMinutes;
    });
  }

  adminPopulateRescheduleTimes(selectEl, selected, dateOverride, options = {}) {
    if (!selectEl) return;
    const state = this.adminRescheduleState || {};
    const targetDate =
      dateOverride ||
      state.date ||
      state.originalDate ||
      this.adminSelectedDate ||
      this.adminFormatYMD(new Date());
    const durationInput = document.getElementById('resched-duration');
    const baseDuration =
      durationInput && durationInput.value
        ? this.normalizeDuration(durationInput.value, state.duration || 1)
        : state.duration || 1;

    const slots = this.getTimeSlotsForDate(targetDate, baseDuration);
    this.applyBusinessHoursForDate(targetDate);
    selectEl.innerHTML = '';

    if (!Array.isArray(slots) || slots.length === 0) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = targetDate ? 'No slots available' : 'Select a date first';
      option.disabled = true;
      option.selected = true;
      selectEl.appendChild(option);
      selectEl.disabled = true;
      return;
    }

    selectEl.disabled = false;
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Select time';
    placeholder.disabled = true;
    selectEl.appendChild(placeholder);

    slots.forEach((slot) => {
      const option = document.createElement('option');
      option.value = slot;
      option.textContent = this.formatTime(slot);
      selectEl.appendChild(option);
    });

    const allowCustom = options.allowCustomFallback === true;
    let selectionApplied = false;
    if (selected && slots.includes(selected)) {
      selectEl.value = selected;
      selectionApplied = true;
    } else if (selected && allowCustom) {
      const option = document.createElement('option');
      option.value = selected;
      option.textContent = this.formatTime(selected);
      selectEl.appendChild(option);
      selectEl.value = selected;
      selectionApplied = true;
    }

    if (!selectionApplied) {
      selectEl.value = '';
      placeholder.selected = true;
    }
  }

  adminPopulateModifierStartTimes(dateOverride, selected, options = {}) {
    const select = document.getElementById('mod-start-time');
    if (!select) return;
    const dateInput = document.getElementById('mod-date');
    const targetDate =
      dateOverride ||
      (dateInput && dateInput.value) ||
      this.adminSelectedDate ||
      this.adminFormatYMD(new Date());
    const durationInput = document.getElementById('mod-duration');
    const durationValue = durationInput ? this.normalizeDuration(durationInput.value, 1) : 1;

    const slots =
      targetDate && this.getTimeSlotsForDate
        ? this.getTimeSlotsForDate(targetDate, durationValue, { incrementMinutes: 30 })
        : [];

    this.applyBusinessHoursForDate(targetDate);

    select.innerHTML = '';
    select.disabled = false;

    if (!Array.isArray(slots) || slots.length === 0) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = targetDate ? 'No slots available' : 'Select a date first';
      option.disabled = true;
      option.selected = true;
      select.appendChild(option);
      select.disabled = true;
      return;
    }

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Select time';
    placeholder.disabled = true;
    select.appendChild(placeholder);

    slots.forEach((slot) => {
      const option = document.createElement('option');
      option.value = slot;
      option.textContent = this.formatTime(slot);
      select.appendChild(option);
    });

    const allowCustom = options.allowCustomFallback === true;
    let selectionApplied = false;
    if (selected && slots.includes(selected)) {
      select.value = selected;
      selectionApplied = true;
    } else if (selected && allowCustom) {
      const customOption = document.createElement('option');
      customOption.value = selected;
      customOption.textContent = this.formatTime(selected);
      select.appendChild(customOption);
      select.value = selected;
      selectionApplied = true;
    }

    if (!selectionApplied) {
      select.value = '';
      placeholder.selected = true;
    }
  }

  adminPopulateRoomSelect(selectEl, selectedId) {
    if (!selectEl) return;
    selectEl.innerHTML = '';
    const rooms = Array.isArray(this.rooms) ? this.rooms : [];
    if (!rooms.length) {
      const opt = document.createElement('option');
      opt.value = selectedId || '';
      opt.textContent = selectedId || 'No rooms configured';
      selectEl.appendChild(opt);
      return;
    }
    rooms.forEach((room) => {
      const option = document.createElement('option');
      option.value = room.id;
      option.textContent = room.name;
      if (room.id === selectedId) option.selected = true;
      selectEl.appendChild(option);
    });
    if (
      selectedId &&
      !rooms.some((room) => room.id === selectedId) &&
      typeof selectedId === 'string'
    ) {
      const option = document.createElement('option');
      option.value = selectedId;
      option.textContent = selectedId;
      option.selected = true;
      selectEl.appendChild(option);
    }
  }

  adminEnsureRescheduleFormBound() {
    if (this.rescheduleFormBound) return;
    const form = document.getElementById('admin-reschedule-form');
    if (!form) return;
    form.addEventListener('submit', (event) => this.adminHandleRescheduleSubmit(event));
    const dateInput = document.getElementById('resched-date');
    if (dateInput) {
      dateInput.addEventListener('change', () => {
        if (this.adminRescheduleState) {
          this.adminRescheduleState.date = dateInput.value;
        }
        const select = document.getElementById('resched-start');
        this.adminPopulateRescheduleTimes(select, '', dateInput.value);
        this.adminEvaluateRescheduleAvailability();
      });
    }
    const durationInput = document.getElementById('resched-duration');
    if (durationInput) {
      durationInput.addEventListener('change', () => {
        const durationValue = this.normalizeDuration(
          durationInput.value,
          this.adminRescheduleState?.duration || 1,
        );
        if (this.adminRescheduleState) {
          this.adminRescheduleState.duration = durationValue;
        }
        const select = document.getElementById('resched-start');
        this.adminPopulateRescheduleTimes(select, select ? select.value : '', undefined);
        this.adminEvaluateRescheduleAvailability();
      });
    }
    const timeInput = document.getElementById('resched-start');
    if (timeInput) {
      timeInput.addEventListener('change', () => this.adminEvaluateRescheduleAvailability());
    }
    const roomSelect = document.getElementById('resched-room-id');
    if (roomSelect) {
      roomSelect.addEventListener('change', () => {
        if (this.adminRescheduleState) {
          this.adminRescheduleState.roomId = roomSelect.value || this.adminRescheduleState.roomId;
        }
        this.adminEvaluateRescheduleAvailability();
      });
    }
    const partyInput = document.getElementById('resched-party-size');
    if (partyInput) {
      partyInput.addEventListener('input', () => {
        if (this.adminRescheduleState) {
          const value = Number(partyInput.value);
          this.adminRescheduleState.partySize = Number.isFinite(value) && value > 0 ? value : null;
        }
      });
    }
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
      date: booking.date,
      originalDate: booking.date,
      originalStartTime: booking.startTime,
      duration: this.normalizeDuration(booking.duration, 1),
      partySize: Number(booking.partySize) || null,
      validPayload: null,
    };
    this.adminRescheduleRequestId += 1;

    const idEl = document.getElementById('resched-booking-id');
    if (idEl) idEl.value = bookingId;

    const codeEl = document.getElementById('resched-booking-code');
    if (codeEl) codeEl.value = bookingId;

    const roomSelect = document.getElementById('resched-room-id');
    if (roomSelect) {
      this.adminPopulateRoomSelect(roomSelect, booking.roomId);
    }

    const partyInput = document.getElementById('resched-party-size');
    if (partyInput) {
      partyInput.value = Number(booking.partySize) ? String(booking.partySize) : '';
    }

    const dateEl = document.getElementById('resched-date');
    if (dateEl) dateEl.value = booking.date;

    const durationEl = document.getElementById('resched-duration');
    if (durationEl) {
      const durationValue = String(booking.duration || 1);
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
      this.adminPopulateRescheduleTimes(timeSelect, booking.startTime, booking.date, {
        allowCustomFallback: true,
      });
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
    const roomSelect = document.getElementById('resched-room-id');
    if (!dateEl || !timeEl || !durationEl) return;

    const date = dateEl.value;
    const startTime = timeEl.value;
    const duration = this.normalizeDuration(
      durationEl.value || state.duration || 1,
      state.duration || 1,
    );

    const roomId = (roomSelect && roomSelect.value) || state.roomId;
    if (!roomId) {
      if (statusEl) statusEl.textContent = 'Select a room.';
      if (submitBtn) submitBtn.disabled = true;
      return;
    }

    if (this.adminRescheduleState) {
      this.adminRescheduleState.duration = duration;
      this.adminRescheduleState.date = date;
      this.adminRescheduleState.roomId = roomId;
    }

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

    const isAdminContext = Boolean(this.currentAdminUser || this.currentStaffUser);
    if (!isAdminContext && candidateStart.getTime() < Date.now()) {
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
      const partySize =
        this.adminRescheduleState?.partySize ||
        state.partySize ||
        this.bookingData.partySize ||
        null;
      const response = await fn({
        date,
        startTime,
        duration,
        roomIds: [roomId],
        excludeBookingId: state.bookingId,
        overrideWalkInHold: true,
        allowPast: true,
        partySize,
      });
      if (requestId !== this.adminRescheduleRequestId) return;

      const remaining = Number(response?.data?.availability?.[roomId]);
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
      const reqPayload = {
        bookingId: state.bookingId,
        newDate: state.validPayload.date,
        newStartTime: state.validPayload.startTime,
        newDuration: state.validPayload.duration,
        roomId: state.roomId,
        allowPast: true,
      };
      if (Number.isFinite(Number(state.partySize)) && Number(state.partySize) > 0) {
        reqPayload.partySize = Number(state.partySize);
      }
      await fn(reqPayload);
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
    this.showNotification(
      `Editing booking ${bookingId} is not available in this build. Please contact the development team.`,
      'info',
    );
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

  hideModal(modalId) {
    if (modalId) {
      const modal = document.getElementById(modalId);
      if (modal) {
        modal.classList.remove('show');
        modal.classList.add('hidden');
      }
      if (modalId === 'admin-reschedule-modal') {
        this.adminResetRescheduleState();
      }
      return;
    }
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
const app = new BarzunkoApp();
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
