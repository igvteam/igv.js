import {createBrowser} from "../js/igv-create.js";

function runSessionTests() {

    const div = document.createElement("div");


    QUnit.test("json session", function (assert) {

        var done = assert.async();

        createBrowser(div,
            {
                genome: "hg19"
            })

            .then(function (browser) {
                browser.loadSession({
                    url: "data/session/amazontest.json"
                })
                    .then(function (ignore) {
                        // loadSession does not return anything,  success is the absence of errors
                        assert.ok(true)
                        done();
                    })
                    .catch(function (error) {
                        console.error(error)
                        assert.ok(false)
                        done();
                    })


            })
    });

    QUnit.test("xml session", function (assert) {

        var done = assert.async();

        createBrowser(div,
            {
                genome: "hg19"
            })

            .then(function (browser) {
                browser.loadSession({
                    url: "data/session/igvSession.xml"
                })
                    .then(function (ignore) {
                        // loadSession does not return anything,  success is the absence of errors
                        assert.ok(true)
                        done();
                    })
                    .catch(function (error) {
                        console.error(error)
                        assert.ok(false)
                        done();
                    })


            })
    });
}

export default runSessionTests;



