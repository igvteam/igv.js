var PromiseThrottle = require('promise-throttle');

var promiseThrottle = new PromiseThrottle({
    requestsPerSecond: 1,
    promiseImplementation: Promise
});

var promiseCounter = 0;

function createPromise() {
    return new Promise(function (resolve, reject) {
        setTimeout(function () {
            resolve(promiseCounter++);
        }, 10);
    });
}

var amountOfPromises = 1000;
while (amountOfPromises-- > 0) {
    promiseThrottle.add(function () {
        return createPromise();
    }).then(function (results) {
        console.log(results)
    })
}