var dsl = {

    // Language definition
    lang: {
        delimeter: ";",
        assignmentOperator: "=",
        context: {},
        currentNamespace: "default",
        static: {
            execStatement: function() {
                console.log('EXEC', dsl.lang.context);

                if (dsl.lang.context[dsl.lang.context.importNamespace]) {
                    try {
                        dsl.lang.context[dsl.lang.context.importNamespace] = require(dsl.lang.context.importUrl);
                    } catch (e) {
                        console.log('Import Error:', e)
                    }
                }
            }
        },
        "$": {
            default: {
                ns: {
                    follow: ["{namespace}"],
                    method: function(ns) {
                        dsl.lang.currentNamespace = ns;
                        console.log('Set namespace', ns)
                    }
                },
                use: {
                    follow: ["{namespace}", "$from"],
                    method: function(ns) {
                        dsl.lang.context['importNamespace'] = ns;
                        console.log(ns)
                    }
                },
                import: {
                    follow: ["{namespace}", "$from"],
                    method: function(ns) {
                        dsl.lang.context['importNamespace'] = ns;
                        console.log(ns)
                    }
                },
                from: {
                    follow: ["{url}"],
                    method: function(url) {
                        dsl.lang.context['importUrl'] = url;
                        console.log(url)
                    }
                }
            }
        }
    },

    // Custom set of methods
    api: {},

    // for breaking code parts down into nested parts
    groupingOperators: ['"', "'", "(", ")", "{", "}"],

    // for the detection of data blocks inside the code
    dataDelimeters: ["{", "}"],

    // Custom context for storing custom data
    context: {},

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
                if (param.includes(this.lang.assignmentOperator)) {
                    var spl = param.split("=");
                    var param = {};
                    param[spl[0]] = spl[1];
                }
            }

            if (Object.assign(this.lang['$'].default, this.lang['$'][this.lang.currentNamespace])[key]) {
                if (isObject(Object.assign(this.lang['$'].default, this.lang['$'][this.lang.currentNamespace])[key])) {
                    (Object.assign(this.lang['$'].default, this.lang['$'][this.lang.currentNamespace])[key]).method(param);
                } else if (this.api[key]) {
                    this.api[key](param)
                }
            } else if (this.api[key]) {
                this.api[key](param)
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

        // Recoursively parse tokens
        var sequence = (tokens, token, instructionKey, partId) => {

            if (tokens.length == 1 && token == this.lang.delimeter) {
                this.lang.static.execStatement()
                return;
            }

            if (!instructionKey) return;

            console.log(currentNamespace);
            var nextInstructions = getTokenSequence(Object.assign(this.lang['$'].default, this.lang['$'][this.lang.currentNamespace])[instructionKey.substring(1)]);

            if (!nextInstructions) nextInstructions = getTokenSequence(Object.assign(this.lang['$'].default, this.lang['$'][this.lang.currentNamespace])[instructionKey]);

            // eaual
            if (instructionKey.substring(1) == token || instructionKey == token) {

                var nextBestInsturction = null;

                tokens.shift();

                var bestMatching = getMatchingFollow(nextInstructions, tokens[0]);

                // execute exact method

                if ((bestMatching || "").charAt(0) == "$") {
                    callTokenFunction(token);
                    sequence(tokens, tokens[0], bestMatching, partId);
                } else {

                    callTokenFunction(token, bestMatching)
                    tokens.shift();

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

                if (Object.assign(this.lang['$'].default, this.lang['$'][this.lang.currentNamespace])[t]) {

                    var bestMatching = getMatchingFollow(Object.assign(this.lang['$'].default, this.lang['$'][this.lang.currentNamespace])[t].follow, tokens[0]);

                    if ((bestMatching || "").charAt(0) == "$") {
                        callTokenFunction(t);
                        sequence(tokens, tokens[0], bestMatching, partId);
                    } else {
                        callTokenFunction(t, bestMatching)
                        tokens.shift();

                        bestMatching = getMatchingFollow(Object.assign(this.lang['$'].default, this.lang['$'][this.lang.currentNamespace])[t].follow, tokens[0]);
                        sequence(tokens, tokens[0], bestMatching, partId);
                    }

                }

            })
        }

        splitInit(parts);

    }
}

module.exports = dsl;