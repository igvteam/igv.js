/**
 * Created by turner on 3/15/14.
 */
function runJSFooTests() {

    test( "Test CharCode Foo", 3, function() {

        var string = "alpha",
            base = string.charAt(2),
            code = string.charCodeAt(2);

        equal(base, "p");
        equal(String.fromCharCode(code), base);
        equal(base.charCodeAt(0), code);
    });

    test( "Test array with Math.NaN", 3, function() {

        var i,
            nan = new Array(3);
        for (i=0; i<nan.length; i++) {
            nan[i] = Math.NaN;
        }

        nan.forEach(function(item) {

            equal(item, Math.NaN);
        });

    });

    test( "Test sparce array", 3, function() {

        var count,
            howmany,
            sparse = new Array(4);

        sparse[1] = "alpha";
        sparse[3] = "delta";
        howmany = 2;

        equal(sparse[0], sparse[2]);
        equal(sparse[0], null);

        // null items are skippped when using forEach.
        count = 0;
        sparse.forEach(function(item, index, items) {
            ++count;
            console.log(index, item);
        });

        equal(count, howmany);
    });

    test( "Test missing function arguments", 1, function() {

        var funky = function(a, b, c) {
            var la, lb, lc;

            la = a || "no_a";
            lb = b || "no_b";
            lc = c || "no_c";

            return a + b + c;
        };

        ok(funky);

        console.log(null, null, "delta");

    });

}
