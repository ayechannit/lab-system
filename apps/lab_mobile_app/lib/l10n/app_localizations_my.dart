// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Burmese (`my`).
class AppLocalizationsMy extends AppLocalizations {
  AppLocalizationsMy([String locale = 'my']) : super(locale);

  @override
  String get appTitle => 'ဆေးခန်းဓာတ်ခွဲစနစ်';

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
  String get signIn => 'အကောင့်ဝင်မည်';

  @override
  String get signingIn => 'အကောင့်ဝင်နေသည်…';

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
  String get emailRequired => 'အီးမေးလ် ထည့်သွင်းပါ';

  @override
  String get emailInvalid => 'မှန်ကန်သော အီးမေးလ် ထည့်သွင်းပါ';

  @override
  String get passwordRequired => 'စကားဝှက် ထည့်သွင်းပါ';

  @override
  String get accountSettings => 'အကောင့်ဆက်တင်များ';

  @override
  String get editProfile => 'ပရိုဖိုင် ပြင်ဆင်မည်';

  @override
  String get editProfileSubtitle => 'ကိုယ်ရေးအချက်အလက်၊ ကျန်းမာရေးရာဇဝင်';

  @override
  String get labAppearance => 'အသွင်အပြင်';

  @override
  String get labAppearanceSubtitle => 'Theme၊ လိုဂို နှင့် ဆက်သွယ်ရန်အချက်အလက်များ';

  @override
  String get loyaltyStatus => 'သစ္စာရှိ အမှတ်များ';

  @override
  String get viewLoyaltyPoints => 'အမှတ်များ ကြည့်ရှုမည်';

  @override
  String pointsCount(int count) {
    return '$count မှတ်';
  }

  @override
  String get phone => 'ဖုန်း';

  @override
  String get signOut => 'ထွက်မည်';

  @override
  String get orderTracking => 'မှာယူမှု ခြေရာခံ';

  @override
  String get trackingEmptyState => 'လက်ရှိ မှာယူမှု မရှိသေးပါ။ ဓာတ်ခွဲခန်းမှ ကောက်ယူချိန်နှင့် အခြေအနေကို ကြည့်ရန် မှာယူမှု တစ်ခု ပြုလုပ်ပါ။';

  @override
  String trackingOrderId(String id) {
    return 'မှာယူမှု ID: $id';
  }

  @override
  String trackingPatientLine(String name, String tests) {
    return '$name · $tests';
  }

  @override
  String get trackingLabTestFallback => 'ဓာတ်ခွဲစစ်ဆေးမှု';

