// This is a basic Flutter widget test.
//
// To perform an interaction with a widget in your test, use the WidgetTester
// utility in the flutter_test package. For example, you can send tap and scroll
// gestures. You can also use WidgetTester to find child widgets in the widget
// tree, read text, and verify that the values of widget properties are correct.

import 'package:flutter_test/flutter_test.dart';

import 'package:agriv_ai/main.dart';

void main() {
  testWidgets('AgrivAI splash screen displays brand', (tester) async {
    await tester.pumpWidget(const AgrivAIApp());

    // Pump frames to allow splash animation to start.
    await tester.pump(const Duration(milliseconds: 500));

    expect(find.text('AgrivAI'), findsOneWidget);
    expect(find.text('AI-powered crop health scanner'), findsOneWidget);
  });
}
