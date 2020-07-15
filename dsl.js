if (typeof module !== 'undefined' && module.exports) {
    environment = "node";
    var LocalStorage = require('node-localstorage').LocalStorage;
    localStorage = new LocalStorage('./localStorage');
}

global.luke = {
    vars: {}
};

var dsl = {

    // Language definition
    lang: require('./default.luke.js'),

    // Custom set of methods
    api: {},

    // variables

    vars: global.luke.vars,

    // internal storage (for saved modules)
    moduleStorage: {
        all: localStorage,
        set: function(key, value) {
            return localStorage.setItem(key, value)
        },
        get: function(key) {
            return localStorage.getItem(key)
        },
        remove: function(key) {
            return localStorage.removeItem(key)
        }
    },

    // for breaking code parts down into nested parts
    groupingOperators: ['"', "'", "(", ")", "{", "}"],

    // for the detection of data blocks inside the code
    dataDelimeters: ["{", "}"],

    // Custom context for storing custom data
    context: {},

    useSyntax: function(jsObject) {

        var _defaultSyntax = this.lang['$'].default;

        Object.assign(this.lang, jsObject)
        console.log(Object.keys(jsObject['$'])[0], 'can now be used');

        this.lang['$'].default = _defaultSyntax;

        console.log('lang', this.lang);
    },

    parse: function(code) {

        var parts = code.split(this.lang.delimeter);

        // Check if parameter is an object
        var isObject = (a) => {
            return (!!a) && (a.constructor === Object);
        };

        // Return the dynamic following tokens
        var getTokenSequence = (reference) => {
            if (isObject(reference)) {
                return reference.follow
            } else return reference;
        }


        // Call the dynamic, corresponding api method that blongs to a single token
        var callTokenFunction = (key, param, dslKey) => {

            //console.log('args', key, param, dslKey)
            if (param) {
                if (isObject(param)) {

                } else if (param.includes(this.lang.assignmentOperator)) {
                    var spl = param.split("=");
                    var param = {};
                    param[spl[0]] = spl[1];
                }
            }

            var definition = Object.assign(this.lang['$'][this.lang.currentNamespace] || {}, this.lang['$'].default)

            if (definition[key]) {
                if (isObject(definition[key])) {
                    (definition[key]).method(param);
                } else if (this.api[key]) {
                    this.api[key](param)
                }
            } else if (this.api[key]) {
                this.api[key](param)
            } else {
                console.log(key, 'is not a function');
            }
        }


        var getMatchingFollow = (nextInstructions, followToken) => {
            var match = null;
            if (!nextInstructions) return null;
            nextInstructions.forEach(next => {
                //console.log('ft', next, followToken, match);
                if (next.charAt(0) == "$" && followToken == next.substring(1) && !match) {
                    // console.log('follow best:', followToken);
                    match = "$" + followToken;
                } else if (next.charAt(0) == "{" && !match) {
                    //console.log('follow best2:', next,  followToken);
                    match = followToken;
                }
            })

            return match;
        }

        var getMatchingFollowInstruction = (nextInstructions, followToken) => {
            var match = null;
            if (!nextInstructions) return null;
            nextInstructions.forEach(next => {
                //console.log('ft', next, followToken, match);
                if (next.charAt(0) == "$" && followToken == next.substring(1) && !match) {
                    // console.log('follow best:', followToken);
                    match = next;
                } else if (next.charAt(0) == "{" && !match) {
                    //console.log('follow best2:', next,  followToken);
                    match = next;
                }
            })

            return match;
        }

        // Recoursively parse tokens
        var sequence = (tokens, token, instructionKey, partId) => {

            if (tokens.length == 1 && token == this.lang.delimeter) {
                this.lang.static.execStatement()
                return;
            }

            if (!instructionKey) {

                return;
            }

            var definition = Object.assign(this.lang['$'][this.lang.currentNamespace] || {}, this.lang['$'].default)

            var nextInstructions = getTokenSequence(definition[instructionKey.substring(1)]);

            if (!nextInstructions) nextInstructions = getTokenSequence(definition[instructionKey]);

            // eaual
            if (instructionKey.substring(1) == token || instructionKey == token) {

                var nextBestInsturction = null;

                tokens.shift();

                var bestMatching = getMatchingFollow(nextInstructions, tokens[0]);
                var bestMatchingInstruction = getMatchingFollowInstruction(definition[t].follow, tokens[0]);

                // execute exact method

                if ((bestMatching || "").charAt(0) == "$") {
                    callTokenFunction(token);
                    sequence(tokens, tokens[0], bestMatching, partId);
                } else {

                    if (global.luke.vars[bestMatching]) {

                        callTokenFunction(t, global.luke.vars[bestMatching]);
                        tokens.shift();
                    } else if (bestMatchingInstruction.includes(",")) {
                        var rawSequence = bestMatchingInstruction.substring(1, bestMatchingInstruction.length - 1).split(",");

                        var argList = {};
                        var t2;

                        rawSequence.forEach(function(s, i) {
                            t2 = tokens[0]
                            argList[s] = t2;
                            tokens.shift();
                        })

                        callTokenFunction(token, argList);
                        //tokens.shift();

                    } else {
                        callTokenFunction(token, bestMatching)
                        tokens.shift();
                    }

                    //console.log('a', tokens, bestMatching)
                    bestMatching = getMatchingFollow(nextInstructions, tokens[0]);
                    //console.log('b', tokens, bestMatching)
                    sequence(tokens, tokens[0], bestMatching, partId);
                }

            } else {
                console.log('unequal', instructionKey, token);
            }
        }


        var splitInit = (parts) => {
            parts.forEach(p => {

                if (!p) return;

                var partId = Math.random();

                var tokens = p.match(/\{[^\}]+?[\}]|\([^\)]+?[\)]|[\""].+?[\""]|[^ ]+/g);

                tokens.push(this.lang.delimeter);

                t = tokens[0]

                tokens.shift();

                var definition = Object.assign(this.lang['$'][this.lang.currentNamespace] || {}, this.lang['$'].default)

                if (definition[t]) {

                    var bestMatching = getMatchingFollow(definition[t].follow, tokens[0]);
                    var bestMatchingInstruction = getMatchingFollowInstruction(definition[t].follow, tokens[0]);

                    if ((bestMatching || "").charAt(0) == "$") {
                        callTokenFunction(t);
                        sequence(tokens, tokens[0], bestMatching, partId);
                    } else {

                        if (global.luke.vars[bestMatching]) {

                            callTokenFunction(t, global.luke.vars[bestMatching]);
                            tokens.shift();
                        } else if (bestMatchingInstruction.includes(",")) {
                            var rawSequence = bestMatchingInstruction.substring(1, bestMatchingInstruction.length - 1).split(",");


                            var argList = {};
                            var t2;

                            rawSequence.forEach(function(s, i) {
                                t2 = tokens[0]
                                argList[s] = t2;
                                tokens.shift();
                            })

                            callTokenFunction(t, argList);
                            //tokens.shift();

                        } else {
                            callTokenFunction(t, bestMatching)
                            tokens.shift();
                        }

                        bestMatching = getMatchingFollow(definition[t].follow, tokens[0]);
                        sequence(tokens, tokens[0], bestMatching, partId);
                    }

                } else {
                    console.log(t, 'is not defined');
                }

            })
        }

        splitInit(parts);
    },
    init: function() {

        console.log('Welcome to luke...');

        localStorage, dsl.moduleStorage.all._keys.forEach(function(key) {
            if (key.charAt(0) == "_") dsl.parse('use ' + dsl.moduleStorage.get(key));
        })
    }
}


module.exports = dsl;