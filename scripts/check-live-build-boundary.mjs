import {build,loadConfigFromFile} from 'vite';

const loaded=await loadConfigFromFile({command:'build',mode:'production'},'vite.live.config.ts');
if(!loaded)throw Error('LIVE_CONFIG_NOT_FOUND');
const config=loaded.config;
// Deliberately break adapter selection in memory. Never write this test build.
config.resolve.alias=[];
config.build={...config.build,write:false};
config.plugins=config.plugins.map(plugin=>plugin?.name==='live-entry'?{...plugin,closeBundle:undefined}:plugin);
try{
 await build({...config,configFile:false,logLevel:'silent'});
 throw Error('BOUNDARY_DID_NOT_BLOCK');
}catch(error){
 if(!String(error.message).includes('LIVE_BUILD_CONTAINS_DEMO_MODULES'))throw error;
 console.log('PASS: real build rejected the demo adapter; no artifact written.');
}
