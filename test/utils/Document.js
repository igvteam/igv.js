/**
 * Mock objects for browser Document class.
 */

class Element {

    constructor() {
        this.lastChild = this;
        this.checked = false;
        this.childNodes = [];
    }

    appendChild() {
        return this;
    }

    cloneNode() {
        return this;
    }

    setAttribute() {
    }

    insertBefore() {
    }
}

class Document {

    constructor() {
        this.location = {href: ""}
        this.documentElement = {}
        this.styleSheets = []
        this.head = new Element();
        this.body = new Element();
    }

    createDocumentFragment() {
        return new Element();
    }

    createElement() {
        return new Element();
    }
}

class DOMImplementation {

    createHTMLDocument() {
        return new Document();
    }
}

export {Document, DOMImplementation};