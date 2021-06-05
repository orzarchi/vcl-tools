// inspired by https://github.com/jhipster/prettier-java/blob/master/packages/java-parser/src/comments.js

import { CstElement, IToken } from 'chevrotain';
import {
  CommentToken,
  CstElementWithComments,
  MostEnclosiveCstNodeByOffset,
} from './types';

/**
 * Search where is the position of the comment in the token array by
 * using dichotomic search.
 * @param {*} tokens ordered array of tokens
 * @param {*} comment comment token
 * @return the position of the token next to the comment
 */
function findUpperBoundToken(tokens: IToken[], comment: CommentToken) {
  let diff;
  let i;
  let current;

  let len = tokens.length;
  i = 0;

  while (len) {
    diff = len >>> 1;
    current = i + diff;
    if (tokens[current].startOffset > comment.startOffset) {
      len = diff;
    } else {
      i = current + 1;
      len -= diff + 1;
    }
  }
  return i;
}

/**
 * Pre-processing of tokens in order to
 * complete the parser's mostEnclosiveCstNodeByStartOffset and mostEnclosiveCstNodeByEndOffset structures.
 */
function completeMostEnclosiveCSTNodeByOffset(
  tokens: IToken[],
  mostEnclosiveCstNodeByStartOffset: MostEnclosiveCstNodeByOffset,
  mostEnclosiveCstNodeByEndOffset: MostEnclosiveCstNodeByOffset
) {
  tokens.forEach((token) => {
    if (mostEnclosiveCstNodeByStartOffset[token.startOffset] === undefined) {
      mostEnclosiveCstNodeByStartOffset[token.startOffset] = token;
    }

    if (mostEnclosiveCstNodeByEndOffset[token.endOffset!] === undefined) {
      mostEnclosiveCstNodeByEndOffset[token.endOffset!] = token;
    }
  });
}

function extendRangeOffset(comments: CommentToken[], tokens: IToken[]) {
  let position;
  comments.forEach((comment) => {
    position = findUpperBoundToken(tokens, comment);

    const extendedStartOffset =
      position - 1 < 0 ? comment.startOffset! : tokens[position - 1].endOffset!;

    const extendedEndOffset =
      position == tokens.length
        ? comment.endOffset!
        : tokens[position].startOffset!;

    comment.extendedOffset = {
      startOffset: extendedStartOffset,
      endOffset: extendedEndOffset,
    };
  });
}

/**
 * Create two data structures we use to know at which offset a comment can be attached.
 * - commentsByExtendedStartOffset: map a comment by the endOffset of the previous token.
 * - commentsByExtendedEndOffset: map a comment by the startOffset of the next token
 *
 */
function mapCommentsByExtendedRange(comments: CommentToken[]) {
  const commentsByExtendedEndOffset: Record<number, CommentToken[]> = {};
  const commentsByExtendedStartOffset: Record<number, CommentToken[]> = {};

  comments.forEach((comment) => {
    const extendedStartOffset = comment.extendedOffset!.startOffset!;
    const extendedEndOffset = comment.extendedOffset!.endOffset!;

    if (commentsByExtendedEndOffset[extendedEndOffset] === undefined) {
      commentsByExtendedEndOffset[extendedEndOffset] = [comment];
    } else {
      commentsByExtendedEndOffset[extendedEndOffset].push(comment);
    }

    if (commentsByExtendedStartOffset[extendedStartOffset] === undefined) {
      commentsByExtendedStartOffset[extendedStartOffset] = [comment];
    } else {
      commentsByExtendedStartOffset[extendedStartOffset].push(comment);
    }
  });

  return { commentsByExtendedEndOffset, commentsByExtendedStartOffset };
}

/**
 * Determine if a comment should be attached as a trailing comment to a specific node.
 * A comment should be trailing if it is on the same line than the previous token and
 * not on the same line than the next token
 *
 */
function shouldAttachTrailingComments(
  comment: CommentToken,
  node: CstElement,
  mostEnclosiveCstNodeByStartOffset: MostEnclosiveCstNodeByOffset
) {
  const nextNode =
    mostEnclosiveCstNodeByStartOffset[comment.extendedOffset.endOffset];

  // Last node of the file
  if (nextNode === undefined) {
    return true;
  }

  const nodeEndLine =
    'location' in node && node.location
      ? node.location.endLine
      : (node as IToken).endLine;

  if (comment.startLine !== nodeEndLine) {
    return false;
  }

  const nextNodeStartLine =
    'location' in nextNode && nextNode.location
      ? nextNode.location.startLine
      : (nextNode as IToken).startLine;
  return comment.endLine !== nextNodeStartLine;
}

/**
 * Attach comments to the most enclosive CSTNode (node or token)
 *
 */
export function attachComments(
  tokens: IToken[],
  comments: IToken[],
  mostEnclosiveCstNodeByStartOffset: MostEnclosiveCstNodeByOffset,
  mostEnclosiveCstNodeByEndOffset: MostEnclosiveCstNodeByOffset
) {
  // Edge case: only comments in the file
  if (tokens.length === 0) {
    // (mostEnclosiveCstNodeByStartOffset[
    //   NaN
    // ] as CstElementWithComments).leadingComments = comments as CommentToken[];
    return;
  }

  // Pre-processing phase to complete the data structures we need to attach
  // a comment to the right place
  completeMostEnclosiveCSTNodeByOffset(
    tokens,
    mostEnclosiveCstNodeByStartOffset,
    mostEnclosiveCstNodeByEndOffset
  );

  extendRangeOffset(comments as CommentToken[], tokens);

  const {
    commentsByExtendedStartOffset,
    commentsByExtendedEndOffset,
  } = mapCommentsByExtendedRange(comments as CommentToken[]);

  /*
    This set is here to ensure that we attach comments only once
    If a comment is attached to a node or token, we remove it from this set
  */
  const commentsToAttach = new Set(comments);

  // Attach comments as trailing comments if desirable
  Object.keys(mostEnclosiveCstNodeByEndOffset).forEach((endOffsetString) => {
    const endOffset = parseInt(endOffsetString);
    // We look if some comments is directly following this node/token
    if (commentsByExtendedStartOffset[endOffset]) {
      const nodeTrailingComments = commentsByExtendedStartOffset[
        endOffset
      ].filter((comment) => {
        return (
          shouldAttachTrailingComments(
            comment,
            mostEnclosiveCstNodeByEndOffset[endOffset],
            mostEnclosiveCstNodeByStartOffset
          ) && commentsToAttach.has(comment)
        );
      });

      if (nodeTrailingComments.length > 0) {
        (mostEnclosiveCstNodeByEndOffset[
          endOffset
        ] as CstElementWithComments).trailingComments = nodeTrailingComments;
      }

      nodeTrailingComments.forEach((comment) => {
        commentsToAttach.delete(comment);
      });
    }
  });

  // Attach rest of comments as leading comments
  Object.keys(mostEnclosiveCstNodeByStartOffset).forEach(
    (startOffsetString) => {
      const startOffset = parseInt(startOffsetString);
      // We look if some comments is directly preceding this node/token
      if (commentsByExtendedEndOffset[startOffset]) {
        const nodeLeadingComments = commentsByExtendedEndOffset[
          startOffset
        ].filter((comment) => commentsToAttach.has(comment));

        if (nodeLeadingComments.length > 0) {
          (mostEnclosiveCstNodeByStartOffset[
            startOffset
          ] as CstElementWithComments).leadingComments = nodeLeadingComments;
        }
      }
    }
  );
}
