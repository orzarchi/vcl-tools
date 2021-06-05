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
  ConstantDeclaration,
  EqualsDeclaration,
  Expression,
  ExpressionStatement,
  CallStatement,
  Identifier,
  IfStatement,
  LabelStatement,
  Literal,
  LogicalExpression,
  Program,
  ReturnStatement,
  UnaryExpression,
  VariableDeclaration,
  WhileStatement,
  GoToStatement,
  Operator,
  Statement,
  LogicalOperator,
} from './VCLAst';
import { CstElementWithComments } from '../parser/types';

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
      this.visit(ctx.callStatement);

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

  expression(ctx: any): Expression {
    return this.visit(ctx.binaryExpression);
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

  binaryExpression(ctx: any): BinaryExpression {
    const recurseBinaryExpression = (
      terms: unknown[],
      operators: IToken[]
    ): BinaryExpression => {
      if (terms.length === 1) {
        return this.visit(ctx.unaryExpression);
      }
      return new BinaryExpression(
        _.last(operators)!.image as Operator,
        recurseBinaryExpression(
          ctx.unaryExpression.slice(0, -1),
          operators.slice(0, -1)
        ),
        this.visit(_.last(ctx.unaryExpression) as CstNode)
      );
    };

    return recurseBinaryExpression(ctx.unaryExpression, ctx.operator || []);
  }

  logicalExpression(ctx: any): LogicalExpression {
    const recurseLogicalExpression = (
      terms: unknown[],
      operators: IToken[]
    ): LogicalExpression => {
      if (terms.length === 1) {
        return this.visit(ctx.parenthesisExpression);
      }
      return new LogicalExpression(
        _.last(operators)!.image as LogicalOperator,
        recurseLogicalExpression(
          ctx.parenthesisExpression.slice(0, -1),
          operators.slice(0, -1)
        ),
        this.visit(_.last(ctx.parenthesisExpression) as CstNode)
      );
    };

    return recurseLogicalExpression(
      ctx.parenthesisExpression,
      ctx.LogicalOperator || []
    );
  }

  parenthesisExpression(ctx: any): Expression {
    return this.visit(ctx.expression);
  }

  returnStatement(ctx: any): ReturnStatement {
    return new ReturnStatement();
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

  private static tryAttachComments<T extends Statement>(ctx: any, statement: T): T {
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
          statement.leadingComments.push(...
            leadingComments?.map((x) => x.image.trimEnd()) || []);
        }
        if (trailingComments) {
          statement.trailingComments.push(...
            trailingComments?.map((x) => x.image.trimEnd()) || []);
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
