import config from '../src/config';
import { generateTOTP } from '../src/core/rfc6238';
import { db } from '../src/db';
import { typeormInstance } from '../src/db/typeorm-connection';
import { hashPassword } from '../src/util/passwords';

/**
 * All sample users for development purposes.
 */
async function loadData() {
  return [
    {
      username: 'admin',
      email: 'admin@attendance.com',
      phoneNumber: '0823-1122-3344',
      password: await hashPassword('test1234'),
      totpSecret: '1234',
      name: 'Admin',
      lastname: 'Attendance',
      role: 'admin',
    },
  ];
}

/**
 * Driver code.
 * 1. Seed all data to DB.
 * 2. Generate OTPAuth strings to be converted to QR.
 */
async function main() {
  await typeormInstance.connect();

  const users = await loadData();

  await db.repositories.user.delete({});
  await db.repositories.user.save(users);

  const totpStrings = users.map((user) =>
    generateTOTP({
      issuer: config.TOTP_ISSUER,
      label: user.username,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: user.totpSecret,
    })
  );

  console.log('Database seeded successfully.');
  console.log('OTP strings are as follows (generate these into QR codes):');
  console.log(totpStrings);
}

/**
 * Call driver code.
 */
main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await typeormInstance.disconnect();
  });
