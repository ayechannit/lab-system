// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Burmese (`my`).
class AppLocalizationsMy extends AppLocalizations {
  AppLocalizationsMy([String locale = 'my']) : super(locale);

  @override
  String get appTitle => 'Lab Patient App';

  @override
  String get navHome => 'ပင်မစာမျက်နှာ';

  @override
  String get navOrders => 'မှာယူမှုများ';

  @override
  String get navResults => 'ရလဒ်များ';

  @override
  String get navPoints => 'အမှတ်များ';

  @override
  String get navProfile => 'ပရိုဖိုင်';

  @override
  String get language => 'ဘာသာစကား';

  @override
  String get languageEnglish => 'English';

  @override
  String get languageMyanmar => 'မြန်မာ';

  @override
  String get signIn => 'ဝင်မည်';

  @override
  String get signingIn => 'ဝင်နေသည်…';

  @override
  String get email => 'အီးမေးလ်';

  @override
  String get password => 'စကားဝှက်';

  @override
  String get rememberMe => 'ဆက်လက်ဝင်ရောက်ထားမည်';

  @override
  String get forgotPassword => 'စကားဝှက် မေ့နေပါသလား?';

  @override
  String get noAccountPrompt => 'အကောင့်မရှိသေးဘူးလား?';

  @override
  String get createNewAccount => 'အကောင့်သစ် ဖန်တီးမည်';

  @override
  String get emailRequired => 'အီးမေးလ် ထည့်ပါ';

  @override
  String get emailInvalid => 'မှန်ကန်သော အီးမေးလ် ထည့်ပါ';

  @override
  String get passwordRequired => 'စကားဝှက် ထည့်ပါ';

  @override
  String get accountSettings => 'အကောင့်ဆက်တင်များ';

  @override
  String get editProfile => 'ပရိုဖိုင်ပြင်မည်';

  @override
  String get editProfileSubtitle => 'ကိုယ်ရေးအချက်အလက်၊ medical history';

  @override
  String get labAppearance => 'Lab & appearance';

  @override
  String get labAppearanceSubtitle => 'Theme, logo နှင့် lab ဆက်သွယ်ရန်';

  @override
  String get loyaltyStatus => 'LOYALTY STATUS';

  @override
  String get viewLoyaltyPoints => 'Loyalty points ကြည့်မည်';

  @override
  String pointsCount(int count) {
    return '$count points';
  }

  @override
  String get phone => 'Phone';

  @override
  String get signOut => 'ထွက်မည်';

  @override
  String get orderTracking => 'မှာယူမှုခြေရာခံ';

  @override
  String get collectorPending => 'ဆိုင်းငံ့';

  @override
  String get preferredCollector => 'Preferred collector';

  @override
  String get noCollectorPreference => 'No preference — lab assigns';

  @override
  String get collectorOptionalHint => 'Optional — same collector when planning routes';

  @override
  String get welcomeBack => 'ပြန်လည်ကြိုဆိုပါတယ်';

  @override
  String get homeRefreshHint => 'အနှစ်ချုပ် card များနှင့် chart များကို lab server မှ ရယူသည်။ refresh လုပ်ရန် အောက်သို့ ဆွဲပါ။';

  @override
  String get homeOverviewLabel => 'သင့်အကျဉ်း';

  @override
  String get homeAccountSummary => 'အကောင့် အနှစ်ချုပ်';

  @override
  String get homeLiveMetrics => 'သင့် lab အကောင့်မှ live metrics';

  @override
  String get homePromotionsLabel => 'ကြော်ငြာများ';

  @override
  String get homeOffersUpdates => 'ကမ်းလှမ်းချက်များနှင့် အသစ်များ';

  @override
  String get homeLearnMore => 'ပိုမိုကြည့်ရှုရန်';

  @override
  String get homeCouldNotOpenLink => 'လင့်ခ်ကို ဖွင့်၍မရပါ';

  @override
  String get homeTotalOrders => 'မှာယူမှုစုစုပေါင်း';

  @override
  String homeCompletedOrdersCount(int count) {
    return '$count ပြီးစီး';
  }

  @override
  String get homeTotalSpent => 'စုစုပေါင်း ကုန်ကျ';

  @override
  String get homeDeliveredOrders => 'ပို့ပြီးသော မှာယူမှုများ';

