const fs = require('fs');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const t = require('@babel/types');
const generate = require('@babel/generator').default;

// Load and parse the JavaScript file
function loadAndParseFile(filePath) {
    const code = fs.readFileSync(filePath, 'utf-8');
    return parser.parse(code, {
        sourceType: 'module',
        plugins: [
           // add other plugins as needed
        ],
    });
}

function manipulateAST(ast) {
    traverse(ast, {
        // Split multiple variable declarations into multiple statements
        VariableDeclaration(path) {
            if (path.node.declarations.length > 1) {
                const declarations = path.node.declarations;
                const statements = declarations.map((declaration) => {
                    return t.variableDeclaration(path.node.kind, [
                        t.variableDeclarator(
                            declaration.id,
                            declaration.init,
                        ),
                    ]);
                });
                path.replaceWithMultiple(statements);
            }
        },

        // Split comma expressions into multiple statements
        ExpressionStatement(path) {
            if (t.isSequenceExpression(path.node.expression)) {
                const expressions = path.node.expression.expressions;
                const statements = expressions.map((expression) => {
                    return t.expressionStatement(expression);
                });
                path.replaceWithMultiple(statements);
            }
        },

        // Split return statements with comma expressions into multiple statements
        ReturnStatement(path) {
            const argument = path.node.argument;

            // Check if the return argument is a SequenceExpression (comma-separated expressions)
            if (t.isSequenceExpression(argument)) {
                const expressions = argument.expressions;
                const expressionStmts = expressions.slice(0, -1).map(expr => t.expressionStatement(expr));
                const returnStmt = t.returnStatement(expressions[expressions.length - 1]);
                path.replaceWithMultiple([...expressionStmts, returnStmt]);
            }
        },
    });
}

function generateCodeFromAST(ast) {
    const output = generate(ast, {
        comments: true, // include comments in the output
        compact: false, // do not minimize the code (pretty print)
        retainLines: false, // do not retain line numbers
        concise: false, // use the full code generator
    });

    return output.code;
}

// Main function
function main() {
    const filePath = 'input.js'; // replace with your file path
    const ast = loadAndParseFile(filePath);

    manipulateAST(ast);

    const code = generateCodeFromAST(ast);

    // Save code to file
    fs.writeFileSync('output.js', code);
}

main();
