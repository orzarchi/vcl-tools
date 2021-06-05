import {
  AssignmentStatement,
  BlockStatement,
  Identifier,
  Literal,
  Program,
  VCLASTNode,
  WhileStatement,
} from '../ast/VCLAst';
import fs from 'fs/promises';
import { getFullTestVclPath, getVCLAST } from './utils';
import VCLASTVisitor from '../ast/VCLAstVisitor';

function visit(ast: VCLASTNode) {
  new VCLASTVisitor().visit(ast);
}

async function visitFile(testFile: string) {
  const file = await fs.readFile(getFullTestVclPath(testFile));
  visit(getVCLAST(file.toString()));
}

describe('AST Printing', () => {
  it('basic program', async () => {
    visit(
      new Program([
        new AssignmentStatement(new Identifier('a'), new Literal('2', 2)),
      ])
    );
  });
  it('while loop', async () => {
    visit(
      new WhileStatement(
        new Literal('1', 1),
        new BlockStatement([
          new AssignmentStatement(new Identifier('a'), new Literal('2', 2)),
          new AssignmentStatement(new Identifier('c'), new Literal('3', 3)),
        ])
      )
    );
  });
  it('file1', async () => {
    return visitFile('BareBones_Ver1');
  });
});
