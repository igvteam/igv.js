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

const document = {

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
    },

    styleSheets: [],

    head: {
        insertBefore: function() {},
        childNodes: []
    },
}

document.implementation = document;    // For jQUery

export {document};