  @override
  String get homeLoyaltyPoints => 'Loyalty points';

  @override
  String get homeTapForHistory => 'မှတ်တမ်းကြည့်ရန် နှိပ်ပါ';

  @override
  String get homeInProgress => 'လုပ်ဆောင်နေသည်';

  @override
  String get homeOpenOrders => 'ဖွင့်ထားသော မှာယူမှုများ';

  @override
  String get homeActiveOrder => 'လက်ရှိ မှာယူမှု';

  @override
  String get homeReportOut => 'ရလဒ် ထွက်ပြီ';

  @override
  String get homeDailySpend => 'နေ့စဉ် ကုန်ကျ';

  @override
  String get homeOrderActivityByDay => 'နေ့အလိုက် မှာယူမှု လှုပ်ရှားမှု';

  @override
  String get homeNoOrdersYet => 'မှာယူမှုမရှိသေးပါ။ ပထမမှာယူမှုပြီးနောက် ကုန်ကျ trend ဤနေရာတွင် ပေါ်လာမည်။';

  @override
  String homeSpendTooltip(String amount, int count) {
    return '$amount MMK · $count order(s)';
  }

  @override
  String get homeTopOrderedTests => 'အများဆုံး မှာယူသော စမ်းသပ်ချက်များ';

  @override
  String get homeMostRequestedTests => 'သင် အများဆုံး တောင်းဆိုသော lab test များ';

  @override
  String get homeNoTopTestsYet => 'မှာယူမှုများ လုပ်ပြီးနောက် သင်နှစ်သက်သော test များ ဤနေရာတွင် ပေါ်လာမည်။';

  @override
  String homeOrdersCount(int count) {
    return '$count မှာယူမှု';
  }

  @override
  String get homeOrderCountSingular => 'မှာယူမှု ၁ ခု';

  @override
  String get homeMmkSuffix => 'MMK';

  @override
  String get ordersNewOrder => 'မှာယူမှုအသစ်';

  @override
  String get ordersTitle => 'သင့်မှာယူမှုများ';

  @override
  String get ordersSubtitle => 'မပို့ရသေးသော လက်ရှိတောင်းဆိုမှုများ။';

  @override
  String get ordersNoActiveYet => 'လက်ရှိ မှာယူမှုမရှိသေးပါ';

  @override
  String get ordersNoActiveHint => 'ပထမ lab test မှာယူရန် အပေါ်က card ကို သုံးပါ။ ပို့မပေးမချင်း မှာယူမှုများ ဤနေရာတွင် ရှိနေမည်။';

  @override
  String ordersActiveCount(int count) {
    return 'လက်ရှိ မှာယူမှုများ ($count)';
  }

  @override
  String get ordersStatus => 'အခြေအနေ';

  @override
  String get ordersSort => 'စီရန်';

  @override
  String get ordersAllOrders => 'မှာယူမှုအားလုံး';

  @override
  String get ordersAll => 'အားလုံး';

  @override
  String get ordersFilterByStatus => 'အခြေအနေဖြင့် စစ်ထုတ်ရန်';

  @override
  String get ordersActiveOnlyHint => 'မပို့ရသေးသော လက်ရှိ မှာယူမှုများသာ ဤနေရာတွင် ပေါ်သည်။';

  @override
  String get ordersSortBy => 'စီရန်နည်းလမ်း';

  @override
  String ordersNoStatusOrders(String status) {
    return '$status မှာယူမှုမရှိပါ';
  }

  @override
  String get ordersTryAnotherFilter => 'အခြား status tab ကို စမ်းကြည့်ပါ သို့မဟုတ် မှာယူမှုအသစ် လုပ်ပါ။';

  @override
  String get ordersOrderLabTest => 'Lab test မှာယူမည်';

  @override
  String get ordersOrderLabTestHint => 'လူနာအချက်အလက် ထည့်ပါ၊ test ရွေးပါ၊ sample ယူချိန် သတ်မှတ်ပါ';

  @override
  String ordersPlaced(String date) {
    return 'မှာယူသည့်ရက် $date';
  }

  @override
  String get ordersPatientFallback => 'လူနာ';

  @override
  String ordersStatusCount(String label, int count) {
    return '$label · $count';
  }

