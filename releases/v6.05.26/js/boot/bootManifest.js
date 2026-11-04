/**
 * GuriGO – script manifests for boot phases 2 (shell) and 3 (features).
 * Cache-busters must stay in sync with former index.html tags.
 */
(function (global) {
  'use strict';

  var PHASE2_SHELL = [
    'https://www.gstatic.com/firebasejs/8.10.0/firebase-firestore.js',
    'js/config/vatConfig.js?v=60517script1',
    'js/config/pricing.js?v=60517script1',
    'js/config/subscriptionTiers.js?v=60508entgift1',
    'js/services/subscriptionEntitlements.js?v=60508status2',
    'js/services/gurigoNativeIapBridge.js?v=60508storekit-price8',
    'js/config/billingEnv.js?v=60514billingday9',
    'js/services/trialResetHandler.js?v=60517console1',
    'js/tracking/utmTracker.js?v=60517console1',
    'js/tracking/analytics.js?v=60514ga1',
    'js/services/sentryClient.js',
    'js/utils/countryFlag.js?v=60508flags1',
    'js/config/appInfo.js',
    'js/config/waybillAllowlist.js',
    'js/config/vehiclesAllowlist.js',
    'js/utils/time.js?v=60513drivingmode4',
    'js/utils/sundayMondayHelper.js?v=60508vhsplit1',
    'js/utils/dailyDriveSegments.js?v=60508tacho10h1',
    'js/utils/geolocation.js',
    'js/utils/dataHelpers.js?v=60514records1',
    'js/utils/crossingFormat.js?v=60330cross',
    'js/utils/crossingMerge.js?v=60526checkout1',
    'js/utils/holidayDates.js?v=60330holidayui',
    'js/utils/realismValidator.js?v=60513drivingmode1',
    'js/ui/headerDateChip.js?v=60510headerdatechip2',
    'js/services/documentsDataService.js?v=60508read1',
    'js/services/workdayRecordSync.js?v=60526checkout1',
    'js/services/activeShiftSync.js?v=60526checkout1',
    'js/services/syncRetryManager.js?v=60526checkout1',
    'js/services/offlinePolicy.js?v=60508prodshift1',
    'js/services/pendingDocumentsStore.js?v=60508policy2',
    'js/services/database.js?v=60526checkout1',
    'js/utils/vehicleSegments.js?v=60508rptveh1',
    'js/services/vehiclesService.js?v=60508veh4',
    'js/features/entryVehicleField.js?v=60508rptveh1',
    'js/features/fullDayVehicleSegments.js?v=60513drivingmode3',
    'js/features/vehicleChange.js?v=60508vehchg3',
    'js/services/errorLogger.js?v=60508errfilt1',
    'js/utils/activityTracker.js?v=60517console1',
    'js/fixes/delete-shim.js?v=40119',
    'js/services/pwa.js',
    'js/services/offlineStore.js?v=60508sync1',
    'js/services/syncManager.js?v=60508sync2',
    'js/services/offlineSync.js?v=60508prodshift1',
    'js/features/trailerContainerLog.js?v=60526checkout1',
    'js/services/trailerContainerActiveSync.js?v=60526checkout1',
    'js/features/workday.js?v=60526checkout1',
    'js/utils/listPagination.js?v=60508listpag4',
    'js/features/recordsList.js?v=60526checkout1',
    'js/features/summary.js',
    'js/features/tachographWarnings.js',
    'js/rules/twoReducedWeeklyRest.js',
    'js/rules/ninetyHourWeekendRest.js',
    'js/rules/mobilityPackageWeeklyRest.js?v=60508mp-overview1',
    'js/rules/weeklyRestCompensation.js?v=60508errfilt1',
    'js/services/subscriptionHelpers.js?v=60508earlybird6',
    'js/services/subscriptionCancellationFeedback.js?v=60508cancel4',
    'js/services/subscriptionProcessingOverlay.js?v=60508resume1',
    'js/services/billingCycleDay.js?v=60520tcl1',
    'js/features/overviewPaymentProblemBanner.js?v=60508iap-payment-grace-ui1',
    'js/features/overview-live-refresh.js',
    'js/ui/navigation.js?v=60508moremenu1',
    'js/utils/countryModal.js?v=60508logoutnav1',
    'js/services/subscriptionEntitlementsRefresh.js?v=60508',
    'js/services/userProfile.js?v=60517console1',
    'js/services/clientInfo.js?v=60508',
    // settings.js: loadSettings / feature toggles needed at shell boot (not tab-only)
    'js/features/settings.js?v=60526checkout1',
    'js/main.js?v=60517console1'
  ];

  var PHASE3_FEATURES = {
    pallets: ['js/features/pallets.js?v=60521pallet1'],
    waybill: ['js/features/waybill.js'],
    vehicles: ['js/features/vehicles.js?v=60508veh3'],
    fueling: [
      'js/services/fuelingService.js?v=60508fuelfull1',
      'js/features/fueling.js?v=60508fuelpro2'
    ],
    stats: [
      'js/services/statisticsDataService.js?v=60508stats1',
      'js/features/stats.js?v=60508stats1'
    ],
    report: [
      'js/utils/reportRowNormalizer.js?v=60330holiday',
      'js/utils/pdfViewer.js?v=60508pdfback6',
      'js/features/report.js?v=60526checkout1'
    ],
    tachograph: ['js/features/tachograph.js?v=60513drivingmode4'],
    documents: [
      'js/features/documents.js?v=60508errfilt1',
      'js/utils/documentExpiryDate.js',
      'js/features/documentsReminder.js?v=60508errfilt1',
      'js/services/documentsStats.js',
      'js/features/documentsManager.js'
    ],
    announcements: [
      'js/utils/environmentDetector.js',
      'js/services/announcementTargeting.js?v=60517rate3',
      'js/services/announcementsService.js?v=60526checkout1',
      'js/features/announcements.js?v=60517rate3'
    ],
    settings: [],
    subscription: [
      'js/features/subscription.js?v=60526checkout1',
      'js/features/paymentFailedAlert.js?v=60324',
      'js/features/billing-info.js?v=60517console1',
      'js/features/invoices.js?v=60517console1'
    ],
    accountDelete: ['js/features/accountDelete.js?v=60508logout1'],
    help: ['js/features/help.js'],
    whatsNew: [],
    yearlySummary: ['js/features/yearlySummary2025.js'],
    debug: ['js/debug/mobilityCompensationCase.js?v=60520tcl1'],
    misc: [
      'js/fixes/nav-fix.js',
      'js/open-in-app.v3.js?v=40112'
    ]
  };

  /** Flat warm list for idle Phase 3 (order matters within groups). */
  var PHASE3_WARM_ORDER = [
    'subscription',
    'announcements',
    'tachograph',
    'documents',
    'fueling',
    'vehicles',
    'waybill',
    'pallets',
    'stats',
    'report',
    'help',
    'accountDelete',
    'yearlySummary',
    'debug',
    'misc'
  ];

  var TAB_TO_FEATURES = {
    live: [],
    start: [],
    'full-day': [],
    list: [],
    summary: [],
    stats: ['stats'],
    report: ['report'],
    tachograph: ['tachograph'],
    pallets: ['pallets'],
    waybill: ['waybill'],
    vehicles: ['vehicles'],
    fueling: ['fueling'],
    documents: ['documents'],
    documentsManager: ['documents'],
    settings: ['accountDelete'],
    subscription: ['subscription'],
    referral: ['subscription'],
    help: ['help'],
    whatsNew: ['announcements'],
    about: [],
    invoices: ['subscription']
  };

  global.GurigoBootManifest = {
    PHASE2_SHELL: PHASE2_SHELL,
    PHASE3_FEATURES: PHASE3_FEATURES,
    PHASE3_WARM_ORDER: PHASE3_WARM_ORDER,
    TAB_TO_FEATURES: TAB_TO_FEATURES
  };
})(typeof window !== 'undefined' ? window : this);
