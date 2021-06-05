import VCLAstPrinter from './printer/VCLAstPrinter';
import { Program } from './ast/VCLAst';
import VCLASTCreatorVisitor from './ast/VCLAstCreatorVisitor';
import { parse } from './parser/VCLParser';
export { default as VCLASTVisitor } from './ast/VCLAstVisitor';

export const parseVCL = (vclContent: string) => {
  const vclastCreatorVisitor = new VCLASTCreatorVisitor();
  const { cst, lexErrors, parseErrors } = parse(vclContent);
  if (lexErrors.length > 0 || parseErrors.length > 0) {
    console.error(lexErrors, parseErrors)
    throw new Error('Failed to parse');
  }
  return vclastCreatorVisitor.visit(cst) as Program;
};

export const reprintVCL = (vclContent: string) => {
  return new VCLAstPrinter().print(parseVCL(vclContent));
};