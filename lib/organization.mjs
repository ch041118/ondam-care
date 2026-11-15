export const DEFAULT_ORGANIZATION = 'clover';
export const organizationOf = value => value?.organizationId || DEFAULT_ORGANIZATION;
export const inOrganization = (user, value) => user?.role === 'admin' || organizationOf(user) === organizationOf(value);

export function ensureOrganizations(db) {
  db.organizations ||= [{id:DEFAULT_ORGANIZATION,name:'클로버 돌봄센터'}];
  if (!db.organizations.some(o=>o.id===DEFAULT_ORGANIZATION)) db.organizations.unshift({id:DEFAULT_ORGANIZATION,name:'클로버 돌봄센터'});
  for (const key of ['accounts','caregivers','elders']) for (const row of db[key] || []) row.organizationId ||= DEFAULT_ORGANIZATION;
  const elders=new Map((db.elders||[]).map(e=>[e.id,e]));
  for (const r of db.requests || []) r.organizationId ||= organizationOf(elders.get(r.elderId));
  return db;
}

// Keep retired records in storage for recovery, but never schedule/display/notify them.
export const supportedRequest = r => r.urgency !== 'sos' && r.urgency !== 'emergency';
export function retireEmergencyFeatures(db) {
  for (const job of db.wellnessOutbox || []) if (job.kind==='sos' && ['pending','sending'].includes(job.status)) job.status='cancelled';
  return db;
}
