import { mkdir, writeFile } from 'node:fs/promises';
import { get } from './collect-x-growth-metrics.mjs';

// Bounded, read-only capability check; never tests writes, purchases, or pagination.
async function main() {
  const me = await get('/2/users/me', {'user.fields':'public_metrics,description'});
  if (me.data?.username?.toLowerCase() !== 'xbid_live') throw new Error('Account mismatch');
  const startTime = new Date(Date.now() - 48*60*60*1000).toISOString();
  const fields = { 'tweet.fields':'created_at,public_metrics,author_id,conversation_id,referenced_tweets', expansions:'author_id', 'user.fields':'username,public_metrics' };
  const checks = [
    ['ownTimeline', `/2/users/${me.data.id}/tweets`, {...fields,max_results:'10',exclude:'retweets'}],
    ['mentions', `/2/users/${me.data.id}/mentions`, {...fields,max_results:'5'}],
    ['cryptoSearch', '/2/tweets/search/recent', {...fields,query:'(Robinhood OR "stock tokens" OR "self custody") lang:en -is:retweet -is:reply',max_results:'10',start_time:startTime}],
    ['broaderSearch', '/2/tweets/search/recent', {...fields,query:'("AI jobs" OR "four day week" OR "NBA GOAT" OR "AI music") lang:en -is:retweet -is:reply',max_results:'10',start_time:startTime}],
    ['ownPrivateMetrics','/2/tweets/2096394438511903067',{'tweet.fields':'public_metrics,non_public_metrics,organic_metrics,created_at'}],
  ];
  const result = {asOf:new Date().toISOString(),account:me.data,checks:[]};
  for (const [name,route,params] of checks) {
    try {
      const payload = await get(route,params);
      result.checks.push({name,route,status:'available',payload});
    } catch (error) {
      result.checks.push({name,route,status:'failed',httpStatus:error.status ?? null,error:error.message});
      if ([401,402,429].includes(error.status) || !error.status) {
        result.stoppedReason = 'Stop further calls after authentication, balance, rate-limit or network failure.';
        break;
      }
    }
  }
  const dir = 'content/x-posts/growth-3day-20260906/research';
  await mkdir(dir,{recursive:true});
  const output = `${dir}/api-probe-${result.asOf.replaceAll(':','-')}.json`;
  await writeFile(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({output,account:result.account,checks:result.checks.map(c=>({name:c.name,status:c.status,httpStatus:c.httpStatus,resultCount:c.payload?.meta?.result_count,errors:c.payload?.errors, data:c.name==='ownPrivateMetrics'?c.payload?.data:undefined}))},null,2));
}
main().catch(error => {console.error(error.message);process.exitCode=1;});
