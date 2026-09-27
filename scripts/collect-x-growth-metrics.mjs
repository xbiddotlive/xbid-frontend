import { createHmac, randomBytes } from 'node:crypto';
import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Read-only API collection. Never prints credentials or authorization headers.
const enc = s => encodeURIComponent(s).replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
export async function get(route, params = {}) {
  const url = new URL(`https://api.x.com${route}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const oauth = {
    oauth_consumer_key: process.env.X_API_KEY,
    oauth_token: process.env.X_ACCESS_TOKEN,
    oauth_nonce: randomBytes(16).toString('hex'),
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_signature_method: 'HMAC-SHA1', oauth_version: '1.0',
  };
  for (const key of ['X_API_KEY', 'X_API_KEY_SECRET', 'X_ACCESS_TOKEN', 'X_ACCESS_TOKEN_SECRET']) {
    if (!process.env[key]) throw new Error(`Missing ${key}`);
  }
  const pairs = [...url.searchParams, ...Object.entries(oauth)].map(([k,v]) => [enc(k),enc(v)])
    .sort((a,b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0);
  const normalized = pairs.map(p => p.join('=')).join('&');
  const base = ['GET',enc(url.origin + url.pathname),enc(normalized)].join('&');
  oauth.oauth_signature = createHmac('sha1', `${enc(process.env.X_API_KEY_SECRET)}&${enc(process.env.X_ACCESS_TOKEN_SECRET)}`).update(base).digest('base64');
  const response = await fetch(url, {headers: {Authorization: 'OAuth ' + Object.entries(oauth).map(([k,v]) => `${enc(k)}="${enc(v)}"`).join(', ')}, signal: AbortSignal.timeout(30000)});
  if (!response.ok) {
    const error = new Error(`X read API ${route}: HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

async function main() {
  const account = await get('/2/users/me', {'user.fields':'public_metrics,description,created_at'});
  if (account.data?.username?.toLowerCase() !== 'xbid_live') throw new Error('Account mismatch');
  const receipts = await Promise.all((await readdir('.x-publish-history')).filter(f => f.endsWith('.json')).map(async f => JSON.parse(await readFile(path.join('.x-publish-history', f), 'utf8'))));
  const external = await readFile('content/x-posts/growth-3day-20260906/external-posts.json','utf8').then(JSON.parse).catch(error => {
    if (error.code === 'ENOENT') return [];
    throw error;
  });
  const recent = [...new Map([...receipts,...external].filter(r => r.username?.toLowerCase() === 'xbid_live').map(r => [r.postId,r])).values()].sort((a,b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0,20);
  const result = {asOf:new Date().toISOString(), account:account.data, posts:[], limitations:[]};
  if (recent.length) {
    let payload;
    try {
      payload = await get('/2/tweets', {ids:recent.map(r => r.postId).join(','), 'tweet.fields':'public_metrics,non_public_metrics,organic_metrics,created_at,author_id'});
    } catch (error) {
      if (error.status !== 403) throw error;
      result.limitations.push('Private metrics access denied; public metrics only.');
      payload = await get('/2/tweets', {ids:recent.map(r => r.postId).join(','), 'tweet.fields':'public_metrics,created_at,author_id'});
    }
    result.posts = payload.data ?? [];
    result.lookupErrors = payload.errors ?? [];
  }
  result.limitations.push('Use user_profile_clicks only when explicitly returned in private metrics; missing fields are unavailable, not zero. Per-post follows and unique human commenters are not inferred. Account follower deltas are not attributed to individual posts.');
  const dir = 'content/x-posts/growth-3day-20260906/metrics';
  await mkdir(dir,{recursive:true});
  const output = path.join(dir, `${result.asOf.replaceAll(':','-')}.json`);
  await writeFile(output, JSON.stringify(result,null,2)+'\n', {flag:'wx'});
  console.log(JSON.stringify({output,asOf:result.asOf,followers:result.account.public_metrics?.followers_count,posts:result.posts.length,metrics:result.posts.map(p=>({id:p.id,...p.public_metrics}))},null,2));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode=1; });
}
