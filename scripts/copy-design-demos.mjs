import {cpSync} from 'node:fs';
// These interactive design prototypes belong only to the public demo build.
cpSync('demo-static/demos','dist/demos',{recursive:true});
