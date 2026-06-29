import '../models/loyalty.dart';
import 'app_localizations.dart';

extension PointTransactionTypeL10n on PointTransactionType {
  String localizedLabel(AppLocalizations l10n) {
    return switch (this) {
      PointTransactionType.earn => l10n.loyaltyEarned,
      PointTransactionType.redeem => l10n.loyaltyRedeemed,
      PointTransactionType.adjustment => l10n.loyaltyTypeAdjustment,
      PointTransactionType.unknown => l10n.loyaltyTypePoints,
    };
  }
}
