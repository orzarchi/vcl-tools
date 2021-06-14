import VCLParser from '../parser/VCLParser';
import _ from 'lodash';
import { CstElement, CstNode, IToken } from 'chevrotain';
import {
  AliasDeclaration,
  AssignmentStatement,
  BinaryExpression,
  BitDeclaration,
  BlockStatement,
  CallExpression,
  CallStatement,
  ConstantDeclaration,
  EnterStatement,
  EqualsDeclaration,
  ExitStatement,
  Expression,
  ExpressionStatement,
  GoToStatement,
  Identifier,
  IfStatement,
  IncludeStatement,
  LabelStatement,
  Literal,
  LogicalExpression,
  LogicalOperator, ModuleStatement,
  Operator,
  Program,
  ReturnStatement,
  Statement,
  UnaryExpression,
  VariableDeclaration,
  WhileStatement,
} from './VCLAst';
import { CstElementWithComments } from '../parser/types';

const operatorPrecedenceGroups = [
  '*/',
  '+-',
  '>><<',
  '&|^',
  '==<><=>=><',
  '&&||',
];

const BaseVCLVisitor = new VCLParser().getBaseCstVisitorConstructor();

const identifier = (idToken: IToken | IToken[]): Identifier => {
  const id = 'length' in idToken ? idToken[0] : idToken;

  return new Identifier(id.image);
};

export default class VCLASTCreatorVisitor extends BaseVCLVisitor {
  constructor() {
    super();
    // The "validateVisitor" method is a helper utility which performs static analysis
    // to detect missing or redundant visitor methods
    this.validateVisitor();
  }

  program(ctx: any): Program {
    return new Program(
      _.compact(
        (ctx.statement || []).map((statement: CstNode) => this.visit(statement))
      )
    );
  }

  statement(ctx: any) {
    const blockStatements =
      this.visit(ctx.moduleStatement) ||
      this.visit(ctx.ifStatement) ||
      this.visit(ctx.whileStatement) ||
      this.visit(ctx.blockStatement);

    if (blockStatements) {
      return blockStatements;
    }

    const statement =
      this.visit(ctx.labelStatement) ||
      this.visit(ctx.returnStatement) ||
      this.visit(ctx.gotoStatement) ||
      this.visit(ctx.createConstantStatement) ||
      this.visit(ctx.createVariableStatement) ||
      this.visit(ctx.createAliasStatement) ||
      this.visit(ctx.createEqualsStatement) ||
      this.visit(ctx.bitStatement) ||
      this.visit(ctx.assignStatement) ||
      this.visit(ctx.expressionStatement) ||
      this.visit(ctx.callStatement) ||
      this.visit(ctx.includeStatement) ||
      this.visit(ctx.enterStatement) ||
      this.visit(ctx.exitStatement);

    return VCLASTCreatorVisitor.tryAttachComments(ctx, statement);
  }

  assignStatement(ctx: any): AssignmentStatement {
    return new AssignmentStatement(
      identifier(ctx.Identifier),
      this.visit(ctx.expression)
    );
  }

  integerLiteral(ctx: any): Literal {
    const raw = ctx.Int ? ctx.Int[0].image : ctx.HexadecimalLiteral[0].image;
    return new Literal(raw, parseInt(raw));
  }

  expressionStatement(ctx: any): ExpressionStatement {
    return new ExpressionStatement(this.visit(ctx.expression));
  }

  primary(ctx: any): Expression {
    if (ctx.Identifier) {
      if (ctx.invocationSuffix) {
        return new CallExpression(
          identifier(ctx.Identifier),
          this.visit(ctx.invocationSuffix)
        );
      } else {
        return identifier(ctx.Identifier);
      }
    }

    return (
      this.visit(ctx.integerLiteral) || this.visit(ctx.parenthesisExpression)
    );
  }

  invocationSuffix(ctx: any) {
    return _.compact(ctx.arguments.map((x: CstNode) => this.visit(x)));
  }

  labelStatement(ctx: any): LabelStatement {
    return new LabelStatement(identifier(ctx.Identifier));
  }

  callStatement(ctx: any): CallStatement {
    return new CallStatement(identifier(ctx.label));
  }

  gotoStatement(ctx: any): GoToStatement {
    return new GoToStatement(identifier(ctx.label));
  }

  ifStatement(ctx: any): IfStatement {
    const ifStatement = new IfStatement(
      this.visit(ctx.test),
      this.visit(ctx.consequent),
      this.visit(ctx.alternate)
    );
    VCLASTCreatorVisitor.tryAttachComments([ctx.test, ctx.If], ifStatement);

    return ifStatement;
  }

  unaryExpression(ctx: any): UnaryExpression {
    if (ctx.operator) {
      return new UnaryExpression(
        ctx.operator[0].image,
        this.visit(ctx.primary)
      );
    }
    return this.visit(ctx.primary);
  }

  private static normalizeOperator(operator: IToken): string {
    return operator.image
      .toLowerCase()
      .replace('and', '&&')
      .replace('or', '||')
      .replace('==', '=')
      .replace(/([^<>=])=([^<>=])/, '$1==$2');
  }

