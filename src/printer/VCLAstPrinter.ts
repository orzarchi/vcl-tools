import {
  AliasDeclaration,
  AssignmentStatement,
  BinaryExpression,
  BitDeclaration,
  BlockStatement,
  CallExpression,
  CallStatement,
  ConstantDeclaration,
  EqualsDeclaration,
  ExpressionStatement,
  GoToStatement,
  Identifier,
  IfStatement,
  LabelStatement,
  Literal,
  LogicalExpression,
  Program,
  ReturnStatement,
  Statement,
  UnaryExpression,
  VariableDeclaration,
  VCLASTNode,
  WhileStatement
} from '../ast/VCLAst';
import _ from 'lodash';

const DEFAULT_INDENT_LEVEL = 4;
const NEWLINE_STATEMENTS: Array<string> = [
  IfStatement.nodeType,
  WhileStatement.nodeType,
  GoToStatement.nodeType,
  ReturnStatement.nodeType
];

const NEWLINE_ONLY_BEFORE_STATEMENTS: Array<string> = [LabelStatement.nodeType];

type PrintingOptions = {
  indentLevel?: number;
  indentStep?: number;
  skipComments?: boolean;
};

export default class VCLASTPrinter {
  private shouldIncreaseIndentLevelAfterThisStatement?: boolean;
  private shouldDecreaseIndentLevelAfterThisStatement?: boolean;
  private indentLevel: number;
  private lastStatementHadNewLine = false;
  private readonly indentStep: number;
  private readonly skipComments?: boolean;

  constructor({
                indentLevel = 0,
                indentStep = DEFAULT_INDENT_LEVEL,
                skipComments
              }: PrintingOptions = {}) {
    this.indentLevel = indentLevel;
    this.indentStep = indentStep;
    this.skipComments = skipComments;
  }

  withIndent(newIndent: number) {
    return new VCLASTPrinter({
      indentStep: this.indentStep,
      indentLevel: newIndent,
      skipComments: this.skipComments
    });
  }

  print = (node?: VCLASTNode): string => {
    const output = this.printInner(node);
    return (_.isArray(output) ? output.join('\n') : output).trim();
  };

  private printInner = (node?: VCLASTNode): string | string[] => {
    if (!node) {
      return [];
    }

    const methodName = `print${_.upperFirst(node.type)}`;
    if (!(methodName in this)) {
      throw new Error(`Implement ${methodName}`);
    }
    return (this[methodName as keyof VCLASTPrinter] as (
      node: VCLASTNode
    ) => string | string[])(node);
  };

  private printStatement = (
    node: Statement,
    shouldNotAddNewLine?: boolean
  ): string[] => {
    const statementLines = this.toArray(this.printInner(node)).map(
      (x) => `${this.indent()}${x}`
    );

    if (this.shouldIncreaseIndentLevelAfterThisStatement) {
      this.indentLevel += this.indentStep;
      this.shouldIncreaseIndentLevelAfterThisStatement = false;
    }

    if (this.shouldDecreaseIndentLevelAfterThisStatement) {
      this.indentLevel -= this.indentStep;
      if (this.indentLevel < 0) {
        throw new Error('Can\'t decrease indent further');
      }
      this.shouldDecreaseIndentLevelAfterThisStatement = false;
    }

    const shouldAddNewLineAfter =
      !shouldNotAddNewLine && NEWLINE_STATEMENTS.includes(node.type);

    const shouldAddNewLineBefore =
      !this.lastStatementHadNewLine &&
      ((!shouldNotAddNewLine && shouldAddNewLineAfter) ||
        NEWLINE_ONLY_BEFORE_STATEMENTS.includes(node.type));

    const leadingComments =
      this.skipComments || node.leadingComments.length === 0
        ? []
        : (!shouldAddNewLineBefore && !this.lastStatementHadNewLine
            ? ['']
            : []
        ).concat(node.leadingComments.map(x=>`${this.indent()}${x}`));

    const trailingComments = this.skipComments ? [] : node.trailingComments;

    const finalOutput = [
      ...(shouldAddNewLineBefore && !this.lastStatementHadNewLine ? [''] : []),
      ...leadingComments,
      statementLines[0] +
      (trailingComments.length === 1 ? ` ${trailingComments[0]}` : ''),
      ...(trailingComments.length > 1
        ? trailingComments
        : trailingComments.slice(1)),
      ...statementLines.slice(1),
      ...(shouldAddNewLineAfter ? [''] : [])
    ];

    this.lastStatementHadNewLine = shouldAddNewLineAfter;
    return finalOutput;
  };

