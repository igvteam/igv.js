import * as http from 'http'
import * as https from 'https'
import {performance} from 'perf_hooks'

var id = 0

function _classPrivateFieldLooseKey(name) {
    return "__private_" + id++ + "_" + name
}

function _classPrivateFieldLooseBase(receiver, privateKey) {
    if (!Object.prototype.hasOwnProperty.call(receiver, privateKey)) {
        throw new TypeError("attempted to use private field on non-instance")
    }

    return receiver
}

// The MIT License (MIT)
const internalEventSymbol = Symbol('InternalEvent')

class InternalEvent {
    constructor(type, eventInit) {
        var _eventInit$bubbles, _eventInit$cancelable

        this.canceled = void 0
        this.immediatePropagationStoped = void 0
        this.initialized = void 0
        this.propagationStoped = void 0
        this.bubbles = void 0
        this.cancelable = void 0
        this.eventPhase = void 0
        this.target = void 0
        this.timeStamp = void 0
        this.type = void 0
        this.canceled = false
        this.immediatePropagationStoped = false
        this.initialized = true
        this.propagationStoped = false
        this.bubbles = (_eventInit$bubbles = eventInit.bubbles) != null ? _eventInit$bubbles : false
        this.cancelable = (_eventInit$cancelable = eventInit.cancelable) != null ? _eventInit$cancelable : false
        this.eventPhase = Event.NONE
        this.target = null
        this.timeStamp = performance.now()
        this.type = type
    }

}

/**
 * @see {@link https://dom.spec.whatwg.org/#interface-event DOM Standard - 2.2. Interface Event}
 */

class Event {
    get bubbles() {
        return this[internalEventSymbol].bubbles
    }

    get cancelable() {
        return this[internalEventSymbol].cancelable
    }

    get currentTarget() {
        return this[internalEventSymbol].target
    }

    get defaultPrevented() {
        return this[internalEventSymbol].canceled
    }

    get eventPhase() {
        return this[internalEventSymbol].eventPhase
    }

    /**
     * @todo Make the value changeable.
     */


    get isTrusted() {
        return true
    }

    get target() {
        return this[internalEventSymbol].target
    }

    get timeStamp() {
        return this[internalEventSymbol].timeStamp
    }

    get type() {
        return this[internalEventSymbol].type
    }

    constructor(type, eventInit = {}) {
        var _eventInit$bubbles2, _eventInit$cancelable2

        this.NONE = Event.NONE
        this.CAPTURING_PHASE = Event.CAPTURING_PHASE
        this.AT_TARGET = Event.AT_TARGET
        this.BUBBLING_PHASE = Event.BUBBLING_PHASE
        this[internalEventSymbol] = void 0
        if (!type) throw new TypeError('Not enough arguments.')
        Object.defineProperty(this, internalEventSymbol, {
            enumerable: false,
            value: new InternalEvent(type, {
                bubbles: (_eventInit$bubbles2 = eventInit.bubbles) != null ? _eventInit$bubbles2 : false,
                cancelable: (_eventInit$cancelable2 = eventInit.cancelable) != null ? _eventInit$cancelable2 : false
            }),
            writable: true
        })
    }

    preventDefault() {
        if (this.cancelable && !this[internalEventSymbol].canceled) {
            this[internalEventSymbol].canceled = true
        }
    }

    stopImmediatePropagation() {
        if (!this[internalEventSymbol].immediatePropagationStoped) {
            this[internalEventSymbol].immediatePropagationStoped = true
        }
    }

    stopPropagation() {
        if (!this[internalEventSymbol].propagationStoped) {
            this[internalEventSymbol].propagationStoped = true
        }
    }

}

Event.NONE = 0
Event.CAPTURING_PHASE = 1
Event.AT_TARGET = 2
Event.BUBBLING_PHASE = 3

var _lengthComputable = /*#__PURE__*/_classPrivateFieldLooseKey("lengthComputable")

var _loaded = /*#__PURE__*/_classPrivateFieldLooseKey("loaded")

var _total = /*#__PURE__*/_classPrivateFieldLooseKey("total")

class ProgressEvent extends Event {
    get lengthComputable() {
        return _classPrivateFieldLooseBase(this, _lengthComputable)[_lengthComputable]
    }

    get loaded() {
        return _classPrivateFieldLooseBase(this, _loaded)[_loaded]
    }

    get total() {
        return _classPrivateFieldLooseBase(this, _total)[_total]
    }

    constructor(type, eventInit = {}) {
        var _eventInit$lengthComp, _eventInit$loaded, _eventInit$total

        super(type, eventInit)
        Object.defineProperty(this, _lengthComputable, {
            writable: true,
            value: void 0
        })
        Object.defineProperty(this, _loaded, {
            writable: true,
            value: void 0
        })
        Object.defineProperty(this, _total, {
            writable: true,
            value: void 0
        })
        _classPrivateFieldLooseBase(this, _lengthComputable)[_lengthComputable] = (_eventInit$lengthComp = eventInit.lengthComputable) != null ? _eventInit$lengthComp : false
        _classPrivateFieldLooseBase(this, _loaded)[_loaded] = (_eventInit$loaded = eventInit.loaded) != null ? _eventInit$loaded : 0
        _classPrivateFieldLooseBase(this, _total)[_total] = (_eventInit$total = eventInit.total) != null ? _eventInit$total : 0
    }

}

var _codeMap = /*#__PURE__*/_classPrivateFieldLooseKey("codeMap")

var _message = /*#__PURE__*/_classPrivateFieldLooseKey("message")

var _name = /*#__PURE__*/_classPrivateFieldLooseKey("name")

