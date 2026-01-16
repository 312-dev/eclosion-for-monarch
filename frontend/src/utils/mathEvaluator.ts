/**
 * Safe Math Expression Evaluator
 *
 * Custom parser for basic arithmetic (+ - * / and parentheses).
 * Does NOT use eval() or Function() for security.
 */

type Token =
  | { type: 'number'; value: number }
  | { type: 'operator'; value: '+' | '-' | '*' | '/' }
  | { type: 'lparen' }
  | { type: 'rparen' };

/**
 * Tokenize a math expression string.
 */
// eslint-disable-next-line sonarjs/cognitive-complexity -- Lexer requires handling each token type individually
function tokenize(expr: string): Token[] | null {
  const tokens: Token[] = [];
  let i = 0;

  while (i < expr.length) {
    const char = expr[i];
    if (char === undefined) break;

    // Skip whitespace
    if (char === ' ') {
      i++;
      continue;
    }

    // Number (including decimals)
    if (/[\d.]/.test(char)) {
      let numStr = '';
      let hasDecimal = false;

      while (i < expr.length) {
        const c = expr[i];
        if (c === undefined || !/[\d.]/.test(c)) break;
        if (c === '.') {
          if (hasDecimal) return null; // Multiple decimals
          hasDecimal = true;
        }
        numStr += c;
        i++;
      }

      const value = Number.parseFloat(numStr);
      if (Number.isNaN(value)) return null;
      tokens.push({ type: 'number', value });
      continue;
    }

    // Operators
    if (char === '+' || char === '-' || char === '*' || char === '/') {
      tokens.push({ type: 'operator', value: char });
      i++;
      continue;
    }

    // Parentheses
    if (char === '(') {
      tokens.push({ type: 'lparen' });
      i++;
      continue;
    }

    if (char === ')') {
      tokens.push({ type: 'rparen' });
      i++;
      continue;
    }

    // Invalid character
    return null;
  }

  return tokens;
}

/**
 * Recursive descent parser for arithmetic expressions.
 *
 * Grammar:
 *   expression = term (('+' | '-') term)*
 *   term = factor (('*' | '/') factor)*
 *   factor = number | '(' expression ')'
 */
class Parser {
  private tokens: Token[];
  private pos: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parse(): number | null {
    const result = this.expression();
    if (this.pos !== this.tokens.length) {
      return null; // Unexpected tokens remaining
    }
    return result;
  }

  private current(): Token | null {
    return this.tokens[this.pos] ?? null;
  }

  private advance(): void {
    this.pos++;
  }

  private expression(): number | null {
    let left = this.term();
    if (left === null) return null;

    while (true) {
      const token = this.current();
      if (token?.type !== 'operator') break;
      if (token.value !== '+' && token.value !== '-') break;

      this.advance();
      const right = this.term();
      if (right === null) return null;

      if (token.value === '+') {
        left = left + right;
      } else {
        left = left - right;
      }
    }

    return left;
  }

  private term(): number | null {
    let left = this.factor();
    if (left === null) return null;

    while (true) {
      const token = this.current();
      if (token?.type !== 'operator') break;
      if (token.value !== '*' && token.value !== '/') break;

      this.advance();
      const right = this.factor();
      if (right === null) return null;

      if (token.value === '*') {
        left = left * right;
      } else {
        if (right === 0) return null; // Division by zero
        left = left / right;
      }
    }

    return left;
  }

  private factor(): number | null {
    const token = this.current();

    if (token?.type === 'number') {
      this.advance();
      return token.value;
    }

    if (token?.type === 'lparen') {
      this.advance();
      const result = this.expression();
      if (result === null) return null;

      const closeToken = this.current();
      if (closeToken?.type !== 'rparen') return null;
      this.advance();

      return result;
    }

    // Handle negative numbers at start or after operator
    if (token?.type === 'operator' && token.value === '-') {
      this.advance();
      const nextFactor = this.factor();
      if (nextFactor === null) return null;
      return -nextFactor;
    }

    return null;
  }
}

/**
 * Evaluate a basic arithmetic expression.
 *
 * @param expression - The expression to evaluate (e.g., "100+50", "(12*3)/2")
 * @returns The result as a number, or null if invalid
 *
 * @example
 * evaluateMathExpression("100+50") // 150
 * evaluateMathExpression("(12*3)/2") // 18
 * evaluateMathExpression("85x2") // 170 (x is supported for multiplication)
 * evaluateMathExpression("abc") // null
 */
export function evaluateMathExpression(expression: string): number | null {
  // Normalize: replace 'x' or 'X' with '*' for multiplication
  // (allows $85x2 since * conflicts with markdown bold/italic)
  const normalized = expression.replaceAll(/x/gi, '*');

  // Quick validation - only allowed characters
  if (!/^[\d.+\-*/()\s]+$/.test(normalized)) {
    return null;
  }

  const tokens = tokenize(normalized);
  if (!tokens || tokens.length === 0) {
    return null;
  }

  const parser = new Parser(tokens);
  const result = parser.parse();

  if (result === null || !Number.isFinite(result)) {
    return null;
  }

  // Round to avoid floating point issues
  return Math.round(result * 1000000) / 1000000;
}
