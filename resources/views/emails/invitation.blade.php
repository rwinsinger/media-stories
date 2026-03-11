<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>You're invited to join Media Stories!</title>
</head>
<body style="font-family: sans-serif; background: #f9fafb; margin: 0; padding: 40px 20px;">
    <div style="max-width: 480px; margin: 0 auto; background: #fff; border-radius: 12px; padding: 40px; box-shadow: 0 1px 4px rgba(0,0,0,0.08);">
        <h1 style="font-size: 22px; color: #111; margin-bottom: 8px;">You're invited!</h1>
        <p style="color: #555; font-size: 16px; line-height: 1.6;">
            <strong>{{ $inviter->name }}</strong> invited you to join <strong>Media Stories</strong> — a place to share your stories with friends.
        </p>
        <p style="margin: 32px 0;">
            <a href="{{ url('/invite/' . $invitation->token) }}"
               style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #db2777); color: #fff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 15px;">
                Accept Invitation &rarr;
            </a>
        </p>
        <p style="color: #999; font-size: 13px;">
            This invitation expires in 72 hours. If you weren't expecting this, you can safely ignore this email.
        </p>
    </div>
</body>
</html>