// The MIT License (MIT)
//
// Copyright (c) 2013-2020 Yamagishi Kazutoshi
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

/**
 * @see {@link https://heycam.github.io/webidl/#idl-DOMException Web IDL - 4.3. DOMException}
 */
class DOMException extends Error {
    /**
     * @deprecated since version 3.0
     */

    /**
     * @deprecated since version 3.0
     */

    /**
     * @deprecated since version 3.0
     */

    /**
     * @deprecated since version 3.0
     */

    /**
     * @deprecated since version 3.0
     */

    /**
     * @deprecated since version 3.0
     */

    /**
     * @deprecated since version 3.0
     */

    /**
     * @deprecated since version 3.0
     */

    /**
     * @deprecated since version 3.0
     */

    /**
     * @deprecated since version 3.0
     */

    /**
     * @deprecated since version 3.0
     */

    /**
     * @deprecated since version 3.0
     */

    /**
     * @deprecated since version 3.0
     */

    /**
     * @deprecated since version 3.0
     */

    /**
     * @deprecated since version 3.0
     */

    /**
     * @deprecated since version 3.0
     */

    /**
     * @deprecated since version 3.0
     */

    /**
     * @deprecated since version 3.0
     */

    /**
     * @deprecated since version 3.0
     */

    /**
     * @deprecated since version 3.0
     */

    /**
     * @deprecated since version 3.0
     */

    /**
     * @deprecated since version 3.0
     */

    /**
     * @deprecated since version 3.0
     */

    /**
     * @deprecated since version 3.0
     */

    /**
     * @deprecated since version 3.0
     */

    /**
     * @deprecated since version 3.0
     */

    /**
     * @deprecated since version 3.0
     */

    /**
     * @deprecated since version 3.0
     */

    /**
     * @deprecated since version 3.0
     */

    /**
     * @deprecated since version 3.0
     */

    /**
     * @deprecated since version 3.0
     */

    /**
     * @deprecated since version 3.0
     */

    /**
     * @deprecated since version 3.0
     */

    /**
     * @deprecated since version 3.0
     */

    /**
     * @deprecated since version 3.0
     */

    /**
     * @deprecated since version 3.0
     */

    /**
     * @deprecated since version 3.0
     */

    /**
     * @deprecated since version 3.0
     */

    /**
     * @deprecated since version 3.0
     */

    /**
     * @deprecated since version 3.0
     */

    /**
     * @deprecated since version 3.0
     */

    /**
     * @deprecated since version 3.0
     */

    /**
     * @deprecated since version 3.0
     */

    /**
     * @deprecated since version 3.0
     */

    /**
     * @deprecated since version 3.0
     */

    /**
     * @deprecated since version 3.0
     */

    /**
     * @deprecated since version 3.0
     */

    /**
     * @deprecated since version 3.0
     */

    /**
     * @deprecated since version 3.0
     */

    /**
     * @deprecated since version 3.0
     */

    /**
     * @deprecated since version 3.0
     */
    get code() {
        var _classPrivateFieldLoo

        return (_classPrivateFieldLoo = _classPrivateFieldLooseBase(this, _codeMap)[_codeMap].get(this.name)) != null ? _classPrivateFieldLoo : 0
    }

    get message() {
        return _classPrivateFieldLooseBase(this, _message)[_message]
    }

    get name() {
        return _classPrivateFieldLooseBase(this, _name)[_name]
    }

    constructor(message = '', name = 'Error') {
        super(message)
        this.INDEX_SIZE_ERR = DOMException.INDEX_SIZE_ERR
        this.DOMSTRING_SIZE_ERR = DOMException.DOMSTRING_SIZE_ERR
        this.HIERARCHY_REQUEST_ERR = DOMException.HIERARCHY_REQUEST_ERR
        this.WRONG_DOCUMENT_ERR = DOMException.WRONG_DOCUMENT_ERR
        this.INVALID_CHARACTER_ERR = DOMException.INVALID_CHARACTER_ERR
        this.NO_DATA_ALLOWED_ERR = DOMException.NO_DATA_ALLOWED_ERR
        this.NO_MODIFICATION_ALLOWED_ERR = DOMException.NO_MODIFICATION_ALLOWED_ERR
        this.NOT_FOUND_ERR = DOMException.NOT_FOUND_ERR
        this.NOT_SUPPORTED_ERR = DOMException.NOT_SUPPORTED_ERR
        this.INUSE_ATTRIBUTE_ERR = DOMException.INUSE_ATTRIBUTE_ERR
        this.INVALID_STATE_ERR = DOMException.INVALID_STATE_ERR
        this.SYNTAX_ERR = DOMException.SYNTAX_ERR
        this.INVALID_MODIFICATION_ERR = DOMException.INVALID_MODIFICATION_ERR
        this.NAMESPACE_ERR = DOMException.NAMESPACE_ERR
        this.INVALID_ACCESS_ERR = DOMException.INVALID_ACCESS_ERR
        this.VALIDATION_ERR = DOMException.VALIDATION_ERR
        this.TYPE_MISMATCH_ERR = DOMException.TYPE_MISMATCH_ERR
        this.SECURITY_ERR = DOMException.SECURITY_ERR
        this.NETWORK_ERR = DOMException.NETWORK_ERR
        this.ABORT_ERR = DOMException.ABORT_ERR
        this.URL_MISMATCH_ERR = DOMException.URL_MISMATCH_ERR
        this.QUOTA_EXCEEDED_ERR = DOMException.QUOTA_EXCEEDED_ERR
        this.TIMEOUT_ERR = DOMException.TIMEOUT_ERR
        this.INVALID_NODE_TYPE_ERR = DOMException.INVALID_NODE_TYPE_ERR
        this.DATA_CLONE_ERR = DOMException.DATA_CLONE_ERR
        Object.defineProperty(this, _codeMap, {
            writable: true,
            value: new Map([['IndexSizeError', DOMException.INDEX_SIZE_ERR], ['HierarchyRequestError', DOMException.HIERARCHY_REQUEST_ERR], ['WrongDocumentError', DOMException.WRONG_DOCUMENT_ERR], ['InvalidCharacterError', DOMException.INVALID_CHARACTER_ERR], ['NotFoundError', DOMException.NOT_FOUND_ERR], ['NotSupportedError', DOMException.NOT_SUPPORTED_ERR], ['InvalidStateError', DOMException.INVALID_STATE_ERR], ['SyntaxError', DOMException.SYNTAX_ERR], ['InvalidModificationError', DOMException.INVALID_MODIFICATION_ERR], ['NamespaceError', DOMException.NAMESPACE_ERR], ['InvalidAccessError', DOMException.INVALID_ACCESS_ERR], ['TypeMismatchError', DOMException.TYPE_MISMATCH_ERR], ['SecurityError', DOMException.SECURITY_ERR], ['NetworkError', DOMException.NETWORK_ERR], ['AbortError', DOMException.ABORT_ERR], ['URLMismatchError', DOMException.URL_MISMATCH_ERR], ['QuotaExceededError', DOMException.QUOTA_EXCEEDED_ERR], ['TimeoutError', DOMException.TIMEOUT_ERR], ['InvalidNodeTypeError', DOMException.INVALID_NODE_TYPE_ERR], ['DataCloneError', DOMException.DATA_CLONE_ERR]])
        })
        Object.defineProperty(this, _message, {
            writable: true,
            value: void 0
        })
        Object.defineProperty(this, _name, {
            writable: true,
            value: void 0
        })
        _classPrivateFieldLooseBase(this, _message)[_message] = message
        _classPrivateFieldLooseBase(this, _name)[_name] = name
    }

}

