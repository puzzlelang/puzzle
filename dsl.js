var dsl = {

    // Language definition
    lang: {},

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

            if (this.lang[dslKey || '$'][key]) {
                if (isObject(this.lang[dslKey || '$'][key])) {
                    this.lang[dslKey || '$'][key].method(param);
                } else if (this.api[key]) {
                    this.api[key](param)
                }
            } else if (this.api[key]) {
                this.api[key](param)
            }
        }

        // Recoursively parse tokens
        /*var sequence = (tokens, token, instructionKey, partId) => {

            console.log('#', token, instructionKey);


            var instruction = getTokenSequence(this.lang['$'][instructionKey.substring(1)]);


            // eaual
            if (instructionKey.substring(1) == token) {
                //tokens.shift();
                console.log('f', token);
                // execute exact method
                callTokenFunction(token, tokens[0])

                if (!instruction) return;

                instruction.forEach(instr => {
                    if (instr.charAt(0) == '$') {
                        // pass to next sequence
                        if (tokens.length > 0) sequence(tokens, tokens[0], instr, partId);

                    } else if (instr.charAt(0) == '{') {
                        tokens.shift();
                        sequence(tokens, tokens[0], instr, partId);

                    }
                })

            } else { // not equal

                //console.log(instructionKey);

                if (instructionKey.substring(1).charAt(0) == "{") {

                    //console.log('..---', tokens[0], instructionKey);

                    // execute param method
                    callTokenFunction(tokens[0], tokens[1])



                    instruction.forEach(instr => {
                        if (instr.charAt(0) == '$') {

                            tokens.shift();
                            // pass to next sequence
                            if (tokens.length > 0) sequence(tokens, tokens[0], instr, partId);

                        } else if (instr.charAt(0) == '{') {

                            tokens.shift();

                            sequence(tokens, tokens[0], instr, partId);

                            // execute dynamic method
                            callTokenFunction(instructionKey.substring(1))
                        }
                    })
                } else if (instructionKey.charAt(0) == "{") {
                    //console.log('df', tokens);

                } else if (this.groupingOperators.includes(token.charAt(0)) && !this.dataDelimeters.includes(token.charAt(0))) {
                    // console.log('inludes:', token);

                    token = token.substring(1, token.length - 1);

                    //console.log('ttt', token);

                    splitInit(token.split(this.lang.delimeter))

                }
            }
        }*/


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

        var sequence = (tokens, token, instructionKey, partId) => {

            //  console.log(tokens, token, instructionKey);

            if (!instructionKey) return;



            var nextInstructions = getTokenSequence(this.lang['$'][instructionKey.substring(1)]);

            if (!nextInstructions) nextInstructions = getTokenSequence(this.lang['$'][instructionKey]);

            // eaual
            if (instructionKey.substring(1) == token || instructionKey == token) {

                var nextBestInsturction = null;

                tokens.shift();

                var bestMatching = getMatchingFollow(nextInstructions, tokens[0]);
                //console.log('bestNext', token, bestMatching)
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



                /*nextInstructions.forEach(instr => {
                    if (instr.charAt(0) == '$') {
                        // pass to next sequence
                        if (tokens.length > 0) sequence(tokens, tokens[0], instr, partId);

                    } else if (instr.charAt(0) == '{') {
                        tokens.shift();
                        sequence(tokens, tokens[0], instr, partId);

                    }
                })*/

            } else {


                console.log('unequal', instructionKey, token);

                //console.log(nextInstructions);
            }
        }


        var splitInit = (parts) => {
            parts.forEach(p => {

                var partId = Math.random();

                var tokens = p.match(/\{[^\}]+?[\}]|\([^\)]+?[\)]|[\""].+?[\""]|[^ ]+/g);

                tokens.push(this.lang.delimeter);

                //console.log(tokens);

                t = tokens[0]
                tokens.shift();

                if (this.lang['$'][t]) {

                    var bestMatching = getMatchingFollow(this.lang['$'][t].follow, tokens[0]);



                    if ((bestMatching || "").charAt(0) == "$") {
                        callTokenFunction(tokens[0]);
                        sequence(tokens, tokens[0], bestMatching, partId);
                    } else {

                        callTokenFunction(tokens[0], bestMatching)
                        tokens.shift();

                        //console.log('a', tokens, bestMatching)
                        bestMatching = getMatchingFollow(this.lang['$'][t].follow, tokens[0]);
                        //console.log('b', tokens, bestMatching)
                        sequence(tokens, tokens[0], bestMatching, partId);
                    }

                }


            })
        }

        splitInit(parts);

    }
}

module.exports = dsl;