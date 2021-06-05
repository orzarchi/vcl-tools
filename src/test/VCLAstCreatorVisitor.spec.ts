import fs from 'fs/promises';
import { parse } from '../parser/VCLParser';
import VCLASTCreatorVisitor from '../ast/VCLAstCreatorVisitor';
import { VCLASTNode } from '../ast/VCLAst';
import { getFullTestVclPath } from './utils';

async function parseAndGetAstContent(fileContent: string) {
  return new VCLASTCreatorVisitor().visit(parse(fileContent).cst) as VCLASTNode;
}

async function parseAndGetAst(testFile: string) {
  const file = await fs.readFile(getFullTestVclPath(testFile));
  return parseAndGetAstContent(file.toString());
}

describe('Create VLC AST', () => {
  it('file1', async () => {
    const ast = await parseAndGetAst('BareBones_Ver1');
    expect(ast).toMatchSnapshot();
  });
  it('bitStatement', async () => {
    const result = await parseAndGetAstContent(`
         Create ControlByte0             variable
          Control1                      bit   ControlByte0.1
          Control2                      bit   ControlByte0.2
          Control3                      bit   ControlByte0.4
          Control4                      bit   ControlByte0.8
          Control5                      bit   ControlByte0.16
          Control6                      bit   ControlByte0.32
          Control7                      bit   ControlByte0.64
          Control8                      bit   ControlByte0.128`);

    expect(result).toMatchSnapshot();
  });
});
