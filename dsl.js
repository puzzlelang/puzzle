var dsl = {

    lang: {},
    api: {},

    parse: function(code) {

        var parts = code.split(this.lang.delimeter);

        var isObject = (a) => {
            return (!!a) && (a.constructor === Object);
        };

        var getTokenSequence = (reference) => {
            if (isObject(reference)) {
                return reference.follow
            } else return reference;
        }

        var callTokenFunction = (key, param, dslKey) => {
            if (this.lang['$'][key]) {
                if (isObject(this.lang[dslKey || '$'][key])) {
                    this.lang[dslKey || '$'][key].method(param);
                } else if (this.api[key]) this.api[key](param)
            }
        }

        var sequence = (tokens, token, instructionKey, finished) => {

            var instruction = getTokenSequence(this.lang['$'][instructionKey.substring(1)]);
            var finished = finished || false;

            // eaual
            if (instructionKey.substring(1) == token) {
                tokens.shift();

                // execute exact method
                //if (this.api[token]) this.api[token](tokens[0])
                callTokenFunction(token, tokens[0])

                instruction.forEach(instr => {
                    if (instr.charAt(0) == '$') {
                        // pass to next sequence
                        if (tokens.length > 0) sequence(tokens, tokens[0], instr, finished);

                    } else if (instr.charAt(0) == '{') {

                        tokens.shift();
                    }
                })

            } else { // not equal

                if (instructionKey.substring(1).charAt(0) == "{") {
                    tokens.shift();

                    // execute param method
                    //if (this.api[tokens[0]]) this.api[tokens[0]](tokens[0])
                    callTokenFunction(tokens[0], tokens[0])

                    instruction.forEach(instr => {
                        if (instr.charAt(0) == '$') {
                            // pass to next sequence
                            if (tokens.length > 0) sequence(tokens, tokens[0], instr, finished);

                        } else if (instr.charAt(0) == '{') {

                            tokens.shift();

                            // execute dynamic method
                            //if (this.api[instructionKey.substring(1)]) this.api[instructionKey.substring(1)]();
                            callTokenFunction(instructionKey.substring(1))

                        }
                    })
                }
            }
        }

        parts.forEach(p => {

            var tokens = p.split(/\s+/);
            tokens.push(this.lang.delimeter);
            t = tokens[0]

            if (this.lang.commands[t]) {

                //if (this.api[t]) this.api[t]()
                callTokenFunction(this.api[t], undefined, 'commands')

                tokens.shift()
                sequence(tokens, tokens[0], this.lang.commands[t]);
            }
        })
    }
}

module.exports = dsl;