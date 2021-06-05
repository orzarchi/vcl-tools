import VCLASTCreatorVisitor from '../ast/VCLAstCreatorVisitor';
import { parse } from '../parser/VCLParser';
import VCLASTPrinter from '../printer/VCLAstPrinter';
import * as fs from 'fs';
import path from 'path';
import { Program } from '../ast/VCLAst';

export function getVCLAST(vclContents: string) {
  const vclastCreatorVisitor = new VCLASTCreatorVisitor();
  const { cst, lexErrors, parseErrors } = parse(vclContents);

  console.log('lex errors:', JSON.stringify(lexErrors, null, 2));
  expect(lexErrors).toHaveLength(0);
  console.log('parse errors:', JSON.stringify(parseErrors, null, 2));
  expect(parseErrors).toHaveLength(0);
  return vclastCreatorVisitor.visit(cst);
}

export function assertFilesEquivalent(actualVCL: string, expectedVCL: string) {
  const actualAST = getVCLAST(actualVCL);
  const expectedAST = getVCLAST(expectedVCL);
  return expect(actualAST).toEqual(expectedAST);
}

function removeComments(vclContent: string) {
  const ast = getVCLAST(vclContent);
  return new VCLASTPrinter({ skipComments: true }).print(ast);
}

function getAst(filename: string) {
  const vclContent = fs.readFileSync(filename);
  const ast = getVCLAST(vclContent.toString()) as Program;
  return ast.statements;
}

export function getFullTestVclPath(testFile: string) {
  return path.join(__dirname, `./files/${testFile}.vcl`);
}