DOMException.INDEX_SIZE_ERR = 1
DOMException.DOMSTRING_SIZE_ERR = 2
DOMException.HIERARCHY_REQUEST_ERR = 3
DOMException.WRONG_DOCUMENT_ERR = 4
DOMException.INVALID_CHARACTER_ERR = 5
DOMException.NO_DATA_ALLOWED_ERR = 6
DOMException.NO_MODIFICATION_ALLOWED_ERR = 7
DOMException.NOT_FOUND_ERR = 8
DOMException.NOT_SUPPORTED_ERR = 9
DOMException.INUSE_ATTRIBUTE_ERR = 10
DOMException.INVALID_STATE_ERR = 11
DOMException.SYNTAX_ERR = 12
DOMException.INVALID_MODIFICATION_ERR = 13
DOMException.NAMESPACE_ERR = 14
DOMException.INVALID_ACCESS_ERR = 15
DOMException.VALIDATION_ERR = 16
DOMException.TYPE_MISMATCH_ERR = 17
DOMException.SECURITY_ERR = 18
DOMException.NETWORK_ERR = 19
DOMException.ABORT_ERR = 20
DOMException.URL_MISMATCH_ERR = 21
DOMException.QUOTA_EXCEEDED_ERR = 22
DOMException.TIMEOUT_ERR = 23
DOMException.INVALID_NODE_TYPE_ERR = 24
DOMException.DATA_CLONE_ERR = 25

/**
 * @see {@link https://dom.spec.whatwg.org/#interface-eventtarget DOM Standard - 2.7. Interface EventTarget}
 */

var _listeners = /*#__PURE__*/_classPrivateFieldLooseKey("listeners")

class EventTarget {
    constructor() {
        Object.defineProperty(this, _listeners, {
            writable: true,
            value: void 0
        })
        _classPrivateFieldLooseBase(this, _listeners)[_listeners] = {}
    }

    /**
     * @see {@link https://dom.spec.whatwg.org/#dom-eventtarget-addeventlistener DOM Standard - The addEventListener(type, callback, options) method}
     */


    addEventListener(type, listener, // eslint-disable-next-line @typescript-eslint/no-unused-vars
                     options = false) {
        var _classPrivateFieldLoo

        _classPrivateFieldLooseBase(this, _listeners)[_listeners][type] = (_classPrivateFieldLoo = _classPrivateFieldLooseBase(this, _listeners)[_listeners][type]) != null ? _classPrivateFieldLoo : new Set()

        if (!_classPrivateFieldLooseBase(this, _listeners)[_listeners][type].has(listener)) {
            _classPrivateFieldLooseBase(this, _listeners)[_listeners][type].add(listener)
        }
    }

    /**
     * @see {@link https://dom.spec.whatwg.org/#dom-eventtarget-dispatchevent DOM Standard - The dispatchEvent(event) method}
     */


    dispatchEvent(event) {
        if (!(event instanceof Event)) {
            // TODO: Add human readable message.
            throw new TypeError('')
        }

        event[internalEventSymbol].eventPhase = Event.CAPTURING_PHASE
        event[internalEventSymbol].target = this
        event[internalEventSymbol].eventPhase = Event.AT_TARGET

        const listeners = _classPrivateFieldLooseBase(this, _listeners)[_listeners][event.type]

        if (listeners && !event[internalEventSymbol].propagationStoped) {
            for (const listener of listeners) {
                if (typeof listener === 'undefined') continue

                if (typeof listener === 'function') {
                    listener.call(this, event)
                } else if (typeof listener.handleEvent === 'function') {
                    listener.handleEvent.call(listener, event)
                }
            }
        }

        if (event.bubbles) {
            event[internalEventSymbol].eventPhase = Event.BUBBLING_PHASE
        }

        event[internalEventSymbol].eventPhase = Event.NONE
        return event.defaultPrevented
    }

