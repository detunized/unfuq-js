const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const generate = require('@babel/generator').default;
const assert = require('assert').strict;

const { unfuqAst } = require('./index.js');


const TEST_DIR = './tests'; // Adjust this path

function parse(js) {
    return parser.parse(js);
}

function toCode(ast) {
    return generate(ast, {comments: false}).code;
}

fs.readdirSync(TEST_DIR).forEach(file => {
    if (path.extname(file) === '.js') { // Assuming all test cases are .js files
        const filePath = path.join(TEST_DIR, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const [inputCode, expectedCode] = content.split(/^\/\/---.*$/m);
        const transformedCode = toCode(unfuqAst(parse(inputCode)));
        const expectedCodeReformatted = toCode(parse(expectedCode));
        assert.strictEqual(transformedCode, expectedCodeReformatted, `Failed in file ${file}`);
    }
});
