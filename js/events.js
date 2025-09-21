class EventEmitter {


    constructor() {
        // Map of event name -> [ handlerFn, ... ]
        this.eventHandlers = new Map()
    }

    on(eventName, fn) {
        if (!this.eventHandlers.has(eventName)) {
            this.eventHandlers.set(eventName, [])
        }
        this.eventHandlers.get(eventName).push(fn)
    }


    /**
     * @deprecated use off()
     * @param eventName
     * @param fn
     */
    un(eventName, fn) {
        this.off(eventName, fn)
    }


    off(eventName, fn) {

        if (!eventName) {
            this.eventHandlers.clear()   // Remove all event handlers
        } else if (!fn) {
            this.eventHandlers.delete(eventName) // Remove all eventhandlers matching name
        } else {
            // Remove specific event handler
            const handlers = this.eventHandlers.get(eventName)
            if (!handlers || handlers.length === 0) {
                console.warn("No handlers to remove for event: " + eventName)
            } else {
                const callbackIndex = handlers.indexOf(fn)
                if (callbackIndex !== -1) {
                    handlers.splice(callbackIndex, 1)
                }
            }
        }
    }

    emit(eventName, args, thisObj) {

        const handlers = this.eventHandlers.get(eventName)
        if (undefined === handlers || handlers.length === 0) {
            return undefined
        }

        const scope = thisObj || globalThis
        const results = handlers.map(function (handler) {
            return handler.apply(scope, args)
        })

        return results
    }
}

export {EventEmitter}