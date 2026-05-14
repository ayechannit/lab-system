/// Passed as [GoRouteState.extra] when navigating to `/login` after successful signup.
class PostRegisterLoginHint {
  const PostRegisterLoginHint({
    required this.message,
    required this.email,
  });

  final String message;
  final String email;
}
