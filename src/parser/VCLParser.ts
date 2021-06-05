import { CstNode, CstParser, Lexer } from 'chevrotain';
import * as t from './tokens';
import { MostEnclosiveCstNodeByOffset } from './types';
import { attachComments } from './comments';

const VlcLexer = new Lexer(t.allTokens);

export default class VCLParser extends CstParser {
  mostEnclosiveCstNodeByStartOffset: MostEnclosiveCstNodeByOffset = {};
  mostEnclosiveCstNodeByEndOffset: MostEnclosiveCstNodeByOffset = {};

  constructor() {
    super(t.allTokens, {
      recoveryEnabled: true,
    });

    // very important to call this after all the rules have been setup.
    // otherwise the parser may not work correctly as it will lack information
    // derived from the self analysis.
    this.performSelfAnalysis();
  }

  public program = this.RULE('program', () => {
    this.MANY(() => {
      this.SUBRULE(this.statement);
    });
  });

  private statement = this.RULE('statement', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.labelStatement) },
      { ALT: () => this.SUBRULE(this.ifStatement) },
      { ALT: () => this.SUBRULE(this.whileStatement) },
      { ALT: () => this.SUBRULE(this.blockStatement) },
      { ALT: () => this.SUBRULE(this.returnStatement) },
      { ALT: () => this.SUBRULE(this.gotoStatement) },
      { ALT: () => this.SUBRULE(this.createConstantStatement) },
      { ALT: () => this.SUBRULE(this.createVariableStatement) },
      { ALT: () => this.SUBRULE(this.createAliasStatement) },
      { ALT: () => this.SUBRULE(this.createEqualsStatement) },
      {
        ALT: () => this.SUBRULE(this.assignStatement),
        GATE: () => this.LA(0).tokenType !== t.LParen,
      },
      { ALT: () => this.SUBRULE(this.bitStatement) },
      { ALT: () => this.SUBRULE(this.expressionStatement) },
      { ALT: () => this.SUBRULE(this.callStatement) },
    ]);
  });

  private labelStatement = this.RULE('labelStatement', () => {
    this.CONSUME(t.Identifier);
    this.CONSUME(t.Colon);
  });

  private returnStatement = this.RULE('returnStatement', () => {
    this.CONSUME(t.Return);
  });

  private ifStatement = this.RULE('ifStatement', () => {
    this.CONSUME(t.If);
    this.SUBRULE(this.logicalExpression, { LABEL: 'test' });
    this.SUBRULE(this.blockStatement, { LABEL: 'consequent' });
    this.OPTION(() => {
      this.CONSUME(t.Else);
      this.OR([
        {
          ALT: () => this.SUBRULE2(this.blockStatement, { LABEL: 'alternate' }),
        },
        { ALT: () => this.SUBRULE3(this.ifStatement, { LABEL: 'alternate' }) },
      ]);
    });
  });

  private whileStatement = this.RULE('whileStatement', () => {
    this.CONSUME(t.While);
    this.SUBRULE(this.logicalExpression, { LABEL: 'test' });
    this.SUBRULE(this.blockStatement, { LABEL: 'body' });
  });

  private blockStatement = this.RULE('blockStatement', () => {
    this.OR([
      {
        ALT: () => {
          this.CONSUME(t.LCurly, { LABEL: 'start' });
          this.MANY(() => {
            this.SUBRULE(this.statement, { LABEL: 'body' });
          });
          this.CONSUME(t.RCurly, { LABEL: 'end' });
        },
      },
      {
        ALT: () => {
          this.CONSUME(t.Begin, { LABEL: 'start' });
          this.MANY1(() => {
            this.SUBRULE1(this.statement, { LABEL: 'body' });
          });
          this.CONSUME(t.End, { LABEL: 'end' });
        },
      },
    ]);
  });

  private createVariableStatement = this.RULE('createVariableStatement', () => {
    this.CONSUME(t.Create);
    this.CONSUME(t.Identifier);
    this.CONSUME(t.Variable);
  });

  private createConstantStatement = this.RULE('createConstantStatement', () => {
    this.CONSUME(t.Identifier);
    this.CONSUME(t.Constant);
    this.SUBRULE(this.integerLiteral);
  });

  private createAliasStatement = this.RULE('createAliasStatement', () => {
    this.CONSUME(t.Identifier);
    this.CONSUME(t.Alias);
    this.CONSUME1(t.Identifier);
  });

  private createEqualsStatement = this.RULE('createEqualsStatement', () => {
    this.CONSUME(t.Identifier);
    this.CONSUME(t.AutoEquals);
    this.CONSUME1(t.Identifier);
  });

  private expressionStatement = this.RULE('expressionStatement', () => {
    this.SUBRULE(this.expression, { LABEL: 'expression' });
  });

  private invocationSuffix = this.RULE('invocationSuffix', () => {
    this.CONSUME(t.LParen);
    this.MANY_SEP({
      SEP: t.Comma,
      DEF: () => {
        this.SUBRULE(this.expression, { LABEL: 'arguments' });
      },
    });
    this.CONSUME(t.RParen);
  });

  private callStatement = this.RULE('callStatement', () => {
    this.CONSUME(t.Call);
    this.CONSUME(t.Identifier, { LABEL: 'label' });
  });

  private gotoStatement = this.RULE('gotoStatement', () => {
    this.CONSUME(t.GoTo);
    this.CONSUME(t.Identifier, { LABEL: 'label' });
  });

  private bitStatement = this.RULE('bitStatement', () => {
    this.OPTION(() => this.CONSUME(t.Create));
    this.CONSUME(t.Identifier);
    this.CONSUME(t.Bit);
    this.CONSUME1(t.Identifier);
    this.CONSUME(t.Period);
    this.CONSUME(t.Int);
  });

  private expression = this.RULE('expression', () => {
    this.SUBRULE(this.binaryExpression);
  });

  private binaryExpression = this.RULE('binaryExpression', () => {
    this.SUBRULE(this.unaryExpression);
    this.MANY(() => {
      this.OR([{ ALT: () => this.CONSUME(t.Operator, { LABEL: 'operator' }) }]);
      this.SUBRULE2(this.unaryExpression);
    });
  });

  private unaryExpression = this.RULE('unaryExpression', () => {
    this.MANY(() => {
      this.CONSUME(t.UnaryPrefixOperator, { LABEL: 'operator' });
    });
    this.SUBRULE(this.primary);
  });

  private assignStatement = this.RULE('assignStatement', () => {
    this.CONSUME(t.Identifier);
    this.CONSUME(t.Equals);
    this.SUBRULE(this.expression);
  });

  private integerLiteral = this.RULE('integerLiteral', () => {
    this.OR([
      { ALT: () => this.CONSUME(t.HexadecimalLiteral) },
      { ALT: () => this.CONSUME(t.Int) },
    ]);
  });

  private primary = this.RULE('primary', () => {
    this.OR([
      {
        ALT: () => {
          this.CONSUME(t.Identifier);

          this.OPTION(() => {
            this.SUBRULE(this.invocationSuffix);
          });
        },
      },
      { ALT: () => this.SUBRULE(this.integerLiteral) },
      { ALT: () => this.SUBRULE(this.parenthesisExpression) },
    ]);
  });

  private parenthesisExpression = this.RULE('parenthesisExpression', () => {
    this.CONSUME(t.LParen);
    this.SUBRULE(this.expression, { LABEL: 'expression' });
    this.CONSUME(t.RParen);
  });

  private logicalExpression = this.RULE('logicalExpression', () => {
    this.MANY_SEP({
      SEP: t.LogicalOperator,
      DEF: () => {
        this.SUBRULE1(this.parenthesisExpression);
      },
    });
  });

  private cstPostNonTerminal(ruleCstResult: CstNode, ruleName: string) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    super.cstPostNonTerminal(ruleCstResult, ruleName);
    if (ruleCstResult.location?.startOffset !== undefined) {
      this.mostEnclosiveCstNodeByStartOffset[
        ruleCstResult.location!.startOffset
      ] = ruleCstResult;
    }

    if (ruleCstResult.location?.endOffset !== undefined) {
      this.mostEnclosiveCstNodeByEndOffset[
        ruleCstResult.location!.endOffset!
      ] = ruleCstResult;
    }
  }
}

export function parse(text: string) {
  const parser = new VCLParser();
  const lexResult = VlcLexer.tokenize(text);

  // setting a new input will RESET the parser instance's state.
  parser.input = lexResult.tokens;

  // any top level rule may be used as an entry point
  const cst = parser.program();

  attachComments(
    lexResult.tokens,
    lexResult.groups.comments,
    parser.mostEnclosiveCstNodeByStartOffset,
    parser.mostEnclosiveCstNodeByEndOffset
  );

  return {
    cst: cst,
    lexErrors: lexResult.errors,
    parseErrors: parser.errors,
  };
}