  @override
  String get orderStatusPending => 'ဆိုင်းငံ့';

  @override
  String get orderStatusScheduled => 'Schedule လုပ်ပြီး';

  @override
  String get orderStatusCollecting => 'Sample ယူနေသည်';

  @override
  String get orderStatusRunning => 'စမ်းသပ်နေသည်';

  @override
  String get orderStatusCompleted => 'ပြီးစီး';

  @override
  String get orderStatusDelivered => 'ပို့ပြီး';

  @override
  String get orderStatusUnknown => 'မသိ';

  @override
  String get ordersSortNewestFirst => 'အသစ်ဆုံး';

  @override
  String get ordersSortOldestFirst => 'အဟောင်းဆုံး';

  @override
  String get ordersSortRecentlyUpdated => 'မကြာသေးမီ update';

  @override
  String get ordersSortByStatus => 'အခြေအနေ';

  @override
  String get ordersSortPriority => 'ဦးစားပေး (အရေးကြီးဆုံး)';

  @override
  String get ordersSortRecentlyReleased => 'မကြာသေးမီ ထုတ်ပြန်ချက်';

  @override
  String get ordersSortOldestReleased => 'အဟောင်းဆုံး ထုတ်ပြန်ချက်';

  @override
  String get ordersSortNewestPlaced => 'နောက်ဆုံး မှာယူမှု';

  @override
  String get ordersSortOldestPlaced => 'ပထမဆုံး မှာယူမှု';

  @override
  String get ordersRate => 'အမှတ်ပေး';

  @override
  String get ordersRated => 'အမှတ်ပေးပြီး';

  @override
  String get ordersRateThisOrder => 'ဤမှာယူမှုကို အမှတ်ပေးပါ';

  @override
  String get ordersCommentOptional => 'Comment (optional)';

  @override
  String get ordersCommentHint => 'Lab team အတွက် feedback မျှဝေပါ';

  @override
  String get ordersSubmitRating => 'အမှတ်ပေးမည်';

  @override
  String get ordersThanksFeedback => 'Feedback အတွက် ကျေးဇူးတင်ပါတယ်';

  @override
  String ordersRatedToast(int stars) {
    return 'ဤမှာယူမှုကို $stars ကြယ် ပေးထားသည်။';
  }

  @override
  String get ordersRatedToastSingular => 'ဤမှာယူမှုကို ၁ ကြယ် ပေးထားသည်။';

  @override
  String get ordersRatingFailed => 'အမှတ်ပေး၍မရပါ';

  @override
  String get ordersYourRating => 'သင့်အမှတ်ပေးချက်';

  @override
  String get ordersYourComment => 'သင့် comment';

  @override
  String get ordersNoComment => 'ဤအမှတ်ပေးချက်နှင့် comment မပါဝင်ပါ။';

  @override
  String get resultsTitle => 'သင့်ရလဒ်များ';

  @override
  String get resultsSubtitle => 'Lab team က ထုတ်ပြန်ပေးသော report များ။';

  @override
  String get resultsNoReleasedYet => 'ထုတ်ပြန်ပြီး ရလဒ်မရှိသေးပါ';

  @override
  String get resultsNoReleasedHint => 'Lab က report ထုတ်ပြန်ပေးသောအခါ PDF download နှင့် AI Check အတွက် ဤနေရာတွင် ပေါ်လာမည်။';

  @override
  String resultsReleasedReportsCount(int count) {
    return 'ထုတ်ပြန်ပြီး report များ ($count)';
  }

  @override
  String resultsReleasedDate(String date) {
    return 'ထုတ်ပြန်သည့်ရက် $date';
  }

  @override
  String get resultsReleasedBadge => 'ထုတ်ပြန်ပြီး';

  @override
  String get labReportTitle => 'Lab report';

  @override
  String get labReportTestsSection => 'ဤ order ရှိ test များ';

