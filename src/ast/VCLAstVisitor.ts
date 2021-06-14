import {
  AliasDeclaration,
  AssignmentStatement,
  BinaryExpression,
  BitDeclaration,
  BlockStatement,
  CallExpression,
  CallStatement,
  ConstantDeclaration, EnterStatement,
  EqualsDeclaration, ExitStatement,
  ExpressionStatement,
  GoToStatement,
  Identifier,
  IfStatement, IncludeStatement,
  LabelStatement,
  Literal,
  LogicalExpression, ModuleStatement,
  Program,
  ReturnStatement,
  UnaryExpression,
  VariableDeclaration,
  VCLASTNode,
  WhileStatement,
} from './VCLAst';
import _ from 'lodash';

export default class VCLASTVisitor {
  public visit = (node?: VCLASTNode) => {
    if (!node) {
      return;
    }
    const methodName = `visit${_.upperFirst(node.type)}`;
    if (!(methodName in this)) {
      throw new Error(`Implement ${methodName}`);
    }

    ((this[methodName as keyof VCLASTVisitor] as unknown) as (
      node: VCLASTNode
    ) => void)(node);
  };

  public visitMany = (nodes?: VCLASTNode[]) => {
    if (!nodes) {
      return;
    }

    nodes.forEach(this.visit);
  };

  protected visitProgram(node: Program) {
    this.visitMany(node.statements);
  }

  protected visitIdentifier(node: Identifier) {}

  protected visitAssignmentStatement(node: AssignmentStatement) {
    this.visit(node.left);
    this.visit(node.right);
  }

  protected visitLiteral(node: Literal) {}

  protected visitExpressionStatement(node: ExpressionStatement) {
    this.visit(node.expression);
  }

  protected visitCallExpression(node: CallExpression) {
    this.visit(node.callee);
    this.visitMany(node.arguments);
  }

  protected visitLabelStatement(node: LabelStatement) {
    this.visit(node.label);
  }

  protected visitCallStatement(node: CallStatement) {
    this.visit(node.label);
  }

  protected visitEnterStatement(node: EnterStatement) {
    this.visit(node.label);
  }

  protected visitGoToStatement(node: GoToStatement) {
    this.visit(node.label);
  }

  protected visitIfStatement(node: IfStatement) {
    this.visit(node.test);
    this.visit(node.consequent);
    this.visit(node.alternate);
  }

  protected visitUnaryExpression(node: UnaryExpression) {
    this.visit(node.argument);
  }

  protected visitBinaryExpression(node: BinaryExpression) {
    this.visit(node.left);
    this.visit(node.right);
  }

  protected visitLogicalExpression(node: LogicalExpression) {
    this.visit(node.left);
    this.visit(node.right);
  }

  protected visitReturnStatement(node: ReturnStatement) {}

  protected visitExitStatement(node: ExitStatement) {}

  protected visitWhileStatement(node: WhileStatement) {
    this.visit(node.test);
    this.visit(node.body);
  }

  protected visitBlockStatement(node: BlockStatement) {
    this.visitMany(node.body);
  }

  protected visitModuleStatement(node: ModuleStatement) {
    this.visit(node.moduleName);
    this.visitMany(node.body);
  }

  protected visitVariableDeclaration(node: VariableDeclaration) {
    this.visit(node.id);
  }

  protected visitConstantDeclaration(node: ConstantDeclaration) {
    this.visit(node.id);
    this.visit(node.init);
  }

  protected visitAliasDeclaration(node: AliasDeclaration) {
    this.visit(node.id);
    this.visit(node.init);
  }

  protected visitEqualsDeclaration(node: EqualsDeclaration) {
    this.visit(node.id);
    this.visit(node.init);
  }

  protected visitBitDeclaration(node: BitDeclaration) {
    this.visit(node.id);
    this.visit(node.init);
  }

  protected visitIncludeStatement(node: IncludeStatement) {
    this.visit(node.path);
  }
}
