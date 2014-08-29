/**
 * Created by jrobinso on 3/19/14.
 */

function runEncodeTests() {

    module("Encode");

    asyncTest("Parse records ", function () {

        var url = "../assets/hg19/gm12878.hg19.txt";

        igv.parseEncodeTableFile(url, function (records) {

            ok(records);


            start();

        });

    });
}