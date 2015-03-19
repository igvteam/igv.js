/*
 * Copyright - unknown
 */

"use strict";
// Source:  https://github.com/jfriend00/Javascript-Set/blob/master/set.js

//-------------------------------------------
// Implementation of a Set in javascript
//
// Supports any element type that can uniquely be identified
//    with its string conversion (e.g. toString() operator).
// This includes strings, numbers, dates, etc...
// It does not include objects or arrays though
//    one could implement a toString() operator
//    on an object that would uniquely identify
//    the object.
//
// Uses a javascript object to hold the Set
//
// s.add(key)                      // adds a key to the Set (if it doesn't already exist)
// s.add(key1, key2, key3)         // adds multiple keys
// s.add([key1, key2, key3])       // adds multiple keys
// s.add(otherSet)                 // adds another Set to this Set
// s.add(arrayLikeObject)          // adds anything that a subclass returns true on _isPseudoArray()
// s.remove(key)                   // removes a key from the Set
// s.remove(["a", "b"]);           // removes all keys in the passed in array
// s.remove("a", "b", ["first", "second"]);   // removes all keys specified
// s.has(key)                      // returns true/false if key exists in the Set
// s.hasAll(args)                  // returns true if s has all the keys in args
// s.equals(otherSet)              // returns true if s has exactly the same keys in it as otherSet
// s.isEmpty()                     // returns true/false for whether Set is empty
// s.keys()                        // returns an array of keys in the Set
// s.clear()                       // clears all data from the Set
// s.union(t)                      // return new Set that is union of both s and t
// s.intersection(t)               // return new Set that has keys in both s and t
// s.difference(t)                 // return new Set that has keys in s, but not in t
// s.isSubset(t)                   // returns boolean whether every element in s is in t
// s.isSuperset(t)                 // returns boolean whether every element of t is in s
// s.each(fn)                      // iterate over all items in the Set (return this for method chaining)
// s.eachReturn(fn)                // iterate over all items in the Set (return true/false if iteration was not stopped)
// s.filter(fn)                    // return a new Set that contains keys that passed the filter function
// s.map(fn)                       // returns a new Set that contains whatever the callback returned for each item
// s.every(fn)                     // returns true if every element in the Set passes the callback, otherwise returns false
// s.some(fn)                      // returns true if any element in the Set passes the callback, otherwise returns false
//-------------------------------------------


// polyfill for Array.isArray
if (!Array.isArray) {
    Array.isArray = function (vArg) {
        return Object.prototype.toString.call(vArg) === "[object Array]";
    };
}

