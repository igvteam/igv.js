function runTDigestTests() {


    test("Test tdigest", function () {

        digest = new Digest();

        for (var i = 0; i < 1000000; i++) {
            digest.push(Math.random());
        }

        var p90 = digest.percentile(0.9);

        // Assert that estimate is within 1% of expected value
        ok(Math.abs(0.9 - p90) < 0.01);


    })

    function printExamples() {

// Note:  Convenience methd, no real tests here.

// Examples of Digest, which automatically chooses between
// a discrete and TDigest representation of a streaming sample.
// create a frequency digest for a small sample. automatically store
// these as discrete samples and report exact percentiles
//
        var x = [], N = 10;
        digest = new Digest();
        for (var i = 0; i < N; i += 1) {
            digest.push(i / N * 10 - 5);
        }
        console.log(digest.summary());
        for (var p = 0; p <= 1.0; p += 0.1) {
            console.log("p = " + p.toFixed(2) + ", x == " + (digest.percentile(p)));
        }
        for (var x = -5; x <= 5; x += 1.0) {
            console.log("x = " + x + ", p == " + (digest.p_rank(x)));
        }
//
// the digest remains exact for a large number of samples having
// a small number of distinct values
//
        x = [];
        N = 10000;
        digest = new Digest();
        for (i = 0; i < N; i += 1) {
            digest.push(Math.floor(i / N * 10 - 5));
        }
        console.log(digest.summary());
        for (p = 0; p <= 1.0; p += 0.1) {
            console.log("p = " + p.toFixed(2) + ", x == " + (digest.percentile(p)));
        }
        for (x = -5; x <= 5; x += 1.0) {
            console.log("x = " + x + ", p == " + (digest.p_rank(x)));
        }
//
// the digest automatically shifts to a TDigest approximation for a
// large number of distinct sample values
//
        x = [];
        N = 10000;
        digest = new Digest();
        for (i = 0; i < N; i += 1) {
            digest.push(i / N * 10 - 5);
        }
        digest.compress();
        console.log(digest.summary());
        for (p = 0; p <= 1.0; p += 0.1) {
            console.log("p = " + p.toFixed(2) + ", x ~ " + (digest.percentile(p)));
        }
        for (x = -5; x <= 5; x += 1.0) {
            console.log("x = " + x + ", p ~ " + (digest.p_rank(x)));
        }
//
// force the digest to store all unique samples, regardless of number
//
        x = [];
        N = 10000;
        digest = new Digest({mode: 'disc'});
        for (var i = 0; i < N; i += 1) {
            digest.push(i / N * 10 - 5);
        }
        console.log(digest.summary());
        for (var p = 0; p <= 1.0; p += 0.1) {
            console.log("p = " + p.toFixed(2) + ", x == " + (digest.percentile(p)));
        }
        for (var x = -5; x <= 5; x += 1.0) {
            console.log("x = " + x + ", p == " + (digest.p_rank(x)));
        }


        ok(true);
    }
}