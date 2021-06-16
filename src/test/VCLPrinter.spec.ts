import VCLAstPrinter from '../printer/VCLAstPrinter';
import {
  AssignmentStatement, BitDeclaration,
  BlockStatement,
  Identifier,
  Literal,
  Program, VariableDeclaration,
  VCLASTNode,
  WhileStatement,
} from '../ast/VCLAst';
import fs from 'fs/promises';
import {
  assertFilesEquivalent,
  getFullTestVclPath,
  getVCLAST,
} from './utils';

function expectPrinted(ast: VCLASTNode, expected: string) {
  const output = new VCLAstPrinter({ indentStep: 2 }).print(ast);
  expect(output).toEqual(expected);
}

async function assertAstToPrint(testFile: string) {
  const file = await fs.readFile(getFullTestVclPath(testFile));
  const vclAstPrinter = new VCLAstPrinter();
  const ast = getVCLAST(file.toString());
  const output = vclAstPrinter.print(ast);
  await fs.writeFile(getFullTestVclPath(`${testFile}.reprinted`), output);
  assertFilesEquivalent(output, file.toString());
  return output;
}

describe('AST Printing', () => {
  it('basic program', async () => {
    expectPrinted(
      new Program([
        new AssignmentStatement(new Identifier('a'), new Literal('2', 2)),
      ]),
      'a = 2'
    );
  });
  it('while loop', async () => {
    expectPrinted(
      new WhileStatement(
        new Literal('1', 1),
        new BlockStatement([
          new AssignmentStatement(new Identifier('a'), new Literal('2', 2)),
          new AssignmentStatement(new Identifier('c'), new Literal('3', 3)),
        ])
      ),
      `while (1)
{
  a = 2
  c = 3
}`
    );
  });
  it('bit statement', async () => {
    expectPrinted(
      new Program(
        [
          new VariableDeclaration(Identifier.from('incoming_data')),
          new BitDeclaration(Identifier.from('incoming_data_first_byte'),
            Identifier.from('incoming_data'), 15)
        ]),
      `Create incoming_data variable
incoming_data_first_byte bit incoming_data.15`
    );
  });
  it('file1', async () => {
    return assertAstToPrint('BareBones_Ver1');
  });
  it('file2', async () => {
    return assertAstToPrint('module');
  });
  it('whitespace_rules_test_file', async () => {
    expect(
      await assertAstToPrint('whitespace_rules_test_file')
    ).toMatchSnapshot();
  });
});
