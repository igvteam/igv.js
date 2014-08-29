// Tests in this file can be run in the ide (they do not require range-byte header support on the server).


function runLocalTests() {



    asyncTest("Cross origin test", function () {

        var createCORSRequest = function(method, url) {
            var xhr = new XMLHttpRequest();
            if ("withCredentials" in xhr) {
                // Most browsers.
                xhr.open(method, url, true);
            } else if (typeof XDomainRequest != "undefined") {
                // IE8 & IE9
                xhr = new XDomainRequest();
                xhr.open(method, url);
            } else {
                // CORS not supported.
                xhr = null;
            }
            return xhr;
        };
ok(true);
        var url = 'http://www.gtexportal.org/igv/assets/eqtl/Whole_Blood.portal.sorted.eqtl.bin';
        var method = 'GET';
        var xhr = createCORSRequest(method, url);

        xhr.onload = function() {
            // Success code goes here.
            start();
        };

        xhr.onerror = function() {
            console.log(xhr.responseText);
            start();
        };

        xhr.setRequestHeader('range', 'bytes=1-100');
        xhr.send();

    });


}


