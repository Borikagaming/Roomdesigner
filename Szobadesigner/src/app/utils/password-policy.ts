export const ALLOWED_PASSWORD_SPECIAL_CHARACTERS = '!@#$%^&*._-';

export function getPasswordPolicyHint(): string {
  return `Legalább 8 karakter, 1 nagybetű és 1 szám. Speciális karakter opcionális, de csak ezek engedettek: ${ALLOWED_PASSWORD_SPECIAL_CHARACTERS}`;
}

export function getPasswordValidationError(password: string): string | null {
  if (password.length < 8) {
    return 'A jelszónak legalább 8 karakter hosszúnak kell lennie.';
  }

  if (!/[A-Z]/.test(password)) {
    return 'A jelszónak tartalmaznia kell legalább 1 nagybetűt.';
  }

  if (!/\d/.test(password)) {
    return 'A jelszónak tartalmaznia kell legalább 1 számot.';
  }

  if (!/^[A-Za-z\d!@#$%^&*._-]+$/.test(password)) {
    return `A jelszó csak betűket, számokat és ezeket a speciális karaktereket tartalmazhatja: ${ALLOWED_PASSWORD_SPECIAL_CHARACTERS}`;
  }

  return null;
}