if(Set) {

    Set.prototype.isEmpty = function () {
        return this.size === 0;
    }
}
else {
     Set = function(/*initialData*/) {
        // Usage:
        // new Set()
        // new Set(1,2,3,4,5)
        // new Set(["1", "2", "3", "4", "5"])
        // new Set(otherSet)
        // new Set(otherSet1, otherSet2, ...)
        this.data = {};
        this.add.apply(this, arguments);
    }

    Set.prototype = {
        // usage:
        // add(key)
        // add([key1, key2, key3])
        // add(otherSet)
        // add(key1, [key2, key3, key4], otherSet)
        // add supports the EXACT same arguments as the constructor
        add: function () {
            var key;
            for (var i = 0; i < arguments.length; i++) {
                key = arguments[i];
                if (Array.isArray(key) || this._isPseudoArray(key)) {
                    for (var j = 0; j < key.length; j++) {
                        this._add(key[j]);
                    }
                } else if (key instanceof Set) {
                    var self = this;
                    key.each(function (val, key) {
                        self._add(key, val);
                    });
                } else {
                    // just a key, so add it
                    this._add(key);
                }
            }
            return this;
        },
        // private methods (used internally only)
        // these make non-public assumptions about the internal data format
        // add a single item to the Set, make sure key is a string
        _add: function (key, val) {
            if (typeof val === "undefined") {
                // store the val (before being converted to a string key)
                val = key;
            }
            this.data[this._makeKey(key)] = val;
            return this;
        },
        // private: fetch current key
        // overridden by subclasses for custom key handling
        _getKey: function (arg) {
            return arg;
        },
        // private: fetch current key or coin a new one if there isn't already one
        // overridden by subclasses for custom key handling
        _makeKey: function (arg) {
            return arg;
        },
        // private: to remove a single item
        // does not have all the argument flexibility that remove does
        _removeItem: function (key) {
            delete this.data[this._getKey(key)];
        },
        // private: asks subclasses if this is something we want to treat like an array
        // default implementation is false
        _isPseudoArray: function (item) {
            return false;
        },
        // usage:
        // remove(key)
        // remove(key1, key2, key3)
        // remove([key1, key2, key3])
        delete: function (key) {
            // can be one or more args
            // each arg can be a string key or an array of string keys
            var item;
            for (var j = 0; j < arguments.length; j++) {
                item = arguments[j];
                if (Array.isArray(item) || this._isPseudoArray(item)) {
                    // must be an array of keys
                    for (var i = 0; i < item.length; i++) {
                        this._removeItem(item[i]);
                    }
                } else {
                    this._removeItem(item);
                }
            }
            return this;
        },
        // returns true/false on whether the key exists
        has: function (key) {
            key = this._makeKey(key);
            return Object.prototype.hasOwnProperty.call(this.data, key);
        },
        // returns true/false for whether the current Set contains all the passed in keys
        // takes arguments just like the constructor or .add()
        hasAll: function (args) {
            var testSet = this.makeNew.apply(this, arguments);
            var self = this;
            return testSet.every(function (data, key) {
                return self.has(key);
            });
        },
        // if first arg is not a set, make it into one
        // otherwise just return it
        makeSet: function (args) {
            if (!(args instanceof Set)) {
                // pass all arguments here
                return this.makeNew.apply(this, arguments);
            }
            return args;
        },
        equals: function (otherSet) {
            otherSet = this.makeSet(otherSet);
            // this is not particularly efficient, but it's simple
            // the only way you can be a subset and a superset it to be the same Set
            return this.isSubset(otherSet) && this.isSuperset(otherSet);
        },
        // tells you if the Set is empty or not
        isEmpty: function () {
            for (var key in this.data) {
                if (this.has(key)) {
                    return false;
                }
            }
            return true;
        },

        size: function () {
            var size = 0;
            for (var key in this.data) {
                if (this.has(key)) {
                    size++;
                }
            }
            return size;
        },

        // returns an array of all keys in the Set
        // returns the original key (not the string converted form)
        keys: function () {
            var results = [];
            this.each(function (data) {
                results.push(data);
            });
            return results;
        },
        // clears the Set
        clear: function () {
            this.data = {};
            return this;
        },
        // makes a new Set of the same type and configuration as this one
        // regardless of what derived type of object we actually are
        // accepts same arguments as a constructor for initially populating the Set
        makeNew: function () {
            var newSet = new this.constructor();
            if (arguments.length) {
                newSet.add.apply(newSet, arguments);
            }
            return newSet;
        },
        // s.union(t)
        // returns a new Set that is the union of two sets
        union: function (otherSet) {
            otherSet = this.makeSet(otherSet);
            var newSet = this.makeNew(this);
            newSet.add(otherSet);
            return newSet;
        },
        // s.intersection(t)
        // returns a new Set that contains the keys that are
        // in both sets
        intersection: function (otherSet) {
            otherSet = this.makeSet(otherSet);
            var newSet = this.makeNew();
            this.each(function (data, key) {
                if (otherSet.has(key)) {
                    newSet._add(key, data);
                }
            });
            return newSet;
        },
        // s.difference(t)
        // returns a new Set that contains the keys that are
        // s but not in t
        difference: function (otherSet) {
            otherSet = this.makeSet(otherSet);
            var newSet = this.makeNew();
            this.each(function (data, key) {
                if (!otherSet.has(key)) {
                    newSet._add(key, data);
                }
            });
            return newSet;
        },
        // s.notInBoth(t)
        // returns a new Set that contains the keys that
        // are in either Set, but not both sets
        notInBoth: function (otherSet) {
            otherSet = this.makeSet(otherSet);
            // get items in s, but not in t
            var newSet = this.difference(otherSet);
            // add to the result items in t, but not in s
            return newSet.add(otherSet.difference(this));
        },
        // s.isSubset(t)
        // returns boolean whether every element of s is in t
        isSubset: function (otherSet) {
            otherSet = this.makeSet(otherSet);
            return this.eachReturn(function (data, key) {
                if (!otherSet.has(key)) {
                    return false;
                }
            });
        },
        // s.isSuperset(t)
        // returns boolean whether every element of t is in s
        isSuperset: function (otherSet) {
            otherSet = this.makeSet(otherSet);
            var self = this;
            return otherSet.eachReturn(function (data, key) {
                if (!self.has(key)) {
                    return false;
                }
            });
        },
        // iterate over all elements in the Set until callback returns false
        // myCallback(key) is the callback form
        // If the callback returns false, then the iteration is stopped
        // returns the Set to allow method chaining
        each: function (fn) {
            this.eachReturn(fn);
            return this;
        },
        // iterate all elements until callback returns false
        // myCallback(key) is the callback form
        // returns false if iteration was stopped
        // returns true if iteration completed
        eachReturn: function (fn) {
            for (var key in this.data) {
                if (this.has(key)) {
                    if (fn.call(this, this.data[key], key) === false) {
                        return false;
                    }
                }
            }
            return true;
        },
        // iterate all elements and call callback function on each one
        // myCallback(key) - returns true to include in returned Set
        // returns new Set
        filter: function (fn) {
            var newSet = this.makeNew();
            this.each(function (data, key) {
                if (fn.call(this, key) === true) {
                    newSet._add(key, data);
                }
            });
            return newSet;
        },
        // iterate all elements and call callback on each one
        // myCallback(key) - whatever value is returned is put in the returned Set
        // if the  return value from the callback is undefined,
        //   then nothing is added to the returned Set
        // returns new Set
        map: function (fn) {
            var newSet = this.makeNew();
            this.each(function (data, key) {
                var ret = fn.call(this, key);
                if (typeof ret !== "undefined") {
                    newSet._add(key, data);
                }
            });
            return newSet;
        },
        // tests whether some element in the Set passes the test
        // myCallback(key) - returns true or false
        // returns true if callback returns true for any element,
        //    otherwise returns false
        some: function (fn) {
            var found = false;
            this.eachReturn(function (key) {
                if (fn.call(this, key) === true) {
                    found = true;
                    return false;
                }
            });
            return found;
        },
        // tests whether every element in the Set passes the test
        // myCallback(key) - returns true or false
        // returns true if callback returns true for every element
        every: function (fn) {
            return this.eachReturn(fn);
        }
    };

    Set.prototype.constructor = Set;

}