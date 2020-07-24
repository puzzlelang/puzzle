if (typeof module !== 'undefined' && module.exports) {
    environment = "node";
    /*var LocalStorage = require('node-localstorage').LocalStorage;
    localStorage = new LocalStorage('./localStorage');
    fs = require('fs');
    fetch = require('node-fetch');
    npm = require("npm");*/
    pjson = require('./package.json');
} else {
    
    global = window;

    fs = {
        readFile: function(url, encoding, cb){
            if(url.indexOf('ls://') == 0)
              return cb(localStorage.getItem(url))

            const reader = new FileReader();
            reader.addEventListener('load', (event) => {
              if(cb) cb(event.target.result);
            });
            reader.readAsDataURL(url);
        },
        writeFile: function(url, data, cb){
            cb(localStorage.setItem('ls://' + url, data))
        }
    }
}

global.luke = {
    vars: {},
    ctx: {}
};

var defaultLang = {
    delimeter: ";",
    assignmentOperator: "=",
    context: {},
    vars: {},
    currentNamespace: "default",
    static: {
        execStatement: function() {

            if (defaultLang.context[defaultLang.context.importNamespace]) {
                if(environment != 'node') return console.log('feature not available in this environment')
                try {
                    defaultLang.context[defaultLang.context.importNamespace] = require(defaultLang.context.importUrl);
                } catch (e) {
                    console.log('Import Error:', e)
                }
            }

            if (defaultLang.context['unUseNamespace']) {
                if (global.luke.moduleStorage.get('_' + defaultLang.context['unUseNamespace'])) {
                    global.luke.moduleStorage.remove('_' + defaultLang.context['unUseNamespace']);
                    console.log(defaultLang.context['unUseNamespace'], 'unused');
                }
            }

            if (defaultLang.context['useNamespace']) {

                try {
                    var fileName = defaultLang.context['useNamespace'];
                    var extention = fileName.split(".")[fileName.split(".").length - 1];

                    if (fileName.indexOf('https://') == 0) {

                        fetch(fileName)
                            .then(res => res.text())
                            .then(data => {
                                if (defaultLang.context['_' + defaultLang.context['useNamespace'] + 'permanent']) {
                                    if (!localStorage.getItem('_' + defaultLang.context['useNamespace'])) localStorage.setItem('_' + defaultLang.context['useNamespace'], data)
                                }
                                useSyntax(defaultLang, eval(data));
                            });

                    } else if (extention.toLowerCase() == "js") {
                        
                        if(environment != 'node') return console.log('feature not available in this environment')

                        if (fileName.charAt(0) != '/') fileName = './' + fileName;
                        var file = require(fileName);
                        useSyntax(defaultLang, file);
                    } else console.log('unsupported file type')


                } catch (e) {
                    console.log('Use Error', e);
                }
            }
        }
    },
    "$": {
        default: {
            include: {
                manual: "include a luke file",
                follow: ["{file}"],
                method: function(ctx, file) {

                    function includeScript(code)
                    {
                        //console.log('ASff');
                        global.luke.instance.parse(code);
                    }
                    
                    var fileName = file;
                    var extention = fileName.split(".")[fileName.split(".").length - 1];

                    if (fileName.indexOf('https://') == 0) {

                        fetch(fileName)
                            .then(res => res.text())
                            .then(data => {
                                includeScript(data);
                            });

                    } else if (extention.toLowerCase() == "luke") {
                        if (fileName.charAt(0) != '/') fileName = './' + fileName;
                        fs.readFile(fileName, function(err, data){
                            if(err) return console.log('Error reading file');
                            file = data;
                        });
                        includeScript(file)
                    } else console.log('unsupported file type')

                }
            },
            ns: {
                manual: "Sets a namespace. Valid until another namespace is set",
                follow: ["{namespace}"],
                method: function(ctx, ns) {
                    defaultLang.currentNamespace = ns;
                    console.log('Set namespace', ns)
                }
            },
            var: {
                manual: "Sets a variable",
                follow: ["{key,value}"],
                method: function(ctx, data) {
                    global.luke.vars[data.key] = data.value;
                    console.log('vars', global.luke.vars)
                }
            },
            version: {
                manual: "See the installed version of luke",
                follow: [],
                method: function(ctx, data) {
                    console.log('luke version: ', pjson.version)
                }
            },
            use: {
                follow: ["$permanent", "{file}"],
                method: function(ctx, ns) {
                    defaultLang.context['useNamespace'] = ns;
                }
            },
            unuse: {
                follow: ["{file}"],
                method: function(ctx, ns) {
                    defaultLang.context['unUseNamespace'] = ns;
                }
            },
            permanent: {
                follow: ["{file}"],
                method: function(ctx, file) {
                    defaultLang.context['useNamespace'] = file;
                    defaultLang.context['_' + file + 'permanent'] = true;
                }
            },
            print: {
                follow: ["{text}"],
                method: function(ctx, text) {
                    console.log(text)
                }
            },
            list: {
                follow: ["{param}"],
                method: function(ctx, param) {
                    switch (param) {
                        case 'modules':
                            console.log(Object.keys(defaultLang['$']).join(', '));
                            break;
                        case 'commands':
                            Object.keys(defaultLang['$']).forEach((ns) => {
                                console.log('namespace:', ns, '\n');
                                Object.keys(defaultLang['$'][ns]).forEach(c => {
                                    var man = "";
                                    if (defaultLang['$'][ns][c].manual) man = ' (' + defaultLang['$'][ns][c].manual + ')';
                                    console.log('  ', c, man)
                                    defaultLang['$'][ns][c].follow.forEach(f => {
                                        console.log('\t...', f)
                                    })
                                    console.log('\n')
                                })
                            })
                            break;
                    }
                }
            },
            download: {
                follow: ["{param}"],
                method: function(ctx, param) {

                    if(environment != 'node') return console.log('download not available in this environment')

                    fetch(param)
                           .then(res => res.text())
                           .then(data => {
                               
                               var fileName = param.split('/')[param.split('/').length - 1];
                               fs.writeFile(fileName, data, function(err, data){
                                    console.log(fileName, 'downloaded');
                               })
                           });
                  
                }
            },
            install: {
                follow: ["{param}"],
                method: function(ctx, param) {

                    if(!npm) return console.log('npm not available in this environment');

                    npm.load({
                        loaded: false
                    }, function(err) {
                        npm.commands.install([param], function(er, data) {
                            console.log(er, data);
                        });
                        npm.on("log", function(message) {
                            console.log(message);
                        });
                    });
                }
            },
        }

    }
};

