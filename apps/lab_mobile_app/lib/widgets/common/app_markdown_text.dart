import 'package:flutter/material.dart';
import 'package:flutter_markdown/flutter_markdown.dart';

/// Renders AI / lab copy that may include lightweight markdown (`**bold**`, lists, etc.).
class AppMarkdownText extends StatelessWidget {
  const AppMarkdownText(
    this.data, {
    super.key,
    this.style,
  });

  final String data;
  final TextStyle? style;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final base = style ??
        theme.textTheme.bodyMedium?.copyWith(height: 1.35) ??
        const TextStyle(height: 1.35);

    return MarkdownBody(
      data: data,
      shrinkWrap: true,
      styleSheet: MarkdownStyleSheet(
        p: base,
        strong: base.copyWith(fontWeight: FontWeight.w700),
        em: base.copyWith(fontStyle: FontStyle.italic),
        listBullet: base,
        listIndent: 20,
        h1: base.copyWith(fontSize: 18, fontWeight: FontWeight.w700),
        h2: base.copyWith(fontSize: 16, fontWeight: FontWeight.w700),
        h3: base.copyWith(fontSize: 15, fontWeight: FontWeight.w600),
      ),
    );
  }
}
