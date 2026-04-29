import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../app/session_scope.dart';
import '../../theme/app_colors.dart';
import '../../widgets/common/app_brand_mark.dart';

class DoctorDashboardScreen extends StatelessWidget {
  const DoctorDashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final user = SessionScope.of(context).user;
    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: false,
        title: Row(
          children: [
            const AppBrandMark(size: 32, iconSize: 16, borderRadius: 8),
            const SizedBox(width: 10),
            Text(
              'Doctor Portal',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    color: AppColors.primary,
                    fontWeight: FontWeight.w800,
                  ),
            ),
          ],
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Text('Welcome, ${user?.name ?? 'Doctor'}'),
          const SizedBox(height: 12),
          _card(context, 'Review Lab Results', 'View reports and run AI checks', '/lab-results'),
          _card(context, 'Submit Clinical Feedback', 'Rate service and leave remarks', '/rating-feedback'),
          _card(context, 'Order Follow-up Tests', 'Create urgent/elective test orders', '/order-lab-test'),
        ],
      ),
    );
  }

  Widget _card(BuildContext context, String title, String subtitle, String route) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        tileColor: Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: const BorderSide(color: Color(0x66E1E2EC)),
        ),
        title: Text(title),
        subtitle: Text(subtitle),
        trailing: const Icon(Icons.chevron_right),
        onTap: () => context.push(route),
      ),
    );
  }
}
