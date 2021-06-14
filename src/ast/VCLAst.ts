import _ from 'lodash';

export type Operator =
  | '+'
  | '-'
  | '*'
  | '/'
  | '%'
  | '&'
  | '|'
  | '^'
  | '~'
  | '<<'
  | '>>'
  | '<'
  | '>'
  | '=='
  | '<>'
  | '>='
  | '<=';

export type LogicalOperator = '&&' | '||';

export interface VCLASTNode {
  type: string;
}

export abstract class Statement implements VCLASTNode {
  abstract type: string;
  leadingComments: string[] = [];
  trailingComments: string[] = [];

  equals(other: Statement) {
    return this.type === other.type && this.innerEquals(other);
  }

  protected abstract innerEquals(other: Statement): boolean;
}

export abstract class Expression implements VCLASTNode {
  abstract type: string;

  equals(other: Expression) {
    return this.type === other.type && this.innerEquals(other);
  }

  protected abstract innerEquals(other: Expression): boolean;
}

export class Program implements VCLASTNode {
  static readonly nodeType = 'Program';
  type = 'Program';

  constructor(public statements: Statement[]) {}
}

// Statements

export class ExpressionStatement extends Statement {
  static readonly nodeType = 'ExpressionStatement';
  type = 'ExpressionStatement';

  constructor(public expression: Expression) {
    super();
  }

  protected innerEquals(other: ExpressionStatement): boolean {
    return this.expression.equals(other.expression);
  }
}

export class BlockStatement extends Statement {
  static readonly nodeType = 'BlockStatement';
  type = 'BlockStatement';

  constructor(public body: Statement[]) {
    super();
  }

  protected innerEquals(other: BlockStatement): boolean {
    return (
      this.body.length === other.body.length &&
      _.zip(this.body, other.body).every(([statement1, statement2]) =>
        statement1!.equals(statement2!)
      )
    );
  }
}

export class AssignmentStatement extends Statement {
  static readonly nodeType = 'AssignmentStatement';
  type = 'AssignmentStatement';

  constructor(public left: Identifier, public right: Expression) {
    super();
  }

  protected innerEquals(other: AssignmentStatement): boolean {
    return this.left.equals(other.left) && this.right.equals(other.right);
  }
}

export class LabelStatement extends Statement {
  static readonly nodeType = 'LabelStatement';
  type = 'LabelStatement';

  constructor(public label: Identifier) {
    super();
  }

  protected innerEquals(other: LabelStatement): boolean {
    return this.label.equals(other.label);
  }
}

export class CallStatement extends Statement {
  static readonly nodeType = 'CallStatement';
  type = 'CallStatement';

  constructor(public label: Identifier) {
    super();
  }

  protected innerEquals(other: CallStatement): boolean {
    return this.label.equals(other.label);
  }
}

export class EnterStatement extends Statement {
  static readonly nodeType = 'EnterStatement';
  type = 'EnterStatement';

  constructor(public label: Identifier) {
    super();
  }

  protected innerEquals(other: EnterStatement): boolean {
    return this.label.equals(other.label);
  }
}

export class GoToStatement extends Statement {
  static readonly nodeType = 'GoToStatement';
  type = 'GoToStatement';

  constructor(public label: Identifier) {
    super();
  }

  protected innerEquals(other: GoToStatement): boolean {
    return this.label.equals(other.label);
  }
}

export class IfStatement extends Statement {
  static readonly nodeType = 'IfStatement';
  type = 'IfStatement';

  constructor(
    public test: Expression,
    public consequent: BlockStatement,
    public alternate?: BlockStatement
  ) {
    super();
  }

  protected innerEquals(other: IfStatement): boolean {
    return (
      this.test.equals(other.test) &&
      this.consequent.equals(other.consequent) &&
      (this.alternate == other.alternate ||
        this.alternate!.equals(other.alternate!))
    );
  }
}

export class WhileStatement extends Statement {
  static readonly nodeType = 'WhileStatement';
  type = 'WhileStatement';

  constructor(public test: Expression, public body?: BlockStatement) {
    super();
  }

  protected innerEquals(other: WhileStatement): boolean {
    return (
      this.test.equals(other.test) &&
      (this.body == other.body || this.body!.equals(other.body!))
    );
  }
}

export class ReturnStatement extends Statement {
  static readonly nodeType = 'ReturnStatement';
  type = 'ReturnStatement';

  protected innerEquals(other: ReturnStatement): boolean {
    return true;
  }
}

export class ExitStatement extends Statement {
  static readonly nodeType = 'ExitStatement';
  type = 'ExitStatement';

  protected innerEquals(other: ExitStatement): boolean {
    return true;
  }
}

export class VariableDeclaration extends Statement {
  static readonly nodeType = 'VariableDeclaration';
  type = 'VariableDeclaration';

  constructor(public id: Identifier) {
    super();
  }

  protected innerEquals(other: VariableDeclaration): boolean {
    return this.id.equals(other.id);
  }
}

export class ConstantDeclaration extends Statement {
  static readonly nodeType = 'ConstantDeclaration';
  type = 'ConstantDeclaration';

