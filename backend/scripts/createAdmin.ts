import { parseArgs } from 'node:util';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { BCRYPT_ROUNDS } from '../src/config/constants';
import { connectDb, disconnectDb } from '../src/config/db';
import { UserModel } from '../src/model';
import { newPassword, personName } from '../src/schema/auth.schema';
import { camPhone } from '../src/schema/common.schema';

const USAGE = 'Usage: pnpm create-admin --name "Full Name" --email admin@example.com --phone 6XXXXXXXX --password "..."';

const input = z.object({
  name: personName,
  email: z.email().transform((value) => value.toLowerCase()),
  phone: camPhone,
  password: newPassword,
});

async function main() {
  const { values } = parseArgs({
    options: {
      name: { type: 'string' },
      email: { type: 'string' },
      phone: { type: 'string' },
      password: { type: 'string' },
    },
  });
  const parsed = input.safeParse({
    ...values,
    password: values.password ?? process.env.ADMIN_PASSWORD,
  });
  if (!parsed.success) {
    console.error(USAGE);
    for (const issue of parsed.error.issues) console.error(`  ${issue.path.join('.')}: ${issue.message}`);
    process.exitCode = 1;
    return;
  }

  const { name, email, phone, password } = parsed.data;
  await connectDb();
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const existing = await UserModel.findOne({ email });
  if (existing && existing.role !== 'admin') {
    console.error(`${email} already belongs to a ${existing.role} account. Use another email.`);
    process.exitCode = 1;
    return;
  }
  if (existing) {
    await UserModel.updateOne({ _id: existing._id }, { name, passwordHash, status: 'active', $unset: { refreshTokenHash: 1 } });
    console.log(`Updated admin ${email}`);
    return;
  }
  await UserModel.create({ name, email, phone, passwordHash, role: 'admin' });
  console.log(`Created admin ${email}`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => disconnectDb());