    /**
     * @see {@link https://dom.spec.whatwg.org/#dom-eventtarget-removeeventlistener DOM Standard - The removeEventListener(type, callback, options) method}
     */


    removeEventListener(type, listener, // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        options = false) {
        if (_classPrivateFieldLooseBase(this, _listeners)[_listeners][type]) {
            _classPrivateFieldLooseBase(this, _listeners)[_listeners][type].delete(listener)
        }
    }

}

var _onabort = /*#__PURE__*/_classPrivateFieldLooseKey("onabort")

var _onerror = /*#__PURE__*/_classPrivateFieldLooseKey("onerror")

var _onload = /*#__PURE__*/_classPrivateFieldLooseKey("onload")

var _onloadstart = /*#__PURE__*/_classPrivateFieldLooseKey("onloadstart")

var _onloadend = /*#__PURE__*/_classPrivateFieldLooseKey("onloadend")

var _onprogress = /*#__PURE__*/_classPrivateFieldLooseKey("onprogress")

var _ontimeout = /*#__PURE__*/_classPrivateFieldLooseKey("ontimeout")

class XMLHttpRequestEventTarget extends EventTarget {
    get onabort() {
        return _classPrivateFieldLooseBase(this, _onabort)[_onabort]
    }

    set onabort(value) {
        if (_classPrivateFieldLooseBase(this, _onabort)[_onabort]) {
            this.removeEventListener('abort', _classPrivateFieldLooseBase(this, _onabort)[_onabort])
        }

        if (typeof value === 'function') {
            _classPrivateFieldLooseBase(this, _onabort)[_onabort] = value
            this.addEventListener('abort', _classPrivateFieldLooseBase(this, _onabort)[_onabort])
        } else {
            _classPrivateFieldLooseBase(this, _onabort)[_onabort] = null
        }
    }

    get onerror() {
        return _classPrivateFieldLooseBase(this, _onerror)[_onerror]
    }

    set onerror(value) {
        if (_classPrivateFieldLooseBase(this, _onerror)[_onerror]) {
            this.removeEventListener('error', _classPrivateFieldLooseBase(this, _onerror)[_onerror])
        }

        if (typeof value === 'function') {
            _classPrivateFieldLooseBase(this, _onerror)[_onerror] = value
            this.addEventListener('error', _classPrivateFieldLooseBase(this, _onerror)[_onerror])
        } else {
            _classPrivateFieldLooseBase(this, _onerror)[_onerror] = null
        }
    }

    get onload() {
        return _classPrivateFieldLooseBase(this, _onload)[_onload]
    }

    set onload(value) {
        if (_classPrivateFieldLooseBase(this, _onload)[_onload]) {
            this.removeEventListener('load', _classPrivateFieldLooseBase(this, _onload)[_onload])
        }

        if (typeof value === 'function') {
            _classPrivateFieldLooseBase(this, _onload)[_onload] = value
            this.addEventListener('load', _classPrivateFieldLooseBase(this, _onload)[_onload])
        } else {
            _classPrivateFieldLooseBase(this, _onload)[_onload] = null
        }
    }

    get onloadstart() {
        return _classPrivateFieldLooseBase(this, _onloadstart)[_onloadstart]
    }

    set onloadstart(value) {
        if (_classPrivateFieldLooseBase(this, _onloadstart)[_onloadstart]) {
            this.removeEventListener('loadstart', _classPrivateFieldLooseBase(this, _onloadstart)[_onloadstart])
        }

        if (typeof value === 'function') {
            _classPrivateFieldLooseBase(this, _onloadstart)[_onloadstart] = value
            this.addEventListener('loadstart', _classPrivateFieldLooseBase(this, _onloadstart)[_onloadstart])
        } else {
            _classPrivateFieldLooseBase(this, _onloadstart)[_onloadstart] = null
        }
    }

    get onloadend() {
        return _classPrivateFieldLooseBase(this, _onloadend)[_onloadend]
    }

    set onloadend(value) {
        if (_classPrivateFieldLooseBase(this, _onloadend)[_onloadend]) {
            this.removeEventListener('loadend', _classPrivateFieldLooseBase(this, _onloadend)[_onloadend])
        }

        if (typeof value === 'function') {
            _classPrivateFieldLooseBase(this, _onloadend)[_onloadend] = value
            this.addEventListener('loadend', _classPrivateFieldLooseBase(this, _onloadend)[_onloadend])
        } else {
            _classPrivateFieldLooseBase(this, _onloadend)[_onloadend] = null
        }
    }

    get onprogress() {
        return _classPrivateFieldLooseBase(this, _onprogress)[_onprogress]
    }

    set onprogress(value) {
        if (_classPrivateFieldLooseBase(this, _onprogress)[_onprogress]) {
            this.removeEventListener('progress', _classPrivateFieldLooseBase(this, _onprogress)[_onprogress])
        }

        if (typeof value === 'function') {
            _classPrivateFieldLooseBase(this, _onprogress)[_onprogress] = value
            this.addEventListener('progress', _classPrivateFieldLooseBase(this, _onprogress)[_onprogress])
        } else {
            _classPrivateFieldLooseBase(this, _onprogress)[_onprogress] = null
        }
    }

    get ontimeout() {
        return _classPrivateFieldLooseBase(this, _ontimeout)[_ontimeout]
    }

