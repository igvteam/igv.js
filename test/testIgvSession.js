function runIgvSessionTests() {

    asyncTest("session file", function () {

        var url = "http://homer.ucsd.edu/cbenner/test/report-170817/homo_sapiens.igv.xml";

        igv.xhr.loadString(url)
            .then(function (string) {
                
                var session = new igv.XMLSession(string);
                
                ok(session);

                start();
            })

    });
}



