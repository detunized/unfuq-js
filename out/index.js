"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const parser = __importStar(require("@babel/parser"));
const traverse_1 = __importDefault(require("@babel/traverse"));
const t = __importStar(require("@babel/types"));
const generator_1 = __importDefault(require("@babel/generator"));
// Load and parse the JavaScript file
function loadAndParseFile(filePath) {
    const code = fs.readFileSync(filePath, 'utf-8');
    return parser.parse(code, {
        sourceType: 'module',
        plugins: [
            'jsx',
            'typescript', // if you're dealing with TypeScript code
            // add other plugins as needed
        ],
    });
}
// Example of AST traversal and manipulation
function manipulateAST(ast) {
    (0, traverse_1.default)(ast, {
        // Slipt multiple variable declarations into multiple statements
        VariableDeclaration(path) {
            if (path.node.declarations.length > 1) {
                const declarations = path.node.declarations;
                const statements = declarations.map((declaration) => {
                    return t.variableDeclaration(path.node.kind, [
                        t.variableDeclarator(declaration.id, declaration.init),
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
                // Create a list of expression statements for all expressions except the last one
                const expressionStmts = expressions.slice(0, -1).map(expr => t.expressionStatement(expr));
                // Create a new return statement for the last expression
                const returnStmt = t.returnStatement(expressions[expressions.length - 1]);
                // Replace the original return statement with the new sequence of statements
                path.replaceWithMultiple([...expressionStmts, returnStmt]);
            }
        },
    });
}
function generateCodeFromAST(ast) {
    const output = (0, generator_1.default)(ast, {
        comments: true,
        compact: false,
        retainLines: false,
        concise: false, // use the full code generator
    });
    return output.code;
}
// Main function
function main() {
    const filePath = 'background.js'; // replace with your file path
    const ast = loadAndParseFile(filePath);
    manipulateAST(ast);
    const code = generateCodeFromAST(ast);
    // Save code to file
    fs.writeFileSync('output.js', code);
}
main();
//# sourceMappingURL=index.js.map