    set ontimeout(value) {
        if (_classPrivateFieldLooseBase(this, _ontimeout)[_ontimeout]) {
            this.removeEventListener('timeout', _classPrivateFieldLooseBase(this, _ontimeout)[_ontimeout])
        }

        if (typeof value === 'function') {
            _classPrivateFieldLooseBase(this, _ontimeout)[_ontimeout] = value
            this.addEventListener('timeout', _classPrivateFieldLooseBase(this, _ontimeout)[_ontimeout])
        } else {
            _classPrivateFieldLooseBase(this, _ontimeout)[_ontimeout] = null
        }
    }

    constructor() {
        super()
        Object.defineProperty(this, _onabort, {
            writable: true,
            value: void 0
        })
        Object.defineProperty(this, _onerror, {
            writable: true,
            value: void 0
        })
        Object.defineProperty(this, _onload, {
            writable: true,
            value: void 0
        })
        Object.defineProperty(this, _onloadstart, {
            writable: true,
            value: void 0
        })
        Object.defineProperty(this, _onloadend, {
            writable: true,
            value: void 0
        })
        Object.defineProperty(this, _onprogress, {
            writable: true,
            value: void 0
        })
        Object.defineProperty(this, _ontimeout, {
            writable: true,
            value: void 0
        })
        _classPrivateFieldLooseBase(this, _onabort)[_onabort] = null
        _classPrivateFieldLooseBase(this, _onerror)[_onerror] = null
        _classPrivateFieldLooseBase(this, _onload)[_onload] = null
        _classPrivateFieldLooseBase(this, _onloadstart)[_onloadstart] = null
        _classPrivateFieldLooseBase(this, _onloadend)[_onloadend] = null
        _classPrivateFieldLooseBase(this, _onprogress)[_onprogress] = null
        _classPrivateFieldLooseBase(this, _ontimeout)[_ontimeout] = null
    }

}

// The MIT License (MIT)
class XMLHttpRequestUpload extends XMLHttpRequestEventTarget {
}

const FORBIDDEN_METHODS = ['connect', 'trace', 'track']
const ACCEPTABLE_RESPONSE_TYPES = ['', 'arraybuffer', 'blob', 'document', 'json', 'text']
/**
 * @see {@link https://fetch.spec.whatwg.org/#forbidden-header-name Fetch Standard - forbidden header name}
 */

const FORBIDDEN_REQUEST_HEADERS = ['accept-charset', 'accept-encoding', 'access-control-request-headers', 'access-control-request-method', 'connection', 'content-length', 'cookie', 'cookie2', 'date', 'dnt', 'expect', 'host', 'keep-alive', 'origin', 'referer', 'te', 'trailer', 'transfer-encoding', 'upgrade', 'via']
/**
 * @see {@link https://fetch.spec.whatwg.org/#forbidden-response-header-name Fetch Standard - forbidden response header name}
 */

const FORBIDDEN_RESPONSE_HEADERS = ['set-cookie', 'set-cookie2']
/**
 * @see {@link https://tools.ietf.org/html/rfc7230#section-3.2.6 RFC 7230 - HTTP/1.1 Message Syntax and Routing - 3.2.6. Field Value Components}
 */

