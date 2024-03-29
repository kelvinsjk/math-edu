import Fraction from '../fractionClass';
import Term from '../algebra/termClass';
import Polynomial from '../algebra/polynomialClass';
import Expression from '../algebra/expressionClass';
import { Ln } from '../exponential/index';

export default class PowerFn extends Term {
  /**
   * class representing the k (ax+b)^n function
   */
  variableAtom: string;
  a: Fraction;
  b: Fraction;
  n: Fraction;

  ////
  // constructor
  ////
  /**
   * Creates a new powerFn instance representing k (ax + b)^n
   *
   * @options defaults to `a: 1, b: 0, n: 1, variableAtom: 'x', coeff: 1`
   *
   */
  constructor(options?: PowerOptions) {
    const defaultOptions = {
      a: 1,
      b: 0,
      n: 1,
      variableAtom: 'x',
      coeff: 1,
    };
    const optionsObject = { ...defaultOptions, ...options };
    let a = convertNumberToFraction(optionsObject.a);
    const b = convertNumberToFraction(optionsObject.b);
    const n = convertNumberToFraction(optionsObject.n);
    let coeff = convertNumberToFraction(optionsObject.coeff);
    if (a.isEqual(0)) {
      throw new Error('powerFn ERROR: a must be non-zero');
    }
    const axPLUSb = new Polynomial([a, b], { variableAtom: optionsObject.variableAtom });
    if (n.isEqual(1)) {
      if (b.isEqual(0)) {
        // k (ax) = (ka) x
        coeff = coeff.times(a);
        a = Fraction.ONE;
        super(coeff, optionsObject.variableAtom);
      } else {
        // b non-zero
        if (coeff.isEqual(1)) {
          super(coeff, `${axPLUSb}`);
        } else {
          super(coeff, `( ${axPLUSb} )`);
        }
      }
    } else if (n.isEqual(0)) {
      super(coeff);
    } else {
      // TODO: handle other powers in a 'nice' manner
      const axPLUSbString = axPLUSb.toString();
      if (axPLUSbString.length === 1) {
        super(coeff, `${axPLUSb}^{ ${n} }`);
      } else {
        super(coeff, `( ${axPLUSb} )^{ ${n} }`);
      }
    }
    this.variableAtom = optionsObject.variableAtom;
    this.a = a;
    this.b = b;
    this.n = n;
  }

  /**
   * subs in the value of x
   *
   * warning: only valid for non-negative integral power n at the moment
   */
  valueAt(x: number | Fraction): Fraction {
    const axPLUSb = this.a.times(x).plus(this.b);
    if (this.n.isInteger() && this.n.num >= 0) {
      const power = axPLUSb.pow(this.n.num);
      return power.times(this.coeff);
    } else {
      throw new Error('powerFn ERROR: non-negative or non-integral power n not supported at this point');
    }
  }
  /**
   * subs in the value of x, where x is an algebraic term
   */
  algebraicValueAt(x: Term): Term {
    if (!(this.n.isInteger() && this.n.num >= 0)) {
      throw new Error('powerFn ERROR: non-negative or non-integral power n not supported at this point');
    }
    if (this.n.num === 0) {
      return new Term(this.coeff);
    }
    if (this.b.isEqual(0)) {
      // k1 ( a(kx) )^n
      const newCoeff = this.coeff.times(x.coeff.times(this.a).pow(this.n.num));
      return this.n.isEqual(1)
        ? new Term(newCoeff, `${x.variable}`)
        : new Term(newCoeff, `\\left( ${x.variable} \\right)^{ ${this.n.num} }`);
    } else {
      const akxPLUSb = new Expression(new Term(this.a.times(x.coeff), x.variable), this.b);
      return this.n.isEqual(1)
        ? this.coeff.isEqual(1)
          ? new Term(this.coeff, `${akxPLUSb}`)
          : new Term(this.coeff, `\\left( ${akxPLUSb} \\right)`)
        : new Term(this.coeff, `\\left( ${akxPLUSb} \\right)^{ ${this.n.num} }`);
    }
  }
  /**
   * toNumberFunction
   *
   * @return a javascript function that takes in a number type and output a number type.
   * useful for numerical methods (eg Simpson's rule)
   */
  toNumberFunction(): (x: number) => number {
    return (x: number) => this.coeff.valueOf() * Math.pow(this.a.valueOf() * x + this.b.valueOf(), this.n.valueOf());
  }

  /**
   * derivative
   */
  derivative(): PowerFn {
    return new PowerFn({
      a: this.a,
      b: this.b,
      variableAtom: this.variableAtom,
      coeff: this.coeff.times(this.n).times(this.a),
      n: this.n.minus(1),
    });
  }

  /**
   * integral
   *
   * integrate k (ax+b)^n to be k/(a(n+1)) (ax+b)^{n+1}
   *
   * WARNING: will throw if n==1. use lnIntegral for this use case
   *
   * TODO: integration of power -1 to ln not yet implemented
   */
  integral(): PowerFn {
    if (this.n.isEqual(-1)) {
      throw new Error('power is -1: use the `.lnIntegral()` method instead');
    }
    return new PowerFn({
      a: this.a,
      b: this.b,
      variableAtom: this.variableAtom,
      coeff: this.coeff.divide(this.n.plus(1)),
      n: this.n.plus(1),
    });
  }

  /**
   * definite integral
   */
  definiteIntegral(lower: number | Fraction | Term, upper: number | Fraction | Term): Expression {
    let upperExpression: Expression, lowerExpression: Expression;
    if (lower instanceof Term) {
      lowerExpression = new Expression(this.integral().algebraicValueAt(lower));
    } else {
      lower = convertNumberToFraction(lower);
      lowerExpression = new Expression(this.integral().valueAt(lower));
    }
    if (upper instanceof Term) {
      upperExpression = new Expression(this.integral().algebraicValueAt(upper));
    } else {
      upper = convertNumberToFraction(upper);
      upperExpression = new Expression(this.integral().valueAt(upper));
    }
    return upperExpression.subtract(lowerExpression);
  }

  /**
   * ln integral (indefinite)
   *
   * integrate k/(ax+b) to be k/a ln | ax + b |
   */
  lnIntegral(): Term {
    if (!this.n.isEqual(-1)) {
      throw new Error(`n must be -1 for this method. Current n: ${this.n}`);
    }
    const aXPlusB = new Polynomial([this.a, this.b]);
    return new Term(this.coeff.divide(this.a), `\\ln \\left| ${aXPlusB} \\right|`);
  }

  /**
   * ln integral (definite)
   */
  lnDefiniteIntegral(lower: number | Fraction, upper: number | Fraction): Ln {
    const lowerX = this.a.times(lower).plus(this.b);
    const upperX = this.a.times(upper).plus(this.b);
    const newCoeff = this.coeff.divide(this.a);
    const lnLower = new Ln(lowerX, newCoeff);
    const lnUpper = new Ln(upperX, newCoeff);
    return lnUpper.minus(lnLower);
  }
}

interface PowerOptions {
  a?: number | Fraction;
  b?: number | Fraction;
  n?: number | Fraction;
  coeff?: number | Fraction;
  variableAtom?: string;
}

// type MathTypes = number | Fraction | Exp;

// convertNumberToFraction
function convertNumberToFraction(x: number | Fraction): Fraction {
  if (typeof x === 'number') {
    return new Fraction(x);
  } else {
    return new Fraction(x.num, x.den);
  }
}
