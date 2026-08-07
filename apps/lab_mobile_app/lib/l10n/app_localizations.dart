import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_en.dart';
import 'app_localizations_my.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale) : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations? of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations);
  }

  static const LocalizationsDelegate<AppLocalizations> delegate = _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates = <LocalizationsDelegate<dynamic>>[
    delegate,
    GlobalMaterialLocalizations.delegate,
    GlobalCupertinoLocalizations.delegate,
    GlobalWidgetsLocalizations.delegate,
  ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('en'),
    Locale('my')
  ];

  /// Application title
  ///
  /// In en, this message translates to:
  /// **'Shwe Health'**
  String get appTitle;

  /// No description provided for @navHome.
  ///
  /// In en, this message translates to:
  /// **'HOME'**
  String get navHome;

  /// No description provided for @navOrders.
  ///
  /// In en, this message translates to:
  /// **'ORDERS'**
  String get navOrders;

  /// No description provided for @navResults.
  ///
  /// In en, this message translates to:
  /// **'RESULTS'**
  String get navResults;

  /// No description provided for @navPoints.
  ///
  /// In en, this message translates to:
  /// **'POINTS'**
  String get navPoints;

  /// No description provided for @navProfile.
  ///
  /// In en, this message translates to:
  /// **'PROFILE'**
  String get navProfile;

  /// No description provided for @language.
  ///
  /// In en, this message translates to:
  /// **'Language'**
  String get language;

  /// No description provided for @languageEnglish.
  ///
  /// In en, this message translates to:
  /// **'English'**
  String get languageEnglish;

  /// No description provided for @languageMyanmar.
  ///
  /// In en, this message translates to:
  /// **'Myanmar (Burmese)'**
  String get languageMyanmar;

  /// No description provided for @chooseLanguage.
  ///
  /// In en, this message translates to:
  /// **'Choose language'**
  String get chooseLanguage;

  /// No description provided for @chooseTheme.
  ///
  /// In en, this message translates to:
  /// **'Choose theme'**
  String get chooseTheme;

  /// No description provided for @themeLight.
  ///
  /// In en, this message translates to:
  /// **'Light'**
  String get themeLight;

  /// No description provided for @themeDark.
  ///
  /// In en, this message translates to:
  /// **'Dark'**
  String get themeDark;

  /// No description provided for @themeIdhc.
  ///
  /// In en, this message translates to:
  /// **'IDHC'**
  String get themeIdhc;

  /// No description provided for @signIn.
  ///
  /// In en, this message translates to:
  /// **'Sign in'**
  String get signIn;

  /// No description provided for @signingIn.
  ///
  /// In en, this message translates to:
  /// **'Signing in…'**
  String get signingIn;

  /// No description provided for @password.
  ///
  /// In en, this message translates to:
  /// **'Password'**
  String get password;

  /// No description provided for @rememberMe.
  ///
  /// In en, this message translates to:
  /// **'Keep me signed in'**
  String get rememberMe;

  /// No description provided for @noAccountPrompt.
  ///
  /// In en, this message translates to:
  /// **'Don\'t have an account?'**
  String get noAccountPrompt;

  /// No description provided for @createNewAccount.
  ///
  /// In en, this message translates to:
  /// **'Create New Account'**
  String get createNewAccount;

  /// No description provided for @passwordRequired.
  ///
  /// In en, this message translates to:
  /// **'Enter your password'**
  String get passwordRequired;

  /// No description provided for @accountSettings.
  ///
  /// In en, this message translates to:
  /// **'ACCOUNT SETTINGS'**
  String get accountSettings;

  /// No description provided for @editProfile.
  ///
  /// In en, this message translates to:
  /// **'Edit Profile'**
  String get editProfile;

  /// No description provided for @editProfileSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Personal information, medical history'**
  String get editProfileSubtitle;

  /// No description provided for @labAppearance.
  ///
  /// In en, this message translates to:
  /// **'Lab & appearance'**
  String get labAppearance;

  /// No description provided for @labAppearanceSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Theme, logo, and contact info from your lab'**
  String get labAppearanceSubtitle;

  /// No description provided for @loyaltyStatus.
  ///
  /// In en, this message translates to:
  /// **'LOYALTY STATUS'**
  String get loyaltyStatus;

  /// No description provided for @viewLoyaltyPoints.
  ///
  /// In en, this message translates to:
  /// **'View loyalty points'**
  String get viewLoyaltyPoints;

  /// No description provided for @pointsCount.
  ///
  /// In en, this message translates to:
  /// **'{count} points'**
  String pointsCount(int count);

  /// No description provided for @membershipTierLabel.
  ///
  /// In en, this message translates to:
  /// **'{tierName} member · {percent}% off'**
  String membershipTierLabel(String tierName, int percent);

  /// No description provided for @membershipTierTitle.
  ///
  /// In en, this message translates to:
  /// **'Membership'**
  String get membershipTierTitle;

  /// No description provided for @membershipTierDefaultName.
  ///
  /// In en, this message translates to:
  /// **'Normal'**
  String get membershipTierDefaultName;

  /// No description provided for @membershipTierNameNormal.
  ///
  /// In en, this message translates to:
  /// **'Normal'**
  String get membershipTierNameNormal;

  /// No description provided for @membershipTierNameSilver.
  ///
  /// In en, this message translates to:
  /// **'Silver'**
  String get membershipTierNameSilver;

  /// No description provided for @membershipTierNameGold.
  ///
  /// In en, this message translates to:
  /// **'Gold'**
  String get membershipTierNameGold;

  /// No description provided for @membershipTierNameBronze.
  ///
  /// In en, this message translates to:
  /// **'Bronze'**
  String get membershipTierNameBronze;

  /// No description provided for @membershipTierPercentOff.
  ///
  /// In en, this message translates to:
  /// **'{percent}% off'**
  String membershipTierPercentOff(int percent);

  /// No description provided for @membershipTierDiscountBenefit.
  ///
  /// In en, this message translates to:
  /// **'{percent}% off applies to your lab test prices'**
  String membershipTierDiscountBenefit(int percent);

  /// No description provided for @membershipTierMemberBenefit.
  ///
  /// In en, this message translates to:
  /// **'Your membership benefits apply on eligible orders'**
  String get membershipTierMemberBenefit;

  /// No description provided for @membershipTierSpendToNext.
  ///
  /// In en, this message translates to:
  /// **'Spend {amount} MMK more to reach {tier}'**
  String membershipTierSpendToNext(String amount, String tier);

  /// No description provided for @membershipTierProgressMax.
  ///
  /// In en, this message translates to:
  /// **'You\'ve reached the top membership tier'**
  String get membershipTierProgressMax;

  /// No description provided for @membershipTierSpendOfNext.
  ///
  /// In en, this message translates to:
  /// **'{current} of {target} MMK'**
  String membershipTierSpendOfNext(String current, String target);

  /// No description provided for @orderCreateMembershipDiscount.
  ///
  /// In en, this message translates to:
  /// **'Membership ({tier}): {percent}% off'**
  String orderCreateMembershipDiscount(String tier, String percent);

  /// No description provided for @phone.
  ///
  /// In en, this message translates to:
  /// **'Phone'**
  String get phone;

  /// No description provided for @signOut.
  ///
  /// In en, this message translates to:
  /// **'Sign out'**
  String get signOut;

  /// No description provided for @deleteAccount.
  ///
  /// In en, this message translates to:
  /// **'Delete account'**
  String get deleteAccount;

  /// No description provided for @deleteAccountSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Permanently deactivate this account'**
  String get deleteAccountSubtitle;

  /// No description provided for @deleteAccountTitle.
  ///
  /// In en, this message translates to:
  /// **'Delete account?'**
  String get deleteAccountTitle;

  /// No description provided for @deleteAccountMessage.
  ///
  /// In en, this message translates to:
  /// **'This will deactivate your account. You will be signed out and will not be able to sign in again with this phone number.'**
  String get deleteAccountMessage;

  /// No description provided for @deleteAccountConfirm.
  ///
  /// In en, this message translates to:
  /// **'Delete account'**
  String get deleteAccountConfirm;

  /// No description provided for @deleteAccountSuccess.
  ///
  /// In en, this message translates to:
  /// **'Your account has been deleted.'**
  String get deleteAccountSuccess;

  /// No description provided for @deleteAccountFailed.
  ///
  /// In en, this message translates to:
  /// **'Could not delete account'**
  String get deleteAccountFailed;

  /// No description provided for @orderTracking.
  ///
  /// In en, this message translates to:
  /// **'Order tracking'**
  String get orderTracking;

  /// No description provided for @trackingEmptyState.
  ///
  /// In en, this message translates to:
  /// **'No active orders yet. Place an order to see collection times and status from the lab.'**
  String get trackingEmptyState;

  /// No description provided for @trackingOrderId.
  ///
  /// In en, this message translates to:
  /// **'Order ID: {id}'**
  String trackingOrderId(String id);

  /// No description provided for @trackingPatientLine.
  ///
  /// In en, this message translates to:
  /// **'{name} · {tests}'**
  String trackingPatientLine(String name, String tests);

  /// No description provided for @trackingLabTestFallback.
  ///
  /// In en, this message translates to:
  /// **'Lab test'**
  String get trackingLabTestFallback;

  /// No description provided for @trackingTestCount.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 test}other{{count} tests}}'**
  String trackingTestCount(int count);

  /// No description provided for @trackingAddress.
  ///
  /// In en, this message translates to:
  /// **'Address: {address}'**
  String trackingAddress(String address);

  /// No description provided for @trackingLabSchedule.
  ///
  /// In en, this message translates to:
  /// **'Lab schedule'**
  String get trackingLabSchedule;

  /// No description provided for @trackingCollector.
  ///
  /// In en, this message translates to:
  /// **'Collector: {name}'**
  String trackingCollector(String name);

  /// No description provided for @trackingCollection.
  ///
  /// In en, this message translates to:
  /// **'Collection: {when}'**
  String trackingCollection(String when);

  /// No description provided for @trackingRunning.
  ///
  /// In en, this message translates to:
  /// **'Running: {when}'**
  String trackingRunning(String when);

  /// No description provided for @trackingReportOut.
  ///
  /// In en, this message translates to:
  /// **'Report out: {when}'**
  String trackingReportOut(String when);

  /// No description provided for @trackingConfirmScheduleHint.
  ///
  /// In en, this message translates to:
  /// **'The lab proposed a collection schedule. Confirm so the collector can proceed.'**
  String get trackingConfirmScheduleHint;

  /// No description provided for @trackingConfirmScheduleButton.
  ///
  /// In en, this message translates to:
  /// **'Confirm collection schedule'**
  String get trackingConfirmScheduleButton;

  /// No description provided for @trackingSaving.
  ///
  /// In en, this message translates to:
  /// **'Saving…'**
  String get trackingSaving;

  /// No description provided for @trackingScheduleConfirmedTitle.
  ///
  /// In en, this message translates to:
  /// **'Schedule confirmed'**
  String get trackingScheduleConfirmedTitle;

  /// No description provided for @trackingScheduleConfirmedMessage.
  ///
  /// In en, this message translates to:
  /// **'The collector can proceed with your sample.'**
  String get trackingScheduleConfirmedMessage;

  /// No description provided for @trackingStatusSection.
  ///
  /// In en, this message translates to:
  /// **'Status'**
  String get trackingStatusSection;

  /// No description provided for @trackingStepSubmitted.
  ///
  /// In en, this message translates to:
  /// **'Order submitted'**
  String get trackingStepSubmitted;

  /// No description provided for @trackingStepSubmittedSub.
  ///
  /// In en, this message translates to:
  /// **'Received by lab'**
  String get trackingStepSubmittedSub;

  /// No description provided for @trackingStepCollection.
  ///
  /// In en, this message translates to:
  /// **'Collection scheduled'**
  String get trackingStepCollection;

  /// No description provided for @trackingAwaitingSchedule.
  ///
  /// In en, this message translates to:
  /// **'Awaiting lab schedule'**
  String get trackingAwaitingSchedule;

  /// No description provided for @trackingStepRunning.
  ///
  /// In en, this message translates to:
  /// **'Sample running'**
  String get trackingStepRunning;

  /// No description provided for @trackingStepReportOut.
  ///
  /// In en, this message translates to:
  /// **'Report out'**
  String get trackingStepReportOut;

  /// No description provided for @trackingPatientSection.
  ///
  /// In en, this message translates to:
  /// **'Patient details'**
  String get trackingPatientSection;

  /// No description provided for @trackingAge.
  ///
  /// In en, this message translates to:
  /// **'Age: {age}'**
  String trackingAge(int age);

  /// No description provided for @trackingPhone.
  ///
  /// In en, this message translates to:
  /// **'Phone: {phone}'**
  String trackingPhone(String phone);

  /// No description provided for @trackingPriority.
  ///
  /// In en, this message translates to:
  /// **'Priority: {priority}'**
  String trackingPriority(String priority);

  /// No description provided for @trackingReportDelivery.
  ///
  /// In en, this message translates to:
  /// **'Report delivery: {method}'**
  String trackingReportDelivery(String method);

  /// No description provided for @trackingTestsSection.
  ///
  /// In en, this message translates to:
  /// **'Tests'**
  String get trackingTestsSection;

  /// No description provided for @trackingNoTestsYet.
  ///
  /// In en, this message translates to:
  /// **'No catalog tests assigned yet. The lab may still be reviewing a prescription.'**
  String get trackingNoTestsYet;

  /// No description provided for @trackingTestLine.
  ///
  /// In en, this message translates to:
  /// **'{name} ({code})'**
  String trackingTestLine(String name, String code);

  /// No description provided for @trackingTestLineNoCode.
  ///
  /// In en, this message translates to:
  /// **'{name}'**
  String trackingTestLineNoCode(String name);

  /// No description provided for @trackingPricingSection.
  ///
  /// In en, this message translates to:
  /// **'Pricing'**
  String get trackingPricingSection;

  /// No description provided for @trackingTestsSubtotal.
  ///
  /// In en, this message translates to:
  /// **'Tests'**
  String get trackingTestsSubtotal;

  /// No description provided for @trackingMaterialFee.
  ///
  /// In en, this message translates to:
  /// **'Material fee'**
  String get trackingMaterialFee;

  /// No description provided for @trackingServiceFee.
  ///
  /// In en, this message translates to:
  /// **'Service fee'**
  String get trackingServiceFee;

  /// No description provided for @trackingDiscount.
  ///
  /// In en, this message translates to:
  /// **'Discount ({percent}%)'**
  String trackingDiscount(String percent);

  /// No description provided for @trackingOriginalPrice.
  ///
  /// In en, this message translates to:
  /// **'Original'**
  String get trackingOriginalPrice;

  /// No description provided for @trackingAmountDue.
  ///
  /// In en, this message translates to:
  /// **'Amount due'**
  String get trackingAmountDue;

  /// No description provided for @trackingPaid.
  ///
  /// In en, this message translates to:
  /// **'Paid'**
  String get trackingPaid;

  /// No description provided for @trackingBalance.
  ///
  /// In en, this message translates to:
  /// **'Balance'**
  String get trackingBalance;

  /// No description provided for @trackingNotesSection.
  ///
  /// In en, this message translates to:
  /// **'Notes'**
  String get trackingNotesSection;

  /// No description provided for @trackingPrescriptionAttached.
  ///
  /// In en, this message translates to:
  /// **'Prescription file attached'**
  String get trackingPrescriptionAttached;

  /// No description provided for @trackingMmk.
  ///
  /// In en, this message translates to:
  /// **'{amount} MMK'**
  String trackingMmk(String amount);

  /// No description provided for @trackingLabelPriority.
  ///
  /// In en, this message translates to:
  /// **'Priority'**
  String get trackingLabelPriority;

  /// No description provided for @trackingLabelDelivery.
  ///
  /// In en, this message translates to:
  /// **'Report delivery'**
  String get trackingLabelDelivery;

  /// No description provided for @trackingLabelAddress.
  ///
  /// In en, this message translates to:
  /// **'Collection address'**
  String get trackingLabelAddress;

  /// No description provided for @trackingLabelName.
  ///
  /// In en, this message translates to:
  /// **'Name'**
  String get trackingLabelName;

  /// No description provided for @trackingLabelAge.
  ///
  /// In en, this message translates to:
  /// **'Age'**
  String get trackingLabelAge;

  /// No description provided for @trackingLabelPhone.
  ///
  /// In en, this message translates to:
  /// **'Phone'**
  String get trackingLabelPhone;

  /// No description provided for @trackingPlacedOn.
  ///
  /// In en, this message translates to:
  /// **'Placed {date}'**
  String trackingPlacedOn(String date);

  /// No description provided for @trackingOrderRef.
  ///
  /// In en, this message translates to:
  /// **'Order reference'**
  String get trackingOrderRef;

  /// No description provided for @trackingCopyId.
  ///
  /// In en, this message translates to:
  /// **'Copy'**
  String get trackingCopyId;

  /// No description provided for @trackingIdCopied.
  ///
  /// In en, this message translates to:
  /// **'Order ID copied'**
  String get trackingIdCopied;

  /// No description provided for @trackingTestsTotal.
  ///
  /// In en, this message translates to:
  /// **'Tests subtotal'**
  String get trackingTestsTotal;

  /// No description provided for @collectorPending.
  ///
  /// In en, this message translates to:
  /// **'Pending'**
  String get collectorPending;

  /// No description provided for @preferredCollector.
  ///
  /// In en, this message translates to:
  /// **'Preferred collector'**
  String get preferredCollector;

  /// No description provided for @noCollectorPreference.
  ///
  /// In en, this message translates to:
  /// **'No preference — lab assigns'**
  String get noCollectorPreference;

  /// No description provided for @collectorOptionalHint.
  ///
  /// In en, this message translates to:
  /// **'Optional — same collector when planning routes'**
  String get collectorOptionalHint;

  /// No description provided for @welcomeBack.
  ///
  /// In en, this message translates to:
  /// **'Welcome back'**
  String get welcomeBack;

  /// No description provided for @homeRefreshHint.
  ///
  /// In en, this message translates to:
  /// **'Summary cards and charts are loaded from the lab server. Pull down anytime to refresh.'**
  String get homeRefreshHint;

  /// No description provided for @homeOverviewLabel.
  ///
  /// In en, this message translates to:
  /// **'YOUR OVERVIEW'**
  String get homeOverviewLabel;

  /// No description provided for @homeAccountSummary.
  ///
  /// In en, this message translates to:
  /// **'Account summary'**
  String get homeAccountSummary;

  /// No description provided for @homeLiveMetrics.
  ///
  /// In en, this message translates to:
  /// **'Live metrics from your lab account'**
  String get homeLiveMetrics;

  /// No description provided for @homePromotionsLabel.
  ///
  /// In en, this message translates to:
  /// **'PROMOTIONS'**
  String get homePromotionsLabel;

  /// No description provided for @homeOffersUpdates.
  ///
  /// In en, this message translates to:
  /// **'Offers & updates'**
  String get homeOffersUpdates;

  /// No description provided for @homeTotalOrders.
  ///
  /// In en, this message translates to:
  /// **'Total orders'**
  String get homeTotalOrders;

  /// No description provided for @homeCompletedOrdersCount.
  ///
  /// In en, this message translates to:
  /// **'{count} completed'**
  String homeCompletedOrdersCount(int count);

  /// No description provided for @homeTotalSpent.
  ///
  /// In en, this message translates to:
  /// **'Total spent'**
  String get homeTotalSpent;

  /// No description provided for @homeDeliveredOrders.
  ///
  /// In en, this message translates to:
  /// **'Delivered orders'**
  String get homeDeliveredOrders;

  /// No description provided for @homeLoyaltyPoints.
  ///
  /// In en, this message translates to:
  /// **'Loyalty points'**
  String get homeLoyaltyPoints;

  /// No description provided for @homeTapForHistory.
  ///
  /// In en, this message translates to:
  /// **'Tap for history'**
  String get homeTapForHistory;

  /// No description provided for @homeInProgress.
  ///
  /// In en, this message translates to:
  /// **'In progress'**
  String get homeInProgress;

  /// No description provided for @homeOpenOrders.
  ///
  /// In en, this message translates to:
  /// **'Open orders'**
  String get homeOpenOrders;

  /// No description provided for @homeActiveOrder.
  ///
  /// In en, this message translates to:
  /// **'Active order'**
  String get homeActiveOrder;

  /// No description provided for @homeReportOut.
  ///
  /// In en, this message translates to:
  /// **'Report out'**
  String get homeReportOut;

  /// No description provided for @homeDailySpend.
  ///
  /// In en, this message translates to:
  /// **'Daily spend'**
  String get homeDailySpend;

  /// No description provided for @homeOrderActivityByDay.
  ///
  /// In en, this message translates to:
  /// **'Order activity by day'**
  String get homeOrderActivityByDay;

  /// No description provided for @homeNoOrdersYet.
  ///
  /// In en, this message translates to:
  /// **'No orders yet. Your spend trend will appear here after your first order.'**
  String get homeNoOrdersYet;

  /// No description provided for @homeSpendTooltip.
  ///
  /// In en, this message translates to:
  /// **'{amount} MMK · {count} order(s)'**
  String homeSpendTooltip(String amount, int count);

  /// No description provided for @homeTopOrderedTests.
  ///
  /// In en, this message translates to:
  /// **'Top ordered tests'**
  String get homeTopOrderedTests;

  /// No description provided for @homeMostRequestedTests.
  ///
  /// In en, this message translates to:
  /// **'Your most requested lab tests'**
  String get homeMostRequestedTests;

  /// No description provided for @homeNoTopTestsYet.
  ///
  /// In en, this message translates to:
  /// **'Once you place orders, your favourite tests will show up here.'**
  String get homeNoTopTestsYet;

  /// No description provided for @homeOrdersCount.
  ///
  /// In en, this message translates to:
  /// **'{count} orders'**
  String homeOrdersCount(int count);

  /// No description provided for @homeOrderCountSingular.
  ///
  /// In en, this message translates to:
  /// **'1 order'**
  String get homeOrderCountSingular;

  /// No description provided for @homeMmkSuffix.
  ///
  /// In en, this message translates to:
  /// **'MMK'**
  String get homeMmkSuffix;

  /// No description provided for @ordersNewOrder.
  ///
  /// In en, this message translates to:
  /// **'New order'**
  String get ordersNewOrder;

  /// No description provided for @ordersTitle.
  ///
  /// In en, this message translates to:
  /// **'Your orders'**
  String get ordersTitle;

  /// No description provided for @ordersSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Active requests that are not yet delivered.'**
  String get ordersSubtitle;

  /// No description provided for @ordersNoActiveYet.
  ///
  /// In en, this message translates to:
  /// **'No active orders yet'**
  String get ordersNoActiveYet;

  /// No description provided for @ordersNoActiveHint.
  ///
  /// In en, this message translates to:
  /// **'Use the card above to place your first lab test. Orders stay here until they are delivered.'**
  String get ordersNoActiveHint;

  /// No description provided for @ordersActiveCount.
  ///
  /// In en, this message translates to:
  /// **'Active orders ({count})'**
  String ordersActiveCount(int count);

  /// No description provided for @ordersStatus.
  ///
  /// In en, this message translates to:
  /// **'Status'**
  String get ordersStatus;

  /// No description provided for @ordersSort.
  ///
  /// In en, this message translates to:
  /// **'Sort'**
  String get ordersSort;

  /// No description provided for @ordersAllOrders.
  ///
  /// In en, this message translates to:
  /// **'All orders'**
  String get ordersAllOrders;

  /// No description provided for @ordersAll.
  ///
  /// In en, this message translates to:
  /// **'All'**
  String get ordersAll;

  /// No description provided for @ordersFilterByStatus.
  ///
  /// In en, this message translates to:
  /// **'Filter by status'**
  String get ordersFilterByStatus;

  /// No description provided for @ordersActiveOnlyHint.
  ///
  /// In en, this message translates to:
  /// **'Only active orders that are not yet delivered appear here.'**
  String get ordersActiveOnlyHint;

  /// No description provided for @ordersSortBy.
  ///
  /// In en, this message translates to:
  /// **'Sort by'**
  String get ordersSortBy;

  /// No description provided for @ordersNoStatusOrders.
  ///
  /// In en, this message translates to:
  /// **'No {status} orders'**
  String ordersNoStatusOrders(String status);

  /// No description provided for @ordersTryAnotherFilter.
  ///
  /// In en, this message translates to:
  /// **'Try another status tab or place a new order.'**
  String get ordersTryAnotherFilter;

  /// No description provided for @ordersOrderLabTest.
  ///
  /// In en, this message translates to:
  /// **'Order lab test'**
  String get ordersOrderLabTest;

  /// No description provided for @ordersOrderLabTestHint.
  ///
  /// In en, this message translates to:
  /// **'Add patient details, pick tests, and schedule collection'**
  String get ordersOrderLabTestHint;

  /// No description provided for @ordersPlaced.
  ///
  /// In en, this message translates to:
  /// **'Placed {date}'**
  String ordersPlaced(String date);

  /// No description provided for @ordersPatientFallback.
  ///
  /// In en, this message translates to:
  /// **'Patient'**
  String get ordersPatientFallback;

  /// No description provided for @ordersStatusCount.
  ///
  /// In en, this message translates to:
  /// **'{label} · {count}'**
  String ordersStatusCount(String label, int count);

  /// No description provided for @orderStatusPending.
  ///
  /// In en, this message translates to:
  /// **'Pending'**
  String get orderStatusPending;

  /// No description provided for @orderStatusScheduled.
  ///
  /// In en, this message translates to:
  /// **'Scheduled'**
  String get orderStatusScheduled;

  /// No description provided for @orderStatusCollecting.
  ///
  /// In en, this message translates to:
  /// **'Collecting'**
  String get orderStatusCollecting;

  /// No description provided for @orderStatusRunning.
  ///
  /// In en, this message translates to:
  /// **'Running'**
  String get orderStatusRunning;

  /// No description provided for @orderStatusCompleted.
  ///
  /// In en, this message translates to:
  /// **'Completed'**
  String get orderStatusCompleted;

  /// No description provided for @orderStatusDelivered.
  ///
  /// In en, this message translates to:
  /// **'Delivered'**
  String get orderStatusDelivered;

  /// No description provided for @orderStatusUnknown.
  ///
  /// In en, this message translates to:
  /// **'Unknown'**
  String get orderStatusUnknown;

  /// No description provided for @ordersSortNewestFirst.
  ///
  /// In en, this message translates to:
  /// **'Newest first'**
  String get ordersSortNewestFirst;

  /// No description provided for @ordersSortOldestFirst.
  ///
  /// In en, this message translates to:
  /// **'Oldest first'**
  String get ordersSortOldestFirst;

  /// No description provided for @ordersSortRecentlyUpdated.
  ///
  /// In en, this message translates to:
  /// **'Recently updated'**
  String get ordersSortRecentlyUpdated;

  /// No description provided for @ordersSortByStatus.
  ///
  /// In en, this message translates to:
  /// **'Status'**
  String get ordersSortByStatus;

  /// No description provided for @ordersSortPriority.
  ///
  /// In en, this message translates to:
  /// **'Priority (urgent first)'**
  String get ordersSortPriority;

  /// No description provided for @ordersSortRecentlyReleased.
  ///
  /// In en, this message translates to:
  /// **'Recently released'**
  String get ordersSortRecentlyReleased;

  /// No description provided for @ordersSortOldestReleased.
  ///
  /// In en, this message translates to:
  /// **'Oldest released'**
  String get ordersSortOldestReleased;

  /// No description provided for @ordersSortNewestPlaced.
  ///
  /// In en, this message translates to:
  /// **'Newest placed'**
  String get ordersSortNewestPlaced;

  /// No description provided for @ordersSortOldestPlaced.
  ///
  /// In en, this message translates to:
  /// **'Oldest placed'**
  String get ordersSortOldestPlaced;

  /// No description provided for @ordersRate.
  ///
  /// In en, this message translates to:
  /// **'Rate'**
  String get ordersRate;

  /// No description provided for @ordersRated.
  ///
  /// In en, this message translates to:
  /// **'Rated'**
  String get ordersRated;

  /// No description provided for @ordersRateThisOrder.
  ///
  /// In en, this message translates to:
  /// **'Rate this order'**
  String get ordersRateThisOrder;

  /// No description provided for @ordersCommentOptional.
  ///
  /// In en, this message translates to:
  /// **'Comment (optional)'**
  String get ordersCommentOptional;

  /// No description provided for @ordersCommentHint.
  ///
  /// In en, this message translates to:
  /// **'Share feedback for the lab team'**
  String get ordersCommentHint;

  /// No description provided for @ordersSubmitRating.
  ///
  /// In en, this message translates to:
  /// **'Submit rating'**
  String get ordersSubmitRating;

  /// No description provided for @ordersThanksFeedback.
  ///
  /// In en, this message translates to:
  /// **'Thanks for your feedback'**
  String get ordersThanksFeedback;

  /// No description provided for @ordersRatedToast.
  ///
  /// In en, this message translates to:
  /// **'You rated this order {stars} stars.'**
  String ordersRatedToast(int stars);

  /// No description provided for @ordersRatedToastSingular.
  ///
  /// In en, this message translates to:
  /// **'You rated this order 1 star.'**
  String get ordersRatedToastSingular;

  /// No description provided for @ordersRatingFailed.
  ///
  /// In en, this message translates to:
  /// **'Rating failed'**
  String get ordersRatingFailed;

  /// No description provided for @ordersYourRating.
  ///
  /// In en, this message translates to:
  /// **'Your rating'**
  String get ordersYourRating;

  /// No description provided for @ordersYourComment.
  ///
  /// In en, this message translates to:
  /// **'Your comment'**
  String get ordersYourComment;

  /// No description provided for @ordersNoComment.
  ///
  /// In en, this message translates to:
  /// **'No comment was added with this rating.'**
  String get ordersNoComment;

  /// No description provided for @orderCreateSummary.
  ///
  /// In en, this message translates to:
  /// **'Summary'**
  String get orderCreateSummary;

  /// No description provided for @orderCreateNoTestsSelected.
  ///
  /// In en, this message translates to:
  /// **'No tests selected yet.'**
  String get orderCreateNoTestsSelected;

  /// No description provided for @orderCreatePricingSummary.
  ///
  /// In en, this message translates to:
  /// **'Order pricing'**
  String get orderCreatePricingSummary;

  /// No description provided for @orderCreateTestsSubtotal.
  ///
  /// In en, this message translates to:
  /// **'Tests'**
  String get orderCreateTestsSubtotal;

  /// No description provided for @orderCreateTestsDiscountHint.
  ///
  /// In en, this message translates to:
  /// **'Original {original} · {percent}% off'**
  String orderCreateTestsDiscountHint(String original, String percent);

  /// No description provided for @orderCreateMaterialFee.
  ///
  /// In en, this message translates to:
  /// **'Material fee'**
  String get orderCreateMaterialFee;

  /// No description provided for @orderCreateMaterialFeeLoading.
  ///
  /// In en, this message translates to:
  /// **'Loading material fee…'**
  String get orderCreateMaterialFeeLoading;

  /// No description provided for @orderCreateServiceFee.
  ///
  /// In en, this message translates to:
  /// **'Service fee'**
  String get orderCreateServiceFee;

  /// No description provided for @orderCreateServiceFeeChecking.
  ///
  /// In en, this message translates to:
  /// **'Checking service zone…'**
  String get orderCreateServiceFeeChecking;

  /// No description provided for @orderCreateServiceFeeOutOfCoverage.
  ///
  /// In en, this message translates to:
  /// **'This address is outside our service coverage areas.'**
  String get orderCreateServiceFeeOutOfCoverage;

  /// No description provided for @orderCreateEstimatedAmountDue.
  ///
  /// In en, this message translates to:
  /// **'Estimated amount due'**
  String get orderCreateEstimatedAmountDue;

  /// No description provided for @orderCreatePrescriptionEmpty.
  ///
  /// In en, this message translates to:
  /// **'Add a prescription file to submit.'**
  String get orderCreatePrescriptionEmpty;

  /// No description provided for @orderCreatePrescriptionAttached.
  ///
  /// In en, this message translates to:
  /// **'Prescription attached. Totals will be set when the lab assigns tests.'**
  String get orderCreatePrescriptionAttached;

  /// No description provided for @orderCreatePatientDetails.
  ///
  /// In en, this message translates to:
  /// **'Patient details'**
  String get orderCreatePatientDetails;

  /// No description provided for @orderCreatePatientFullName.
  ///
  /// In en, this message translates to:
  /// **'Patient full name'**
  String get orderCreatePatientFullName;

  /// No description provided for @orderCreateRequired.
  ///
  /// In en, this message translates to:
  /// **'Required'**
  String get orderCreateRequired;

  /// No description provided for @orderCreatePhoneHint.
  ///
  /// In en, this message translates to:
  /// **'+959…'**
  String get orderCreatePhoneHint;

  /// No description provided for @orderCreatePhoneInvalid.
  ///
  /// In en, this message translates to:
  /// **'Use + and digits only (e.g. +959…)'**
  String get orderCreatePhoneInvalid;

  /// No description provided for @orderCreateAge.
  ///
  /// In en, this message translates to:
  /// **'Age'**
  String get orderCreateAge;

  /// No description provided for @orderCreateValidAge.
  ///
  /// In en, this message translates to:
  /// **'Enter a valid age'**
  String get orderCreateValidAge;

  /// No description provided for @orderCreateValidAgeWhole.
  ///
  /// In en, this message translates to:
  /// **'Enter a valid age (whole number).'**
  String get orderCreateValidAgeWhole;

  /// No description provided for @orderCreateGender.
  ///
  /// In en, this message translates to:
  /// **'Gender'**
  String get orderCreateGender;

  /// No description provided for @orderCreateGenderMale.
  ///
  /// In en, this message translates to:
  /// **'Male'**
  String get orderCreateGenderMale;

  /// No description provided for @orderCreateGenderFemale.
  ///
  /// In en, this message translates to:
  /// **'Female'**
  String get orderCreateGenderFemale;

  /// No description provided for @orderCreateGenderOther.
  ///
  /// In en, this message translates to:
  /// **'Other'**
  String get orderCreateGenderOther;

  /// No description provided for @orderCreateBloodTypeOptional.
  ///
  /// In en, this message translates to:
  /// **'Blood type (optional)'**
  String get orderCreateBloodTypeOptional;

  /// No description provided for @orderCreateClinicalNotesOptional.
  ///
  /// In en, this message translates to:
  /// **'Clinical notes (optional)'**
  String get orderCreateClinicalNotesOptional;

  /// No description provided for @orderCreatePriorityDelivery.
  ///
  /// In en, this message translates to:
  /// **'Priority & delivery'**
  String get orderCreatePriorityDelivery;

  /// No description provided for @orderCreateUrgent.
  ///
  /// In en, this message translates to:
  /// **'Urgent'**
  String get orderCreateUrgent;

  /// No description provided for @orderCreateElective.
  ///
  /// In en, this message translates to:
  /// **'Elective'**
  String get orderCreateElective;

  /// No description provided for @orderCreateReportDelivery.
  ///
  /// In en, this message translates to:
  /// **'Report delivery'**
  String get orderCreateReportDelivery;

  /// No description provided for @orderCreateSoftCopy.
  ///
  /// In en, this message translates to:
  /// **'Soft copy (app/PDF)'**
  String get orderCreateSoftCopy;

  /// No description provided for @orderCreateHardCopy.
  ///
  /// In en, this message translates to:
  /// **'Hard copy'**
  String get orderCreateHardCopy;

  /// No description provided for @orderCreateBoth.
  ///
  /// In en, this message translates to:
  /// **'Both'**
  String get orderCreateBoth;

  /// No description provided for @orderCreateFacilityNotesOptional.
  ///
  /// In en, this message translates to:
  /// **'Collection / facility notes (optional)'**
  String get orderCreateFacilityNotesOptional;

  /// No description provided for @orderCreateFacilityNotesHint.
  ///
  /// In en, this message translates to:
  /// **'Notes for collector or lab…'**
  String get orderCreateFacilityNotesHint;

  /// No description provided for @orderCreatePreferredDate.
  ///
  /// In en, this message translates to:
  /// **'Preferred collection date'**
  String get orderCreatePreferredDate;

  /// No description provided for @orderCreateTimeNoteOptional.
  ///
  /// In en, this message translates to:
  /// **'Time note (optional)'**
  String get orderCreateTimeNoteOptional;

  /// No description provided for @orderCreateTimeNoteHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. Morning, after 2pm'**
  String get orderCreateTimeNoteHint;

  /// No description provided for @orderCreatePreferredCollectorOptional.
  ///
  /// In en, this message translates to:
  /// **'Preferred collector (optional)'**
  String get orderCreatePreferredCollectorOptional;

  /// No description provided for @orderCreateCollectorsAssignedByLab.
  ///
  /// In en, this message translates to:
  /// **'Collectors will be assigned by the lab.'**
  String get orderCreateCollectorsAssignedByLab;

  /// No description provided for @orderCreateCollectionAddress.
  ///
  /// In en, this message translates to:
  /// **'Collection address'**
  String get orderCreateCollectionAddress;

  /// No description provided for @orderCreateEnterCollectionAddress.
  ///
  /// In en, this message translates to:
  /// **'Enter collection address'**
  String get orderCreateEnterCollectionAddress;

  /// No description provided for @orderCreateFullCollectionAddress.
  ///
  /// In en, this message translates to:
  /// **'Full address for sample collection'**
  String get orderCreateFullCollectionAddress;

  /// No description provided for @orderCreateProcessOrderTitle.
  ///
  /// In en, this message translates to:
  /// **'How should we process this order?'**
  String get orderCreateProcessOrderTitle;

  /// No description provided for @orderCreateTestsFromList.
  ///
  /// In en, this message translates to:
  /// **'Tests from list'**
  String get orderCreateTestsFromList;

  /// No description provided for @orderCreatePrescriptionFile.
  ///
  /// In en, this message translates to:
  /// **'Prescription file'**
  String get orderCreatePrescriptionFile;

  /// No description provided for @orderCreateCatalogEmpty.
  ///
  /// In en, this message translates to:
  /// **'No lab tests in the catalog. Use “Prescription file” or ask the lab to publish tests.'**
  String get orderCreateCatalogEmpty;

  /// No description provided for @orderCreateTestsFromCatalog.
  ///
  /// In en, this message translates to:
  /// **'Tests from catalog'**
  String get orderCreateTestsFromCatalog;

  /// No description provided for @orderCreateSelectTestsPlaceholder.
  ///
  /// In en, this message translates to:
  /// **'Select tests from catalog…'**
  String get orderCreateSelectTestsPlaceholder;

  /// No description provided for @orderCreateTestsSelected.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 test selected — tap to add or remove}other{{count} tests selected — tap to add or remove}}'**
  String orderCreateTestsSelected(int count);

  /// No description provided for @orderCreateAddPrescriptionMedia.
  ///
  /// In en, this message translates to:
  /// **'Add PDF, image, or take photo'**
  String get orderCreateAddPrescriptionMedia;

  /// No description provided for @orderCreateChangeFile.
  ///
  /// In en, this message translates to:
  /// **'Change file'**
  String get orderCreateChangeFile;

  /// No description provided for @orderCreatePrescriptionReviewHint.
  ///
  /// In en, this message translates to:
  /// **'The lab will review your file and assign tests. Order status stays pending until they add catalog lines.'**
  String get orderCreatePrescriptionReviewHint;

  /// No description provided for @orderCreateSetCoordinates.
  ///
  /// In en, this message translates to:
  /// **'Set collection coordinates — type the address or choose on the map.'**
  String get orderCreateSetCoordinates;

  /// No description provided for @orderCreateStillCheckingCoverage.
  ///
  /// In en, this message translates to:
  /// **'Still checking service coverage for this address.'**
  String get orderCreateStillCheckingCoverage;

  /// No description provided for @orderCreateTestsLoadFailed.
  ///
  /// In en, this message translates to:
  /// **'Selected tests could not be loaded. Wait for the catalog or pick tests again.'**
  String get orderCreateTestsLoadFailed;

  /// No description provided for @orderCreateSubmittedTitle.
  ///
  /// In en, this message translates to:
  /// **'Order submitted'**
  String get orderCreateSubmittedTitle;

  /// No description provided for @orderCreateSubmittedBody.
  ///
  /// In en, this message translates to:
  /// **'Status is pending — the lab will review your request.'**
  String get orderCreateSubmittedBody;

  /// No description provided for @orderCreateFailedTitle.
  ///
  /// In en, this message translates to:
  /// **'Order failed'**
  String get orderCreateFailedTitle;

  /// No description provided for @orderCreateSaveOrder.
  ///
  /// In en, this message translates to:
  /// **'Save order'**
  String get orderCreateSaveOrder;

  /// No description provided for @orderCreateSaving.
  ///
  /// In en, this message translates to:
  /// **'Saving…'**
  String get orderCreateSaving;

  /// No description provided for @orderCreateSelectAtLeastOneTest.
  ///
  /// In en, this message translates to:
  /// **'Select at least one test from the catalog.'**
  String get orderCreateSelectAtLeastOneTest;

  /// No description provided for @orderCreateChoosePrescription.
  ///
  /// In en, this message translates to:
  /// **'Choose a prescription PDF or image.'**
  String get orderCreateChoosePrescription;

  /// No description provided for @orderCreatePrescriptionUpload.
  ///
  /// In en, this message translates to:
  /// **'Prescription upload'**
  String get orderCreatePrescriptionUpload;

  /// No description provided for @orderCreateSelectedTestsCount.
  ///
  /// In en, this message translates to:
  /// **'{count} selected tests'**
  String orderCreateSelectedTestsCount(int count);

  /// No description provided for @orderCreateAddPrescription.
  ///
  /// In en, this message translates to:
  /// **'Add prescription'**
  String get orderCreateAddPrescription;

  /// No description provided for @orderCreateAddPrescriptionHint.
  ///
  /// In en, this message translates to:
  /// **'Take a photo, pick from gallery, or upload a PDF/image file.'**
  String get orderCreateAddPrescriptionHint;

  /// No description provided for @orderCreateTakePhoto.
  ///
  /// In en, this message translates to:
  /// **'Take photo'**
  String get orderCreateTakePhoto;

  /// No description provided for @orderCreateUseCamera.
  ///
  /// In en, this message translates to:
  /// **'Use camera'**
  String get orderCreateUseCamera;

  /// No description provided for @orderCreateChooseFromGallery.
  ///
  /// In en, this message translates to:
  /// **'Choose from gallery'**
  String get orderCreateChooseFromGallery;

  /// No description provided for @orderCreateGalleryFormats.
  ///
  /// In en, this message translates to:
  /// **'JPG, PNG, or other image'**
  String get orderCreateGalleryFormats;

  /// No description provided for @orderCreateChooseFile.
  ///
  /// In en, this message translates to:
  /// **'Choose file'**
  String get orderCreateChooseFile;

  /// No description provided for @orderCreateFileFromDevice.
  ///
  /// In en, this message translates to:
  /// **'PDF or image from device'**
  String get orderCreateFileFromDevice;

  /// No description provided for @orderCreateCouldNotCaptureImage.
  ///
  /// In en, this message translates to:
  /// **'Could not capture image: {error}'**
  String orderCreateCouldNotCaptureImage(String error);

  /// No description provided for @orderCreateCouldNotLoadImage.
  ///
  /// In en, this message translates to:
  /// **'Could not load image: {error}'**
  String orderCreateCouldNotLoadImage(String error);

  /// No description provided for @orderCreateCouldNotReadFile.
  ///
  /// In en, this message translates to:
  /// **'Could not read the selected file.'**
  String get orderCreateCouldNotReadFile;

  /// No description provided for @orderCreateSelectTests.
  ///
  /// In en, this message translates to:
  /// **'Select tests'**
  String get orderCreateSelectTests;

  /// No description provided for @orderCreateDone.
  ///
  /// In en, this message translates to:
  /// **'Done'**
  String get orderCreateDone;

  /// No description provided for @orderCreateSearchTestsHint.
  ///
  /// In en, this message translates to:
  /// **'Search by test name or code'**
  String get orderCreateSearchTestsHint;

  /// No description provided for @orderCreateTestMatchSummary.
  ///
  /// In en, this message translates to:
  /// **'{matches, plural, =1{1 match · {selected} selected}other{{matches} matches · {selected} selected}}'**
  String orderCreateTestMatchSummary(int matches, int selected);

  /// No description provided for @orderCreateNoTestsMatchSearch.
  ///
  /// In en, this message translates to:
  /// **'No tests match your search.'**
  String get orderCreateNoTestsMatchSearch;

  /// No description provided for @orderCreatePreferredCollector.
  ///
  /// In en, this message translates to:
  /// **'Preferred collector'**
  String get orderCreatePreferredCollector;

  /// No description provided for @orderCreateNoPreference.
  ///
  /// In en, this message translates to:
  /// **'No preference'**
  String get orderCreateNoPreference;

  /// No description provided for @orderCreateLabWillAssign.
  ///
  /// In en, this message translates to:
  /// **'Lab will assign a collector'**
  String get orderCreateLabWillAssign;

  /// No description provided for @orderCreateNoPreferenceLabel.
  ///
  /// In en, this message translates to:
  /// **'No preference — lab assigns'**
  String get orderCreateNoPreferenceLabel;

  /// No description provided for @orderCreateCollectorOptionalHint.
  ///
  /// In en, this message translates to:
  /// **'Optional — same collector when planning routes'**
  String get orderCreateCollectorOptionalHint;

  /// No description provided for @resultsTitle.
  ///
  /// In en, this message translates to:
  /// **'Your results'**
  String get resultsTitle;

  /// No description provided for @resultsSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Lab reports the team has released to you.'**
  String get resultsSubtitle;

  /// No description provided for @resultsNoReleasedYet.
  ///
  /// In en, this message translates to:
  /// **'No released results yet'**
  String get resultsNoReleasedYet;

  /// No description provided for @resultsNoReleasedHint.
  ///
  /// In en, this message translates to:
  /// **'When the lab releases your report, it will show up here for PDF download and AI Check.'**
  String get resultsNoReleasedHint;

  /// No description provided for @resultsReleasedReportsCount.
  ///
  /// In en, this message translates to:
  /// **'Released reports ({count})'**
  String resultsReleasedReportsCount(int count);

  /// No description provided for @resultsReleasedDate.
  ///
  /// In en, this message translates to:
  /// **'Released {date}'**
  String resultsReleasedDate(String date);

  /// No description provided for @resultsReleasedBadge.
  ///
  /// In en, this message translates to:
  /// **'Released'**
  String get resultsReleasedBadge;

  /// No description provided for @resultsHardCopyBadge.
  ///
  /// In en, this message translates to:
  /// **'Delivered'**
  String get resultsHardCopyBadge;

  /// No description provided for @resultsHardCopyDate.
  ///
  /// In en, this message translates to:
  /// **'Delivered {date}'**
  String resultsHardCopyDate(String date);

  /// No description provided for @labReportTitle.
  ///
  /// In en, this message translates to:
  /// **'Lab report'**
  String get labReportTitle;

  /// No description provided for @labReportTestsSection.
  ///
  /// In en, this message translates to:
  /// **'TESTS IN THIS ORDER'**
  String get labReportTestsSection;

  /// No description provided for @labReportTestCount.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 test}other{{count} tests}}'**
  String labReportTestCount(int count);

  /// No description provided for @labReportCombinedHint.
  ///
  /// In en, this message translates to:
  /// **'Some tests are grouped into combined reports. Download the shared PDF or run AI Check from each group.'**
  String get labReportCombinedHint;

  /// No description provided for @labReportSeparateHint.
  ///
  /// In en, this message translates to:
  /// **'Download the official PDF or run AI Check for each test separately.'**
  String get labReportSeparateHint;

  /// No description provided for @labReportNoTestLines.
  ///
  /// In en, this message translates to:
  /// **'No test line items were found for this order.'**
  String get labReportNoTestLines;

  /// No description provided for @labReportPdfsNotUploadedYet.
  ///
  /// In en, this message translates to:
  /// **'The lab has released this order, but PDFs are not uploaded yet. Check back soon or contact the lab.'**
  String get labReportPdfsNotUploadedYet;

  /// No description provided for @labReportHardCopyHint.
  ///
  /// In en, this message translates to:
  /// **'Physical copy only — digital PDFs are not available in the app.'**
  String get labReportHardCopyHint;

  /// No description provided for @labReportHardCopyDeliveredBanner.
  ///
  /// In en, this message translates to:
  /// **'Your physical lab report has been delivered. Contact the lab if you need another copy.'**
  String get labReportHardCopyDeliveredBanner;

  /// No description provided for @labReportHardCopyTestDelivered.
  ///
  /// In en, this message translates to:
  /// **'Physical report delivered for this test.'**
  String get labReportHardCopyTestDelivered;

  /// No description provided for @labReportSummaryValues.
  ///
  /// In en, this message translates to:
  /// **'Summary values'**
  String get labReportSummaryValues;

  /// No description provided for @labReportNoReportLoaded.
  ///
  /// In en, this message translates to:
  /// **'No report loaded'**
  String get labReportNoReportLoaded;

  /// No description provided for @labReportSelectFromResults.
  ///
  /// In en, this message translates to:
  /// **'Select a released order from Results.'**
  String get labReportSelectFromResults;

  /// No description provided for @labReportPatient.
  ///
  /// In en, this message translates to:
  /// **'Patient'**
  String get labReportPatient;

  /// No description provided for @labReportAge.
  ///
  /// In en, this message translates to:
  /// **'Age {age}'**
  String labReportAge(int age);

  /// No description provided for @labReportOrderLine.
  ///
  /// In en, this message translates to:
  /// **'Order {ref} · {date}'**
  String labReportOrderLine(String ref, String date);

  /// No description provided for @labReportPdfCountOne.
  ///
  /// In en, this message translates to:
  /// **'{released}/{total} PDF'**
  String labReportPdfCountOne(int released, int total);

  /// No description provided for @labReportPdfCountMany.
  ///
  /// In en, this message translates to:
  /// **'{released}/{total} PDFs'**
  String labReportPdfCountMany(int released, int total);

  /// No description provided for @labReportCombinedReport.
  ///
  /// In en, this message translates to:
  /// **'Combined report'**
  String get labReportCombinedReport;

  /// No description provided for @labReportTestsSharePdf.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 test shares one PDF}other{{count} tests share one PDF}}'**
  String labReportTestsSharePdf(int count);

  /// No description provided for @labReportPdfNotUploadedCombined.
  ///
  /// In en, this message translates to:
  /// **'PDF not uploaded yet for this combined report.'**
  String get labReportPdfNotUploadedCombined;

  /// No description provided for @labReportPdfNotUploadedTest.
  ///
  /// In en, this message translates to:
  /// **'PDF not uploaded yet for this test.'**
  String get labReportPdfNotUploadedTest;

  /// No description provided for @labReportDownloadCombinedPdf.
  ///
  /// In en, this message translates to:
  /// **'Download combined PDF'**
  String get labReportDownloadCombinedPdf;

  /// No description provided for @labReportDownloadPdf.
  ///
  /// In en, this message translates to:
  /// **'Download PDF'**
  String get labReportDownloadPdf;

  /// No description provided for @labReportDownloading.
  ///
  /// In en, this message translates to:
  /// **'Downloading…'**
  String get labReportDownloading;

  /// No description provided for @labReportRunAiCheck.
  ///
  /// In en, this message translates to:
  /// **'Run AI Check'**
  String get labReportRunAiCheck;

  /// No description provided for @labReportRunningAiCheck.
  ///
  /// In en, this message translates to:
  /// **'Running AI Check…'**
  String get labReportRunningAiCheck;

  /// No description provided for @labReportViewAiSummary.
  ///
  /// In en, this message translates to:
  /// **'View AI summary'**
  String get labReportViewAiSummary;

  /// No description provided for @labReportPdfReady.
  ///
  /// In en, this message translates to:
  /// **'PDF ready'**
  String get labReportPdfReady;

  /// No description provided for @labReportPdfPending.
  ///
  /// In en, this message translates to:
  /// **'Pending'**
  String get labReportPdfPending;

  /// No description provided for @labReportDownloadStarted.
  ///
  /// In en, this message translates to:
  /// **'Download started'**
  String get labReportDownloadStarted;

  /// No description provided for @labReportReportSaved.
  ///
  /// In en, this message translates to:
  /// **'Report saved'**
  String get labReportReportSaved;

  /// No description provided for @labReportDownloadFailed.
  ///
  /// In en, this message translates to:
  /// **'Could not download the report. Try again.'**
  String get labReportDownloadFailed;

  /// No description provided for @labReportAiCheckFailed.
  ///
  /// In en, this message translates to:
  /// **'Could not run AI Check. Try again.'**
  String get labReportAiCheckFailed;

  /// No description provided for @loyaltyLoadError.
  ///
  /// In en, this message translates to:
  /// **'Could not load point history. Pull down to retry.'**
  String get loyaltyLoadError;

  /// No description provided for @loyaltyAvailableBalance.
  ///
  /// In en, this message translates to:
  /// **'Available balance'**
  String get loyaltyAvailableBalance;

  /// No description provided for @loyaltyPointsUnit.
  ///
  /// In en, this message translates to:
  /// **'pts'**
  String get loyaltyPointsUnit;

  /// No description provided for @loyaltyBalanceHint.
  ///
  /// In en, this message translates to:
  /// **'Points are earned when the lab verifies a payment, using the rules below. Your membership tier is separate and is based on lifetime spend.'**
  String get loyaltyBalanceHint;

  /// No description provided for @loyaltyHowToEarn.
  ///
  /// In en, this message translates to:
  /// **'How to earn'**
  String get loyaltyHowToEarn;

  /// No description provided for @loyaltyEarnRulesHint.
  ///
  /// In en, this message translates to:
  /// **'Active rules from your lab (point_settings).'**
  String get loyaltyEarnRulesHint;

  /// No description provided for @loyaltySpendRule.
  ///
  /// In en, this message translates to:
  /// **'Spend {amount} MMK → +{points} pts'**
  String loyaltySpendRule(String amount, int points);

  /// No description provided for @loyaltyEarned.
  ///
  /// In en, this message translates to:
  /// **'Earned'**
  String get loyaltyEarned;

  /// No description provided for @loyaltyRedeemed.
  ///
  /// In en, this message translates to:
  /// **'Redeemed'**
  String get loyaltyRedeemed;

  /// No description provided for @loyaltyTransactions.
  ///
  /// In en, this message translates to:
  /// **'Transactions'**
  String get loyaltyTransactions;

  /// No description provided for @loyaltyTxnsShort.
  ///
  /// In en, this message translates to:
  /// **'Txns'**
  String get loyaltyTxnsShort;

  /// No description provided for @loyaltyActivity.
  ///
  /// In en, this message translates to:
  /// **'Activity'**
  String get loyaltyActivity;

  /// No description provided for @loyaltyFilterAll.
  ///
  /// In en, this message translates to:
  /// **'All'**
  String get loyaltyFilterAll;

  /// No description provided for @loyaltyFilterAdjustments.
  ///
  /// In en, this message translates to:
  /// **'Adjustments'**
  String get loyaltyFilterAdjustments;

  /// No description provided for @loyaltyPaymentOrderRef.
  ///
  /// In en, this message translates to:
  /// **'Payment / order ref.'**
  String get loyaltyPaymentOrderRef;

  /// No description provided for @loyaltyNothingToShow.
  ///
  /// In en, this message translates to:
  /// **'Nothing to show'**
  String get loyaltyNothingToShow;

  /// No description provided for @loyaltyNoActivityYet.
  ///
  /// In en, this message translates to:
  /// **'No activity yet'**
  String get loyaltyNoActivityYet;

  /// No description provided for @loyaltyNoFilteredTransactions.
  ///
  /// In en, this message translates to:
  /// **'No {type} transactions in this filter.'**
  String loyaltyNoFilteredTransactions(String type);

  /// No description provided for @loyaltyNoActivityHint.
  ///
  /// In en, this message translates to:
  /// **'Your point activity will appear here after lab visits, ratings, or rewards from the lab.'**
  String get loyaltyNoActivityHint;

  /// No description provided for @loyaltyTypeAdjustment.
  ///
  /// In en, this message translates to:
  /// **'Adjustment'**
  String get loyaltyTypeAdjustment;

  /// No description provided for @loyaltyTypePoints.
  ///
  /// In en, this message translates to:
  /// **'Points'**
  String get loyaltyTypePoints;

  /// No description provided for @profileEditTitle.
  ///
  /// In en, this message translates to:
  /// **'Edit profile'**
  String get profileEditTitle;

  /// No description provided for @profileBack.
  ///
  /// In en, this message translates to:
  /// **'Back'**
  String get profileBack;

  /// No description provided for @profileEditIntro.
  ///
  /// In en, this message translates to:
  /// **'Update how the lab reaches you. Changes apply to your signed-in account.'**
  String get profileEditIntro;

  /// No description provided for @profileContactDetails.
  ///
  /// In en, this message translates to:
  /// **'Contact details'**
  String get profileContactDetails;

  /// No description provided for @profileContactHint.
  ///
  /// In en, this message translates to:
  /// **'Used for orders, results, and account recovery.'**
  String get profileContactHint;

  /// No description provided for @profileFullName.
  ///
  /// In en, this message translates to:
  /// **'Full name'**
  String get profileFullName;

  /// No description provided for @profileNameRequired.
  ///
  /// In en, this message translates to:
  /// **'Enter your name'**
  String get profileNameRequired;

  /// No description provided for @profileNameTooShort.
  ///
  /// In en, this message translates to:
  /// **'Name looks too short'**
  String get profileNameTooShort;

  /// No description provided for @profilePhoneRequired.
  ///
  /// In en, this message translates to:
  /// **'Enter a phone number'**
  String get profilePhoneRequired;

  /// No description provided for @profilePhoneInvalid.
  ///
  /// In en, this message translates to:
  /// **'Use + and digits only (e.g. +959…)'**
  String get profilePhoneInvalid;

  /// No description provided for @profileSaveChanges.
  ///
  /// In en, this message translates to:
  /// **'Save changes'**
  String get profileSaveChanges;

  /// No description provided for @profileCancel.
  ///
  /// In en, this message translates to:
  /// **'Cancel'**
  String get profileCancel;

  /// No description provided for @profileSaved.
  ///
  /// In en, this message translates to:
  /// **'Profile saved'**
  String get profileSaved;

  /// No description provided for @profileSaveFailed.
  ///
  /// In en, this message translates to:
  /// **'Could not save changes'**
  String get profileSaveFailed;

  /// No description provided for @profileSavedHint.
  ///
  /// In en, this message translates to:
  /// **'Your details are updated on the lab account. Returning to your profile…'**
  String get profileSavedHint;

  /// No description provided for @profileSaveErrorHint.
  ///
  /// In en, this message translates to:
  /// **'Please check your connection and try again.'**
  String get profileSaveErrorHint;

  /// No description provided for @profileDismiss.
  ///
  /// In en, this message translates to:
  /// **'Dismiss'**
  String get profileDismiss;

  /// No description provided for @profileAddress.
  ///
  /// In en, this message translates to:
  /// **'Address'**
  String get profileAddress;

  /// No description provided for @profileAddressHint.
  ///
  /// In en, this message translates to:
  /// **'Street, city, etc.'**
  String get profileAddressHint;

  /// No description provided for @profileChooseOnMap.
  ///
  /// In en, this message translates to:
  /// **'Choose on map'**
  String get profileChooseOnMap;

  /// No description provided for @profileLatLong.
  ///
  /// In en, this message translates to:
  /// **'Latitude–Longitude'**
  String get profileLatLong;

  /// No description provided for @profileLookingUpAddress.
  ///
  /// In en, this message translates to:
  /// **'Looking up address…'**
  String get profileLookingUpAddress;

  /// No description provided for @profileNoAddressMatch.
  ///
  /// In en, this message translates to:
  /// **'No match — try a fuller address or choose on the map.'**
  String get profileNoAddressMatch;

  /// No description provided for @profileAddressLookupFailed.
  ///
  /// In en, this message translates to:
  /// **'Could not look up address. Try again or choose on the map.'**
  String get profileAddressLookupFailed;

  /// No description provided for @profilePhotoTitle.
  ///
  /// In en, this message translates to:
  /// **'Profile photo'**
  String get profilePhotoTitle;

  /// No description provided for @profileTakePhoto.
  ///
  /// In en, this message translates to:
  /// **'Take photo'**
  String get profileTakePhoto;

  /// No description provided for @profileChooseFromGallery.
  ///
  /// In en, this message translates to:
  /// **'Choose from gallery'**
  String get profileChooseFromGallery;

  /// No description provided for @profilePhotoPickFailed.
  ///
  /// In en, this message translates to:
  /// **'Could not load photo. Try again.'**
  String get profilePhotoPickFailed;
}

class _AppLocalizationsDelegate extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) => <String>['en', 'my'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {


  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'en': return AppLocalizationsEn();
    case 'my': return AppLocalizationsMy();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.'
  );
}