const HTTP_HEADER_FIELD_NAME_REGEXP = /[!#$%&'*+-.^_`|~a-z0-9]+/
/**
 * @see {@link https://xhr.spec.whatwg.org/#interface-xmlhttprequest XMLHttpRequest Standard - 4. Interface XMLHttpRequest}
 */

var _client = /*#__PURE__*/_classPrivateFieldLooseKey("client")

var _onreadystatechange = /*#__PURE__*/_classPrivateFieldLooseKey("onreadystatechange")

var _responseBuffer = /*#__PURE__*/_classPrivateFieldLooseKey("responseBuffer")

var _responseHeaders = /*#__PURE__*/_classPrivateFieldLooseKey("responseHeaders")

var _readyState = /*#__PURE__*/_classPrivateFieldLooseKey("readyState")

var _responseType = /*#__PURE__*/_classPrivateFieldLooseKey("responseType")

var _responseURL = /*#__PURE__*/_classPrivateFieldLooseKey("responseURL")

var _status = /*#__PURE__*/_classPrivateFieldLooseKey("status")

var _statusText = /*#__PURE__*/_classPrivateFieldLooseKey("statusText")

var _timeout = /*#__PURE__*/_classPrivateFieldLooseKey("timeout")

var _withCredentials = /*#__PURE__*/_classPrivateFieldLooseKey("withCredentials")

class XMLHttpRequest extends XMLHttpRequestEventTarget {
    get onreadystatechange() {
        return _classPrivateFieldLooseBase(this, _onreadystatechange)[_onreadystatechange]
    }

    set onreadystatechange(value) {
        if (_classPrivateFieldLooseBase(this, _onreadystatechange)[_onreadystatechange]) {
            this.removeEventListener('readystatechange', _classPrivateFieldLooseBase(this, _onreadystatechange)[_onreadystatechange])
        }

        if (typeof value === 'function') {
            _classPrivateFieldLooseBase(this, _onreadystatechange)[_onreadystatechange] = value
            this.addEventListener('readystatechange', _classPrivateFieldLooseBase(this, _onreadystatechange)[_onreadystatechange])
        } else {
            _classPrivateFieldLooseBase(this, _onreadystatechange)[_onreadystatechange] = null
        }
    }

    get readyState() {
        return _classPrivateFieldLooseBase(this, _readyState)[_readyState]
    } // eslint-disable-next-line @typescript-eslint/no-explicit-any


    get response() {
        if (this.readyState !== XMLHttpRequest.DONE) {
            return null
        }

        switch (this.responseType) {
            case 'arraybuffer':
                return new Uint8Array(_classPrivateFieldLooseBase(this, _responseBuffer)[_responseBuffer]).buffer

            case 'blob':
                return _classPrivateFieldLooseBase(this, _responseBuffer)[_responseBuffer]

            case 'document':
                return this.responseXML

            case 'json':
                try {
                    const text = _classPrivateFieldLooseBase(this, _responseBuffer)[_responseBuffer].toString() // eslint-disable-next-line @typescript-eslint/no-unsafe-return


                    return JSON.parse(text)
                } catch (_unused) {
                    return null
                }

            default:
                return this.responseText
        }
    }

    get responseText() {
        if (this.responseType !== '' && this.responseType !== 'text') {
            // TODO: Add human readable message.
            throw new DOMException('', 'InvalidStateError')
        }

        if (this.readyState !== XMLHttpRequest.LOADING && this.readyState !== XMLHttpRequest.DONE) {
            return ''
        }

        return _classPrivateFieldLooseBase(this, _responseBuffer)[_responseBuffer].toString()
    }

    get responseType() {
        return _classPrivateFieldLooseBase(this, _responseType)[_responseType]
    }

    set responseType(value) {
        if (ACCEPTABLE_RESPONSE_TYPES.includes(value)) {
            if (this.readyState === XMLHttpRequest.LOADING || this.readyState === XMLHttpRequest.DONE) {
                // TODO: Add human readable message.
                throw new DOMException('', 'InvalidStateError')
            }

            _classPrivateFieldLooseBase(this, _responseType)[_responseType] = value
        }
    }

    get responseURL() {
        return _classPrivateFieldLooseBase(this, _responseURL)[_responseURL]
    }

    get responseXML() {
        if (this.responseType !== '' && this.responseType !== 'document') {
            // TODO: Add human readable message.
            throw new DOMException('', 'InvalidStateError')
        }

        if (this.readyState !== XMLHttpRequest.DONE) {
            return null
        }

        return null
    }

    get status() {
        return _classPrivateFieldLooseBase(this, _status)[_status]
    }

    get statusText() {
        return _classPrivateFieldLooseBase(this, _statusText)[_statusText]
    }

    get timeout() {
        return _classPrivateFieldLooseBase(this, _timeout)[_timeout]
    }

    set timeout(value) {
        _classPrivateFieldLooseBase(this, _timeout)[_timeout] = value
    }

    get withCredentials() {
        return _classPrivateFieldLooseBase(this, _withCredentials)[_withCredentials]
    }

    set withCredentials(value) {
        if (this.readyState !== XMLHttpRequest.UNSENT && this.readyState !== XMLHttpRequest.OPENED) {
            // TODO: Add human readable message.
            throw new DOMException('', 'InvalidStateError')
        }

        _classPrivateFieldLooseBase(this, _withCredentials)[_withCredentials] = value
    }

    constructor() {
        super()
        this.UNSENT = XMLHttpRequest.UNSENT
        this.OPENED = XMLHttpRequest.OPENED
        this.HEADERS_RECEIVED = XMLHttpRequest.HEADERS_RECEIVED
        this.LOADING = XMLHttpRequest.LOADING
        this.DONE = XMLHttpRequest.DONE
        this.upload = void 0
        Object.defineProperty(this, _client, {
            writable: true,
            value: void 0
        })
        Object.defineProperty(this, _onreadystatechange, {
            writable: true,
            value: void 0
        })
        Object.defineProperty(this, _responseBuffer, {
            writable: true,
            value: void 0
        })
        Object.defineProperty(this, _responseHeaders, {
            writable: true,
            value: void 0
        })
        Object.defineProperty(this, _readyState, {
            writable: true,
            value: void 0
        })
        Object.defineProperty(this, _responseType, {
            writable: true,
            value: void 0
        })
        Object.defineProperty(this, _responseURL, {
            writable: true,
            value: void 0
        })
        Object.defineProperty(this, _status, {
            writable: true,
            value: void 0
        })
        Object.defineProperty(this, _statusText, {
            writable: true,
            value: void 0
        })
        Object.defineProperty(this, _timeout, {
            writable: true,
            value: void 0
        })
        Object.defineProperty(this, _withCredentials, {
            writable: true,
            value: void 0
        })
        this.upload = new XMLHttpRequestUpload()
        _classPrivateFieldLooseBase(this, _client)[_client] = null
        _classPrivateFieldLooseBase(this, _onreadystatechange)[_onreadystatechange] = null
        _classPrivateFieldLooseBase(this, _responseBuffer)[_responseBuffer] = Buffer.alloc(0)
        _classPrivateFieldLooseBase(this, _responseHeaders)[_responseHeaders] = null
        _classPrivateFieldLooseBase(this, _readyState)[_readyState] = XMLHttpRequest.UNSENT
        _classPrivateFieldLooseBase(this, _responseType)[_responseType] = ''
        _classPrivateFieldLooseBase(this, _responseURL)[_responseURL] = ''
        _classPrivateFieldLooseBase(this, _status)[_status] = 0
        _classPrivateFieldLooseBase(this, _statusText)[_statusText] = ''
        _classPrivateFieldLooseBase(this, _timeout)[_timeout] = 0
        _classPrivateFieldLooseBase(this, _withCredentials)[_withCredentials] = false
    }

    /**
     * @see {@link https://xhr.spec.whatwg.org/#the-abort()-method XMLHttpRequest Standard - 4.5.7. The abort() method}
     */


    abort() {
        if (this.readyState === XMLHttpRequest.UNSENT || this.readyState === XMLHttpRequest.OPENED || this.readyState === XMLHttpRequest.DONE || !_classPrivateFieldLooseBase(this, _client)[_client]) {
            return
        }

        _classPrivateFieldLooseBase(this, _client)[_client].destroy()

        _classPrivateFieldLooseBase(this, _readyState)[_readyState] = XMLHttpRequest.UNSENT
        this.dispatchEvent(new ProgressEvent('abort'))
        this.upload.dispatchEvent(new ProgressEvent('abort'))
        _classPrivateFieldLooseBase(this, _client)[_client] = null
    }

    /**
     * @see {@link https://xhr.spec.whatwg.org/#the-getallresponseheaders()-method XMLHttpRequest Standard - 4.6.5. The getAllResponseHeaders() method}
     */


    getAllResponseHeaders() {
        if (this.readyState === XMLHttpRequest.UNSENT || this.readyState === XMLHttpRequest.OPENED || !_classPrivateFieldLooseBase(this, _responseHeaders)[_responseHeaders]) {
            return ''
        }

        const headerNames = Object.keys(_classPrivateFieldLooseBase(this, _responseHeaders)[_responseHeaders]).sort()
        let result = ''

        for (const name of headerNames) {
            const value = _classPrivateFieldLooseBase(this, _responseHeaders)[_responseHeaders][name]

            if (value) {
                const values = Array.isArray(value) ? value : [value]

                for (const v of values) {
                    result += `${name}: ${v}\r\n`
                }
            }
        }

        return result
    }

    /**
     * @see {@link https://xhr.spec.whatwg.org/#the-getresponseheader()-method XMLHttpRequest Standard - 4.6.4. The getResponseHeader() method}
     */


    getResponseHeader(name) {
        if (this.readyState === XMLHttpRequest.UNSENT || this.readyState === XMLHttpRequest.OPENED || !_classPrivateFieldLooseBase(this, _responseHeaders)[_responseHeaders]) {
            return null
        } // Normalize value


        const headerName = `${name}`.toLowerCase()

        if (!HTTP_HEADER_FIELD_NAME_REGEXP.test(headerName)) {
            // TODO: Add human readable message.
            throw new DOMException('', 'SyntaxError')
        }

        if (FORBIDDEN_RESPONSE_HEADERS.includes(headerName)) {
            // TODO: Print human readable warn message.
            return null
        }

        const value = _classPrivateFieldLooseBase(this, _responseHeaders)[_responseHeaders][headerName] || null
        return Array.isArray(value) ? value.join(', ') : value
    }

    /**
     * @see {@link https://xhr.spec.whatwg.org/#the-open()-method 4.5.1. The open() method}
     */


    open(method, url, async = true, username = null, password = null) {
        if (!async) {
            // TODO: Add human readable message.
            throw new DOMException('', 'InvalidAccessError')
        }

        _classPrivateFieldLooseBase(this, _responseURL)[_responseURL] = ''
        let parsedURL

        try {
            parsedURL = new URL(url, 'http://localhost/')
        } catch (_unused2) {
            // TODO: Add human readable message.
            throw new DOMException('', 'SyntaxError')
        }

        if (FORBIDDEN_METHODS.includes(method.toLowerCase())) {
            // TODO: Add human readable message.
            throw new DOMException('', 'SecurityError')
        }

        const protocol = parsedURL.protocol
        const isHTTPS = protocol === 'https:'
        const user = username || parsedURL.username
        const pass = password || parsedURL.password
        const agent = isHTTPS ? https.globalAgent : http.globalAgent
        const auth = user ? pass ? `${user}:${pass}` : user : ''
        const path = parsedURL.pathname + parsedURL.search
        const port = parsedURL.port ? parseInt(parsedURL.port, 10) : isHTTPS ? 443 : 80
        _classPrivateFieldLooseBase(this, _client)[_client] = new http.ClientRequest({
            agent,
            auth,
            host: parsedURL.hostname,
            method,
            path,
            port,
            protocol
        })

        _classPrivateFieldLooseBase(this, _client)[_client].addListener('error', () => {
            this.dispatchEvent(new ProgressEvent('error'))
            this.upload.dispatchEvent(new ProgressEvent('error'))
            _classPrivateFieldLooseBase(this, _client)[_client] = null
            _classPrivateFieldLooseBase(this, _readyState)[_readyState] = XMLHttpRequest.DONE
        })

        _classPrivateFieldLooseBase(this, _client)[_client].addListener('response', response => {
            var _response$statusCode, _response$statusMessa

            _classPrivateFieldLooseBase(this, _readyState)[_readyState] = XMLHttpRequest.HEADERS_RECEIVED
            this.dispatchEvent(new Event('readystatechange'))
            _classPrivateFieldLooseBase(this, _status)[_status] = (_response$statusCode = response.statusCode) != null ? _response$statusCode : 0
            _classPrivateFieldLooseBase(this, _statusText)[_statusText] = (_response$statusMessa = response.statusMessage) != null ? _response$statusMessa : ''
            _classPrivateFieldLooseBase(this, _responseHeaders)[_responseHeaders] = response.headers
            _classPrivateFieldLooseBase(this, _responseURL)[_responseURL] = `${protocol}//${parsedURL.host}${path}`
            response.addListener('data', chunk => {
                if (_classPrivateFieldLooseBase(this, _responseBuffer)[_responseBuffer].length === 0) {
                    this.dispatchEvent(new ProgressEvent('loadstart'))
                }

                _classPrivateFieldLooseBase(this, _responseBuffer)[_responseBuffer] = Buffer.concat([_classPrivateFieldLooseBase(this, _responseBuffer)[_responseBuffer], chunk])
                _classPrivateFieldLooseBase(this, _readyState)[_readyState] = XMLHttpRequest.LOADING
                this.dispatchEvent(new Event('readystatechange'))
                this.dispatchEvent(new ProgressEvent('progress', {
                    loaded: _classPrivateFieldLooseBase(this, _responseBuffer)[_responseBuffer].length
                }))
            })
            response.addListener('end', () => {
                if (_classPrivateFieldLooseBase(this, _responseBuffer)[_responseBuffer].length === 0) {
                    _classPrivateFieldLooseBase(this, _readyState)[_readyState] = XMLHttpRequest.LOADING
                    this.dispatchEvent(new Event('readystatechange'))
                }

                _classPrivateFieldLooseBase(this, _client)[_client] = null
                _classPrivateFieldLooseBase(this, _readyState)[_readyState] = XMLHttpRequest.DONE
                this.dispatchEvent(new Event('readystatechange'))
                this.dispatchEvent(new ProgressEvent('load', {
                    loaded: _classPrivateFieldLooseBase(this, _responseBuffer)[_responseBuffer].length
                }))
                this.dispatchEvent(new ProgressEvent('loadend', {
                    loaded: _classPrivateFieldLooseBase(this, _responseBuffer)[_responseBuffer].length
                }))
            })
        })

        _classPrivateFieldLooseBase(this, _readyState)[_readyState] = XMLHttpRequest.OPENED
        this.dispatchEvent(new Event('readystatechange'))
    }

    /**
     * @see {@link https://xhr.spec.whatwg.org/#the-overridemimetype()-method XMLHttpRequest Standard - 4.6.7. The overrideMimeType() method}
     */


    overrideMimeType( // eslint-disable-next-line @typescript-eslint/no-unused-vars
        mime) {// TODO: Unimplemented.
    }

    /**
     * @see {@link https://xhr.spec.whatwg.org/#the-send()-method XMLHttpRequest Standard - 4.5.6. The send() method}
     */


    send(body = null) {

        if (this.readyState !== XMLHttpRequest.OPENED || !_classPrivateFieldLooseBase(this, _client)[_client]) {
            // TODO: Add human readable message.
            throw new DOMException('', 'InvalidStateError')
        }

        this.setRequestHeader('User-Agent', 'Mozilla')  // We are emulating a browser

        if (body) {
            const bodyInit = body instanceof ArrayBuffer || body instanceof Uint8Array ? Buffer.from(body) : body

            if (typeof bodyInit === 'string' || bodyInit instanceof Buffer) {
                const length = Buffer.isBuffer(bodyInit) ? bodyInit.length : Buffer.byteLength(bodyInit)

                _classPrivateFieldLooseBase(this, _client)[_client].setHeader('Content-Length', length)
            }

            _classPrivateFieldLooseBase(this, _client)[_client].addListener('socket', socket => {
                this.upload.dispatchEvent(new ProgressEvent('loadstart'))
                socket.addListener('data', () => {
                    this.upload.dispatchEvent(new ProgressEvent('progress'))
                })
                socket.addListener('end', () => {
                    this.upload.dispatchEvent(new ProgressEvent('load'))
                    this.upload.dispatchEvent(new ProgressEvent('loadend'))
                })
            })

            _classPrivateFieldLooseBase(this, _client)[_client].write(body)
        }

        this.dispatchEvent(new ProgressEvent('loadstart'))

        _classPrivateFieldLooseBase(this, _client)[_client].end()
    }

    /**
     * @see {@link https://xhr.spec.whatwg.org/#the-setrequestheader()-method XMLHttpRequest Standard - 4.5.2. The setRequestHeader() method}
     */


    setRequestHeader(name, value) {
        if (this.readyState !== XMLHttpRequest.OPENED || !_classPrivateFieldLooseBase(this, _client)[_client]) {
            // TODO: Add human readable message.
            throw new DOMException('', 'InvalidStateError')
        } // Normalize value


        const headerName = `${name}`.toLowerCase()
        const headerValue = `${value}`.trim()

        if (!HTTP_HEADER_FIELD_NAME_REGEXP.test(headerName)) {
            // TODO: Add human readable message.
            throw new DOMException('', 'SyntaxError')
        }

        if (FORBIDDEN_REQUEST_HEADERS.includes(headerName) || headerName.startsWith('proxy-') || headerName.startsWith('sec-')) {
            // TODO: Print human readable warn message.
            return
        }

        try {
            _classPrivateFieldLooseBase(this, _client)[_client].setHeader(headerName, headerValue)
        } catch (error) {
            const message = error instanceof Error ? error.message : ''
            throw new DOMException(message, 'SyntaxError')
        }
    }

}

XMLHttpRequest.UNSENT = 0
XMLHttpRequest.OPENED = 1
XMLHttpRequest.HEADERS_RECEIVED = 2
XMLHttpRequest.LOADING = 3
XMLHttpRequest.DONE = 4

// The MIT License (MIT)
//
// Copyright (c) 2012-2020 Yamagishi Kazutoshi
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

/**
 * @see {@link https://xhr.spec.whatwg.org/#interface-formdata XMLHttpRequest Standard - 5. Interface FormData}
 */
class FormData {
    /**
     * @todo Implement this function.
     */
    append()
    /* name, value, filename */ {// wip
    }

}

export {FormData, XMLHttpRequest, XMLHttpRequestUpload}
//# sourceMappingURL=w3XMLHttpRequest.js.map
