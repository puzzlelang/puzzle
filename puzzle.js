if ((typeof process !== 'undefined') && ((process.release || {}).name === 'node')) {

    if(process.env.sandbox) {
        environment = "sandbox";
        dependencies = require('./dependencies_sandboxed.js');
        localStorage = new dependencies.localStorage.LocalStorage();
        console.log('SANDBOX MODE!')
    } else {
        environment = "node";
        dependencies = require('./dependencies.js');
        localStorage = new dependencies.localStorage.LocalStorage(/*dependencies.os.tmpdir()*/ "localStorage");
    }
    
} else {
    global = window;
    environment = 'browser';
}

// Check if parameter is an object
var isObject = (a) => {
    return (!!a) && (a.constructor === Object);
};

// Split tokens for variable detection
function splitMulti(str, tokens){
    var tempChar = tokens[0]; // We can use the first token as a temporary join character
    for(var i = 1; i < tokens.length; i++){
        str = str.split(tokens[i]).join(tempChar);
    }
    str = str.split(tempChar);
    return str;
}

// Merge syntax
var mergeSyntaxWithDefault = (defaultSyntax, newSyntax) => {
    var obj = {};
    Object.keys(newSyntax || {}).forEach(k => {
        obj[k] = newSyntax[k]
    })

    Object.keys(defaultSyntax).forEach(k => {
        if (!obj.hasOwnProperty(k)) obj[k] = defaultSyntax[k];
    })

    return obj;
}

Object.byString = function(o, s) {
    if(typeof s !== 'string') return s; // in case var has already been resolved
    if(!s) return o;
    s = s.replace(/\[(\w+)\]/g, '.$1');
    s = s.replace(/^\./, '');
    var a = s.split('.');
    for (var i = 0, n = a.length; i < n; ++i) {
        var k = a[i];
        if (k in o) {
            o = o[k];
        } else {
            return;
        }
    }
    return o;
}

