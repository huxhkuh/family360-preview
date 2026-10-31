// Check Rollup/Rolldown's actual module graph, not minified variable names.
const demoOnly=[
 '/src/Demo.tsx',
 '/src/lib/backend.ts',
 '/src/lib/demo-seed.ts',
 '/src/lib/demo-operations.ts',
 '/src/lib/demo-meeting.ts',
];
export function assertLiveModules(ids:Iterable<string>){
 const leaked=[...ids].map(id=>id.replaceAll('\\','/').split('?')[0])
  .filter(id=>demoOnly.some(suffix=>id.endsWith(suffix)));
 if(leaked.length)throw Error('LIVE_BUILD_CONTAINS_DEMO_MODULES: '+[...new Set(leaked)].join(', '));
}
