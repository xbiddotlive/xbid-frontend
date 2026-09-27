import { mkdir,writeFile } from 'node:fs/promises';
import { get } from './collect-x-growth-metrics.mjs';
const index = process.argv.indexOf('--query');
const query = index >= 0 ? process.argv[index+1] : undefined;
async function main() {
  if (!query || query.length > 512) throw new Error('Usage: scout-x-discussions.mjs --query <up to 512 characters>');
  const me = await get('/2/users/me');
  if (me.data?.username?.toLowerCase() !== 'xbid_live') throw new Error('Account mismatch');
  const now = Date.now();
  const payload = await get('/2/tweets/search/recent', {
    query, max_results:'20',sort_order:'relevancy',
    start_time:new Date(now-48*3600000).toISOString(),end_time:new Date(now-3600000).toISOString(),
    'tweet.fields':'created_at,public_metrics,author_id,conversation_id,referenced_tweets',
    expansions:'author_id','user.fields':'username,public_metrics',
  });
  const result={asOf:new Date().toISOString(),query,window:'48h to 1h ago; relevance sample, not a representative popularity ranking',payload};
  const dir='content/x-posts/growth-3day-20260906/research';
  await mkdir(dir,{recursive:true});
  const file=`${dir}/search-${result.asOf.replaceAll(':','-')}.json`;
  await writeFile(file,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
  const names=new Map((payload.includes?.users??[]).map(u=>[u.id,u.username]));
  console.log(JSON.stringify({file,posts:(payload.data??[]).map(p=>({id:p.id,url:`https://x.com/${names.get(p.author_id)??'i'}/status/${p.id}`,text:p.text,created_at:p.created_at,metrics:p.public_metrics})),errors:payload.errors??[]},null,2));
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
