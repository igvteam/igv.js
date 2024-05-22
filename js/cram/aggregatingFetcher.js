
/**
 * takes fetch requests and aggregates them at a certain time frequency
 */
export default class AggregatingFetcher {
    /**
     *
     * @param {object} params
     * @param {number} [params.frequency] number of milliseconds to wait for requests to aggregate
     */
    constructor({
                    frequency = 1000,
                    fetch,
                    maxExtraSize = 32000,
                    maxFetchSize = 1000000,
                }) {
        this.requestQueues = {} // url => array of requests
        this.fetchCallback = fetch
        this.frequency = frequency
        this.maxExtraSize = maxExtraSize
        this.maxFetchSize = maxFetchSize
    }

    _canAggregate(requestGroup, request) {
        return (
            // the fetches overlap, or come close
            request.start <= requestGroup.end + this.maxExtraSize &&
            // aggregating would not result in a fetch that is too big
            request.end - request.start + requestGroup.end - requestGroup.start <
            this.maxFetchSize
        )
    }

    // returns a promise that only resolves
    // when all of the signals in the given array
    // have fired their abort signal
    _allSignalsFired(signals) {
        return new Promise(resolve => {
            let signalsLeft = signals.filter(s => !s.aborted).length
            signals.forEach(signal => {
                signal.addEventListener('abort', () => {
                    signalsLeft -= 1
                    // console.log('aggregatingfetcher received an abort')
                    if (!signalsLeft) {
                        // console.log('aggregatingfetcher aborting aggegated request')
                        resolve()
                    }
                })
            })
        }).catch(e => {
            // eslint-disable-next-line no-console
            console.error(e)
        })
    }

    // dispatch a request group as a single request
    // and then slice the result back up to satisfy
    // the individual requests
    _dispatch({ url, start, end, requests }) {
        // if any of the requests have an AbortSignal `signal` in their requestOptions,
        // make our aggregating abortcontroller track it, aborting the request if
        // all of the abort signals that are aggregated here have fired

        const abortWholeRequest = new AbortController()
        const signals = []
        requests.forEach(({ requestOptions }) => {
            if (requestOptions && requestOptions.signal) {
                signals.push(requestOptions.signal)
            }
        })
        if (signals.length === requests.length) {
            this._allSignalsFired(signals).then(() => abortWholeRequest.abort())
        }

        this.fetchCallback(url, start, end - 1, {
            signal: abortWholeRequest.signal,
        }).then(
            response => {

                const data = response

                requests.forEach(({ start: reqStart, end: reqEnd, resolve }) => {
                    // remember Buffer.slice does not copy, it creates
                    // an offset child buffer pointing to the same data
                    resolve({
                        headers: response.headers,
                        buffer: data.slice(reqStart - start, reqEnd - start),
                    })
                })
            },
            err => {
                requests.forEach(({ reject }) => reject(err))
            },
        )
    }

    _aggregateAndDispatch() {
        console.log("Dispatch " + Object.entries(this.requestQueues).length)
        Object.entries(this.requestQueues).forEach(([url, requests]) => {
            if (!requests || !requests.length) {
                return
            }
            // console.log(url, requests)

            // we are now going to aggregate the requests in this url's queue
            // into groups of requests that can be dispatched as one
            const requestsToDispatch = []

            // look to see if any of the requests are aborted, and if they are, just
            // reject them now and forget about them
            requests.forEach(request => {
                const { requestOptions, reject } = request
                if (requestOptions?.signal?.aborted) {
                    reject(Object.assign(new Error('aborted'), { code: 'ERR_ABORTED' }))
                } else {
                    requestsToDispatch.push(request)
                }
            })

            requestsToDispatch.sort((a, b) => a.start - b.start)

            // eslint-disable-next-line no-param-reassign
            requests.length = 0
            if (!requestsToDispatch.length) {
                return
            }

            let currentRequestGroup
            for (let i = 0; i < requestsToDispatch.length; i += 1) {
                const next = requestsToDispatch[i]
                if (
                    currentRequestGroup &&
                    this._canAggregate(currentRequestGroup, next)
                ) {
                    // aggregate it into the current group
                    currentRequestGroup.requests.push(next)
                    currentRequestGroup.end = next.end
                } else {
                    // out of range, dispatch the current request group
                    if (currentRequestGroup) {
                        this._dispatch(currentRequestGroup)
                    }
                    // and start on a new one
                    currentRequestGroup = {
                        requests: [next],
                        url,
                        start: next.start,
                        end: next.end,
                    }
                }
            }
            if (currentRequestGroup) {
                this._dispatch(currentRequestGroup)
            }
        })
    }

    _enQueue(url, request) {
        if (!this.requestQueues[url]) {
            this.requestQueues[url] = []
        }
        this.requestQueues[url].push(request)
    }

    /**
     *
     * @param {string} url
     * @param {number} start 0-based half-open
     * @param {number} end 0-based half-open
     * @param {object} [requestOptions] options passed to the underlying fetch call
     */
    fetch(url, start, end, requestOptions = {}) {
        console.log(`fetch ${start} - ${end}`)
        return new Promise((resolve, reject) => {
            console.log(`enqueu ${start} - ${end}`)
            this._enQueue(url, { start, end, resolve, reject, requestOptions })
            if (!this.timeout) {
                this.timeout = setTimeout(() => {
                    this.timeout = undefined
                    console.log(`dispatch`)
                    this._aggregateAndDispatch()
                }, this.frequency || 1)
            }
        })
    }
}