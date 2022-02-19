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

    /*fs = {
        readFile: function(url, cb) {
            if (url.indexOf('http://') == 0 || url.indexOf('https://') == 0)
            {
                // TODO fetch!
                return;
            }

            if(localStorage.getItem(url)) cb(null, localStorage.getItem(url));
            else cb("file not found", null)
        },
        writeFile: function(url, data, cb) {
            localStorage.setItem(url, data)
            cb(null, localStorage.getItem(url));
        }
    }*/

    var LightningFS = require('./dependencies/lightning-fs.min.js');

    fs = new LightningFS('fs')
}

var isObject = (a) => {
    return (!!a) && (a.constructor === Object);
};

var lang = {
    delimeter: ";",
    assignmentOperator: "=",
    context: {},
    vars: {},
    currentNamespace: "default",
    "$": {
        default: {
            _static: {
                execStatement: function(done, ctx) {

                    var relevantNamespace = ctx.insideNamespace || 'default';

                    if (ctx.define) {
                        if (ctx.tokenName) {
                            // console.log('ctx.insideNamespace', ctx.insideNamespace)
                            lang.$[relevantNamespace][ctx.tokenName] = {
                                follow: ctx.tokenFollow,
                                method: ctx.tokenMethod
                            }
                        } else {
                            //lang.$[relevantNamespace] = global[relevantNamespace]
                        }

                    } else if (ctx.unDefine) {
                        if (ctx.tokenName)
                            if (lang.$[relevantNamespace][ctx.tokenName]) delete lang.$[relevantNamespace][ctx.tokenName];
                    }
                    //                    console.log('rns', lang.$[relevantNamespace])

                    if (ctx[ctx.importNamespace]) {
                        if (environment != 'node') return global.puzzle.output('feature not available in this environment')
                        try {
                            ctx[ctx.importNamespace] = require(ctx.importUrl);
                        } catch (e) {
                            global.puzzle.error('Import Error:', e)
                        }
                        if (done) done();
                    }

                    if (ctx['unUseNamespace']) {
                        if (global.puzzle.moduleStorage.get('_' + ctx['unUseNamespace'])) {
                            global.puzzle.moduleStorage.remove('_' + ctx['unUseNamespace']);
                        }
                        if (lang.$[ctx['unUseNamespace']]) delete lang.$[ctx['unUseNamespace']];
                        global.puzzle.output(ctx['unUseNamespace'], 'unused');
                    }

                    if (ctx['useNamespace']) {

                        function downloadModule(fileName) {
                            fetch(fileName)
                                .then(res => res.text())
                                .then(data => {

                                    if (data.includes("Couldn't find the requested file")) {
                                        global.puzzle.output('module not found');
                                        if (done) done();
                                        return;
                                    }

                                    if (ctx['_' + ctx['useNamespace'] + 'permanent']) {
                                        if (!localStorage.getItem('_' + ctx['useNamespace'])) localStorage.setItem('_' + ctx['useNamespace'], data)
                                    }

                                    if (environment == 'node') {

                                        var fileName = Math.random() + ".js";

                                        fs.writeFile(fileName, data, function(err, data) {

                                            var file = require(__dirname + '/' + fileName);
                                            global.puzzle.useSyntax(file);

                                            fs.unlinkSync(__dirname + '/' + fileName);
                                        })

                                    } else {
                                        var syntax = new Function("module = {}; " + data + " return syntax")();
                                        global.puzzle.useSyntax(syntax);
                                    }
                                    if (done) done();
                                });
                        }

                        try {
                            var fileName = ctx['useNamespace'];
                            var extention = fileName.split(".")[fileName.split(".").length - 1];
                            if (!fileName.includes('.')) extention = null;

                            if (fileName.indexOf('https://') == 0 || fileName.indexOf('http://') == 0) {

                                downloadModule(fileName)

                            } else if (extention && extention.toLowerCase() == "js") {

                                if (environment != 'node') return global.puzzle.output('feature not available in this environment')
                                //if (!fileName.startsWith('../') && !fileName.startsWith('./')) fileName = __dirname + fileName;
                                var file = require(fileName);
                                global.puzzle.useSyntax(file);
                                if (done) done();
                            } else if (fileName.indexOf('var:') == 0) {
                                // 

                                if (ctx.define) global.puzzle.useSyntax(global[fileName.substring(4)], true);
                                else global.puzzle.useSyntax(global[fileName.substring(4)]);
                                
                                if (done) done();
                            } else {

                                var moduleUrl = global.puzzle.mainRepo.replace('<module>', fileName);
                                var moduleFileName = 'index.js';
                                if (fileName.includes('.')) {
                                    moduleFileName = 'index.' + fileName.split('.')[1] + '.js';
                                }

                                downloadModule(moduleUrl + '/' + moduleFileName)
                            }

                        } catch (e) {
                            global.puzzle.error('Use error', e);
                            if (done) done();
                        }
                    } else if (ctx['includeNamespace']) {

                        function includeScript(code) {
                            global.puzzle.parse(code);
                        }

                        var fileName = ctx['includeNamespace'];
                        var extention = fileName.split(".")[fileName.split(".").length - 1];

                        if (fileName.indexOf('https://') == 0) {

                            fetch(fileName)
                                .then(res => res.text())
                                .then(data => {
                                    includeScript(data);
                                    if (done) done();
                                });

                        } else {
                            //if (fileName.charAt(0) != '/') fileName = './' + fileName;
                            fs.readFile(fileName, function(err, data) {

                                if (err) return global.puzzle.error('Error reading file');
                                file = data.toString();
                                includeScript(file)
                                if (done) done();
                            });
                            
                        } 
                    } else if (done) done();

                    //console.log('lang', lang)
                }
            },
            include: {
                manual: "include a puzzle file",
                follow: ["{file}"],
                method: function(ctx, file) {
                    ctx['includeNamespace'] = global.puzzle.getRawStatement(file);
                }
            },
            define: {
                manual: "Defines something",
                follow: ["$syntax", "$livesyntax", "$token", "$function"],
                method: function(ctx, data) {
                    ctx.define = true;

                }
            },
            undefine: {
                manual: "Undefines something",
                follow: ["$syntax", "$token"],
                method: function(ctx, data) {
                    ctx.unDefine = true;
                }
            },
            syntax: {
                manual: "Defines a syntax",
                follow: ["{data}"],
                method: function(ctx, data) {
                    if (ctx.define) {
                        inlineSyntax = eval('(' + data + ')');
                        ctx.syntaxNamespace = Object.keys(inlineSyntax.$)[0];
                        ctx['useNamespace'] = 'var:inlineSyntax';
                    } else if (ctx.unDefine) {
                        ctx['unUseNamespace'] = 'inlineSyntax';
                    }
                }
            },
            livesyntax: {
                manual: "Defines an instant-available live syntax",
                follow: ["{name,func}"],
                method: function(ctx, data) {
                    ctx.syntaxNamespace = data.name;
                    lang.$[data.name] = {
                        $: {}
                    };
                    lang.$[data.name] = {
                        _static: {
                            execStatement: function(done, ctx) { return new Function(global.puzzle.getRawStatement(data.func)) }
                        },
                    };

                    global[data.name] = { $: {} };
                    global[data.name].$[data.name] = lang.$[data.name]
                    //ctx['useNamespace'] = 'var:name';
                }
            },
            token: {
                manual: "Defines a custom token for the active syntax",
                follow: ["{name}", "$with"],
                method: function(ctx, name) {
                    if (ctx.define) {
                        ctx.tokenName = name;
                    }
                }
            },
            with: {
                follow: ["{param}", "$follow", "$method", "$do"],
                method: function(ctx, param) {
                    ctx.withParam = param;
                }
            },
            follow: {
                follow: ["{follow}", "$and"],
                method: function(ctx, follow) {
                    if (ctx.define) {
                        var raw = global.puzzle.getRawStatement(follow);
                        var followTokens = [];
                        raw.split(',').forEach(t => {
                            followTokens.push(t.trim());
                        })
                        ctx.tokenFollow = followTokens
                    }
                }
            },
            method: {
                follow: ["{method}", "$and", "$inside"],
                method: function(ctx, method) {
                    if (ctx.define) {
                        ctx.tokenMethod = new Function('ctx', 'data', global.puzzle.getRawStatement(method))
                    }
                }
            },
            inside: {
                follow: ["{namespace}"],
                method: function(ctx, data) {
                    ctx.insideNamespace = data;
                }
            },
            and: {
                follow: ["$follow", "$method"],
                method: function(ctx, follow) {
                    if (ctx.define) {

                    }
                }
            },
            ns: {
                manual: "Sets a namespace. Valid until another namespace is set",
                follow: ["{namespace}"],
                method: function(ctx, ns) {
                    lang.currentNamespace = ns;

                }
            },
            var: {
                manual: "Sets a variable",
                follow: ["{key,value}"],
                method: function(ctx, data) {
                    global.puzzle.vars[data.key] = global.puzzle.evaluateRawStatement(data.value);
                }
            },
            add: {
                manual: "adds an entry to an array or object",
                follow: ["$to", "{data}"],
                method: function(ctx, data) {
                    ctx.addData = data
                }
            },
            pop: {
                manual: "removes an entry to an array or object",
                follow: ["$from", "{data}"],
                method: function(ctx, data) {
                    if (data) ctx.popData = data
                }
            },
            /*update: { @TODO !!!
                manual: "updates an entry inside an array or object",
                follow: ["$from", "{data}"],
                method: function(ctx, data) {
                    if (data) ctx.popData = data
                }
            },*/
            to: {
                manual: "adds an entry to an array or object",
                follow: ["{varName}"],
                method: function(ctx, varName) {
                    varName = global.puzzle.getRawStatement(varName);

                    if (ctx.addData) {
                        if (!global.puzzle.vars.hasOwnProperty(varName)) return global.puzzle.output(varName + 'does not exist');
                        var variable = global.puzzle.vars[varName];
                        if (Array.isArray(variable)) {
                            global.puzzle.vars[varName].push(global.puzzle.getRawStatement(ctx.addData));
                        } else if (isObject(variable)) {
                            try {
                                var parsed = eval('(' + ctx.addData + ')');
                                if (variable.hasOwnProperty(Object.keys(parsed)[0])) return global.puzzle.output(ctx.addData + 'already exists in this object');
                                global.puzzle.vars[varName][Object.keys(parsed)[0]] = parsed[Object.keys(parsed)[0]];
                            } catch (e) {
                                //global.puzzle.output(e)
                            }
                        }
                    }
                }
            },
            from: {
                manual: "removes an entry to an array or object",
                follow: ["{varName}"],
                method: function(ctx, varName) {
                    varName = global.puzzle.getRawStatement(varName);

                    if (ctx.popData) {
                        if (!global.puzzle.vars.hasOwnProperty(varName)) return global.puzzle.output(varName + 'does not exist');
                        var variable = global.puzzle.vars[varName];
                        if (Array.isArray(variable)) {
                            global.puzzle.vars[varName].splice(global.puzzle.vars[varName].indexOf(global.puzzle.getRawStatement(ctx.popData)), 1)
                        } else if (isObject(variable)) {
                            if (!global.puzzle.vars[varName].hasOwnProperty(global.puzzle.getRawStatement(ctx.popData))) return global.puzzle.output(global.puzzle.getRawStatement(ctx.popData) + 'does not exist in this object');
                            delete global.puzzle.vars[varName][global.puzzle.getRawStatement(ctx.popData)];
                        }
                    }
                }
            },
            set: {
                manual: "Sets a variable",
                follow: ["$from", "$local", "{key,value}"],
                method: function(ctx, data) {
                    if (!data) return;
                    try {
                        global.puzzle.vars[data.key] = JSON.parse(data.value);
                    } catch (e) {
                        global.puzzle.vars[data.key] = global.puzzle.evaluateRawStatement(data.value || '');
                    }
                    ctx.return = global.puzzle.vars[data.key];
                }
            },
            unset: {
                manual: "Unsets a variable",
                follow: ["{key}"],
                method: function(ctx, data) {
                    delete global.puzzle.vars[global.puzzle.getRawStatement(data)];
                    localStorage.removeItem('var:' + global.puzzle.getRawStatement(data));
                }
            },
            local: {
                manual: "Persists a variable",
                follow: ["{key,value}"],
                method: function(ctx, data) {
                    var value = global.puzzle.evaluateRawStatement(data.value || '');
                    localStorage.setItem('var:' + data.key, value);
                    global.puzzle.vars[data.key] = value;
                }
            },
            func: {
                manual: "Sets a function",
                follow: ["{key,params,body}"],
                method: function(ctx, data) {
                    global.puzzle.funcs[data.key] = { params: data.params, body: data.body };
                }
            },
            runner: {
                manual: "Sets a function (subscript)",
                follow: ["{key,body}"],
                method: function(ctx, data) {
                    global.puzzle.subscripts[data.key] = { body: data.body };
                }
            },
            run: {
                manual: "Runs a function",
                follow: ["{subscript}"],
                innerSequence: { in: {
                        follow: ["{subscript}"],
                        method: function(ctx, subscript) {
                            var vars = {};
                            ctx.params.split(',').forEach(p => {
                                vars[p.split(':')[0]] = p.split(':')[1]
                            })
                            if (global.puzzle.subscripts[subscript]) {
                                var func = global.puzzle.subscripts[subscript];
                                global.puzzle.parse(func.body.substring(func.body.indexOf('{') + 1, func.body.indexOf('}')), Object.assign(global.puzzle.vars, vars));
                            }
                        }
                    }
                },
                method: function(ctx, subscript) {
                    if (global.puzzle.subscripts[subscript]) {
                        var func = global.puzzle.subscripts[subscript];
                        global.puzzle.parse(func.body.substring(func.body.indexOf('{') + 1, func.body.indexOf('}')), global.puzzle.vars);
                    } else {
                        ctx.params = global.puzzle.getRawStatement(subscript);
                    }
                }
            },
            if: {
                follow: ["{condition}", "$then"],
                method: function(ctx, condition) {
                    ctx.if = condition;
                    Object.keys(global.puzzle.vars).forEach(v => {
                        if (ctx.if.includes(v)) ctx.if = ctx.if.replace(v, global.puzzle.vars[v])
                    })
                }
            },
            then: {
                follow: ["{statement}", "$else"],
                method: function(ctx, statement) {
                    if (ctx.if) {
                        ctx.if = ctx.if.replace(/AND/g, '&&').replace(/OR/g, '||')
                        if (eval(ctx.if)) {
                            ctx.conditionMet = true;
                            global.puzzle.parse(global.puzzle.getRawStatement(statement));
                        }
                    }
                }
            },
            else: {
                follow: ["{statement}"],
                method: function(ctx, statement) {
                    if (ctx.if && !ctx.conditionMet) {
                        global.puzzle.parse(global.puzzle.getRawStatement(statement));
                    }
                }
            },
            while: {
                follow: ["{condition}", "$do"],
                method: function(ctx, statement) {
                    ctx.while = condition;
                }

            },
            loop: {
                follow: ["$over"],
                method: function(ctx, statement) {
                    
                }

            },
            over: {
                follow: ["{variable}", "$do"],
                method: function(ctx, variable) {
                    ctx.loopData = variable;
                }

            },
            for: {
                follow: ["{condition}", "$do"],
                method: function(ctx, condition) {
                    ctx.for = condition;
                }
            },
            do: {
                follow: ["{statement}"],
                method: function(ctx, statement) {
                    //new Function("module = {}; " + data + " return syntax;")();
                    if (ctx.while) {
                        ctx.while = ctx.while.replace(/AND/g, '&&').replace(/OR/g, '||')
                        new Function("while(" + global.puzzle.getRawStatement(ctx.while) + "){ puzzle.parse('" + global.puzzle.getRawStatement(statement) + "') };")()
                    } else if (ctx.for) {
                        ctx.for = ctx.for.replace(/AND/g, '&&').replace(/OR/g, '||');
                        new Function("for(" + global.puzzle.getRawStatement(ctx.for) + "){ puzzle.parse('var i '+i+'; " + global.puzzle.getRawStatement(statement) + "') };")()
                    } else if(ctx.loopData){
                        //console.log('ctx', ctx, global.puzzle.getRawStatement(statement))
                        if(!Array.isArray(ctx.loopData)) return global.puzzle.error('Error. ' + ctx.loopData + ' is not iterable');
                        ctx.loopData.forEach(item => {
                            var varsObj = {};
                            varsObj[ctx.withParam] = item;
                            global.puzzle.parse(global.puzzle.getRawStatement(statement), varsObj)
                        })
                    }
                }
            },
            '+': {
                manual: "Add",
                follow: [],
                method: function(ctx, data) {
                    global.puzzle.output('puzzle version: ', pjson.version)
                }
            },
            version: {
                manual: "See the installed version of puzzle",
                follow: [],
                method: function(ctx, data) {
                    global.puzzle.output('puzzle version: ', pjson.version)
                }
            },
            use: {
                follow: ["$permanent", "{file}"],
                method: function(ctx, ns) {
                    ctx['useNamespace'] = global.puzzle.getRawStatement(ns);

                }
            },
            unuse: {
                follow: ["{file}"],
                method: function(ctx, ns) {
                    ctx['unUseNamespace'] = ns;
                }
            },
            permanent: {
                follow: ["{file}"],
                method: function(ctx, file) {
                    ctx['useNamespace'] = global.puzzle.getRawStatement(file);
                    ctx['_' + file + 'permanent'] = true;
                }
            },
            write: {
                follow: ["$file"],
                method: function(ctx) {
                    ctx.fileOperation = 'write';
                }
            },
            read: {
                follow: ["$file", "$directory"],
                method: function(ctx) {
                    ctx.fileOperation = 'read';
                    ctx.dirOperation = 'read';
                }
            },
            remove: {
                follow: ["$file", "$directory"],
                method: function(ctx) {
                    ctx.fileOperation = 'remove';
                    ctx.dirOperation = 'remove';
                }
            },
            make: {
                follow: ["$directory"],
                method: function(ctx) {
                    ctx.dirOperation = 'make';
                }
            },
            file: {
                follow: ["{name,content}"],
                method: function(ctx, file) {
                    var content = global.puzzle.getRawStatement(file.content);
                    if (environment == 'web') content = new TextEncoder("utf-8").encode(file.content);

                    switch (ctx.fileOperation) {
                        case 'write':
                            fs.writeFile(file.name, content, 'utf8', function(err, data) {
                                if (err) return global.puzzle.output(err);
                                global.puzzle.output(data);
                            })
                            break;
                        case 'read':
                            fs.readFile(file.name, function(err, data) {
                                if (err) return global.puzzle.output(err);
                                global.puzzle.output(data.toString());
                            })
                            break;
                        case 'remove':
                            fs.unlink(file.name, function(err, data) {
                                if (err) return global.puzzle.output(err);
                                global.puzzle.output(data);
                            })
                            break;
                    }
                }
            },
            directory: {
                follow: ["{dir}"],
                method: function(ctx, dir) {
                    switch (ctx.dirOperation) {
                        case 'make':
                            fs.mkdir(dir, {}, function(err, data) {
                                if (err) return global.puzzle.output(err);
                                global.puzzle.output(data);
                            })
                            break;
                        case 'remove':
                            fs.rmdir(dir, function(err, data) {
                                if (err) return global.puzzle.output(err);
                                global.puzzle.output(data);
                            })
                            break;
                        case 'read':
                            fs.readdir(dir, function(err, data) {
                                if (err) return global.puzzle.output(err);
                                global.puzzle.output(data);
                            })
                            break;
                    }
                }
            },
            print: {
                follow: ["{text}"],
                method: function(ctx, text) {
                    global.puzzle.output(global.puzzle.evaluateRawStatement(text))
                }
            },
            js: {
                follow: ["{code}"],
                method: function(ctx, text) {
                    try {
                        global.puzzle.output(eval(global.puzzle.getRawStatement(text)))
                    } catch (e) {
                        global.puzzle.error('JavaScript Error', e)
                    }
                }
            },
            list: {
                follow: ["{param}"],
                method: function(ctx, param) {
                    switch (param) {
                        case 'modules':
                            global.puzzle.output(Object.keys(lang['$']).join(', '));
                            break;
                        case 'commands':
                            Object.keys(lang['$']).forEach((ns) => {
                                global.puzzle.output('namespace:', ns, '\n');
                                Object.keys(lang['$'][ns]).forEach(c => {
                                    try {
                                        var man = "";
                                        if (lang['$'][ns][c].manual) man = ' (' + lang['$'][ns][c].manual + ')';
                                        var seq = "";
                                        lang['$'][ns][c].follow.forEach(f => {
                                            seq += f + " ";
                                        })
                                        global.puzzle.output('  ', c, seq, '\t', man)
                                        global.puzzle.output('\n')
                                    } catch(e){}                                    
                                })
                            })
                            break;
                    }
                }
            },
            download: {
                follow: ["{param}"],
                method: function(ctx, param) {

                    if (environment != 'node') return global.puzzle.output('download not available in this environment')

                    fetch(param)
                        .then(res => res.text())
                        .then(data => {

                            var fileName = param.split('/')[param.split('/').length - 1];
                            fs.writeFile(fileName, data, function(err, data) {
                                global.puzzle.output(fileName, 'downloaded');
                            })
                        });

                }
            },
            install: {
                follow: ["{param}"],
                method: function(ctx, param) {

                    if (!npm) return global.puzzle.output('npm not available in this environment');

                    npm.load({
                        loaded: false
                    }, function(err) {
                        npm.commands.install([param], function(er, data) {
                            global.puzzle.output(er, data);
                        });
                        npm.on("log", function(message) {
                            global.puzzle.output(message);
                        });
                    });
                }
            },
            "->": {
                follow: ["{code}"],
                method: function(ctx, code) {
                    global.puzzle.parse(global.puzzle.getRawStatement(code))

                }
            },
             "as": {
                follow: ["{variableName}"],
                method: function(ctx, variableName) {
                    global.puzzle.vars[variableName]  = ctx.return;

                }
            }
        }

    }

}

module.exports = lang;