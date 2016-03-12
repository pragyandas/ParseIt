"use strict";
var q = require('q');
module.exports = function(parser) {
	var ast = parser.ast;
	var instance;
	ast.ProgramNode.prototype.print = function(indent, indentChar, inst) {
		var elements = this.body,
			str = "",
			promises = [],
			deferred = q.defer();
		instance = inst;
		for (var i = 0, len = elements.length; i < len; i++) {
			promises.push(elements[i].print(indent, indentChar));
		}

		q.allSettled(promises).then(function(results) {
			results.map(function(d) {
				return d.value;
			}).forEach(function(d) {
				str += d + "\n";
			})
			deferred.resolve(eval(str));
		});

		return deferred.promise;
	};

	ast.EmptyStatementNode.prototype.print = function(indent, indentChar) {
		var deferred = q.defer();
		deferred.resolve(indent + ";");
		return deferred.promise;
	};

	ast.BlockStatementNode.prototype.print = function(indent, indentChar) {
		var statements = this.body;
		var str = indent + "{\n";
		var newIndent = indent + indentChar;
		var deferred = q.defer();
		var promises = [];

		for (var i = 0, len = statements.length; i < len; i++) {
			promises.push(statements[i].print(newIndent, indentChar));
		}

		q.allSettled(promises).then(function(results) {
			results.map(function(d) {
				return d.value;
			}).forEach(function(d) {
				str += d + "\n";
			})
			str += indent + "}";
			deferred.resolve(str);
		});

		return deferred.promise;
	};

	ast.ExpressionStatementNode.prototype.print = function(indent, indentChar) {
		var deferred = q.defer();
		this.expression.print(indent, indentChar).then(function(result) {
			deferred.resolve(indent + result + ";");
		})
		return deferred.promise;
	};

	ast.IfStatementNode.prototype.print = function(indent, indentChar) {
		var deferred = q.defer();
		this.test.print("", "").then(function(result) {
			var str = indent + "if (" + result + ")\n";
			var consequent = this.consequent;
			var alternate = this.alternate;
			var consequent_indent = consequent.type === "BlockStatement" ? indent : indent + indentChar;
			consequent.print(consequent_indent, indentChar).then(function(c) {
				str += c;
				if (alternate !== null) {
					str += "\n" + indent + "else\n";
					var alternate_indent = consequent.type === "BlockStatement" ? indent : indent + indentChar;
					alternate.print(alternate_indent, indentChar).then(function(a) {
						str += a;
						deferred.resolve(str);
					})
				} else {
					deferred.resolve(str);
				}
			});
		}.bind(this));
		return deferred.promise;
	};

	ast.LabeledStatementNode.prototype.print = function(indent, indentChar) {
		var deferred = q.defer();
		this.label.print("", "").then(function(d) {
			this.body.print("", "").then(function(e) {
				deferred.resolve(indent + d + ": " + e);
			})
		}.bind(this))
		return deferred.promise;
	};

	ast.BreakStatementNode.prototype.print = function(indent, indentChar) {
		var deferred = q.defer();
		var str = indent + "break";
		var label = this.label;
		if (label !== null) {
			label.print("", "").then(function(result) {
				str += " " + result;
				deferred.resolve(str + ";");
			});
		} else {
			deferred.resolve(str + ";");
		}
		return deferred.promise;
	};

	ast.ContinueStatementNode.prototype.print = function(indent, indentChar) {
		var deferred = q.defer();
		var str = indent + "continue";
		var label = this.label;

		if (label !== null) {
			label.print("", "").then(function(result) {
				str += " " + result;
				deferred.resolve(str + ";");
			});
		} else {
			deferred.resolve(str + ";");
		}

		return deferred.promise;
	};

	ast.WithStatementNode.prototype.print = function(indent, indentChar) {
		var deferred = q.defer(),
			str = "";
		this.object.print("", "").then(function(o) {
			str += indent + "with (" + o + ")\n";
			var body = this.body;
			var body_indent = body.type === "BlockStatement" ? indent : indent + indentChar;
			body.print(body_indent, indentChar).then(function(b) {
				str += b;
				deferred.resolve(str);
			})
		}.bind(this));

		return deferred.promise;
	};

	ast.SwitchStatementNode.prototype.print = function(indent, indentChar) {
		var deferred = q.defer();
		this.discriminant.print("", "").then(function(d) {
			var str = indent + "switch (" + d + ")\n" + indent + "{\n";
			var casePromises = [];
			var newIndent = indent + indentChar;
			var cases = this.cases;
			for (var i = 0, len = cases.length; i < len; i++) {
				casePromises.push(cases[i].print(newIndent, indentChar));
			}
			q.allSettled(casePromises).then(function(results) {
				results.map(function(d) {
					return d.value;
				}).forEach(function(result) {
					str += result;
				})
				deferred.resolve(str);
			})
		}.bind(this));

		return deferred.promise;
	};

	ast.ReturnStatementNode.prototype.print = function(indent, indentChar) {
		var str = indent + "return";
		var argument = this.argument;
		var deferred = q.defer();
		if (argument !== null) {
			argument.print("", "").then(function(result) {
				str += " " + result + ";";
				deferred.resolve(str);
			})
		} else {
			deferred.resolve(str + ";");
		}

		return deferred.promise;
	};

	ast.ThrowStatementNode.prototype.print = function(indent, indentChar) {
		var str = indent + "throw";
		var argument = this.argument;
		var deferred = q.defer();
		if (argument !== null) {
			argument.print("", "").then(function(result) {
				str += " " + result + ";";
				deferred.resolve(str);
			});
		} else {
			deferred.resolve(str + ";");
		}

		return deferred.promise;
	};

	ast.TryStatementNode.prototype.print = function(indent, indentChar) {
		var str = indent + "try\n";
		var handlers = this.handlers;
		var finalizer = this.finalizer;
		var deferred = q.defer();

		this.block.print(indent, indentChar).then(function(result) {
			str += result;

			if (handlers != null) {
				handlers.print(indent, indentChar).then(function(h) {
					str += "\n" + h;

					if (finalizer != null) {
						finalizer.print(indent, indentChar).then(function(f) {
							str += "\n" + indent + "finally\n" + f;
							deferred.resolve(str);
						})
					} else {
						deferred.resolve(str);
					}
				})
			} else {
				if (finalizer != null) {
					finalizer.print(indent, indentChar).then(function(f) {
						str += "\n" + indent + "finally\n" + f;
						deferred.resolve(str);
					})
				} else {
					deferred.resolve(str);
				}
			}
		});

		return deferred.promise;
	};

	ast.WhileStatementNode.prototype.print = function(indent, indentChar) {
		var str = "";
		var body = this.body;
		var deferred = q.defer();
		this.test.print("", "").then(function(result) {
			str += indent + "while (" + result + ")\n";
			var body_indent = body.type === "BlockStatement" ? indent : indent + indentChar;
			body.print(body_indent, indentChar).then(function(b) {
				str += b;
				deferred.resolve(str);
			})
		});

		return deferred.promise;
	};

	ast.DoWhileStatementNode.prototype.print = function(indent, indentChar) {
		var str = indent + "do\n";
		var body = this.body;
		var deferred = q.defer();
		var body_indent = body.type === "BlockStatement" ? indent : indent + indentChar;

		body.print(body_indent, indentChar).then(function(result) {
			str += result + "\n";
			this.test.print("", "").then(function(t) {
				str += indent + "while (" + this.test.print("", "") + ");";
				deferred.resolve(str);
			})
		})

		return deferred.promise;
	};

	ast.ForStatementNode.prototype.print = function(indent, indentChar) {
		var str = indent + "for (";
		var init = this.init;
		var test = this.test;
		var update = this.update;
		var body = this.body;

		if (init !== null) {
			if (typeof(init.type) === "undefined") {
				str += "var ";

				for (var i = 0, len = init.length; i < len; i++) {
					if (i !== 0)
						str += ", ";

					str += init[i].print("", "");
				}
			} else {
				str += init.print("", "");
			}
		}

		str += "; ";

		if (test !== null)
			str += test.print("", "");

		str += "; ";

		if (update != null)
			str += update.print("", "");

		str += ")\n";

		if (body.type === "BlockStatement") {
			str += body.print(indent, indentChar) + "\n";
		} else {
			str += body.print(indent + indentChar, indentChar) + "\n";
		}

		return str;
	};

	ast.ForInStatementNode.prototype.print = function(indent, indentChar) {
		var str = indent + "for (";
		var left = this.left;
		var body = this.body;

		if (left !== null) {
			if (left.type === "VariableDeclarator") {
				str += "var " + left.print("", "");
			} else {
				str += left.print("", "");
			}
		}

		str += " in " + this.right.print("", "") + ")\n";

		if (body.type === "BlockStatement") {
			str += body.print(indent, indentChar) + "\n";
		} else {
			str += body.print(indent + indentChar, indentChar) + "\n";
		}

		return str;
	};

	ast.DebugggerStatementNode.prototype.print = function(indent, indentChar) {
		var deferred = q.defer();
		deferred.resolve(indent + "debugger;")
		return deferred.promise;
	};

	ast.FunctionDeclarationNode.prototype.print = function(indent, indentChar) {
		var str = indent + "function " + this.id.print("", "") + "(";
		var params = this.params;
		var body = this.body;
		var newIndent = indent + indentChar;

		for (var i = 0, len = params.length; i < len; i++) {
			if (i !== 0)
				str += ", ";

			str += params[i].print(newIndent, indentChar);
		}

		str += ")\n" + indent + "{\n";

		for (var i = 0, len = body.length; i < len; i++) {
			str += body[i].print(newIndent, indentChar) + "\n";
		}

		return str + indent + "}";
	};

	ast.VariableDeclarationNode.prototype.print = function(indent, indentChar) {
		var str = indent + this.kind + " ";
		var declarations = this.declarations;
		var deferred = q.defer();
		var promises = [];
		for (var i = 0, len = declarations.length; i < len; i++) {
			promises.push(declarations[i].print("", ""));
		}

		q.allSettled(promises).then(function(results) {
			results.map(function(d) {
				return d.value;
			}).forEach(function(result, i) {
				if (i !== 0)
					str += ", ";
				str += result;
			});
			deferred.resolve(str);
		})

		return deferred.promise;
	};

	ast.VariableDeclaratorNode.prototype.print = function(indent, indentChar) {
		var deferred = q.defer();
		this.id.print("", "").then(function(result) {
			var str = result;
			var init = this.init;
			if (init != null) {
				init.print("", "").then(function(i) {
					str += "=" + i;
					deferred.resolve(str);
				})
			} else {
				deferred.resolve(str);
			}
		}.bind(this))

		return deferred.promise;
	};

	ast.ThisExpressionNode.prototype.print = function(indent, indentChar) {
		var deferred = q.defer();
		deferred.resolve("this");
		return deferred.promise;
	};

	ast.ArrayExpressionNode.prototype.print = function(indent, indentChar) {
		var str = "[";
		var elements = this.elements;
		var deferred = q.defer();
		for (var i = 0, len = elements.length; i < len; i++) {
			promises.push(elements[i].print("", ""));
		}

		q.allSettled(promises).then(function(results) {
			results.map(function(d) {
				return d.value;
			}).forEach(function(result, i) {
				if (i !== 0)
					str += ", ";
				str += result;
			});
			deferred.resolve(str + "]");
		});

		return deferred.promise;
	};

	ast.ObjectExpressionNode.prototype.print = function(indent, indentChar) {
		var str = "({";
		var properties = this.properties;

		for (var i = 0, len = properties.length; i < len; i++) {
			var prop = properties[i];
			var kind = prop.kind;
			var key = prop.key;
			var value = prop.value;

			if (i !== 0)
				str += ", ";

			if (kind === "init") {
				str += key.print("", "") + ": " + value.print("", "");
			} else {
				var params = value.params;
				var body = value.body;

				str += kind + " " + key.print("", "") + "(";

				for (var j = 0, plen = params.length; j < plen; j++) {
					if (j !== 0)
						str += ", ";

					str += params[j].print("", "");
				}

				str += ") { ";

				for (var j = 0, blen = body.length; j < blen; j++) {
					str += body[j].print("", "") + " ";
				}

				str += "}";
			}
		}

		return str + "})";
	};

	ast.FunctionExpressionNode.prototype.print = function(indent, indentChar) {
		var str = "(function";
		var id = this.id;
		var params = this.params;
		var body = this.body;
		var newIndent = indent + indentChar;

		if (id !== null)
			str += " " + id.print("", "");

		str += "(";

		for (var i = 0, len = params.length; i < len; i++) {
			if (i !== 0)
				str += ", ";

			str += params[i].print(newIndent, indentChar);
		}

		str += ") { ";

		for (var i = 0, len = body.length; i < len; i++) {
			str += body[i].print(newIndent, indentChar) + " ";
		}

		return str + "})";
	};

	ast.SequenceExpressionNode.prototype.print = function(indent, indentChar) {
		var str = "";
		var expressions = this.expressions;
		var deferred = q.defer();
		var promises = [];
		for (var i = 0, len = expressions.length; i < len; i++) {

			promises.push(expressions[i].print("", ""));
		}

		q.allSettled(promises).then(function(results) {
			results.map(function(d) {
				return d.value;
			}).forEach(function(result, i) {
				if (i !== 0)
					str += ", ";
				str += result;
			})
			deferred.resolve(str);
		})

		return deferred.prromise;
	};

	ast.UnaryExpressionNode.prototype.print = function(indent, indentChar) {
		var operator = this.operator;
		var deferred = q.defer();
		if (operator === "delete" || operator === "void" || operator === "typeof") {
			this.argument.print("", "").then(function(result) {
				deferred.resolve(operator + "(" + result + ")");
			});
		} else {
			this.argument.print("", "").then(function(result) {
				deferred.resolve(operator + "(" + result + ")");
			});
		}
		return deferred.promise;
	};

	ast.BinaryExpressionNode.prototype.print = function(indent, indentChar) {
		var deferred = q.defer();
		this.left.print("", "").then(function(left) {
			this.right.print("", "").then(function(right) {
				deferred.resolve("(" + left + ") " + this.operator + " (" + right + ")");
			}.bind(this))
		}.bind(this))
		return deferred.promise;
	};

	ast.AssignmentExpressionNode.prototype.print = function(indent, indentChar) {
		var deferred = q.defer();
		this.left.print("", "").then(function(l) {
			this.right.print("", "").then(function(r) {
				deferred.resolve(l + " " + this.operator + " (" + r + ")");
			}.bind(this));
		}.bind(this));
		return deferred.promise;
	};

	ast.UpdateExpressionNode.prototype.print = function(indent, indentChar) {
		var deferred = q.defer();
		this.argument.print("", "").then(function(result) {
			if (this.prefix) {
				deferred.resolve("(" + this.operator + result + ")");
			} else {
				deferred.resolve("(" + result + this.operator + ")");
			}
		}.bind(this));

		return deferred.promise;
	};

	ast.LogicalExpressionNode.prototype.print = function(indent, indentChar) {
		var deferred = q.defer();
		q.allSettled([this.left.print("", ""), this.right.print("", "")]).then(function(results) {
			results = results.map(function(d) {
				return d.value;
			})
			deferred.resolve("(" + results[0] + ") " + this.operator + " (" + results[1] + ")");
		}.bind(this));

		return deferred.promise;
	};

	ast.ConditionalExpressionNode.prototype.print = function(indent, indentChar) {
		var deferred = q.defer();
		q.allSettled([this.test.print("", ""), this.consequent.print("", ""), this.alternate.print("", "")]).then(function(results) {
			results = results.map(function(d) {
				return d.value;
			})
			deferred.resolve("(" + results[0] + ") ? " + result[1] + " : " + results[2]);
		});
		return deferred.promise;
	};

	ast.NewExpressionNode.prototype.print = function(indent, indentChar) {
		var str = "new " + this.callee.print("", "");
		var args = this.arguments;

		if (args !== null) {
			str += "(";

			for (var i = 0, len = args.length; i < len; i++) {
				if (i !== 0)
					str += ", ";

				str += args[i].print("", "");
			}

			str += ")";
		}

		return str;
	};

	ast.CallExpressionNode.prototype.print = function(indent, indentChar) {
		var deferred = q.defer();
		var args = this.arguments;
		this.callee.print("", "").then(function(result) {

			var str = result + "(";
			var promises = [];

			for (var i = 0, len = args.length; i < len; i++) {
				promises.push(args[i].print("", ""));
			}

			q.allSettled(promises).then(function(results) {
				results.map(function(d) {
					return d.value
				}).forEach(function(d, i) {
					if (i !== 0)
						str += ", ";
					str += d;
				})
				deferred.resolve(str + ")");
			})

		})
		return deferred.promise;
	};

	ast.MemberExpressionNode.prototype.print = function(indent, indentChar) {
		var deferred = q.defer();
		if (this.computed) {
			q.allSettled([this.object.print("", ""), this.property.print("", "")]).then(function(results) {
				results = results.map(function(d) {
					return d.value;
				});
				deferred.resolve(results[0] + "[" + results[1] + "]");
			});
		} else {
			q.allSettled([this.object.print("", ""), this.property.print("", "")]).then(function(results) {
				results = results.map(function(d) {
					return d.value;
				});
				deferred.resolve(results[0] + "." + results[1]);
			});
		}
		return deferred.promise;
	};

	ast.SwitchCaseNode.prototype.print = function(indent, indentChar) {
		var str = indent;
		var test = this.test;
		var consequent = this.consequent;
		var newIndent = indent + indentChar;
		var deferred = q.defer();
		var promises = [];
		for (var i = 0, len = consequent.length; i < len; i++) {
			promises.push(consequent[i].print(newIndent, indentChar));
		}
		if (test !== null) {
			test.print("", "").then(function(t) {
				str += "case" + t + ":\n";
				q.allSettled(promises).then(function(results) {
					results.map(function(d) {
						return d.value;
					}).forEach(function(result) {
						str += result + "\n";
					});
					deferred.resolve(str);
				});
			})
		} else {
			str += "default:\n";
			q.allSettled(promises).then(function(results) {
				results.map(function(d) {
					return d.value;
				}).forEach(function(result) {
					str += result + "\n";
				});
				deferred.resolve(str);
			});
		}
		return deferred.promise;
	};

	ast.CatchClauseNode.prototype.print = function(indent, indentChar) {
		var str = indent + "catch (" + this.param.print("", "") + ")\n";

		str += this.body.print(indent, indentChar);
		return str;
	};

	ast.IdentifierNode.prototype.print = function(indent, indentChar) {
		var deferred = q.defer();
		deferred.resolve(this.name);
		return deferred.promise;
	};

	ast.LiteralNode.prototype.print = function(indent, indentChar) {
		var deferred = q.defer();
		deferred.resolve(this.value);
		return deferred.promise;
	};

	ast.ModelLiteralNode.prototype.print = function(indent, indentChar) {
		var modelProperty = this.modelProperty.value.replace(/[']+/g, "").split('.');
		var modelName = modelProperty[0];
		var propertyName = modelProperty[1];
		if (this.filter === null) {
			return {
				modelName: modelName,
				propertyName: propertyName
			};
		} else {
			var deferred = q.defer();
			var filter = this.filter.print(indent, indentChar).then(function(value) {
				deferred.resolve(1);
			});
			return deferred.promise;
		}
	};

	ast.WhereLiteralNode.prototype.print = function(indent, indentChar) {
		var modelProperty = this.modelProperty.print(indent, indentChar);
		var deferred = q.defer();
		setTimeout(function() {
			deferred.resolve({
				modelName: modelProperty.modelName,
				propertyName: modelProperty.propertyName,
				operator: this.operator,
				literal: this.literal.print(indent, indentChar)
			});
		}.bind(this), 2000);
		return deferred.promise;
	};

	ast.InstanceLiteralNode.prototype.print = function(indent, indentChar) {
		var deferred = q.defer();
		var str = this.operation ? 'instance' + "." + this.expression + "." + this.operation : 'instance' + "." + this.expression;
		deferred.resolve(str);
		return deferred.promise;
	};
};