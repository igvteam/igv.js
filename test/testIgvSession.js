function runIgvSessionTests() {


    // mock object
    if (igv === undefined) {
        igv = {};
    }

    igv.browser = {
        getFormat: function () {
        },

        genome: {
            getChromosome: function (chr) {
            },
            getChromosomeName: function (chr) {
                return chr
            }
        }
    };

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



