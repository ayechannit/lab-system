/// Backend base URL for the mobile app (no mock/offline mode).
///
/// **Pick the URL for where the app runs** (not where the backend runs):
/// - **Chrome / macOS desktop / iOS Simulator** on the same machine as the API:
///   use `http://localhost:3000` or the default `http://127.0.0.1:3000`.
///   Do **not** use `10.0.2.2` here — that hostname is only meaningful inside
///   the Android emulator.
/// - **Android emulator** (API on the host PC):  
///   `flutter run -d <emulator> --dart-define=LAB_API_BASE_URL=http://10.0.2.2:3000`
/// - **Physical phone** (API on your dev machine): use your computer’s LAN IP, e.g.  
///   `--dart-define=LAB_API_BASE_URL=http://192.168.1.50:3000`
abstract final class LabApiConfig {
  static const String baseUrl = String.fromEnvironment(
    'LAB_API_BASE_URL',
    defaultValue: 'http://10.0.2.2:3000',
  );

  /// Optional; if empty, the app uses the first AI config from `GET /api/ai-configs`.
  static const String aiConfigId = String.fromEnvironment('LAB_AI_CONFIG_ID', defaultValue: '');

  /// Managed prompt for patient-facing lab result summaries (`Lab Result Summarized`).
  static const String labResultSummarizedPromptId = String.fromEnvironment(
    'LAB_RESULT_SUMMARIZED_PROMPT_ID',
    defaultValue: '982c00c9-06dc-4f9f-811f-c40110e55e43',
  );
}
