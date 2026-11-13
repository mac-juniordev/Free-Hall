// tests/realtime.mjs
// Run from repo root: node tests/realtime.mjs
// Requires: server running on localhost:4000, socket.io-client installed in server/

import { io } from '../server/node_modules/socket.io-client/build/esm/index.js';

const BASE = 'http://localhost:4000';
const MATRICULE = 'UBa23E0001';
const PASSWORD = 'FreeHall@2025';
const HALL_ID = process.argv[2] || 'f99c62b6-6fff-4085-b530-c52cf70dc87d'; // Amphi 1000

async function main() {
  console.log('1. Logging in...');
  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ matricule: MATRICULE, password: PASSWORD }),
  });
  if (!loginRes.ok) {
    console.error('Login failed:', await loginRes.text());
    process.exit(1);
  }
  const { token, user } = await loginRes.json();
  console.log(`   ✅ Logged in as ${user.fullName} (${user.role})`);

  const universityId = user.universityId;

  console.log('2. Connecting socket...');
  const socket = io(BASE, {
    auth: { token },
    transports: ['websocket'],
  });

  const events = [];

  socket.on('connect', () => {
    console.log(`   ✅ Socket connected (id=${socket.id})`);
    console.log(`3. Joining room halls:${universityId}`);
    socket.emit('halls:join', universityId);
  });

  socket.on('connect_error', (err) => {
    console.error('   ❌ Socket connect_error:', err.message);
    process.exit(1);
  });

  socket.on('hall:update', (payload) => {
    console.log('   📩 hall:update:', JSON.stringify(payload));
    events.push(payload);
  });

  socket.on('hall:booked_soon', (payload) => {
    console.log('   📩 hall:booked_soon:', JSON.stringify(payload));
  });

  // Give the socket 500ms to finish joining the room
  await new Promise((r) => setTimeout(r, 800));

  console.log('4. Claiming hall via HTTP...');
  const claimRes = await fetch(`${BASE}/api/bookings/claim`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      hallId: HALL_ID,
      courseCode: 'TEST-RT',
      studentCount: 20,
      durationMin: 30,
    }),
  });
  if (!claimRes.ok) {
    console.error('   ❌ Claim failed:', await claimRes.text());
    socket.close();
    process.exit(1);
  }
  const claimBody = await claimRes.json();
  console.log(`   ✅ Claimed booking ${claimBody.booking.id}`);

  // Wait for the hall:update event
  await new Promise((r) => setTimeout(r, 800));

  if (events.length === 0) {
    console.error('   ❌ No hall:update received after claim — realtime NOT working');
    socket.close();
    process.exit(1);
  }
  console.log(`   ✅ Received ${events.length} hall:update event(s) after claim`);

  console.log('5. Releasing booking via HTTP...');
  const releaseRes = await fetch(
    `${BASE}/api/bookings/${claimBody.booking.id}/release`,
    { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
  );
  if (!releaseRes.ok) {
    console.error('   ❌ Release failed:', await releaseRes.text());
    socket.close();
    process.exit(1);
  }
  console.log('   ✅ Released');

  // Wait for the FREE event
  await new Promise((r) => setTimeout(r, 800));
  const freeEvent = events.find((e) => e.liveStatus === 'FREE');
  if (!freeEvent) {
    console.error('   ❌ No FREE event received after release');
    socket.close();
    process.exit(1);
  }
  console.log('   ✅ Received FREE event');

  console.log('\n🎉 Realtime test PASSED');
  socket.close();
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});