// Pages routes /api/* and /health through a private service binding.
// The API Worker remains responsible for authentication and every permission check.
export default {
  async fetch(request,env){
    const path=new URL(request.url).pathname;
    if(path.startsWith('/api/')||path==='/health'){
      if(!env.STAGING_API)return Response.json({error:{code:'SERVICE_NOT_CONFIGURED'}},{status:503,headers:{'Cache-Control':'no-store'}});
      return env.STAGING_API.fetch(request);
    }
    return env.ASSETS.fetch(request);
  },
};
