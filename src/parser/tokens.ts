import {
  createToken as innerCreateToken,
  ITokenConfig,
  Lexer,
} from 'chevrotain';

export const allTokens: ITokenConfig[] = [];

export const Identifier = innerCreateToken({
  name: 'Identifier',
  pattern: /(\d*[a-zA-Z_]\d*)+|[a-zA-Z]\w*/,
});

// Utility to avoid manually building the allTokens array
function createToken(options: ITokenConfig) {
  const newToken = innerCreateToken(options);
  allTokens.push(newToken);
  return newToken;
}

function createKeywordLikeToken(options: ITokenConfig) {
  // A keyword 'like' token uses the "longer_alt" config option
  // to resolve ambiguities, see: http://sap.github.io/chevrotain/docs/features/token_alternative_matches.html
  return createToken({ ...options, longer_alt: Identifier });
}

export const Comment = createToken({
  name: 'Comment',
  pattern: /;.*/,
  group: 'comments',
});

export const Operator = createToken({
  name: 'Operator',
  pattern: Lexer.NA,
});

export const UnaryPrefixOperator = createToken({
  name: 'UnaryPrefixOperator',
  pattern: Lexer.NA,
});

export const LogicalOperator = createToken({
  name: 'LogicalOperator',
  pattern: Lexer.NA,
});

export const Colon = createToken({ name: 'Colon', pattern: /:/ });
export const Comma = createToken({ name: 'Comma', pattern: /,/ });
export const Bit = createKeywordLikeToken({ name: 'Bit', pattern: /bit/ });
export const Period = createToken({ name: 'Period', pattern: /\./ });
export const If = createKeywordLikeToken({ name: 'If', pattern: /[Ii]f/ });
export const Else = createKeywordLikeToken({ name: 'Else', pattern: /else/ });
export const While = createKeywordLikeToken({
  name: 'While',
  pattern: /while/,
});
export const Begin = createKeywordLikeToken({
  name: 'Begin',
  pattern: /begin/,
});
export const End = createKeywordLikeToken({ name: 'End', pattern: /end/ });
export const Return = createKeywordLikeToken({
  name: 'Return',
  pattern: /Return/,
});
export const LCurly = createToken({ name: 'LCurly', pattern: /{/ });
export const RCurly = createToken({ name: 'RCurly', pattern: /}/ });
export const LParen = createToken({ name: 'LParen', pattern: /\(/ });
export const RParen = createToken({ name: 'RParen', pattern: /\)/ });
export const Equals = createToken({
  name: 'Equals',
  pattern: /=/,
  categories: [Operator],
});
export const NotEquals = createToken({
  name: 'NotEquals',
  pattern: /<>/,
  categories: [Operator],
});
export const GreaterThanEqual = createToken({
  name: 'GreaterThanEqual',
  pattern: />=/,
  categories: [Operator],
});
export const LessThanEqual = createToken({
  name: 'LessThanEqual',
  pattern: /<=/,
  categories: [Operator],
});
export const GreaterThan = createToken({
  name: 'GreaterThan',
  pattern: />/,
  categories: [Operator],
});
export const LessThan = createToken({
  name: 'LessThan',
  pattern: /</,
  categories: [Operator],
});
export const Plus = createToken({
  name: 'Plus',
  pattern: /\+/,
  categories: [Operator, UnaryPrefixOperator],
});
export const Minus = createToken({
  name: 'Minus',
  pattern: /-/,
  categories: [Operator, UnaryPrefixOperator],
});
export const And = createKeywordLikeToken({
  name: 'And',
  pattern: /and/,
  categories: [LogicalOperator],
});
export const Call = createKeywordLikeToken({ name: 'Call', pattern: /call/ });
export const GoTo = createKeywordLikeToken({ name: 'GoTo', pattern: /goto/ });
export const Alias = createKeywordLikeToken({
  name: 'Alias',
  pattern: /alias/,
});
export const Variable = createKeywordLikeToken({
  name: 'Variable',
  pattern: /[vV]ariable/,
});
export const Constant = createKeywordLikeToken({
  name: 'Constant',
  pattern: /[Cc]onstant/,
});
export const Create = createKeywordLikeToken({
  name: 'Create',
  pattern: /[Cc]reate/,
});
export const AutoEquals = createKeywordLikeToken({
  name: 'AutoEquals',
  pattern: /[Ee]quals/,
});

export const HexadecimalLiteral = createToken({
  name: 'HexadecimalLiteral',
  pattern: /0x[0-9A-F]+/,
});

// Identifier must appear after all keywords
allTokens.push(Identifier);

export const Int = createKeywordLikeToken({ name: 'Int', pattern: /[0-9]+/ });
export const WhiteSpace = createToken({
  name: 'WhiteSpace',
  pattern: /\s+/,
  group: Lexer.SKIPPED,
});
