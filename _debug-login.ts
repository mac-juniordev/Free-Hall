import 'dotenv/config';
import { login } from './src/modules/auth/auth.service';

(async () => {
  try {
    const r = await login({ matricule: 'UBa23E0001', password: 'FreeHall@2025' });
    console.log('SUCCESS:', r.user.role, r.user.status);
  } catch (e: any) {
    console.error('FAIL:', e.code, '-', e.message);
  }
  process.exit(0);
})();