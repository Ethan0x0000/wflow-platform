import jsep from 'jsep';

type Hook = (...args: unknown[]) => unknown;
const hooks = new Map<string, Hook>();

/** Hosts register reviewed functions at startup; persisted form JSON contains their names. */
export function registerFormHook(name: string, handler: Hook): void {
  if (hooks.has(name)) throw new Error(`Duplicate form hook: ${name}`);
  hooks.set(name, handler);
}

export function compileHook(_parameters: string[], name: string): Hook {
  const handler = hooks.get(name.trim());
  if (!handler) throw new Error('请注册表单扩展函数后使用；不执行模型中的任意脚本');
  return handler;
}

export function evaluateFormula(expression: string, values: Record<string, unknown>): number {
  if (expression.length > 4096) throw new Error('公式过长');
  let steps = 0;
  function run(node: jsep.Expression): number {
    if (++steps > 256) throw new Error('公式过于复杂');
    if (node.type === 'Literal') {
      const value = (node as jsep.Literal).value;
      if (typeof value === 'number' && Number.isFinite(value)) return value;
    }
    if (node.type === 'Identifier') {
      const name = (node as jsep.Identifier).name;
      const value = Object.hasOwn(values, name) ? values[name] : undefined;
      if (typeof value === 'number' && Number.isFinite(value)) return value;
    }
    if (node.type === 'MemberExpression') {
      const member = node as jsep.MemberExpression;
      if (!member.computed && member.object.type === 'Identifier' && (member.object as jsep.Identifier).name === 'formData' && member.property.type === 'Identifier') return run(member.property);
    }
    if (node.type === 'UnaryExpression') {
      const unary = node as jsep.UnaryExpression;
      if (unary.operator === '-') return -run(unary.argument);
      if (unary.operator === '+') return run(unary.argument);
    }
    if (node.type === 'BinaryExpression') {
      const binary = node as jsep.BinaryExpression, left = run(binary.left), right = run(binary.right);
      if (binary.operator === '+') return left + right;
      if (binary.operator === '-') return left - right;
      if (binary.operator === '*') return left * right;
      if (binary.operator === '/' && right !== 0) return left / right;
      if (binary.operator === '%' && right !== 0) return left % right;
    }
    throw new Error('公式仅支持数值字段和算术运算');
  }
  const result = run(jsep(expression));
  if (!Number.isFinite(result)) throw new Error('公式结果无效');
  return result;
}
