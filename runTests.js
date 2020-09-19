#! /usr/bin/env node
const { runQunitPuppeteer, printResultSummary, printFailedTests, printOutput } = require('node-qunit-puppeteer');
const finalhandler = require('finalhandler')
const http = require('http')
const serveStatic = require('serve-static')

// Start a server for the the static test files
const serve = serveStatic('.',
    {

    })
const server = http.createServer(function onRequest (req, res) {
    serve(req, res, finalhandler(req, res))
})
server.listen(8000);


const qunitArgs = {
    headless: true,
    traceSettings: {
        outputConsole: true,
        outputAllAssertions: true
    },
    // Path to qunit tests suite
    targetUrl: 'http://127.0.0.1:8000/test/runTests.html',
    // (optional, 30000 by default) global timeout for the tests suite
    timeout: 100000,
    // (optional, false by default) should the browser console be redirected or not
    redirectConsole: true
};

runQunitPuppeteer(qunitArgs)
    .then((result) => {

        printOutput(result, console);
        printResultSummary(result, console);

        if (result.stats.failed > 0) {
            printFailedTests(result, console);
            // other action(s) on failed tests
        }

        server.close();
    })
    .catch((ex) => {
        console.error(ex);
        server.close();
    });