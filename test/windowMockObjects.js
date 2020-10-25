/**
 * Mock objects to enable jQuery import.
 */

class element {
    constructor() {
        this.lastChild = this;
        this.checked = false;
    }

    appendChild() {
        return new element();
    }

    cloneNode() {
        return this;
    }

    setAttribute() {
    }

    createHTMLDocument() {
        return this;
    }
}

global.document = {

    location: {
        href: ""
    },

    documentElement: {},

    createDocumentFragment: function () {
        return {
            appendChild: function () {
                return new element();
            }
        }
    },
    createElement: function () {
        return new element();
    },

    createHTMLDocument: function () {
        return {
            head: {},
            body: {
                childNodes: [{}, {}]
            }
        }
    }
}

global.document.implementation = global.document;

global.window = {
    document,
    setTimeout: function () {
    }
}
