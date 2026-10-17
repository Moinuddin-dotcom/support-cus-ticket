import * as bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

let dummyHash: Promise<string> | undefined;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * A real bcrypt hash to compare against when the email is unknown,
 * so login timing does not reveal which emails are registered.
 */
export function getDummyHash(): Promise<string> {
  dummyHash ??= bcrypt.hash('timing-equaliser', SALT_ROUNDS);
  return dummyHash;
}
