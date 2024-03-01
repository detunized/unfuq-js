const fs = require('fs');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const t = require('@babel/types');
const { escape } = require('querystring');
const generate = require('@babel/generator').default;

function loadFile(filePath) {
    return fs.readFileSync(filePath, 'utf-8');
}

function parseJs(js) {
    return parser.parse(js, {
        sourceType: 'module',
        plugins: [
            // add other plugins as needed
        ],
    });
}

function unfuqFile(filePath) {
    const js = loadFile(filePath);
    return unfuqJs(js);
}

function unfuqJs(js) {
    const ast = parseJs(js);
    unfuqAst(ast);
    return generateCodeFromAST(ast);
}

function unfuqAst(ast) {
    traverse(ast, {
        UnaryExpression(path) {
            // Convert void 0 to undefined
            if (path.node.operator === 'void' && path.node.argument.value === 0) {
                path.replaceWith(t.identifier('undefined'));
                return;
            }

            // Convert !0 to true
            if (path.node.operator === '!' && path.node.argument.value === 0) {
                path.replaceWith(t.booleanLiteral(true));
                return;
            }

            // Convert !1 to false
            if (path.node.operator === '!' && path.node.argument.value === 1) {
                path.replaceWith(t.booleanLiteral(false));
                return;
            }
        },

        // Split multiple variable declarations into multiple statements
        VariableDeclaration(path) {
            if (path.node.declarations.length > 1) {
                // Check if the parent is a for loop
                if (t.isForStatement(path.parent) ||
                    t.isForOfStatement(path.parent) ||
                    t.isForInStatement(path.parent)) {
                    return; // If inside a for loop, exit early without splitting
                }

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

        ExpressionStatement(path) {
            // Split comma expressions into multiple statements
            if (t.isSequenceExpression(path.node.expression)) {
                const expressions = path.node.expression.expressions;
                const statements = expressions.map((expression) => {
                    return t.expressionStatement(expression);
                });
                path.replaceWithMultiple(statements);
                return;
            }

            // Split && into multiple statements
            if (t.isLogicalExpression(path.node.expression) && path.node.expression.operator === '&&') {
                const left = path.node.expression.left;
                const right = path.node.expression.right;
                const ifStmt = t.ifStatement(left, t.blockStatement([t.expressionStatement(right)]));
                //console.log(`// Replacing: ${generate(path.node, {concise: true}).code}\n//      with: ${generate(ifStmt, {concise: true}).code}\n`);
                path.replaceWith(ifStmt);
                return;
            }

            // Split || into multiple statements
            if (t.isLogicalExpression(path.node.expression) && path.node.expression.operator === '||') {
                const left = path.node.expression.left;
                const right = path.node.expression.right;
                const ifStmt = t.ifStatement(t.unaryExpression('!', left), t.blockStatement([t.expressionStatement(right)]));
                //console.log(`// Replacing: ${generate(path.node, {concise: true}).code}\n//      with: ${generate(ifStmt, {concise: true}).code}\n`);
                path.replaceWith(ifStmt);
                return;
            }

            // Convert ?: into if statements
            if (t.isConditionalExpression(path.node.expression)) {
                const test = path.node.expression.test;
                const consequent = path.node.expression.consequent;
                const alternate = path.node.expression.alternate;
                const ifStmt = t.ifStatement(test, t.blockStatement([t.expressionStatement(consequent)]), t.blockStatement([t.expressionStatement(alternate)]));
                //console.log(`// Replacing: ${generate(path.node, {concise: true}).code}\n//      with: ${generate(ifStmt, {concise: true}).code}\n`);
                path.replaceWith(ifStmt);
                return;
            }
        },

        IfStatement(path) {
            const test = path.node.test;

            // Add braces to if even when there's only one statement
            if (!t.isBlockStatement(path.node.consequent)) {
                path.node.consequent = t.blockStatement([path.node.consequent]);
            }

            // Add braces to else even when there's only one statement
            if (path.node.alternate && !t.isBlockStatement(path.node.alternate)) {
                path.node.alternate = t.blockStatement([path.node.alternate]);
            }

            // Split if statements with comma expressions into multiple statements
            if (t.isSequenceExpression(test)) {
                const expressions = test.expressions;
                const expressionStmts = expressions.slice(0, -1).map(expr => t.expressionStatement(expr));
                const ifStmt = t.ifStatement(expressions[expressions.length - 1], path.node.consequent, path.node.alternate);
                //console.log(`// Replacing: ${generate(path.node, {concise: true}).code}`);
                path.replaceWithMultiple([...expressionStmts, ifStmt]);
                return;
            }
        },

        ForStatement(path) {
            const init = path.node.init;

            // Add braces even if the for loop has only one statement
            if (!t.isBlockStatement(path.node.body)) {
                path.node.body = t.blockStatement([path.node.body]);
                return;
            }

            // Split vars inside for loops into multiple statements
            if (t.isVariableDeclaration(init) && init.declarations.length > 1) {
                // Extract the declarations
                const declarations = init.declarations;

                // Separate the last declaration from the others
                const lastDeclaration = declarations.pop();

                // Create separate VariableDeclaration for each of the earlier VariableDeclarators
                const separateDeclarations = declarations.map(declaration => {
                    return t.variableDeclaration(init.kind, [declaration]);
                });

                // Insert the new declarations before the for loop
                path.insertBefore(separateDeclarations);

                // Update the for loop's init to only have the last declaration
                path.node.init = t.variableDeclaration(init.kind, [lastDeclaration]);
                return;
            }
        },

        ReturnStatement(path) {
            const argument = path.node.argument;

            // Split return statements with comma expressions into multiple statements
            if (t.isSequenceExpression(argument)) {
                const expressions = argument.expressions;
                const expressionStmts = expressions.slice(0, -1).map(expr => t.expressionStatement(expr));
                const returnStmt = t.returnStatement(expressions[expressions.length - 1]);
                path.replaceWithMultiple([...expressionStmts, returnStmt]);
                return;
            }

            // Convert return ?: into if statements
            if (t.isConditionalExpression(argument)) {
                const test = argument.test;
                const consequent = argument.consequent;
                const alternate = argument.alternate;
                const ifStmt = t.ifStatement(test, t.blockStatement([t.returnStatement(consequent)]), t.blockStatement([t.returnStatement(alternate)]));
                //console.log(`// Replacing: ${generate(path.node, {concise: true}).code}\n//      with: ${generate(ifStmt, {concise: true}).code}\n`);
                path.replaceWith(ifStmt);
                return;
            }
        },
    });

    return ast;
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

module.exports = {
    unfuqFile,
    unfuqJs,
    unfuqAst,
};
