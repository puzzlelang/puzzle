(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
(function (process,global){
var environment = 'browser';
if ((typeof process !== 'undefined') && ((process.release || {}).name === 'node')) {
    environment = "node";
    const dependencies = require('./dependencies.js');
    fs = dependencies.fs;
    fetch = dependencies.fetch;
    npm = dependencies.npm;
    pjson = require('./package.json');
} else {
    global = window;

    fs = {
        readFile: function(url, encoding, cb) {
            if (url.indexOf('ls://') == 0)
                return cb(localStorage.getItem(url))

            const reader = new FileReader();
            reader.addEventListener('load', (event) => {
                if (cb) cb(event.target.result);
            });
            reader.readAsDataURL(url);
        },
        writeFile: function(url, data, cb) {
            cb(localStorage.setItem('ls://' + url, data))
        }
    }
}

var lang = {
    delimeter: ";",
    assignmentOperator: "=",
    context: {},
    vars: {},
    currentNamespace: "default",
    static: {
        execStatement: function(done) {

            if (lang.context[lang.context.importNamespace]) {
                if (environment != 'node') return console.log('feature not available in this environment')
                try {
                    lang.context[lang.context.importNamespace] = require(lang.context.importUrl);
                } catch (e) {
                    console.log('Import Error:', e)
                }
                if (done) done();
            }

            if (lang.context['unUseNamespace']) {
                if (global.luke.moduleStorage.get('_' + lang.context['unUseNamespace'])) {
                    global.luke.moduleStorage.remove('_' + lang.context['unUseNamespace']);
                    console.log(lang.context['unUseNamespace'], 'unused');
                }
            }

            if (lang.context['useNamespace']) {

                try {
                    var fileName = lang.context['useNamespace'];
                    var extention = fileName.split(".")[fileName.split(".").length - 1];

                    if (fileName.indexOf('https://') == 0) {

                        fetch(fileName)
                            .then(res => res.text())
                            .then(data => {
                                if (lang.context['_' + lang.context['useNamespace'] + 'permanent']) {
                                    if (!localStorage.getItem('_' + lang.context['useNamespace'])) localStorage.setItem('_' + lang.context['useNamespace'], data)
                                }

                                if (environment == 'node') {
                                    var syntax = new Function("module = {}; " + data + " return syntax;")();
                                    global.luke.useSyntax(syntax);
                                } else {
                                    var syntax = new Function("module = {}; " + data + " return syntax;")();
                                    global.luke.useSyntax(syntax);
                                }
                                if (done) done();
                            });

                    } else if (extention.toLowerCase() == "js") {

                        if (environment != 'node') return console.log('feature not available in this environment')

                        if (fileName.charAt(0) != '/') fileName = './' + fileName;
                        var file = require(fileName);
                        global.luke.useSyntax(file);
                        if (done) done();
                    } else {
                        console.log('unsupported file type');
                        if (done) done();
                    }


                } catch (e) {
                    console.log('Use Error', e);
                    if (done) done();
                }
            } else if (lang.context['includeNamespace']) {

                function includeScript(code) {
                    //console.log('ASff');
                    global.luke.parse(code);
                }

                var fileName = lang.context['includeNamespace'];
                var extention = fileName.split(".")[fileName.split(".").length - 1];

                if (fileName.indexOf('https://') == 0) {

                    fetch(fileName)
                        .then(res => res.text())
                        .then(data => {
                            includeScript(data);
                            if (done) done();
                        });

                } else if (extention.toLowerCase() == "luke") {
                    if (fileName.charAt(0) != '/') fileName = './' + fileName;
                    fs.readFile(fileName, function(err, data) {
                        if (err) return console.log('Error reading file');
                        file = data;
                    });
                    includeScript(file)
                    if (done) done();
                } else {
                    console.log('unsupported file type');
                    if (done) done();
                }
            } else if (done) done();
        }
    },
    "$": {
        default: {
            include: {
                manual: "include a luke file",
                follow: ["{file}"],
                method: function(ctx, file) {

                    lang.context['includeNamespace'] = file;

                }
            },
            ns: {
                manual: "Sets a namespace. Valid until another namespace is set",
                follow: ["{namespace}"],
                method: function(ctx, ns) {
                    lang.currentNamespace = ns;
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
            func: {
                manual: "Sets a function",
                follow: ["{key,params,body}"],
                method: function(ctx, data) {
                    global.luke.funcs[data.key] = { params: data.params, body: data.body };
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
                    lang.context['useNamespace'] = ns;
                    console.log('ctx', lang.context['useNamespace'])
                }
            },
            unuse: {
                follow: ["{file}"],
                method: function(ctx, ns) {
                    lang.context['unUseNamespace'] = ns;
                }
            },
            permanent: {
                follow: ["{file}"],
                method: function(ctx, file) {
                    lang.context['useNamespace'] = file;
                    lang.context['_' + file + 'permanent'] = true;
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
                            console.log(Object.keys(lang['$']).join(', '));
                            break;
                        case 'commands':
                            Object.keys(lang['$']).forEach((ns) => {
                                console.log('namespace:', ns, '\n');
                                Object.keys(lang['$'][ns]).forEach(c => {
                                    var man = "";
                                    if (lang['$'][ns][c].manual) man = ' (' + lang['$'][ns][c].manual + ')';
                                    console.log('  ', c, man)
                                    lang['$'][ns][c].follow.forEach(f => {
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

                    if (environment != 'node') return console.log('download not available in this environment')

                    fetch(param)
                        .then(res => res.text())
                        .then(data => {

                            var fileName = param.split('/')[param.split('/').length - 1];
                            fs.writeFile(fileName, data, function(err, data) {
                                console.log(fileName, 'downloaded');
                            })
                        });

                }
            },
            install: {
                follow: ["{param}"],
                method: function(ctx, param) {

                    if (!npm) return console.log('npm not available in this environment');

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

}

module.exports = lang;
}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./dependencies.js":4,"./package.json":3,"_process":5}],2:[function(require,module,exports){
(function (process,global){
if ((typeof process !== 'undefined') && ((process.release || {}).name === 'node')) {
    environment = "node";
    const dependencies = require('./dependencies.js');
    localStorage = new dependencies.localStorage.LocalStorage('./localStorage');
} else global = window;


var luke = {

    // Default language definition
    lang: require('./default.luke.js'),

    // Schedule map for statements
    schedule: [],

    // Custom set of methods
    api: {},

    // variables
    vars: {},

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
            /*if (param) {
                if (isObject(param)) {

                } else if (param.includes(this.lang.assignmentOperator)) {
                    var spl = param.split("=");
                    var param = {};
                    param[spl[0]] = spl[1];
                }
            }*/

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
        var sequence = (tokens, token, instructionKey, partId, done) => {

            if (tokens.length == 1 && token == this.lang.delimeter) {
                this.lang.static.execStatement(done)
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
                var bestMatchingInstruction = getMatchingFollowInstruction(nextInstructions, tokens[0]);

                // execute exact method

                if ((bestMatching || "").charAt(0) == "$") {
                    callTokenFunction(token);
                    sequence(tokens, tokens[0], bestMatching, partId, done);
                } else {

                    if (global.luke.vars[bestMatching]) {

                        callTokenFunction(global.luke.ctx[partId], token, global.luke.vars[bestMatching]);
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
                    sequence(tokens, tokens[0], bestMatching, partId, done);
                }

            } else {
                console.log('unequal', instructionKey, token);
            }
        }


        var splitInit = (parts) => {
            parts.forEach(p => {



                var partId = Math.random();

                luke.schedule.push({partId: partId, fn:(done) => {

                    if (!p) return;

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
                            sequence(tokens, tokens[0], bestMatching, partId, done);
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
                            sequence(tokens, tokens[0], bestMatching, partId, done);
                        }

                    } else {
                        console.log(t, 'is not defined');
                    }


                }})


                })


            function execSchedule(next){
                //console.log('next', next);
                if(!next) return;
                next.fn(function(){
                   // console.log('callback called');
                    execSchedule(luke.schedule.shift());
                });
            }

            //console.log(luke.schedule);

            execSchedule(luke.schedule.shift())

        }

        splitInit(parts);
    },
    init: function() {

        localStorage, luke.moduleStorage.all._keys.forEach(function(key) {
            if (key.charAt(0) == "_") {
                var syntax = new Function("module = {}; " + luke.moduleStorage.get(key) + " return syntax;" )();
                luke.useSyntax(syntax);
            }
        })
    }
}



global.luke = luke;

module.exports = luke;
}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./default.luke.js":1,"./dependencies.js":4,"_process":5}],3:[function(require,module,exports){
module.exports={
  "name": "luke-lang",
  "version": "0.0.29",
  "description": "A programing language platform",
  "main": "luke.js",
  "bin": {
    "luke": "./cli.js"
  },
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1",
    "build-browser": "browserify luke.js -i ./dependencies.js -o luke.browser.js"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/luke-lang/luke.git"
  },
  "author": "Marco Boelling",
  "license": "MIT",
  "bugs": {
    "url": "https://github.com/luke-lang/luke/issues"
  },
  "homepage": "https://github.com/luke-lang/luke#readme",
  "dependencies": {
    "commander": "^5.1.0",
    "https": "^1.0.0",
    "inquirer": "^7.3.0",
    "node-fetch": "^2.6.0",
    "node-fetch-npm": "^2.0.4",
    "node-localstorage": "^2.1.6",
    "npm": "^6.14.6",
    "npmview": "0.0.4",
    "tinyify": "^2.5.2"
  },
  "devDependencies": {}
}

},{}],4:[function(require,module,exports){

},{}],5:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}]},{},[2]);
