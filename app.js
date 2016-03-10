var parser = require("./parseit");
debugger;
require("./print")(parser.Parser.prototype);
var source = "if( @m'Super.Bored' where @m'Candy.Crush' = 'Lolipop'  > @m'Minion.Banana' where @m'Professor.Nefario' = 'Kidnapped'){console.log('Nuclear Apocalypse...Aaaaa...Ash...JustKidding')}";
var ast;
try {
	ast = parser.parse(source);
	console.log(ast);
	ast.print("", "  ").then(function(d) {
		console.log(d);
	});
} catch (exception) {
	console.log("Parse Error:  " + exception.message);
}