var environment = null;
var puzzle = {

    environment: environment,
    
    // Default language definition
    lang: require('./default.puzzle.js'),

    run: (file) => {
        puzzle.parse(dependencies.fs.readFileSync(file).toString())
    },

    // Schedule map for statements
    schedule: [],

    // Custom set of methods
    api: {},

    // variables
    vars: {},

    // functions
    funcs: {},

    // subscripts
    subscripts: {},

    // statement context
    ctx: {},

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

    // main repo url for the official modules github repo
    mainRepo: 'https://cdn.jsdelivr.net/gh/puzzlelang/puzzle-catalog/modules/<module>',

    // for breaking code parts down into nested parts
    groupingOperators: ['"', "'", "(", ")", "{", "}"],

    // for the detection of data blocks inside the code
    dataDelimeters: ["{", "}"],

    // Custom context for storing custom data
    context: {},

    output: function() {
        for (arg of arguments) {
            console.info(arg);
        }
    },

    error: function() {
        for (arg of arguments) {
            console.error(arg);
        }
    },

    useSyntax: function(jsObject, dontUse, done) {

        Object.keys(this.lang.default).forEach(k => {
            this.lang.default[k].ns = 'default';
        })

        var _defaultSyntax = this.lang.default;
        var syntaxName = Object.keys(jsObject)[0];

        Object.keys(jsObject[syntaxName]).forEach(k => {
            jsObject[syntaxName][k].ns = syntaxName;
        })

        var combinedLang = Object.assign({}, this.lang.default, jsObject[syntaxName])

        //Object.assign(jsObject[syntaxName], combinedLang);

        jsObject[syntaxName].as = this.lang.default.as;

        Object.keys(jsObject[syntaxName]).forEach(k => {
            if(!this.lang.default[k]) this.lang.default[k] = jsObject[syntaxName][k];
        })


        Object.assign(this.lang, jsObject)
        //console.log(Object.keys(jsObject['$'])[0], 'can now be used');

        //this.lang.default = _defaultSyntax;

        //console.log(this.lang)

        if(done) done()

    },
    

    // Returns the raw statement from an input. e.g. (print hello) will return print hello
    getRawStatement: function(statement, vars) {
        if(!statement) return;
        var returnValue;
        /*
            @TODO: evaluate raw inputs
            var possibleVarParts = splitMulti(statement, ['=', ',', ':', '+', '-', '*', '/', '\\', '(', ')', '{', '}', '[', ']'])
        */

        if(typeof statement !== 'string') returnValue = statement;

        if(isObject(statement)) return statement;

        if(Array.isArray(statement)) return statement;

        if (this.groupingOperators.includes(statement.charAt(0)) && this.groupingOperators.includes(statement.charAt(statement.length - 1))) {
            returnValue = statement.substring(1, statement.length - 1)
        } else returnValue = statement;

        if(vars)
            if(Object.byString(vars, returnValue)) return Object.byString(vars, returnValue);

        if(Object.byString(global.puzzle.vars, returnValue)) return Object.byString(global.puzzle.vars, returnValue);

        return returnValue
    },

    // Rvaluates and returns a raw statement. this includes numeric and string operations
    evaluateRawStatement: function(statement, vars) {
        var _statement;

        if (!isNaN(statement)) return statement;

        if (isObject(statement)) {
            return statement;
        } else {
            try {
                _statement = JSON.parse(statement)
                return _statement;
            } catch (e) {
                if(vars){
                    if(Object.byString(vars, statement)) return Object.byString(vars, statement);
                }

                if(Object.byString(global.puzzle.vars, statement)) return Object.byString(global.puzzle.vars, statement);

                return statement;
            }
        }
        if (Array.isArray(statement)) return statement;

        if (this.groupingOperators.includes(statement.charAt(0)) && this.groupingOperators.includes(statement.charAt(statement.length - 1))) {
            _statement = statement.substring(1, statement.length - 1)
        } else _statement = statement;

        try {
            return eval(_statement)
        } catch (e) {
            return _statement;
        }
    },

    parse: function(code, vars, funcs) {

        if (!vars) vars = {};
        if (!funcs) funcs = {};

        var parts = {}; //code.split(this.lang.delimeter);

        /*Object.keys(this.lang.delays).forEach(k => {
            clearTimeout(this.lang.delays[k])
            delete this.lang.delays[k];
        })

        Object.keys(this.lang.intervals).forEach(k => {
            clearInterval(this.lang.intervals[k])
            delete this.lang.intervals[k];
        })*/

        var litStart = ['(', '{', '"', "'"];
        var litEnd = [')', '}', '"', "'"];


        partsCounter = 0;
        var litActive = null;
        var litActiveCounter = 0;

        code.split('').forEach(function(t) {

            if (/^\s+$/.test(t) && !litActive) partsCounter++;

            if (!parts[partsCounter]) parts[partsCounter] = [];

            if (!litStart.includes(t)) {
                parts[partsCounter].push(t)

                if (litActive && t == litEnd[litActive.litIdx]) {
                    litActiveCounter--;
                    if (litActiveCounter == 0) {
                        partsCounter++;
                        if (!parts[partsCounter]) parts[partsCounter] = [];
                        litActive = null;
                    }
                }
            } else if (litActive && litStart.includes(t) && t == litEnd[litActive.litIdx]) {
                litActiveCounter--;
                parts[partsCounter].push(t)
                if (litActiveCounter == 0) {
                    partsCounter++;
                    if (!parts[partsCounter]) parts[partsCounter] = [];
                    litActive = null;
                }
            } else if (!litActive) {
                partsCounter++;
                if (!parts[partsCounter]) parts[partsCounter] = [];
                parts[partsCounter].push(t)
                litActive = {
                    token: t,
                    litIdx: litStart.indexOf(t)
                };
                litActiveCounter++;
            } else {
                if (litActive && t == litActive.token) litActiveCounter++;
                parts[partsCounter].push(t)
            }

        });

        var finalParts = {};
        var finalPartsCounter = 0;

        Object.keys(parts).forEach((p, i) => {

            parts[p] = parts[p].join('').trim()

            if (!parts[p] || parts[p].length == 0) return;
            if (!finalParts[finalPartsCounter]) finalParts[finalPartsCounter] = [];
            if (parts[p].charAt(0) == ';' && parts[p].length > 1) {
                finalPartsCounter++;
                if (!finalParts[finalPartsCounter]) finalParts[finalPartsCounter] = [];
                finalParts[finalPartsCounter].push(parts[p].substring(1))
            } else if (parts[p].charAt(parts[p].length - 1) == ';' && parts[p].length > 1) {
                finalParts[finalPartsCounter].push(parts[p].substring(0, parts[p].length - 1))
                finalPartsCounter++;
            } else if (parts[p] == ';') {
                finalPartsCounter++;
            } else finalParts[finalPartsCounter].push(parts[p])

        })


        var _parts = [];
        Object.keys(finalParts).forEach(p => {
            _parts.push(finalParts[p]);
        });

        // Return the dynamic following tokens
        var getTokenSequence = (reference) => {
            //console.log('sequence', reference)
            if (isObject(reference)) {
                return reference.follow
            } else return reference;
        }


        // Call the dynamic, corresponding api method that blongs to a single token
        var callTokenFunction = (ctx, key, param, namespace, dslKey, innerDefinition) => {

            if (isObject(param)) {
                Object.keys(param).forEach(p => {
                    if(ctx.vars){
                        if(ctx.vars[param[p]]) param[p] = ctx.vars[param[p]];
                    } else if(global.puzzle.vars[param[p]]) param[p] = global.puzzle.vars[param[p]];
                })
            } else {
                if(ctx.vars){
                    if(ctx.vars[param]) param = ctx.vars[param];
                } else if(global.puzzle.vars[param]) param = global.puzzle.vars[param];
            }
            /*if (param) {
                if (isObject(param)) {

                } else if (param.includes(this.lang.assignmentOperator)) {
                    var spl = param.split("=");
                    var param = {};
                    param[spl[0]] = spl[1];
                }
            }*/

            var definition = innerDefinition || this.lang[namespace];//mergeSyntaxWithDefault(this.lang.default, this.lang[this.lang.currentNamespace])

            if (definition[key]) {
                if (isObject(definition[key])) {
                    (definition[key]).method(ctx, param);
                } else if (this.api[key]) {
                    this.api[key](ctx, param)
                }
            } else if (this.api[key]) {
                this.api[key](ctx, param)
            } else if (key !== undefined) {
                global.puzzle.error(key, 'is not a function');
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
                     //console.log('follow best:', followToken);
                    match = next;
                } else if (next.charAt(0) == "{" && !match) {
                    //console.log('follow best2:', next,  followToken);
                    match = next;
                }
            })
            return match;
        }

        // Recoursively parse tokens
        var sequence = (tokens, token, instructionKey, lastToken, partId, namespace, done) => {

            var execNamespace = namespace;
            if(!this.lang[namespace]) return;
            
            
            /*f(!(this.lang[namespace]._static || {}).execStatement) {
                execNamespace = 'default'
            } */

/*
            Object.keys(this.lang).forEach(l => {
               if(isObject(this.lang[l])){
                   if(this.lang[l]._static && Object.keys(this.lang[l]).includes(global.puzzle.ctx[partId]._sequence[0])){
                       execNamespace = l;
                   }
               }
            })*/

            if(this.lang.default[global.puzzle.ctx[partId]._sequence[0]]){
                //console.log('execns', global.puzzle.ctx[partId]._sequence[0], this.lang.default[global.puzzle.ctx[partId]._sequence[0]].ns)
                execNamespace = this.lang.default[global.puzzle.ctx[partId]._sequence[0]].ns || 'default';
            }

            //console.log(tokens.length, tokens, this.lang.delimeter);

            // Statement end
            if (tokens.length == 1 && token == this.lang.delimeter) {

                if(global.puzzle.ctx[partId].execStatement) {
                    //return done();
                }

                if(this.lang.default[global.puzzle.ctx[partId]._sequence[0]]){
                    //console.log('execns', global.puzzle.ctx[partId]._sequence[0], this.lang.default[global.puzzle.ctx[partId]._sequence[0]].ns)
                    execNamespace = this.lang.default[global.puzzle.ctx[partId]._sequence[0]].ns || 'default';
                }

                this.lang[execNamespace]._static.execStatement(done, global.puzzle.ctx[partId]);
                return;
            } else if (tokens.length == 0) {
                this.lang[execNamespace]._static.execStatement(done, global.puzzle.ctx[partId])
                return;
            }

            if (!instructionKey) {
                return;
            }

            var innerDefinition;
            var definition = this.lang[namespace]; //mergeSyntaxWithDefault(this.lang.default, this.lang[namespace]);

            //console.log('lt', lastToken, definition[lastToken], definition[lastToken].innerSequence)

            if (definition[lastToken]) {

                if (definition[lastToken].innerSequence) {

                    innerDefinition = definition[lastToken].innerSequence;
                    definition = innerDefinition;
                }
            }

            //console.log('def', definition)
            var nextInstructions = getTokenSequence(definition[instructionKey.substring(1)]);

            if (!nextInstructions) nextInstructions = getTokenSequence(definition[instructionKey]);

            // eaual
            if (instructionKey.substring(1) == token || instructionKey == token) {

                global.puzzle.ctx[partId]._sequence.push(token)

                var nextBestInsturction = null;

                var lastToken = tokens.shift();

                var bestMatching = getMatchingFollow(nextInstructions, tokens[0]);
                var bestMatchingInstruction = getMatchingFollowInstruction(nextInstructions, tokens[0]);
                // execute exact method

                //console.log('bm', bestMatching, bestMatchingInstruction, nextInstructions)
                
                if ((bestMatching || "").charAt(0) == "$") {
                    callTokenFunction(global.puzzle.ctx[partId], token, null, namespace, null, innerDefinition);
                    sequence(tokens, tokens[0], bestMatching, lastToken, partId, namespace, done);
                } else {

                    if(bestMatching == '...') {
                       
                    }
                    /*else if ((Object.byString(vars, bestMatching) || Object.byString(global.puzzle.vars, bestMatching)) && (global.puzzle.ctx[partId]._sequence || [])[0] != 'set' && !(global.puzzle.ctx[partId]._sequence || []).includes('as')) {
                        callTokenFunction(global.puzzle.ctx[partId], token, Object.byString(vars, bestMatching) || Object.byString(global.puzzle.vars, bestMatching), null, innerDefinition);
                        tokens.shift();
                    }*/ /*else if (global.puzzle.funcs[bestMatching]) {
                        console.log('func')
                        //callTokenFunction(global.puzzle.ctx[partId], t, global.puzzle.vars[bestMatching]);
                        tokens.shift();
                    } */ else if ((bestMatchingInstruction || "").includes(",")) {
                        var rawSequence = bestMatchingInstruction.substring(1, bestMatchingInstruction.length - 1).split(",");

                        var argList = {};
                        var t2;

                        rawSequence.forEach(function(s, i) {
                            t2 = tokens[0]
                            argList[s] = t2;
                            tokens.shift();
                        })

                        callTokenFunction(global.puzzle.ctx[partId], token, argList, namespace, null, innerDefinition);
                        //tokens.shift();

                    } else if(definition[bestMatching]){
                        //console.log('def', bestMatching, definition)
                    } else {
                       // console.log('ffffff', token, bestMatching, bestMatchingInstruction)
                        callTokenFunction(global.puzzle.ctx[partId], token, bestMatching, namespace, null, innerDefinition)
                        tokens.shift();
                    }

                    //console.log('a', tokens, bestMatching)
                    bestMatching = getMatchingFollow(nextInstructions, tokens[0]);
                    //console.log('b', tokens, bestMatching)
                    sequence(tokens, tokens[0], bestMatching, lastToken, partId, namespace, done);
                }

            } /*else if (token.includes('(') && funcs || global.puzzle.funcs[token.substring(0, token.indexOf('('))]) {
                execFunctionBody(token, vars, funcs)

            }*/ else {
            }
        }

        var execFunctionBody = (bestMatching, vars, funcs) => {
            if (bestMatching.includes('(') && bestMatching.includes(')')) {

                var scope = {
                    vars: {},
                    funcs: {}
                };

                var rawInputParams = bestMatching.substring(bestMatching.indexOf('(') + 1, bestMatching.indexOf(')'));
                var inputParams = rawInputParams.split(",");

                bestMatching = bestMatching.substring(0, bestMatching.indexOf('('));
                var rawDefinedParams = global.puzzle.funcs[bestMatching].params;
                rawDefinedParams = rawDefinedParams.substring(rawDefinedParams.indexOf('(') + 1, rawDefinedParams.indexOf(')'));
                var definedParams = rawDefinedParams.split(",");

                definedParams.forEach(function(param, i) {
                    scope.vars[param] = inputParams[i]
                })

                //console.log(global.puzzle.funcs[bestMatching].body)

                var body = global.puzzle.funcs[bestMatching].body;

                puzzle.parse(body.substring(body.indexOf('{') + 1, body.indexOf('}')), scope.vars, scope.funcs);

            }
        }

        var splitInit = (parts) => {
            parts.forEach(p => {

                //p = p.trim();

                // Ignore comments for parsing
                if ((p[0] || "").indexOf('//') == 0) return;

                // get namespace from dot notation
                /*p.forEach((t, i) => {
                    if(t.includes('.')){
                        console.log(t.split('.')[0], this.lang, 'ns', t, this.lang[t.split('.')[0]])
                        if(this.lang[t.split('.')[0]]){
                            console.log(t)
                            this.lang.currentNamespace = t.split('.')[0];
                            console.log(t, this.lang.currentNamespace)
                            p[i] = t.split('.')[1]
                        }
                    }
                })*/

                var partId = Math.random();

                puzzle.schedule.push({
                    partId: partId,
                    fn: (done) => {

                        if (!p) return;

                        global.puzzle.ctx[partId] = {
                            _sequence: [],
                            vars: vars,
                            done: () => {
                                global.puzzle.ctx[partId].execStatement = true;
                            }
                        };

                        var tokens = p; //.match(/\{[^\}]+?[\}]|\([^\)]+?[\)]|[\""].+?[\""]|[^ ]+/g);

                        //console.log('tokens', tokens)

                        var namespace = 'default';

                        tokens.push(this.lang.delimeter);

                        var t = tokens[0].replace(/(\r\n|\n|\r)/gm, "");

                       
                        if(t.includes('.')){
                           
                            if(this.lang[t.split('.')[0]]){
                          
                                namespace = t.split('.')[0];
                  
                                t = t.split('.')[1]
                            }
                        } else {
                            namespace = this.lang.default[t].ns || 'default';
                        }

                        var lastToken = tokens.shift();

                        var definition = this.lang[namespace];//mergeSyntaxWithDefault(this.lang.default, this.lang[namespace]);

                        if (definition[t]) {

                            var bestMatching = getMatchingFollow(definition[t].follow, tokens[0]);
                            var bestMatchingInstruction = getMatchingFollowInstruction(definition[t].follow, tokens[0]);

                            if ((bestMatching || "").charAt(0) == "$") {
                                callTokenFunction(global.puzzle.ctx[partId], t, undefined, namespace);
                                sequence(tokens, tokens[0], bestMatching, lastToken, partId, namespace, done);
                                global.puzzle.ctx[partId]._sequence.push(t)
                            } else {

                                global.puzzle.ctx[partId]._sequence.push(t)

                                if(bestMatching == '...') {
                                    
                                }/* else if ((Object.byString(vars, bestMatching) || Object.byString(global.puzzle.vars, bestMatching)) && (global.puzzle.ctx[partId]._sequence || [])[0] != 'set') {

                                    callTokenFunction(global.puzzle.ctx[partId], t, Object.byString(vars, bestMatching) || Object.byString(global.puzzle.vars, bestMatching));
                                    tokens.shift();
                                }*/ else if((bestMatching || "").startsWith('var:')){
                                    callTokenFunction(global.puzzle.ctx[partId], t, global[bestMatching.substring(4)], namespace);
                                    tokens.shift();
                                } /*else if (global.puzzle.funcs[bestMatching] || (bestMatching.includes('(') && global.puzzle.funcs[bestMatching.substring(0, bestMatching.indexOf('('))])) {
                                    console.log('funcsss22', bestMatching, global.puzzle.funcs)
                                    execFunctionBody(bestMatching, global.puzzle.vars, global.puzzle.funcs)

                                    //callTokenFunction(global.puzzle.ctx[partId], t, global.puzzle.funcs[bestMatching]);
                                    tokens.shift();
                                } */
                                else if (bestMatchingInstruction && bestMatchingInstruction.includes(",")) {
                                    var rawSequence = bestMatchingInstruction.substring(1, bestMatchingInstruction.length - 1).split(",");

                                    var argList = {};
                                    var t2;

                                    rawSequence.forEach(function(s, i) {
                                        t2 = tokens[0]
                                        argList[s] = t2;
                                        tokens.shift();
                                    })

                                    callTokenFunction(global.puzzle.ctx[partId], t, argList, namespace);
                                    //tokens.shift();

                                } else {
                                    callTokenFunction(global.puzzle.ctx[partId], t, bestMatching, namespace)
                                    tokens.shift();
                                }

                                bestMatching = getMatchingFollow(definition[t].follow, tokens[0]);
                                sequence(tokens, tokens[0], bestMatching, lastToken, partId, namespace, done);
                            }

                        } else if (t.includes('...')) {
                            //this.lang.currentNamespace = t.split('...')[0]; 
                        } else {
                            global.puzzle.error(t, 'is not defined');
                        }
                    }
                })

            })


            function execSchedule(next) {
                //console.log('next', next);
                if (!next) return;
                next.fn(function() {
                    //console.log('callback called', global.puzzle.ctx[next.partId]);

                    /*var hasAnyAs = false;
                    ((global.puzzle.ctx[next.partId] || {})._sequence || []).forEach(t => {
                        if(t.includes('.as')) hasAnyAs = true;
                    });

                    if(((global.puzzle.ctx[next.partId] || {})._sequence || []).includes('as') || hasAnyAs) {
                       
                        if(Object.keys((global.puzzle.ctx[next.partId] || {}).vars).length){
                            // @TODO: check if var available in scope, then take global or local scope
                            if(Object.byString(global.puzzle.vars, (global.puzzle.ctx[next.partId] || {})._asVariable)){
                                Object.setByString(global.puzzle.vars, (global.puzzle.ctx[next.partId] || {})._asVariable);
                            } else (global.puzzle.ctx[next.partId] || {}).vars[(global.puzzle.ctx[next.partId] || {})._asVariable] = (global.puzzle.ctx[next.partId] || {}).return;
                        } 
                        else global.puzzle.vars[(global.puzzle.ctx[next.partId] || {})._asVariable] = (global.puzzle.ctx[next.partId] || {}).return;
                    }*/

                  
                    // puzzle.schedule
                    execSchedule(puzzle.schedule.shift());
                });
            }

            //console.log(puzzle.schedule);

            execSchedule(puzzle.schedule.shift())

        }
        splitInit(_parts);
    },
    init: function() {

        localStorage,
        puzzle.moduleStorage.all._keys.forEach(function(key) {
            if (key.charAt(0) == "_") {
                var syntax = new Function("module = {}; " + puzzle.moduleStorage.get(key) + " return syntax;")();
                puzzle.useSyntax(syntax);
            } else if (key.indexOf('var:') == 0) {
                global.puzzle.vars[key.substring(4)] = puzzle.moduleStorage.get(key);
            }
        })
    }
}


global.puzzle = puzzle;

try {
    window.puzzle = puzzle;
    try {
        window.addEventListener('DOMContentLoaded', (event) => {
            var scriptTags = document.getElementsByTagName("script");
            Array.from(scriptTags).forEach(function(s) {
                if (s.getAttribute("type") == "text/x-puzzle" && !s.getAttribute("src")) {
                    window.puzzle.parse(s.innerHTML);
                }
            })

        });
    } catch (e) {}

} catch (e) {

}

module.exports = puzzle;