const { execSync } = require('child_process');
execSync('ts-node index.ts',{stdio:[0,1,2]});