var dsl = {

    // Default defaultLanguage definition
    lang: defaultLang,//require('./default.luke.js'),

    // Custom set of methods
    api: {},

    // variables
    vars: global.luke.vars,

    // statement context
    ctx: global.luke.ctx,

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

        this.lang.currentNamespace = Object.keys(jsObject['$'])[0];

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
        var callTokenFunction = (ctx, key, param, dslKey) => {

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
                    (definition[key]).method(ctx, param);
                } else if (this.api[key]) {
                    this.api[key](ctx, param)
                }
            } else if (this.api[key]) {
                this.api[key](ctx, param)
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

                global.luke.ctx[partId].sequence.push(token)

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

                        callTokenFunction(global.luke.ctx[partId], t, global.luke.vars[bestMatching]);
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

                        callTokenFunction(global.luke.ctx[partId], token, argList);
                        //tokens.shift();

                    } else {
                        callTokenFunction(global.luke.ctx[partId], token, bestMatching)
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

                global.luke.ctx[partId] = {
                    sequence: [],
                    data: {}
                };

                var tokens = p.match(/\{[^\}]+?[\}]|\([^\)]+?[\)]|[\""].+?[\""]|[^ ]+/g);

                tokens.push(this.lang.delimeter);

                var t = tokens[0].replace(/(\r\n|\n|\r)/gm,"");

                tokens.shift();

                var definition = Object.assign(this.lang['$'][this.lang.currentNamespace] || {}, this.lang['$'].default)

                if (definition[t]) {

                    var bestMatching = getMatchingFollow(definition[t].follow, tokens[0]);
                    var bestMatchingInstruction = getMatchingFollowInstruction(definition[t].follow, tokens[0]);

                    if ((bestMatching || "").charAt(0) == "$") {
                        callTokenFunction(global.luke.ctx[partId], t);
                        sequence(tokens, tokens[0], bestMatching, partId);
                    } else {

                        if (global.luke.vars[bestMatching]) {

                            callTokenFunction(global.luke.ctx[partId], t, global.luke.vars[bestMatching]);
                            tokens.shift();
                        } else if (bestMatchingInstruction && bestMatchingInstruction.includes(",")) {
                            var rawSequence = bestMatchingInstruction.substring(1, bestMatchingInstruction.length - 1).split(",");


                            var argList = {};
                            var t2;

                            rawSequence.forEach(function(s, i) {
                                t2 = tokens[0]
                                argList[s] = t2;
                                tokens.shift();
                            })

                            callTokenFunction(global.luke.ctx[partId], t, argList);
                            //tokens.shift();

                        } else {
                            callTokenFunction(global.luke.ctx[partId], t, bestMatching)
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

        localStorage, dsl.moduleStorage.all._keys.forEach(function(key) {
            if (key.charAt(0) == "_") {
                dsl.useSyntax(eval(dsl.moduleStorage.get(key)));
            }
        })
    }
}

global.luke.useSyntax = dsl.useSyntax;
global.luke.moduleStorage = dsl.moduleStorage;
global.luke.instance = dsl;

module.exports = dsl;