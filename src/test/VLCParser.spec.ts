import * as fs from 'fs/promises';
import { parse } from '../parser/VCLParser';
import { getFullTestVclPath } from './utils';

async function parseAndAssertContent(content: string) {
  const lexAndParseResult = parse(content);
  console.log(
    'lex errors:',
    JSON.stringify(lexAndParseResult.lexErrors, null, 2)
  );
  expect(lexAndParseResult.lexErrors).toHaveLength(0);
  console.log(
    'parse errors:',
    JSON.stringify(lexAndParseResult.parseErrors, null, 2)
  );
  expect(lexAndParseResult.parseErrors).toHaveLength(0);
  return lexAndParseResult;
}

async function parseAndAssert(testFile: string) {
  const file = await fs.readFile(getFullTestVclPath(testFile));
  return parseAndAssertContent(file.toString());
}

describe('The VLC Grammar', () => {
  it('file1', async () => {
    await parseAndAssert('BareBones_Ver1');
  });
  it('file2', async () => {
    await parseAndAssert('module');
  });
  it('file3', async () => {
    await parseAndAssert('logical_expresssions');
  });
});
