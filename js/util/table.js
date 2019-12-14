/**
 * Simple 2-key map class
 */
class Table {

    constructor() {
        this.map = new Map();
    }

    set(key1, key2, value) {
        return this.map.set(constructKey(key1, key2), value);
    }

    get(key1, key2) {
        return this.map.get(constructKey(key1, key2));
    }

    delete(key1, key2) {
        return this.map.delete(constructKey(key1, key2));
    }

    has(key1, key2) {
        return this.map.has(constructKey(key1, key2));
    }

    values(key1, key2) {
        return this.map.values(constructKey(key1, key2));
    }

    valuesArray(key1, key2) {
        const iter = this.map.values();
        const result = [];
        let next = iter.next();
        while (!next.done) {
            result.push(next.value);
            next = iter.next();
        }
        return result;
    }

}

function constructKey(key1, key2) {
    return key1 + '$$$%%%$$$' + key2;
}


export default Table