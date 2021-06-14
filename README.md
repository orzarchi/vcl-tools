## Introduction

Tools to parse a Curtis VCL source file into an AST.
You can also pretty-print the AST back into a text file, or extend the provided parser to create extensions to the language.

## High level API

### parseVCLtoAST(vclContent: string)

A function that accepts a VCL source string and outputs an AST.

### reprintVCL(vclContent: string)

A function that accepts a VCL source string and outputs a pretty-printed formatted source string.

### VCLASTVisitor

A generic VCL visitor. Inherit and override specific methods to quickly go over a VCL AST. See example below.


## Low level building blocks

### parse(vclContent: string)
A function that accepts a VCL source string and outputs a CST, along with potential errors.

Useful for creating a basic compiler that doesn't require using VCL Studio.

Returns the following type:
```
{
  cst: cst,
  lexErrors: lexResult.errors,
  parseErrors: parser.errors,
};
```

### VCLLexer

A [chevrotain](https://github.com/SAP/chevrotain) based lexer class

### VCLParser

A [chevrotain](https://github.com/SAP/chevrotain) based parser class

### VCLAstCreatorVisitor

A [chevrotain](https://github.com/SAP/chevrotain) based CST visitor


#### Example:

This example uses `VCLASTVisitor` to locate all CAN mailboxes used in a VCL source file, and fill a field `mailboxes` with the results (using a custom data structure `CanMailbox`).
```typescript
enum BuiltInFunctions {
  SETUP_CAN_RECEIVE_MAILBOX = 'Setup_CAN_Receive_Mailbox',
  SETUP_CAN_TRANSMIT_MAILBOX = 'Setup_CAN_Transmit_Mailbox',
  SETUP_CAN_RECEIVE_DATA = 'Setup_CAN_Receive_Data',
  SETUP_CAN_TRANSMIT_DATA = 'Setup_CAN_Transmit_data',
}


export class MailboxExtractorVisitor extends VCLASTVisitor {
  mailboxes: Record<string, CanMailbox> = {};

  private getBuiltInFunction(identifier: string) {
    const match = Object.keys(BuiltInFunctions).find(
      (x) => x.toLowerCase() === identifier.toLowerCase()
    );
    if (match) {
      return (BuiltInFunctions as Record<string, BuiltInFunctions>)[match];
    }
    return null;
  };

  visitCallExpression(node: CallExpression) {
    super.visitCallExpression(node);
    const callee = node.callee.name;
    let functionName = this.getBuiltInFunction(callee);
    if (
      functionName === BuiltInFunctions.SETUP_CAN_RECEIVE_MAILBOX
    ) {
      const mailboxName = (node.arguments[0] as Identifier).toString();
      const mailboxId = (node.arguments[2] as Literal).value as number

      this.mailboxes[mailboxName] = new IncomingCanMailbox(
        mailboxId.toString(),
        mailboxName,
        []
      );
    } else if (
      functionName === BuiltInFunctions.SETUP_CAN_TRANSMIT_MAILBOX
    ) {
      const mailboxName = (node.arguments[0] as Identifier).toString();
      const mailboxId = (node.arguments[2] as Literal).value as number
      const type = node.arguments[4] as Identifier;
      const interval = node.arguments[5] as Literal;
      this.mailboxes[mailboxName] = new OutgoingCanMailbox(
        mailboxId.toString(),
        mailboxName,
        [],
        type.name === 'C_CYCLIC' ? 'cyclic' : 'event',
        interval?.value as number
      );
    } else if (
      functionName === BuiltInFunctions.SETUP_CAN_RECEIVE_DATA ||
      functionName === BuiltInFunctions.SETUP_CAN_TRANSMIT_DATA
    ) {
      const mailbox = (node.arguments[0] as Identifier).name;
      const field = (node.arguments[1] as Identifier).name;
      const bytes = (node.arguments[2] as Literal).value as number;
      const endianness =
        ((node.arguments[3] as Literal).value as number) === 0
          ? 'little'
          : 'big';
      this.mailboxes[mailbox].structure.push({ field, endianness, bytes });
    }
  }
```

### Known errors:
1) The code formatter is very basic. A much better solution will be to re implement it as a prettier plugin (similar to [this](https://github.com/jhipster/prettier-java))
