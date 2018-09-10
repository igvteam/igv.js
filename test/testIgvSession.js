function runIgvSessionTests() {

    QUnit.test("session file", function (assert) {
        var done = assert.async();

        var url = "http://homer.ucsd.edu/cbenner/test/report-170817/homo_sapiens.igv.xml";

        igv.xhr.loadString(url)
            .then(function (string) {
                
                var session = new igv.XMLSession(string);
                
                assert.ok(session);

                done();
            })

    });
}



