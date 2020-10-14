
const t = require("@babel/types");

const operator = '**';
// 生成 Math.pow 的AST
const getMathPowExpression = (left, right) => {
	return t.callExpression(
	  t.memberExpression(t.identifier("Math"), t.identifier("pow")),
	  [left, right],
	);
}

module.exports = function ({ types: t }) {
	return {
		name: 'babel-plugin-hello',
		visitor: {
			/**
			 * 文件头部添加 "use strict;"
			 */
			Program(path, file) {
				path.unshiftContainer('body', t.expressionStatement(t.stringLiteral('use strict')));
			},

			/**
			 * 转换 Math.pow()
			 */
			BinaryExpression(path) {
				const { node } = path;
				if (node.operator === operator) {
					// 替换成 Math.pow 的 AST 节点
					path.replaceWith(getMathPowExpression(node.left, node.right));
				}
			},
			
			/**
			 * console功能拓展
			 */
			CallExpression(path, { opts }) {
				const { node } = path;

				// node.callee.type === 'MemberExpression' && node.callee.object.name === 'console'
				if (t.isMemberExpression(node.callee) &&
					t.isIdentifier(node.callee.object, { name: 'console' })
				) {
					// 生产环境：删除console
					if (opts.env === 'production') {
						path.remove();
					} else {
						// 开发环境：打印console的位置
						const location = `line ${node.loc.start.line}, column ${node.loc.start.column}`;
						path.node.arguments[0].value = `${path.node.arguments[0].value} (trace: ${location})`;
					}
				}
			}


		}
	};
};