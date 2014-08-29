// Note -- this test must be run on a "real" server, such as Apache.  Intellij's ide server does not return content-length.

function runDataSourceTests() {
    module("DataSource");
    var numberOfAssertions = 2;
    asyncTest("Head", numberOfAssertions, function () {
        console.log("Head test");
        var url = "../test/data/gstt1_sample.bam";

        var dataLoader = new igv.DataLoader(url);

        dataLoader.loadHeader(function (headerDictionary) {

            ok(headerDictionary);

            var contentLengthString = headerDictionary["Content-Length"];
            var contentLength = parseInt(contentLengthString);
            equal(60872, contentLength, "ContentLength");
            start();
        });

    });


}