  private static isLogicalOperator(operator: string) {
    return ['&&', '||'].includes(operator);
  }

  binaryExpression(ctx: any): BinaryExpression | LogicalExpression {
    const recurseBinaryExpression = (
      terms: CstNode[],
      operators: string[]
    ): BinaryExpression | LogicalExpression => {
      if (terms.length === 1) {
        return this.visit(terms);
      }

      const operatorPrecedenceRanks = operators.map((op) =>
        operatorPrecedenceGroups.findIndex((group) => group.includes(op))
      );

      const lowestRank = _.min(operatorPrecedenceRanks)!;
      const rightmostLowestRank =
        operatorPrecedenceRanks.lastIndexOf(lowestRank);
      const splitPointOperator = operators[rightmostLowestRank];
      const leftExpression = recurseBinaryExpression(
        terms.slice(0, rightmostLowestRank + 1),
        operators.slice(0, rightmostLowestRank)
      );

      const rightExpression = recurseBinaryExpression(
        terms.slice(rightmostLowestRank + 1, terms.length),
        operators.slice(rightmostLowestRank + 1, operators.length)
      );

      if (VCLASTCreatorVisitor.isLogicalOperator(splitPointOperator)) {
        return new LogicalExpression(
          splitPointOperator as LogicalOperator,
          leftExpression,
          rightExpression
        );
      }

      return new BinaryExpression(
        splitPointOperator as Operator,
        leftExpression,
        rightExpression
      );
    };

    return recurseBinaryExpression(
      ctx.unaryExpression,
      (ctx.operator || []).map(VCLASTCreatorVisitor.normalizeOperator)
    );
  }

  parenthesisExpression(ctx: any): Expression {
    return this.visit(ctx.expression);
  }

  returnStatement(ctx: any): ReturnStatement {
    return new ReturnStatement();
  }

  enterStatement(ctx: any): EnterStatement {
    return new EnterStatement(identifier(ctx.label));
  }

  exitStatement(ctx: any): ExitStatement {
    return new ExitStatement();
  }

  moduleStatement(ctx: any): ModuleStatement {
    return new ModuleStatement(identifier(ctx.label), ctx.body ? _.compact(ctx.body.map((x: CstNode) => this.visit(x))) : []);
  }

  whileStatement(ctx: any): WhileStatement {
    return VCLASTCreatorVisitor.tryAttachComments(
      [ctx.test, ctx.While],
      new WhileStatement(this.visit(ctx.test), this.visit(ctx.body))
    );
  }

  blockStatement(ctx: any) {
    // TODO: Handle comments on closing brace
    return VCLASTCreatorVisitor.tryAttachComments(
      ctx.start[0],
      new BlockStatement(
        ctx.body ? _.compact(ctx.body.map((x: CstNode) => this.visit(x))) : []
      )
    );
  }

  createVariableStatement(ctx: any): VariableDeclaration {
    return new VariableDeclaration(identifier(ctx.Identifier));
  }

  createConstantStatement(ctx: any): ConstantDeclaration {
    return new ConstantDeclaration(
      identifier(ctx.Identifier),
      this.visit(ctx.integerLiteral)
    );
  }

  createAliasStatement(ctx: any): AliasDeclaration {
    return new AliasDeclaration(
      identifier(ctx.Identifier[0]),
      identifier(ctx.Identifier[1])
    );
  }

  createEqualsStatement(ctx: any): EqualsDeclaration {
    return new EqualsDeclaration(
      identifier(ctx.Identifier[0]),
      identifier(ctx.Identifier[1])
    );
  }

  bitStatement(ctx: any): BitDeclaration {
    return new BitDeclaration(
      identifier(ctx.Identifier[0]),
      identifier(ctx.Identifier[1]),
      parseInt(ctx.Int[0].image)
    );
  }

  includeStatement(ctx: any): IncludeStatement {
    const path = Literal.fromString(ctx.StringLiteral[0].image);
    return new IncludeStatement(path);
  }

  private static tryAttachComments<T extends Statement>(
    ctx: any,
    statement: T
  ): T {
    const recurseForNodes = (node: CstElement | CstElement[]) => {
      if (_.isArray(node)) {
        (node as CstElement[]).map(recurseForNodes);
        return;
      }
      if ('leadingComments' in node || 'trailingComments' in node) {
        const leadingComments = (node as CstElementWithComments)
          .leadingComments;
        const trailingComments = (node as CstElementWithComments)
          .trailingComments;
        if (leadingComments) {
          statement.leadingComments.push(
            ...(leadingComments?.map((x) => x.image.trimEnd()) || [])
          );
        }
        if (trailingComments) {
          statement.trailingComments.push(
            ...(trailingComments?.map((x) => x.image.trimEnd()) || [])
          );
        }
        return;
      }
      if ('children' in node) {
        _.flatten(Object.values(node.children)).forEach((x) =>
          recurseForNodes(x!)
        );
      } else if (!(node as IToken).tokenType) {
        _.flatten(Object.values(node)).forEach((x) => recurseForNodes(x));
      }
    };

    recurseForNodes(ctx);

    return statement;
  }
}