  @override
  String trackingTestCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'ဓာတ်ခွဲ $count ခု',
      one: 'ဓာတ်ခွဲ ၁ ခု',
    );
    return '$_temp0';
  }

  @override
  String trackingAddress(String address) {
    return 'လိပ်စာ: $address';
  }

  @override
  String get trackingLabSchedule => 'ဓာတ်ခွဲခန်း အချိန်ဇယား';

  @override
  String trackingCollector(String name) {
    return 'ကောက်ယူသူ: $name';
  }

  @override
  String trackingCollection(String when) {
    return 'ကောက်ယူချိန်: $when';
  }

  @override
  String trackingRunning(String when) {
    return 'လုပ်ဆောင်ချိန်: $when';
  }

  @override
  String trackingReportOut(String when) {
    return 'အစီရင်ခံစာ ထွက်ရှိချိန်: $when';
  }

  @override
  String get trackingConfirmScheduleHint => 'ဓာတ်ခွဲခန်းက ကောက်ယူချိန် အချိန်ဇယား တင်ပြထားပါသည်။ ကောက်ယူသူ ဆက်လက်လုပ်ဆောင်နိုင်ရန် အတည်ပြုပါ။';

  @override
  String get trackingConfirmScheduleButton => 'ကောက်ယူချိန် အချိန်ဇယား အတည်ပြုမည်';

  @override
  String get trackingSaving => 'သိမ်းဆည်းနေသည်…';

  @override
  String get trackingScheduleConfirmedTitle => 'အချိန်ဇယား အတည်ပြုပြီး';

  @override
  String get trackingScheduleConfirmedMessage => 'ကောက်ယူသူက သင့်နမူနာကို ဆက်လက် ကောက်ယူနိုင်ပါပြီ။';

  @override
  String get trackingStatusSection => 'အခြေအနေ';

  @override
  String get trackingStepSubmitted => 'မှာယူမှု တင်ပြီး';

  @override
  String get trackingStepSubmittedSub => 'ဓာတ်ခွဲခန်းသို့ ရောက်ရှိပြီး';

  @override
  String get trackingStepCollection => 'ကောက်ယူချိန် သတ်မှတ်ပြီး';

  @override
  String get trackingAwaitingSchedule => 'ဓာတ်ခွဲခန်း အချိန်ဇယား စောင့်ဆိုင်းနေသည်';

  @override
  String get trackingStepRunning => 'နမူနာ လုပ်ဆောင်နေသည်';

  @override
  String get trackingStepReportOut => 'အစီရင်ခံစာ ထွက်ရှိ';

  @override
  String get collectorPending => 'ဆိုင်းငံ့';

  @override
  String get preferredCollector => 'ဦးစားပေး ကောက်ယူသူ';

  @override
  String get noCollectorPreference => 'မရွေးချယ်ထားပါ — ဓာတ်ခွဲခန်းမှ သတ်မှတ်ပေးမည်';

  @override
  String get collectorOptionalHint => 'ရွေးချယ်နိုင်သည် — သွားရောက်ကောက်ယူမည့်သူကို ရွေးချယ်နိုင်သည်';

  @override
  String get welcomeBack => 'ပြန်လည်ကြိုဆိုပါတယ်';

  @override
  String get homeRefreshHint => 'အချက်အလက်များကို ဆာဗာမှ ရယူပါသည်။ ပြန်လည်ရယူရန် အောက်သို့ ဆွဲပါ။';

  @override
  String get homeOverviewLabel => 'သင့်အကျဉ်းချုပ်';

  @override
  String get homeAccountSummary => 'အကောင့် အနှစ်ချုပ်';

  @override
  String get homeLiveMetrics => 'လက်ရှိ အချက်အလက်များ';

  @override
  String get homePromotionsLabel => 'ကြော်ငြာများ';

  @override
  String get homeOffersUpdates => 'ကမ်းလှမ်းချက်များနှင့် အသစ်များ';

  @override
  String get homeTotalOrders => 'စုစုပေါင်း မှာယူမှု';

  @override
  String homeCompletedOrdersCount(int count) {
    return '$count ခု ပြီးစီး';
  }

  @override
  String get homeTotalSpent => 'စုစုပေါင်း အသုံးပြုမှု';

  @override
  String get homeDeliveredOrders => 'ပေးပို့ပြီးသော မှာယူမှုများ';

  @override
  String get homeLoyaltyPoints => 'သစ္စာရှိ အမှတ်များ';

  @override
  String get homeTapForHistory => 'မှတ်တမ်းကြည့်ရန် နှိပ်ပါ';

  @override
  String get homeInProgress => 'လုပ်ဆောင်နေဆဲ';

  @override
  String get homeOpenOrders => 'ဆိုင်းငံ့ မှာယူမှုများ';

  @override
  String get homeActiveOrder => 'လက်ရှိ မှာယူမှု';

  @override
  String get homeReportOut => 'အစီရင်ခံစာ ထွက်ရှိ';

  @override
  String get homeDailySpend => 'နေ့စဉ် အသုံးပြုမှု';

  @override
  String get homeOrderActivityByDay => 'နေ့အလိုက် မှာယူမှု မှတ်တမ်း';

  @override
  String get homeNoOrdersYet => 'မှာယူမှုမရှိသေးပါ။ မှာယူမှုပြုလုပ်ပြီးပါက ဤနေရာတွင် ပေါ်လာပါမည်။';

  @override
  String homeSpendTooltip(String amount, int count) {
    return '$amount MMK · $count မှာယူမှု';
  }

  @override
  String get homeTopOrderedTests => 'အများဆုံးမှာယူသော ဓာတ်ခွဲများ';

  @override
  String get homeMostRequestedTests => 'သင်အများဆုံး တောင်းဆိုသော ဓာတ်ခွဲစစ်ဆေးမှုများ';

  @override
  String get homeNoTopTestsYet => 'မှာယူမှုများပြုလုပ်ပြီးနောက် သင်အများဆုံးမှာယူသော ဓာတ်ခွဲများ ဤနေရာတွင် ပေါ်လာပါမည်။';

  @override
  String homeOrdersCount(int count) {
    return 'မှာယူမှု $count ခု';
  }

  @override
  String get homeOrderCountSingular => 'မှာယူမှု ၁ ခု';

  @override
  String get homeMmkSuffix => 'MMK';

  @override
  String get ordersNewOrder => 'အသစ်မှာယူမည်';

  @override
  String get ordersTitle => 'သင့်မှာယူမှုများ';

  @override
  String get ordersSubtitle => 'ပေးပို့ရန် ကျန်ရှိနေသေးသော မှာယူမှုများ';

  @override
  String get ordersNoActiveYet => 'လက်ရှိ မှာယူမှု မရှိသေးပါ';

  @override
  String get ordersNoActiveHint => 'အထက်ပါနေရာမှ မှာယူမှု အသစ်ပြုလုပ်နိုင်ပါသည်။ ပေးပို့ပြီးသည်အထိ ဤနေရာတွင် ကြည့်ရှုနိုင်ပါသည်။';

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
  String get ordersActiveOnlyHint => 'ဆိုင်းငံ့နေသော မှာယူမှုများသာ ပြသမည်။';

  @override
  String get ordersSortBy => 'စီစဉ်ရန်ပုံစံ';

  @override
  String ordersNoStatusOrders(String status) {
    return 'ဤအခြေအနေဖြင့် မှာယူမှု မရှိပါ';
  }

  @override
  String get ordersTryAnotherFilter => 'အခြားစစ်ထုတ်မှုတစ်ခုကို ရွေးချယ်ပါ သို့မဟုတ် အသစ်မှာယူပါ။';

  @override
  String get ordersOrderLabTest => 'ဓာတ်ခွဲစစ်ဆေးမှု မှာယူမည်';

  @override
  String get ordersOrderLabTestHint => 'လူနာအချက်အလက် ထည့်သွင်းပါ၊ ဓာတ်ခွဲစစ်ဆေးမှု ရွေးချယ်ပါ၊ နမူနာကောက်ယူမည့်အချိန်ကို သတ်မှတ်ပါ';

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
  String get orderStatusScheduled => 'အချိန်ဇယားဆွဲပြီး';

  @override
  String get orderStatusCollecting => 'နမူနာ ကောက်ယူနေသည်';

  @override
  String get orderStatusRunning => 'လုပ်ဆောင်နေသည်';

  @override
  String get orderStatusCompleted => 'ပြီးစီး';

  @override
  String get orderStatusDelivered => 'ပေးပို့ပြီး';

  @override
  String get orderStatusUnknown => 'အခြေအနေ မသိရပါ';

  @override
  String get ordersSortNewestFirst => 'အသစ်ဆုံး';

  @override
  String get ordersSortOldestFirst => 'အဟောင်းဆုံး';

  @override
  String get ordersSortRecentlyUpdated => 'နောက်ဆုံး ပြင်ဆင်ထားသော';

  @override
  String get ordersSortByStatus => 'အခြေအနေ';

  @override
  String get ordersSortPriority => 'အရေးကြီးဆုံး ဦးစားပေး';

  @override
  String get ordersSortRecentlyReleased => 'နောက်ဆုံး ထုတ်ပြန်ချက်';

  @override
  String get ordersSortOldestReleased => 'အဟောင်းဆုံး ထုတ်ပြန်ချက်';

  @override
  String get ordersSortNewestPlaced => 'နောက်ဆုံး မှာယူမှု';

  @override
  String get ordersSortOldestPlaced => 'အဟောင်းဆုံး မှာယူမှု';

  @override
  String get ordersRate => 'အကဲဖြတ်ရန်';

  @override
  String get ordersRated => 'အကဲဖြတ်ပြီးပါပြီ';

  @override
  String get ordersRateThisOrder => 'ဤမှာယူမှုကို အကဲဖြတ်ပါ';

  @override
  String get ordersCommentOptional => 'မှတ်ချက် (ရွေးချယ်နိုင်သည်)';

  @override
  String get ordersCommentHint => 'ကျွန်ုပ်တို့အတွက် အကြံပြုချက်များ ရေးသားနိုင်ပါသည်';

  @override
  String get ordersSubmitRating => 'အတည်ပြုမည်';

  @override
  String get ordersThanksFeedback => 'အကြံပြုချက်အတွက် ကျေးဇူးတင်ပါသည်';

  @override
  String ordersRatedToast(int stars) {
    return 'ဤမှာယူမှုအတွက် ကြယ် $stars ပွင့် ပေးထားပါသည်။';
  }

  @override
  String get ordersRatedToastSingular => 'ဤမှာယူမှုအတွက် ကြယ် ၁ ပွင့် ပေးထားပါသည်။';

  @override
  String get ordersRatingFailed => 'အကဲဖြတ်ခြင်း မအောင်မြင်ပါ';

  @override
  String get ordersYourRating => 'သင့်အကဲဖြတ်ချက်';

  @override
  String get ordersYourComment => 'သင့်မှတ်ချက်';

  @override
  String get ordersNoComment => 'မှတ်ချက် မပါဝင်ပါ။';

  @override
  String get resultsTitle => 'သင့်ရလဒ်များ';

  @override
  String get resultsSubtitle => 'ဓာတ်ခွဲခန်းမှ ပေးပို့ထားသော အစီရင်ခံစာများ။';

  @override
  String get resultsNoReleasedYet => 'ပေးပို့ထားသော ရလဒ်များ မရှိသေးပါ';

  @override
  String get resultsNoReleasedHint => 'ဓာတ်ခွဲခန်းမှ အစီရင်ခံစာများ ပေးပို့သောအခါ ဤနေရာတွင် PDF ရယူခြင်းနှင့် AI စစ်ဆေးခြင်း ပြုလုပ်နိုင်ပါမည်။';

  @override
  String resultsReleasedReportsCount(int count) {
    return 'ပေးပို့ထားသော အစီရင်ခံစာများ ($count)';
  }

  @override
  String resultsReleasedDate(String date) {
    return 'ပေးပို့သည့်ရက် $date';
  }

  @override
  String get resultsReleasedBadge => 'ပေးပို့ပြီး';

  @override
  String get labReportTitle => 'ဓာတ်ခွဲခန်း အစီရင်ခံစာ';

  @override
  String get labReportTestsSection => 'ဤမှာယူမှုရှိ ဓာတ်ခွဲစစ်ဆေးမှုများ';

  @override
  String labReportTestCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'ဓာတ်ခွဲစစ်ဆေးမှု $count ခု',
      one: 'ဓာတ်ခွဲစစ်ဆေးမှု ၁ ခု',
    );
    return '$_temp0';
  }

  @override
  String get labReportCombinedHint => 'အချို့စစ်ဆေးမှုများကို ပေါင်းစပ်အစီရင်ခံစာအဖြစ် ခွဲခြားထားပါသည်။ ပူးဲတွဲ PDF ကို ရယူပါ သို့မဟုတ် အုပ်စုတစ်ခုချင်းစီအတွက် AI စစ်ဆေးခြင်းကို ပြုလုပ်ပါ။';

  @override
  String get labReportSeparateHint => 'တရားဝင် PDF ကို ရယူပါ သို့မဟုတ် စစ်ဆေးမှုတစ်ခုချင်းစီအတွက် AI စစ်ဆေးခြင်း ပြုလုပ်ပါ။';

  @override
  String get labReportNoTestLines => 'ဤမှာယူမှုအတွက် ဓာတ်ခွဲစစ်ဆေးမှုများ မတွေ့ရှိပါ။';

  @override
  String get labReportPdfsNotUploadedYet => 'မှာယူမှုကို ပေးပို့ပြီးသော်လည်း PDF ဖိုင်များ မတင်ရသေးပါ။ အနည်းငယ်စောင့်ပြီး ထပ်မံစစ်ဆေးပါ သို့မဟုတ် ဓာတ်ခွဲခန်းသို့ ဆက်သွယ်ပါ။';

  @override
  String get labReportSummaryValues => 'အကျဉ်းချုပ် ရလဒ်များ';

  @override
  String get labReportNoReportLoaded => 'အစီရင်ခံစာ မရရှိနိုင်ပါ';

  @override
  String get labReportSelectFromResults => 'ရလဒ်များမှ ပေးပို့ပြီးသော မှာယူမှုတစ်ခုကို ရွေးချယ်ပါ။';

  @override
  String get labReportPatient => 'လူနာ';

  @override
  String labReportAge(int age) {
    return 'အသက် $age';
  }

  @override
  String labReportOrderLine(String ref, String date) {
    return 'မှာယူမှု $ref · $date';
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
  String get labReportCombinedReport => 'ပေါင်းစပ် အစီရင်ခံစာ';

  @override
  String labReportTestsSharePdf(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'စစ်ဆေးမှု $count ခု PDF တစ်ခု အသုံးပြုသည်',
      one: 'စစ်ဆေးမှု ၁ ခု PDF တစ်ခု အသုံးပြုသည်',
    );
    return '$_temp0';
  }

  @override
  String get labReportPdfNotUploadedCombined => 'ဤပေါင်းစပ်အစီရင်ခံစာအတွက် PDF ဖိုင် မတင်ရသေးပါ။';

  @override
  String get labReportPdfNotUploadedTest => 'ဤစစ်ဆေးမှုအတွက် PDF ဖိုင် မတင်ရသေးပါ။';

  @override
  String get labReportDownloadCombinedPdf => 'ပေါင်းစပ် PDF ကို ရယူမည်';

  @override
  String get labReportDownloadPdf => 'PDF ကို ရယူမည်';

  @override
  String get labReportDownloading => 'ရယူနေသည်…';

  @override
  String get labReportRunAiCheck => 'AI စစ်ဆေးမည်';

  @override
  String get labReportRunningAiCheck => 'AI စစ်ဆေးနေသည်…';

  @override
  String get labReportViewAiSummary => 'AI အကျဉ်းချုပ် ကြည့်ရှုမည်';

  @override
  String get labReportPdfReady => 'PDF အသင့်';

  @override
  String get labReportPdfPending => 'ဆိုင်းငံ့';

  @override
  String get labReportDownloadStarted => 'စတင်ရယူနေပြီ';

  @override
  String get labReportReportSaved => 'အစီရင်ခံစာ သိမ်းဆည်းပြီးပါပြီ';

  @override
  String get labReportDownloadFailed => 'အစီရင်ခံစာ ရယူ၍မရပါ။ ထပ်မံကြိုးစားပါ။';

  @override
  String get labReportAiCheckFailed => 'AI စစ်ဆေး၍မရပါ။ ထပ်မံကြိုးစားပါ။';

  @override
  String get loyaltyLoadError => 'မှတ်တမ်းကို ရယူ၍မရပါ။ ပြန်လည်စမ်းသပ်ရန် အောက်သို့ ဆွဲပါ။';

  @override
  String get loyaltyAvailableBalance => 'လက်ရှိ လက်ကျန်';

  @override
  String get loyaltyPointsUnit => 'မှတ်';

  @override
  String get loyaltyBalanceHint => 'လက်ကျန်သည် သင့်အကောင့်ရှိ စုစုပေါင်းအမှတ်မှ ဖြစ်သည်။ ငွေပေးချေမှု အတည်ပြုပြီးပါက အောက်ပါစည်းမျဉ်းများအရ အမှတ်များ ရရှိပါမည်။';

  @override
  String get loyaltyHowToEarn => 'အမှတ်ရယူနည်း';

  @override
  String get loyaltyEarnRulesHint => 'ဓာတ်ခွဲခန်း၏ လက်ရှိ အမှတ်ပေးစည်းမျဉ်းများ။';

  @override
  String loyaltySpendRule(String amount, int points) {
    return '$amount MMK သုံးပါက → +$points မှတ် ရမည်';
  }

  @override
  String get loyaltyEarned => 'ရရှိ';

  @override
  String get loyaltyRedeemed => 'အသုံးပြုပြီး';

  @override
  String get loyaltyTransactions => 'မှတ်တမ်းများ';

  @override
  String get loyaltyTxnsShort => 'မှတ်တမ်း';

  @override
  String get loyaltyActivity => 'လှုပ်ရှားမှုများ';

  @override
  String get loyaltyFilterAll => 'အားလုံး';

  @override
  String get loyaltyFilterAdjustments => 'ပြင်ဆင်ချက်များ';

  @override
  String get loyaltyPaymentOrderRef => 'ငွေပေးချေမှု / မှာယူမှု အမှတ်စဉ်';

  @override
  String get loyaltyNothingToShow => 'ပြသရန် မရှိပါ';

  @override
  String get loyaltyNoActivityYet => 'လုပ်ဆောင်မှု မရှိသေးပါ';

  @override
  String loyaltyNoFilteredTransactions(String type) {
    return 'ဤစစ်ထုတ်မှုတွင် $type မှတ်တမ်း မရှိပါ။';
  }

  @override
  String get loyaltyNoActivityHint => 'ဓာတ်ခွဲခန်းသို့ လာရောက်ခြင်း၊ အကဲဖြတ်ခြင်း သို့မဟုတ် ဆုချီးမြှင့်မှုများ အပြီးတွင် သင့်အမှတ် မှတ်တမ်းများ ဤနေရာတွင် ပေါ်လာပါမည်။';

  @override
  String get loyaltyTypeAdjustment => 'ပြင်ဆင်ချက်';

  @override
  String get loyaltyTypePoints => 'အမှတ်များ';

  @override
  String get profileEditTitle => 'ပရိုဖိုင် ပြင်ဆင်မည်';

  @override
  String get profileBack => 'နောက်သို့';

  @override
  String get profileEditIntro => 'ဓာတ်ခွဲခန်းမှ သင့်ကို ဆက်သွယ်နိုင်မည့် အချက်အလက်များကို ပြင်ဆင်ပါ။';

  @override
  String get profileContactDetails => 'ဆက်သွယ်ရန် အချက်အလက်';

  @override
  String get profileContactHint => 'မှာယူမှုများ၊ ရလဒ်များနှင့် အကောင့်ပြန်လည်ရယူရန်အတွက် အသုံးပြုပါသည်။';

  @override
  String get profileFullName => 'အမည်အပြည့်အစုံ';

  @override
  String get profileNameRequired => 'အမည် ထည့်သွင်းပါ';

  @override
  String get profileNameTooShort => 'အမည်မှာ တိုလွန်းနေပါသည်';

  @override
  String get profilePhoneRequired => 'ဖုန်းနံပါတ် ထည့်သွင်းပါ';

  @override
  String get profilePhoneInvalid => 'မှန်ကန်သော ဖုန်းနံပါတ် ထည့်သွင်းပါ';

  @override
  String get profileSaveChanges => 'ပြောင်းလဲမှုများ သိမ်းမည်';

  @override
  String get profileCancel => 'မလုပ်တော့ပါ';

  @override
  String get profileSaved => 'ပရိုဖိုင်ကို သိမ်းဆည်းပြီးပါပြီ';

  @override
  String get profileSaveFailed => 'ပြောင်းလဲမှုများကို သိမ်းဆည်း၍မရပါ';

  @override
  String get profileSavedHint => 'သင့်အချက်အလက်များကို ဓာတ်ခွဲခန်းအကောင့်တွင် သိမ်းဆည်းပြီးပါပြီ။ ပရိုဖိုင်သို့ ပြန်သွားနေသည်…';

  @override
  String get profileSaveErrorHint => 'အင်တာနက်ချိတ်ဆက်မှုကို စစ်ဆေးပြီး ထပ်မံကြိုးစားပါ။';

  @override
  String get profileDismiss => 'ပိတ်မည်';

  @override
  String get profileAddress => 'လိပ်စာ';

  @override
  String get profileAddressHint => 'လမ်း၊ မြို့၊ စသည်';

  @override
  String get profileChooseOnMap => 'မြေပုံမှ ရွေးချယ်မည်';

  @override
  String get profileLatLong => 'လတ္တီကျု–လောင်ဂျီကျု';

  @override
  String get profileLookingUpAddress => 'လိပ်စာကို ရှာဖွေနေသည်…';

  @override
  String get profileNoAddressMatch => 'မကိုက်ညီပါ။ လိပ်စာအပြည့်အစုံ ထည့်ပါ သို့မဟုတ် မြေပုံမှ ရွေးချယ်ပါ။';

  @override
  String get profileAddressLookupFailed => 'လိပ်စာ ရှာ၍မရပါ။ ထပ်မံကြိုးစားပါ သို့မဟုတ် မြေပုံမှ ရွေးချယ်ပါ။';

  @override
  String get profilePhotoTitle => 'ပရိုဖိုင်ပုံ';

  @override
  String get profileTakePhoto => 'ဓာတ်ပုံရိုက်မည်';

  @override
  String get profileChooseFromGallery => 'ဓာတ်ပုံပြခန်းမှ ရွေးမည်';

  @override
  String get profilePhotoPickFailed => 'ဓာတ်ပုံကို ရယူ၍မရပါ။ ထပ်မံကြိုးစားပါ။';
}
