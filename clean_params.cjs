const fs = require('fs');
let code = fs.readFileSync('src/services/simpleTrainerBot.ts', 'utf8');

code = code.replace(/isFrenchOffset: boolean/g, '');
code = code.replace(/, \)/g, ')');
code = code.replace(/, isFrenchOffset/g, '');
code = code.replace(/const isFrenchOffset = [^;]+;/g, '');

fs.writeFileSync('src/services/simpleTrainerBot.ts', code);
console.log('Cleaned unused params');
