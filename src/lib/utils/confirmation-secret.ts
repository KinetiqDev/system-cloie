export const getConfirmationSecret = () => process.env.CONFIRMATION_SECRET ?? 'dev-secret-only';
