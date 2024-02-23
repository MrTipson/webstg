import { styleTags, tags } from "@lezer/highlight"

export const stgHighlight = styleTags({
	"FUN THUNK CON": tags.typeName,
	"let letrec in case of": tags.controlKeyword,
	Literal: tags.number,
	Identifier: tags.variableName,
	Binding: tags.definition(tags.variableName),
	LineComment: tags.lineComment,
	Operator: tags.arithmeticOperator,
	"( )": tags.paren,
	// A variable name whose parent is a call is a function name
	"Call/Identifier": tags.function(tags.variableName),
});