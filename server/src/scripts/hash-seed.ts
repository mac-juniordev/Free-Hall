import { hashPassword } from '../utils/password';

async function main() {
  const plain = process.argv[2] ?? 'Admin@1234';
  const hash = await hashPassword(plain);
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ plain, hash }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});