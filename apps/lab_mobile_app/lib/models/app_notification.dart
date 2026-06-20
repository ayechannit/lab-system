class AppNotification {
  const AppNotification({
    required this.id,
    required this.title,
    required this.body,
    required this.isRead,
    required this.createdAt,
    this.dataPayload,
  });

  final String id;
  final String title;
  final String body;
  final bool isRead;
  final DateTime createdAt;
  final String? dataPayload;

  factory AppNotification.fromJson(Map<String, dynamic> json) {
    final createdRaw = json['created_at'];
    DateTime createdAt = DateTime.now();
    if (createdRaw is String && createdRaw.isNotEmpty) {
      createdAt = DateTime.tryParse(createdRaw) ?? createdAt;
    }

    final readRaw = json['is_read'];
    final isRead = readRaw == true || readRaw == 1;

    String? payload;
    final rawPayload = json['data_payload'];
    if (rawPayload != null) {
      payload = rawPayload is String ? rawPayload : rawPayload.toString();
    }

    return AppNotification(
      id: '${json['id'] ?? ''}',
      title: '${json['title'] ?? ''}'.trim(),
      body: '${json['body'] ?? ''}'.trim(),
      isRead: isRead,
      createdAt: createdAt,
      dataPayload: payload,
    );
  }

  AppNotification markRead() => AppNotification(
        id: id,
        title: title,
        body: body,
        isRead: true,
        createdAt: createdAt,
        dataPayload: dataPayload,
      );
}
