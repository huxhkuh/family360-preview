import {test,expect} from 'vitest';
import {assertLiveModules} from '../../scripts/live-build-boundary';
test.each(['src/Demo.tsx','src/lib/backend.ts','src/lib/demo-seed.ts','src/lib/demo-operations.ts','src/lib/demo-meeting.ts'])('live build rejects %s',path=>{
 expect(()=>assertLiveModules(['/project/'+path])).toThrow('LIVE_BUILD_CONTAINS_DEMO_MODULES');
});
test('Windows paths and query suffixes cannot bypass the build boundary',()=>{
 expect(()=>assertLiveModules(['C:\\project\\src\\lib\\backend.ts?worker'])).toThrow('LIVE_BUILD_CONTAINS_DEMO_MODULES');
});
test('live adapter, shared business logic and third-party modules remain allowed',()=>{
 expect(()=>assertLiveModules(['/project/src/lib/live-backend.ts','/project/src/reports/report-operations.ts','/project/node_modules/react/index.js'])).not.toThrow();
});
