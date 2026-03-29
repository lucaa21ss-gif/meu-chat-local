import { createConfiguredApp } from './apps/api/src/http/app-create.js';
import { initStoreDb } from './platform/persistence/sqlite/store.js';

process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED:', err.message);
  console.error(err.stack);
  process.exit(1);
});

async function diagnose() {
  try {
    await initStoreDb();
    const app = createConfiguredApp();
    console.log('SUCCESS! app type:', typeof app);
    return { ok: true };
  } catch (err) {
    console.error('ERROR TYPE:', err.constructor.name);
    console.error('ERROR MSG:', err.message);
    console.error('FULL STACK:\n', err.stack);
    return { ok: false, error: err.message, stack: err.stack };
  }
}

diagnose().then(r => {
  if (r.ok) {
    console.log('Server app created successfully!');
    process.exit(0);
  } else {
    process.exit(1);
  }
});
