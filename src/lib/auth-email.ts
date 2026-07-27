const GMAIL_MIN_LOCAL_LENGTH = 6;

const BASIC_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeAuthEmail(raw: string): string {
  let email = raw.trim();

  const angleMatch = email.match(/<([^>]+)>/);
  if (angleMatch) {
    email = angleMatch[1].trim();
  }

  return email.toLowerCase();
}

export function getAuthEmailValidationError(email: string): string | null {
  if (!email) {
    return "Email is required.";
  }

  if (!BASIC_EMAIL_PATTERN.test(email)) {
    return "Please enter a valid email address.";
  }

  const [localPart, domain] = email.split("@");

  if (domain === "gmail.com" && localPart.length < GMAIL_MIN_LOCAL_LENGTH) {
    return `Gmail addresses must be at least ${GMAIL_MIN_LOCAL_LENGTH} characters before the @ sign (for example, ali123@gmail.com). Shorter Gmail usernames are rejected during signup.`;
  }

  return null;
}

export function getSignupAuthErrorMessage(
  code: string | undefined,
  message: string,
  email: string
): string {
  const validationError = getAuthEmailValidationError(email);

  if (code === "email_address_invalid") {
    if (validationError) {
      return validationError;
    }

    return "This email address cannot be used for signup. Try a different provider or check the domain for typos.";
  }

  if (code === "email_address_not_authorized") {
    return "Signup confirmation emails cannot be sent to this address yet. Configure custom SMTP in Supabase to allow external emails.";
  }

  if (code === "validation_failed" && message.includes("validate email address")) {
    return "Please enter a valid email address without extra spaces or special formatting.";
  }

  return message;
}