  constructor(public id: Identifier, public init: Expression) {
    super();
  }

  protected innerEquals(other: ConstantDeclaration): boolean {
    return this.id.equals(other.id) && this.init.equals(other.init);
  }
}

export class AliasDeclaration extends Statement {
  static readonly nodeType = 'AliasDeclaration';
  type = 'AliasDeclaration';

  constructor(public id: Identifier, public init: Expression) {
    super();
  }

  protected innerEquals(other: AliasDeclaration): boolean {
    return this.id.equals(other.id) && this.init.equals(other.init);
  }
}

export class EqualsDeclaration extends Statement {
  static readonly nodeType = 'EqualsDeclaration';
  type = 'EqualsDeclaration';

  constructor(public id: Identifier, public init: Expression) {
    super();
  }

  protected innerEquals(other: EqualsDeclaration): boolean {
    return this.id.equals(other.id) && this.init.equals(other.init);
  }
}

export class BitDeclaration extends Statement {
  static readonly nodeType = 'BitDeclaration';
  type = 'BitDeclaration';

  constructor(
    public id: Identifier,
    public init: Identifier,
    public index: number
  ) {
    super();
  }

  protected innerEquals(other: BitDeclaration): boolean {
    return (
      this.id.equals(other.id) &&
      this.init.equals(other.init) &&
      this.index == other.index
    );
  }
}

export class IncludeStatement extends Statement {
  static readonly nodeType = 'IncludeStatement';
  type = 'IncludeStatement';

  constructor(public path: Literal) {
    super();
  }

  protected innerEquals(other: IncludeStatement): boolean {
    return this.path.equals(other.path);
  }
}

export class ModuleStatement extends Statement {
  static readonly nodeType = 'ModuleStatement';
  type = 'ModuleStatement';

  constructor(public moduleName: Identifier, public body:Statement[]) {
    super();
  }

  protected innerEquals(other: ModuleStatement): boolean {
    return (
      this.body.length === other.body.length &&
      _.zip(this.body, other.body).every(([statement1, statement2]) =>
        statement1!.equals(statement2!)
      )
    );
  }
}

// Expressions

export class Identifier extends Expression {
  static readonly nodeType = 'Identifier';
  type = 'Identifier';

  constructor(public name: string) {
    super();
  }

  protected innerEquals(other: Identifier): boolean {
    return this.name === other.name;
  }

  static from(str: string) {
    if (!str) {
      throw new Error('Invalid identifier name');
    }
    return new Identifier(str);
  }

  toString() {
    return this.name;
  }
}

export class Literal extends Expression {
  static readonly nodeType = 'Literal';
  type = 'Literal';

  constructor(public raw: string, public value: string | number) {
    super();
  }

  static fromNumber(number: number) {
    return new Literal(number.toString(), number);
  }

  static fromHex(hexString: string) {
    return new Literal(hexString, parseInt(hexString, 16));
  }

  static fromString(quotedString: string) {
    return new Literal(quotedString, quotedString.slice(1, -1));
  }

  static guess(literal: string) {
    return literal.includes('0x')
      ? Literal.fromHex(literal)
      : literal.includes('"')
      ? Literal.fromString(literal)
      : Literal.fromNumber(parseInt(literal));
  }

  protected innerEquals(other: Literal): boolean {
    return this.raw === other.raw && this.value === other.value;
  }
}

export class CallExpression extends Expression {
  static readonly nodeType = 'CallExpression';
  type = 'CallExpression';
  public arguments: Expression[];

  constructor(public callee: Identifier, args: Expression[]) {
    super();
    this.arguments = args;
  }

  protected innerEquals(other: CallExpression): boolean {
    return (
      this.arguments.length === other.arguments.length &&
      this.arguments.every((arg, index) => arg.equals(other.arguments[index]))
    );
  }
}

export class BinaryExpression extends Expression {
  static readonly nodeType = 'BinaryExpression';
  type = 'BinaryExpression';

  constructor(
    public operator: Operator,
    public left: Expression,
    public right: Expression
  ) {
    super();
  }

  protected innerEquals(other: BinaryExpression): boolean {
    return (
      this.operator === other.operator &&
      this.left.equals(other.left) &&
      this.right.equals(other.right)
    );
  }
}

export class UnaryExpression extends Expression {
  static readonly nodeType = 'UnaryExpression';
  type = 'UnaryExpression';

  constructor(public operator: Operator, public argument: Expression) {
    super();
  }

  protected innerEquals(other: UnaryExpression): boolean {
    return (
      this.operator === other.operator && this.argument.equals(other.argument)
    );
  }
}

export class LogicalExpression extends Expression {
  static readonly nodeType = 'LogicalExpression';
  type = 'LogicalExpression';

  constructor(
    public operator: LogicalOperator,
    public left: Expression,
    public right: Expression
  ) {
    super();
  }

  protected innerEquals(other: LogicalExpression): boolean {
    return (
      this.operator === other.operator &&
      this.left.equals(other.left) &&
      this.right.equals(other.right)
    );
  }
}
