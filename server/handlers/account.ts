// DELETE /api/account: the caller's thumbnails, then their records, then the auth user (TECH-SPEC section 7).
import { admin, caller } from '../auth.js';
import { json } from '../http.js';

const BUCKET = 'meal-photos';
const PAGE = 1000;

export async function account(request: Request): Promise<Response> {
  if (request.method !== 'DELETE') return json(405, { ok: false, error: 'bad_request' });
  const db = admin();
  const user = await caller(request, db);
  if (!user) return json(401, { ok: false, error: 'unauthorized' });

  // storage keeps objects that point at a user, so they go first
  for (;;) {
    const list = await db.storage.from(BUCKET).list(user.id, { limit: PAGE });
    if (list.error) return failed('list', list.error);
    if (!list.data.length) break;
    const removed = await db.storage.from(BUCKET).remove(list.data.map((o) => `${user.id}/${o.name}`));
    if (removed.error) return failed('remove', removed.error);
    if (!removed.data.length) break; // only folder entries are left, which hold nothing
  }
  const rows = await db.from('records').delete().eq('user_id', user.id);
  if (rows.error) return failed('records', rows.error);
  const gone = await db.auth.admin.deleteUser(user.id);
  if (gone.error) return failed('user', gone.error);
  console.info('account deleted');
  return json(200, { ok: true });
}

function failed(step: string, e: { message?: string }) {
  console.error('account deletion failed at', step, e.message);
  return json(502, { ok: false, error: 'provider_error' });
}
