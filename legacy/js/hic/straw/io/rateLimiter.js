class RateLimiter {

    constructor(wait) {
        this.wait = wait === undefined ? 100 : wait

        this.isCalled = false
        this.calls = [];
    }


    limiter(fn) {

        const self = this

        let caller = function () {

            if (self.calls.length && !self.isCalled) {
                self.isCalled = true;
                self.calls.shift().call();
                setTimeout(function () {
                    self.isCalled = false;
                    caller();
                }, self.wait);
            }
        };

        return function () {
            self.calls.push(fn.bind(this, ...arguments));
            caller();
        };
    }

}

export default RateLimiter;