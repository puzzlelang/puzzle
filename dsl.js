var dsl = {

	// Language definition
    lang: {},
    
    // Custom set of methods
    api: {},

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
        var sequence = (tokens, token, instructionKey, partId) => {

            //console.log('#', token, instructionKey);

            var instruction = getTokenSequence(this.lang['$'][instructionKey.substring(1)]);

            // eaual
            if (instructionKey.substring(1) == token) {
                tokens.shift();

                // execute exact method
                callTokenFunction(token, tokens[0])

                if (!instruction) return;

                instruction.forEach(instr => {
                    if (instr.charAt(0) == '$') {
                        // pass to next sequence
                        if (tokens.length > 0) sequence(tokens, tokens[0], instr, partId);

                    } else if (instr.charAt(0) == '{') {

                        tokens.shift();
                    }
                })

            } else { // not equal

                if (instructionKey.substring(1).charAt(0) == "{") {


                    // console.log('..---', tokens[0], instructionKey);

                    // execute param method
                    callTokenFunction(tokens[0], tokens[0])

                    tokens.shift();

                    instruction.forEach(instr => {
                        if (instr.charAt(0) == '$') {
                            // pass to next sequence
                            if (tokens.length > 0) sequence(tokens, tokens[0], instr, partId);

                        } else if (instr.charAt(0) == '{') {

                            tokens.shift();

                            // execute dynamic method
                            callTokenFunction(instructionKey.substring(1))
                        }
                    })
                }
            }
        }

        parts.forEach(p => {

            var partId = Math.random();

            var tokens = p.split(/\s+/);
            tokens.push(this.lang.delimeter);

            //console.log(tokens);

            t = tokens[0]

            if (this.lang.commands[t]) {


                // execute initial command
                callTokenFunction(t, undefined, 'commands')

                tokens.shift()

                if (isObject(this.lang.commands[t])) {
                    this.lang.commands[t].follow.forEach(f => {

                        if (f.charAt(0) == '$') {
                            // pass to next sequence
                            if (tokens.length > 0) sequence(tokens, tokens[0], f, partId);
                        } else if (f.charAt(0) == '{') {
                            // tokens.shift();
                            // execute dynamic method
                            callTokenFunction(f.substring(1), undefined, 'commands')
                        }

                        //sequence(tokens, tokens[0], f, partId);
                    })

                } else sequence(tokens, tokens[0], this.lang.commands[t], partId);
            }
        })
    }
}

module.exports = dsl;