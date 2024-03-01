const { unfuqFile } = require('./index.js');

if (process.argv.length < 3) {
    console.log('Usage: node unfuq.js <input file>');
    process.exit(1);
}

console.log(unfuqFile(process.argv[2]));
