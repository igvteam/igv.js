// The MIT License (MIT)
// Adapted from https://github.com/JMPerez/promise-throttle
//
// Copyright (c) 2015 José M. Pérez
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
//     The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
//     THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
//     FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
//     OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
//


'use strict';

/**
 * @constructor
 * @param {Object} options A set op options to pass to the throttle function
 *        @param {number} requestsPerSecond The amount of requests per second
 *                                          the library will limit to
 */
class Throttle {
    constructor(options) {
        this.requestsPerSecond = options.requestsPerSecond || 10;
        this.lastStartTime = 0;
        this.queued = [];
    }

    /**
     * Adds a promise
     * @param {Function} async function to be executed
     * @param {Object} options A set of options.
     * @return {Promise} A promise
     */
    add(asyncFunction, options) {

        var self = this;
        return new Promise(function (resolve, reject) {
            self.queued.push({
                resolve: resolve,
                reject: reject,
                asyncFunction: asyncFunction,
            });
            self.dequeue();
        });
    }

    /**
     * Adds all the promises passed as parameters
     * @param {Function} promises An array of functions that return a promise
     * @param {Object} options A set of options.
     * @param {number} options.signal An AbortSignal object that can be used to abort the returned promise
     * @param {number} options.weight A "weight" of each operation resolving by array of promises
     * @return {Promise} A promise that succeeds when all the promises passed as options do
     */
    addAll(promises, options) {
        var addedPromises = promises.map(function (promise) {
            return this.add(promise, options);
        }.bind(this));

        return Promise.all(addedPromises);
    };

    /**
     * Dequeues a promise
     * @return {void}
     */
    dequeue() {
        if (this.queued.length > 0) {
            var now = new Date(),
                inc = (1000 / this.requestsPerSecond) + 1,
                elapsed = now - this.lastStartTime;

            if (elapsed >= inc) {
                this._execute();
            } else {
                // we have reached the limit, schedule a dequeue operation
                setTimeout(function () {
                    this.dequeue();
                }.bind(this), inc - elapsed);
            }
        }
    }

    /**
     * Executes the promise
     * @private
     * @return {void}
     */
    async _execute() {
        this.lastStartTime = new Date();
        var candidate = this.queued.shift();
        const f = candidate.asyncFunction;
        try {
            const r = await f();
            candidate.resolve(r);
        } catch (e) {
            candidate.reject(e);
        }

    }


}

export default Throttle;
