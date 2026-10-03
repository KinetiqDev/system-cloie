export const LEGAL_ACKNOWLEDGEMENT_CONTENT = {
  privacy: {
    shortTitle: "Privacy Notice",
    paragraphs: [
      "System CLOIE authenticates your account through Supabase Auth. Depending on the entrance you choose, System CLOIE may receive your name, email address, and a unique authentication identifier from Google Sign-In, or it may verify an email address you provide and store a credential there instead. System CLOIE never receives or stores your Google password, and it does not access your Gmail, Google Drive, Google Calendar, contacts, or other unrelated Google account content.",
      "Your information is used to create or match your account, verify your role and eligibility, provide access to assigned evaluations, prevent duplicate submissions, and support academic quality assurance, accreditation, and program improvement.",
    ],
  },
  terms: {
    shortTitle: "Terms of Use",
    paragraphs: [
      "By using System CLOIE, you agree to use only your authorized account and assigned role, provide honest and relevant evaluation responses, protect confidential information, and follow applicable ACD policies.",
      "You must not impersonate another user, submit an evaluation on someone else's behalf, manipulate results, bypass access restrictions, disclose confidential records, attempt to identify respondents, retaliate against participants, or disrupt the system.",
      "System-generated reports support academic review, quality assurance, accreditation, and program improvement. They do not replace authorized institutional judgment and must not be treated as guaranteed error-free until properly reviewed.",
    ],
  },
  acknowledgementLabel:
    "I acknowledge that I have read and understood the System CLOIE Privacy Notice and agree to the System CLOIE Terms of Use.",
} as const;
