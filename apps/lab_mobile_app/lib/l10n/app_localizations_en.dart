// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appTitle => 'Lab Patient App';

  @override
  String get navHome => 'HOME';

  @override
  String get navOrders => 'ORDERS';

  @override
  String get navResults => 'RESULTS';

  @override
  String get navPoints => 'POINTS';

  @override
  String get navProfile => 'PROFILE';

  @override
  String get language => 'Language';

  @override
  String get languageEnglish => 'English';

  @override
  String get languageMyanmar => 'Myanmar (Burmese)';

  @override
  String get signIn => 'Sign in';

  @override
  String get signingIn => 'Signing in…';

  @override
  String get email => 'Email';

  @override
  String get password => 'Password';

  @override
  String get rememberMe => 'Keep me signed in';

  @override
  String get forgotPassword => 'Forgot password?';

  @override
  String get noAccountPrompt => 'Don\'t have an account?';

  @override
  String get createNewAccount => 'Create New Account';

  @override
  String get emailRequired => 'Enter your email';

  @override
  String get emailInvalid => 'Enter a valid email';

  @override
  String get passwordRequired => 'Enter your password';

  @override
  String get accountSettings => 'ACCOUNT SETTINGS';

  @override
  String get editProfile => 'Edit Profile';

  @override
  String get editProfileSubtitle => 'Personal information, medical history';

  @override
  String get labAppearance => 'Lab & appearance';

  @override
  String get labAppearanceSubtitle => 'Theme, logo, and contact info from your lab';

  @override
  String get loyaltyStatus => 'LOYALTY STATUS';

  @override
  String get viewLoyaltyPoints => 'View loyalty points';

  @override
  String pointsCount(int count) {
    return '$count points';
  }

  @override
  String get phone => 'Phone';

  @override
  String get signOut => 'Sign out';

  @override
  String get orderTracking => 'Order tracking';

  @override
  String get collectorPending => 'Pending';

  @override
  String get preferredCollector => 'Preferred collector';

  @override
  String get noCollectorPreference => 'No preference — lab assigns';

  @override
  String get collectorOptionalHint => 'Optional — same collector when planning routes';

  @override
  String get welcomeBack => 'Welcome back';

  @override
  String get homeRefreshHint => 'Summary cards and charts are loaded from the lab server. Pull down anytime to refresh.';

  @override
  String get homeOverviewLabel => 'YOUR OVERVIEW';

  @override
  String get homeAccountSummary => 'Account summary';

  @override
  String get homeLiveMetrics => 'Live metrics from your lab account';

  @override
  String get homePromotionsLabel => 'PROMOTIONS';

  @override
  String get homeOffersUpdates => 'Offers & updates';

  @override
  String get homeLearnMore => 'Learn more';

  @override
  String get homeCouldNotOpenLink => 'Could not open link';

  @override
  String get homeTotalOrders => 'Total orders';

  @override
  String homeCompletedOrdersCount(int count) {
    return '$count completed';
  }

  @override
  String get homeTotalSpent => 'Total spent';

  @override
  String get homeDeliveredOrders => 'Delivered orders';

  @override
  String get homeLoyaltyPoints => 'Loyalty points';

  @override
  String get homeTapForHistory => 'Tap for history';

  @override
  String get homeInProgress => 'In progress';

  @override
  String get homeOpenOrders => 'Open orders';

  @override
  String get homeActiveOrder => 'Active order';

  @override
  String get homeReportOut => 'Report out';

  @override
  String get homeDailySpend => 'Daily spend';

  @override
  String get homeOrderActivityByDay => 'Order activity by day';

  @override
  String get homeNoOrdersYet => 'No orders yet. Your spend trend will appear here after your first order.';

  @override
  String homeSpendTooltip(String amount, int count) {
    return '$amount MMK · $count order(s)';
  }

  @override
  String get homeTopOrderedTests => 'Top ordered tests';

  @override
  String get homeMostRequestedTests => 'Your most requested lab tests';

  @override
  String get homeNoTopTestsYet => 'Once you place orders, your favourite tests will show up here.';

  @override
  String homeOrdersCount(int count) {
    return '$count orders';
  }

  @override
  String get homeOrderCountSingular => '1 order';

  @override
  String get homeMmkSuffix => 'MMK';

  @override
  String get ordersNewOrder => 'New order';

  @override
  String get ordersTitle => 'Your orders';

  @override
  String get ordersSubtitle => 'Active requests that are not yet delivered.';

  @override
  String get ordersNoActiveYet => 'No active orders yet';

  @override
  String get ordersNoActiveHint => 'Use the card above to place your first lab test. Orders stay here until they are delivered.';

  @override
  String ordersActiveCount(int count) {
    return 'Active orders ($count)';
  }

  @override
  String get ordersStatus => 'Status';

  @override
  String get ordersSort => 'Sort';

  @override
  String get ordersAllOrders => 'All orders';

  @override
  String get ordersAll => 'All';

  @override
  String get ordersFilterByStatus => 'Filter by status';

  @override
  String get ordersActiveOnlyHint => 'Only active orders that are not yet delivered appear here.';

  @override
  String get ordersSortBy => 'Sort by';

  @override
  String ordersNoStatusOrders(String status) {
    return 'No $status orders';
  }

  @override
  String get ordersTryAnotherFilter => 'Try another status tab or place a new order.';

  @override
  String get ordersOrderLabTest => 'Order lab test';

  @override
  String get ordersOrderLabTestHint => 'Add patient details, pick tests, and schedule collection';

  @override
  String ordersPlaced(String date) {
    return 'Placed $date';
  }

  @override
  String get ordersPatientFallback => 'Patient';

  @override
  String ordersStatusCount(String label, int count) {
    return '$label · $count';
  }

  @override
  String get orderStatusPending => 'Pending';

  @override
  String get orderStatusScheduled => 'Scheduled';

  @override
  String get orderStatusCollecting => 'Collecting';

  @override
  String get orderStatusRunning => 'Running';

  @override
  String get orderStatusCompleted => 'Completed';

  @override
  String get orderStatusDelivered => 'Delivered';

  @override
  String get orderStatusUnknown => 'Unknown';

  @override
  String get ordersSortNewestFirst => 'Newest first';

  @override
  String get ordersSortOldestFirst => 'Oldest first';

  @override
  String get ordersSortRecentlyUpdated => 'Recently updated';

  @override
  String get ordersSortByStatus => 'Status';

  @override
  String get ordersSortPriority => 'Priority (urgent first)';

  @override
  String get ordersSortRecentlyReleased => 'Recently released';

  @override
  String get ordersSortOldestReleased => 'Oldest released';

  @override
  String get ordersSortNewestPlaced => 'Newest placed';

  @override
  String get ordersSortOldestPlaced => 'Oldest placed';

  @override
  String get ordersRate => 'Rate';

  @override
  String get ordersRated => 'Rated';

  @override
  String get ordersRateThisOrder => 'Rate this order';

  @override
  String get ordersCommentOptional => 'Comment (optional)';

  @override
  String get ordersCommentHint => 'Share feedback for the lab team';

  @override
  String get ordersSubmitRating => 'Submit rating';

  @override
  String get ordersThanksFeedback => 'Thanks for your feedback';

  @override
  String ordersRatedToast(int stars) {
    return 'You rated this order $stars stars.';
  }

  @override
  String get ordersRatedToastSingular => 'You rated this order 1 star.';

  @override
  String get ordersRatingFailed => 'Rating failed';

  @override
  String get ordersYourRating => 'Your rating';

  @override
  String get ordersYourComment => 'Your comment';

  @override
  String get ordersNoComment => 'No comment was added with this rating.';

  @override
  String get resultsTitle => 'Your results';

  @override
  String get resultsSubtitle => 'Lab reports the team has released to you.';

  @override
  String get resultsNoReleasedYet => 'No released results yet';

  @override
  String get resultsNoReleasedHint => 'When the lab releases your report, it will show up here for PDF download and AI Check.';

  @override
  String resultsReleasedReportsCount(int count) {
    return 'Released reports ($count)';
  }

  @override
  String resultsReleasedDate(String date) {
    return 'Released $date';
  }

  @override
  String get resultsReleasedBadge => 'Released';

  @override
  String get labReportTitle => 'Lab report';

  @override
  String get labReportTestsSection => 'TESTS IN THIS ORDER';

  @override
  String labReportTestCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count tests',
      one: '1 test',
    );
    return '$_temp0';
  }

  @override
  String get labReportCombinedHint => 'Some tests are grouped into combined reports. Download the shared PDF or run AI Check from each group.';

  @override
  String get labReportSeparateHint => 'Download the official PDF or run AI Check for each test separately.';

  @override
  String get labReportNoTestLines => 'No test line items were found for this order.';

  @override
  String get labReportPdfsNotUploadedYet => 'The lab has released this order, but PDFs are not uploaded yet. Check back soon or contact the lab.';

  @override
  String get labReportSummaryValues => 'Summary values';

  @override
  String get labReportNoReportLoaded => 'No report loaded';

  @override
  String get labReportSelectFromResults => 'Select a released order from Results.';

  @override
  String get labReportPatient => 'Patient';

  @override
  String labReportAge(int age) {
    return 'Age $age';
  }

  @override
  String labReportOrderLine(String ref, String date) {
    return 'Order $ref · $date';
  }

  @override
  String labReportPdfCountOne(int released, int total) {
    return '$released/$total PDF';
  }

  @override
  String labReportPdfCountMany(int released, int total) {
    return '$released/$total PDFs';
  }

  @override
  String get labReportCombinedReport => 'Combined report';

  @override
  String labReportTestsSharePdf(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count tests share one PDF',
      one: '1 test shares one PDF',
    );
    return '$_temp0';
  }

  @override
  String get labReportPdfNotUploadedCombined => 'PDF not uploaded yet for this combined report.';

  @override
  String get labReportPdfNotUploadedTest => 'PDF not uploaded yet for this test.';

  @override
  String get labReportDownloadCombinedPdf => 'Download combined PDF';

  @override
  String get labReportDownloadPdf => 'Download PDF';

  @override
  String get labReportDownloading => 'Downloading…';

  @override
  String get labReportRunAiCheck => 'Run AI Check';

  @override
  String get labReportRunningAiCheck => 'Running AI Check…';

  @override
  String get labReportViewAiSummary => 'View AI summary';

  @override
  String get labReportPdfReady => 'PDF ready';

  @override
  String get labReportPdfPending => 'Pending';

  @override
  String get labReportDownloadStarted => 'Download started';

  @override
  String get labReportReportSaved => 'Report saved';

  @override
  String get labReportDownloadFailed => 'Could not download the report. Try again.';

  @override
  String get labReportAiCheckFailed => 'Could not run AI Check. Try again.';

  @override
  String get loyaltyLoadError => 'Could not load point history. Pull down to retry.';

  @override
  String get loyaltyAvailableBalance => 'Available balance';

  @override
  String get loyaltyPointsUnit => 'pts';

  @override
  String get loyaltyBalanceHint => 'Balance comes from your account total_points. Points are earned when the lab verifies a payment, using the rules below.';

  @override
  String get loyaltyHowToEarn => 'How to earn';

  @override
  String get loyaltyEarnRulesHint => 'Active rules from your lab (point_settings).';

  @override
  String loyaltySpendRule(String amount, int points) {
    return 'Spend $amount MMK → +$points pts';
  }

  @override
  String get loyaltyEarned => 'Earned';

  @override
  String get loyaltyRedeemed => 'Redeemed';

  @override
  String get loyaltyTransactions => 'Transactions';

  @override
  String get loyaltyTxnsShort => 'Txns';

  @override
  String get loyaltyActivity => 'Activity';

  @override
  String get loyaltyFilterAll => 'All';

  @override
  String get loyaltyFilterAdjustments => 'Adjustments';

  @override
  String get loyaltyPaymentOrderRef => 'Payment / order ref.';

  @override
  String get loyaltyNothingToShow => 'Nothing to show';

  @override
  String get loyaltyNoActivityYet => 'No activity yet';

  @override
  String loyaltyNoFilteredTransactions(String type) {
    return 'No $type transactions in this filter.';
  }

  @override
  String get loyaltyNoActivityHint => 'Your point activity will appear here after lab visits, ratings, or rewards from the lab.';

  @override
  String get loyaltyTypeAdjustment => 'Adjustment';

  @override
  String get loyaltyTypePoints => 'Points';

  @override
  String get profileEditTitle => 'Edit profile';

  @override
  String get profileBack => 'Back';

  @override
  String get profileEditIntro => 'Update how the lab reaches you. Changes apply to your signed-in account.';

  @override
  String get profileContactDetails => 'Contact details';

  @override
  String get profileContactHint => 'Used for orders, results, and account recovery.';

  @override
  String get profileFullName => 'Full name';

  @override
  String get profileNameRequired => 'Enter your name';

  @override
  String get profileNameTooShort => 'Name looks too short';

  @override
  String get profilePhoneRequired => 'Enter a phone number';

  @override
  String get profilePhoneInvalid => 'Enter a valid phone number';

  @override
  String get profileSaveChanges => 'Save changes';

  @override
  String get profileCancel => 'Cancel';

  @override
  String get profileSaved => 'Profile saved';

  @override
  String get profileSaveFailed => 'Could not save changes';

  @override
  String get profileSavedHint => 'Your details are updated on the lab account. Returning to your profile…';

  @override
  String get profileSaveErrorHint => 'Please check your connection and try again.';

  @override
  String get profileDismiss => 'Dismiss';

  @override
  String get profileAddress => 'Address';

  @override
  String get profileAddressHint => 'Street, city, etc.';

  @override
  String get profileChooseOnMap => 'Choose on map';

  @override
  String get profileLatLong => 'Latitude–Longitude';

  @override
  String get profileLookingUpAddress => 'Looking up address…';

  @override
  String get profileNoAddressMatch => 'No match — try a fuller address or choose on the map.';

  @override
  String get profileAddressLookupFailed => 'Could not look up address. Try again or choose on the map.';

  @override
  String get profilePhotoTitle => 'Profile photo';

  @override
  String get profileTakePhoto => 'Take photo';

  @override
  String get profileChooseFromGallery => 'Choose from gallery';

  @override
  String get profilePhotoPickFailed => 'Could not load photo. Try again.';
}
