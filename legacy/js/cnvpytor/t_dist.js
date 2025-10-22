

/** 
* Evaluates the cumulative distribution function (CDF) for a Student's t distribution with degrees of freedom `v` at a value `t`.
*
* @params {number} t - value for the t test
* @params {PositiveNumber} v - degree of freedom
* @returns {Probability} evaluated CDF
*/
function TdistributionCDF(t, v){
    if (isNaN( t ) || isNaN( v ) || v <= 0.0) {
		return NaN;
	}
	if ( t === 0.0 ) {
		return 0.5;
	}
    return 1/2 + (1/2 * (incompbeta(1/2*v, 1/2, 1) - incompbeta(1/2*v, 1/2, v/(v+t*t)))) * Math.sign( t)

}


/** 
* incompbeta(a,b,x) evaluates incomplete beta function, here a, b > 0 and 0 <= x <= 1. This function requires contfractbeta(a,b,x, ITMAX = 200) 
*  code translated from  https://malishoaib.wordpress.com/2014/04/15/the-beautiful-beta-functions-in-raw-python/
*
* @params
* @params
* @params
* @returns 
*/
function incompbeta(a, b, x){
     
    if(x == 0){
        return 0;
    }
    else if (x == 1){
        return 1;
    }else
    {
        let lbeta = lgamma(a+b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1-x)
        if (x < (a+1) / (a+b+2)){
            return Math.exp(lbeta) * contfractbeta(a, b, x) / a;
        }
        else{
            return 1 - Math.exp(lbeta) * contfractbeta(b, a, 1-x) / b;
        }
    }
}

/**
 * contfractbeta() evaluates the continued fraction form of the incomplete Beta function; incompbeta().  
 *   (Code translated from: Numerical Recipes in C.)
 * 
 * @param {*} a 
 * @param {*} b 
 * @param {*} x 
 * @param {*} ITMAX 
 * @returns 
 */
function contfractbeta(a,b,x, ITMAX = 1000){
     
    let EPS = 3.0e-7;
    let az = 1.0;
    let am = 1.0;
    let bm = 1.0;
    let qab = a + b
    let qap = a + 1.0
    let qam = a-1.0
    let bz = 1.0 - qab*x/qap
     
    //for i in range(ITMAX):
    for(let i =0; i<= ITMAX; i++){
        let em = parseFloat(i+1)
        let tem = em + em
        let d = em*(b-em)*x/((qam+tem)*(a+tem))
        let ap = az + d*am
        let bp = bz+d*bm
        d = -(a+em)*(qab+em)*x/((qap+tem)*(a+tem))
        let app = ap+d*az
        let bpp = bp+d*bz
        let aold = az
        am = ap/bpp
        bm = bp/bpp
        az = app/bpp
        bz = 1.0
        if (Math.abs(az-aold)<(EPS * Math.abs(az))){
            return az
        }
    }
}

/**
 * Evaluates factorial of a number
 * 
 * @param {Number} xf - Integer number 
 * @returns factorial of the number
 */
function factorial(xf) {
    if ((xf == 0) || (xf == 1)) return 1;
    else {
        let result = (xf * factorial(xf - 1))
        return result
    }
}

/**
 * Evalues factorial for an integer or fraction using either either factorial or gamma function
 * 
 * @param {Number} a - integar or fraction number
 * @returns value of a gamma function
 */
export function gamma(a){
    let gamma
    
    var qc = [75122.6331530, 80916.6278952, 36308.2951477, 8687.24529705, 1168.92649479, 83.8676043424, 2.50662827511];
    
    var sum1 = 0;
    var prod1 = 1;
    if (a == 0) { 
        gamma = 1e99; 
    }else {
        if ((a % 1) == 0) {//if integer
            gamma = factorial(a - 1);
        }
        else { //not integer
            for (let j = 0; j < qc.length; j++) {
                sum1 = sum1 + qc[j] * Math.pow(a, j);
                prod1 = prod1 * (a + j);
            }
            gamma = (sum1 * Math.pow((a + 5.5), (a + 0.5))) * Math.exp(-(a + 5.5)) / prod1;
        }
    }
    
    return gamma
}

/**
 * 
 * @param {Number} xg  - integar or fraction number
 * @returns natural log of gamma function
 */

function lgamma(xg){
    return Math.log(gamma(xg))
}

function t_test_1_sample(mean, m, s, n) {
    if (s == 0) s = 1;
    var t = ((mean - m) / s) * Math.sqrt(n)
    var p = 1.0 - TdistributionCDF(Math.abs(t), (n - 1))
    return p
}

function t_test_2_samples(m1, s1, n1, m2, s2, n2) {
    if (s1 == 0) s1 = 1;
    if (s2 == 0) s2 = 1;
    var t = (m1 - m2) / Math.sqrt(s1 ** 2 / n1 + s2 ** 2 / n2);
    var df = ((s1 ** 2 / n1 + s2 ** 2 / n2) ** 2 * (n1 - 1) * (n2 - 1)) /
        ((s1 ** 4 * (n2 - 1)) / n1 ** 2 + (s2 ** 4 * (n1 - 1)) / n2 ** 2);

    var p = 1.0 - TdistributionCDF(Math.abs(t), parseInt(df + 0.5))

    return p
}

export default {TdistributionCDF, gamma, t_test_1_sample, t_test_2_samples};