  private indent() {
    return _.repeat(' ', this.indentLevel);
  }

  private printProgram(program: Program) {
    return _.flatten(
      program.statements.map((statement) => this.printStatement(statement))
    );
  }

  private printAssignmentStatement(statement: AssignmentStatement) {
    return `${this.printInner(statement.left)} = ${this.printInner(
      statement.right
    )}`;
  }

  private printVariableDeclaration(variableDeclaration: VariableDeclaration) {
    return `Create ${variableDeclaration.id} variable`;
  }

  private printBitDeclaration(bitDeclaration: BitDeclaration) {
    return `${bitDeclaration.id} bit ${bitDeclaration.init}.${bitDeclaration.index}`;
  }

  private printAliasDeclaration(aliasDeclaration: AliasDeclaration) {
    return `${aliasDeclaration.id} alias ${this.printInner(
      aliasDeclaration.init
    )}`;
  }

  private printEqualsDeclaration(equalsDeclaration: EqualsDeclaration) {
    return `${equalsDeclaration.id} equals ${this.printInner(
      equalsDeclaration.init
    )}`;
  }

  private printConstantDeclaration(constantDeclaration: ConstantDeclaration) {
    return `${constantDeclaration.id} constant ${this.printInner(
      constantDeclaration.init
    )}`;
  }

  private printExpressionStatement(expressionStatement: ExpressionStatement) {
    return this.printInner(expressionStatement.expression);
  }

  private printBlockStatement(blockStatement: BlockStatement) {
    const body = !blockStatement.body?.length
      ? []
      : blockStatement.body.map((statement, index) => {
        return this.withIndent(this.indentStep).printStatement(
          statement,
          index === 0 || blockStatement.body.length === index - 1
        );
      });

    return [`{`, ..._.flatten(body), `}`];
  }

  private printWhileStatement(whileStatement: WhileStatement) {
    return [
      `while(${this.printInner(whileStatement.test)})`,
      ...this.withIndent(0).printStatement(
        whileStatement.body || new BlockStatement([])
      )
    ];
  }

  private printIfStatement(ifStatement: IfStatement) {
    let testClause = `${this.printInner(ifStatement.test)}`;
    if (!(ifStatement.test instanceof LogicalExpression)) {
      testClause = `(${testClause})`;
    }

    const elseClause = !ifStatement.alternate
      ? []
      : [
        `else`,
        ...this.toArray(
          this.withIndent(0).printStatement(ifStatement.alternate)
        )
      ];

    const newVar = [
      `if${testClause}`,
      ...this.toArray(
        this.withIndent(0).printStatement(ifStatement.consequent)
      ),
      ...elseClause
    ];
    return newVar;
  }

  private printIdentifier(identifier: Identifier) {
    return identifier.name;
  }

  private printLiteral(literal: Literal) {
    return literal.raw;
  }

  private printUnaryExpression(unaryExpression: UnaryExpression) {
    return `${unaryExpression.operator || ''}${this.printInner(
      unaryExpression.argument
    )}`;
  }

  private printCallExpression(callExpression: CallExpression) {
    return `${callExpression.callee}(${callExpression.arguments
      .map(this.print)
      .join(', ')})`;
  }

  private printBinaryExpression(binaryExpression: BinaryExpression) {
    return `${this.printInner(binaryExpression.left)} ${
      binaryExpression.operator
    } ${this.printInner(binaryExpression.right)}`;
  }

  private printLogicalExpression(logicalExpression: LogicalExpression) {
    return `(${this.printInner(logicalExpression.left)}) ${
      logicalExpression.operator
    } (${this.printInner(logicalExpression.right)})`;
  }

  private printCallStatement(callExpression: CallStatement) {
    return `call ${this.printInner(callExpression.label)}`;
  }

  private printGoToStatement(gotoStatement: GoToStatement) {
    this.decreaseIndentAfter();
    return `goto ${this.printInner(gotoStatement.label)}`;
  }

  private printLabelStatement(labelStatement: LabelStatement) {
    const output = `${this.printInner(labelStatement.label)}:`;
    this.indentLevel = 0
    this.increaseIndentAfter();
    return output;
  }

  private printReturnStatement(returnStatement: ReturnStatement) {
    this.decreaseIndentAfter();
    return 'Return';
  }

  private increaseIndentAfter() {
    this.shouldIncreaseIndentLevelAfterThisStatement = true;
  }

  private decreaseIndentAfter() {
    this.shouldDecreaseIndentLevelAfterThisStatement = true;
  }

  private toArray(printed: string | string[]) {
    return _.isArray(printed) ? printed : [printed];
  }
}