  @override
  String labReportTestCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'test $count ခု',
      one: 'test 1 ခု',
    );
    return '$_temp0';
  }

  @override
  String get labReportCombinedHint => 'Test တချို့ကို ပေါင်းစပ် report အဖြစ် ခွဲထားသည်။ PDF တွဲမှ ဒေါင်းလုတ်လုပ်ပါ သို့မဟုတ် AI Check ကို group တစ်ခုချင်းစီမှ run လုပ်ပါ။';

  @override
  String get labReportSeparateHint => 'တရားဝင် PDF ကို ဒေါင်းလုတ်လုပ်ပါ သို့မဟုတ် test တစ်ခုချင်းစီအတွက် AI Check run လုပ်ပါ။';

  @override
  String get labReportNoTestLines => 'ဤ order အတွက် test line item မတွေ့ပါ။';

  @override
  String get labReportPdfsNotUploadedYet => 'Lab က order ထုတ်ပြန်ပြီးသော်လည်း PDF များ upload မလုပ်ရသေးပါ။ ခဏနေ ပြန်စစ်ပါ သို့မဟုတ် lab ကို ဆက်သွယ်ပါ။';

  @override
  String get labReportSummaryValues => 'Summary values';

  @override
  String get labReportNoReportLoaded => 'Report load မလုပ်ရသေးပါ';

  @override
  String get labReportSelectFromResults => 'Results မှ ထုတ်ပြန်ပြီး order တစ်ခု ရွေးချယ်ပါ။';

  @override
  String get labReportPatient => 'လူနာ';

  @override
  String labReportAge(int age) {
    return 'အသက် $age';
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
    return '$released/$total PDF';
  }

  @override
  String get labReportCombinedReport => 'ပေါင်းစပ် report';

  @override
  String labReportTestsSharePdf(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'test $count ခု PDF တစ်ခု တွဲသုံးသည်',
      one: 'test 1 ခု PDF တစ်ခု တွဲသုံးသည်',
    );
    return '$_temp0';
  }

  @override
  String get labReportPdfNotUploadedCombined => 'ဤပေါင်းစပ် report အတွက် PDF upload မလုပ်ရသေးပါ။';

  @override
  String get labReportPdfNotUploadedTest => 'ဤ test အတွက် PDF upload မလုပ်ရသေးပါ။';

  @override
  String get labReportDownloadCombinedPdf => 'ပေါင်းစပ် PDF ဒေါင်းလုတ်';

  @override
  String get labReportDownloadPdf => 'PDF ဒေါင်းလုတ်';

  @override
  String get labReportDownloading => 'ဒေါင်းလုတ်လုပ်နေသည်…';

  @override
  String get labReportRunAiCheck => 'AI Check လုပ်မည်';

  @override
  String get labReportRunningAiCheck => 'AI Check run လုပ်နေသည်…';

  @override
  String get labReportViewAiSummary => 'AI summary ကြည့်မည်';

  @override
  String get labReportPdfReady => 'PDF အသင့်';

  @override
  String get labReportPdfPending => 'ဆိုင်းငံ့';

  @override
  String get labReportDownloadStarted => 'ဒေါင်းလုတ် စတင်ပြီ';

  @override
  String get labReportReportSaved => 'Report သိမ်းပြီး';

  @override
  String get labReportDownloadFailed => 'Report ဒေါင်းလုတ်၍မရပါ။ ထပ်ကြိုးစားပါ။';

  @override
  String get labReportAiCheckFailed => 'AI Check run လုပ်မရပါ။ ထပ်ကြိုးစားပါ။';

  @override
  String get loyaltyLoadError => 'Point history ကို load လုပ်မရပါ။ retry လုပ်ရန် အောက်သို့ ဆွဲပါ။';

  @override
  String get loyaltyAvailableBalance => 'လက်ရှိ balance';

  @override
  String get loyaltyPointsUnit => 'pts';

  @override
  String get loyaltyBalanceHint => 'Balance သည် account total_points မှ ရသည်။ Lab က payment verify လုပ်သောအခါ အောက်ပါ rule များအရ points ရရှိသည်။';

  @override
  String get loyaltyHowToEarn => 'Points ရယူနည်း';

  @override
  String get loyaltyEarnRulesHint => 'Lab ၏ active rule များ (point_settings)။';

  @override
  String loyaltySpendRule(String amount, int points) {
    return '$amount MMK သုံးပါ → +$points pts';
  }

  @override
  String get loyaltyEarned => 'ရရှိ';

  @override
  String get loyaltyRedeemed => 'သုံးစွဲ';

  @override
  String get loyaltyTransactions => 'လုပ်ဆောင်ချက်များ';

  @override
  String get loyaltyTxnsShort => 'Txn';

  @override
  String get loyaltyActivity => 'လုပ်ဆောင်မှု';

  @override
  String get loyaltyFilterAll => 'အားလုံး';

  @override
  String get loyaltyFilterAdjustments => 'Adjustments';

  @override
  String get loyaltyPaymentOrderRef => 'Payment / order ref.';

  @override
  String get loyaltyNothingToShow => 'ပြရန် မရှိပါ';

  @override
  String get loyaltyNoActivityYet => 'လုပ်ဆောင်မှု မရှိသေးပါ';

  @override
  String loyaltyNoFilteredTransactions(String type) {
    return 'ဤ filter တွင် $type transaction မရှိပါ။';
  }

  @override
  String get loyaltyNoActivityHint => 'Lab visit, rating သို့မဟုတ် lab reward ပြီးနောက် point activity ဤနေရာတွင် ပေါ်လာမည်။';

  @override
  String get loyaltyTypeAdjustment => 'Adjustment';

  @override
  String get loyaltyTypePoints => 'Points';

  @override
  String get profileEditTitle => 'ပရိုဖိုင်ပြင်မည်';

  @override
  String get profileBack => 'နောက်သို့';

  @override
  String get profileEditIntro => 'Lab က သင့်ကို ဆက်သွယ်ရန် အချက်အလက်များ update လုပ်ပါ။ ပြောင်းလဲမှုများသည် signed-in account တွင် apply ဖြစ်သည်။';

  @override
  String get profileContactDetails => 'ဆက်သွယ်ရန် အချက်အလက်';

  @override
  String get profileContactHint => 'Orders, results နှင့် account recovery အတွက် သုံးသည်။';

  @override
  String get profileFullName => 'အမည်အပြည့်အစုံ';

  @override
  String get profileNameRequired => 'အမည် ထည့်ပါ';

  @override
  String get profileNameTooShort => 'အမည် တိုလွန်းနေသည်';

  @override
  String get profilePhoneRequired => 'ဖုန်းနံပါတ် ထည့်ပါ';

  @override
  String get profilePhoneInvalid => 'မှန်ကန်သော ဖုန်းနံပါတ် ထည့်ပါ';

  @override
  String get profileSaveChanges => 'ပြောင်းလဲမှုများ သိမ်းမည်';

  @override
  String get profileCancel => 'ပယ်ဖျက်မည်';

  @override
  String get profileSaved => 'Profile သိမ်းပြီး';

  @override
  String get profileSaveFailed => 'ပြောင်းလဲမှုများ သိမ်း၍မရပါ';

  @override
  String get profileSavedHint => 'သင့်အချက်အလက်များ lab account တွင် update လုပ်ပြီးပါပြီ။ Profile သို့ ပြန်သွားနေသည်…';

  @override
  String get profileSaveErrorHint => 'Connection စစ်ပြီး ထပ်မံကြိုးစားပါ။';

  @override
  String get profileDismiss => 'ပိတ်မည်';

  @override
  String get profileAddress => 'လိပ်စာ';

  @override
  String get profileAddressHint => 'လမ်း၊ မြို့၊ စသည်';

  @override
  String get profileChooseOnMap => 'Map မှ ရွေးချယ်မည်';

  @override
  String get profileLatLong => 'Latitude–Longitude';

  @override
  String get profileLookingUpAddress => 'လိပ်စာ ရှာဖွေနေသည်…';

  @override
  String get profileNoAddressMatch => 'မကိုက်ညီပါ — လိပ်စာအပြည့်အစုံ ထည့်ပါ သို့မဟုတ် map မှ ရွေးပါ။';

  @override
  String get profileAddressLookupFailed => 'လိပ်စာ ရှာ၍မရပါ။ ထပ်ကြိုးစားပါ သို့မဟုတ် map မှ ရွေးပါ။';

  @override
  String get profilePhotoTitle => 'Profile photo';

  @override
  String get profileTakePhoto => 'ဓာတ်ပုံရိုက်မည်';

  @override
  String get profileChooseFromGallery => 'Gallery မှ ရွေးမည်';

  @override
  String get profilePhotoPickFailed => 'ဓာတ်ပုံ ရွေး၍မရပါ။ ထပ်ကြိုးစားပါ။';
}
