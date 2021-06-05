import { CstElement, IToken } from 'chevrotain';

export type CommentToken = IToken & {
  extendedOffset: { startOffset: number; endOffset: number };
};
export type MostEnclosiveCstNodeByOffset = Record<number, CstElement>;
export type CstElementWithComments = CstElement & {
  leadingComments?: CommentToken[];
  trailingComments?: CommentToken[];
};
