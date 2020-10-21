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

var lang = {
    delimeter: ";",
    assignmentOperator: "=",
    context: {},
    vars: {},
    currentNamespace: "default",
    static: {
        execStatement: function(done, ctx) {

            if(ctx.define){
                lang.$.default[ctx.tokenName] = {
                    follow: ctx.tokenFollow,
                    method: ctx.tokenMethod
                }
            } else if(ctx.unDefine){
                if(ctx.tokenName) if(lang.$.default[ctx.tokenName]) delete lang.$.default[ctx.tokenName];
            }

            if (ctx[ctx.importNamespace]) {
                if (environment != 'node') return global.puzzle.output('feature not available in this environment')
                try {
                    ctx[ctx.importNamespace] = require(ctx.importUrl);
                } catch (e) {
                    global.puzzle.output('Import Error:', e)
                }
                if (done) done();
            }

            if (ctx['unUseNamespace']) {
                if (global.puzzle.moduleStorage.get('_' + ctx['unUseNamespace'])) {
                    global.puzzle.moduleStorage.remove('_' + ctx['unUseNamespace']);
                }
                if(lang.$[ctx['unUseNamespace']]) delete lang.$[ctx['unUseNamespace']];
                global.puzzle.output(ctx['unUseNamespace'], 'unused');
            }

            if (ctx['useNamespace']) {

                try {
                    var fileName = ctx['useNamespace'];
                    var extention = fileName.split(".")[fileName.split(".").length - 1];

                    if (fileName.indexOf('https://') == 0 || fileName.indexOf('http://') == 0) {

                        fetch(fileName)
                            .then(res => res.text())
                            .then(data => {
                                if (ctx['_' + ctx['useNamespace'] + 'permanent']) {
                                    if (!localStorage.getItem('_' + ctx['useNamespace'])) localStorage.setItem('_' + ctx['useNamespace'], data)
                                }

                                if (environment == 'node') {

                                    var fileName = Math.random() + ".js";

                                    fs.writeFile(fileName, data, function(err, data) {

                                        var file = require('./' + fileName);
                                        global.puzzle.useSyntax(file);

                                        fs.unlinkSync('./' + fileName);

                                    })

                                } else {
                                    var syntax = new Function("module = {}; " + data + " return syntax")();
                                    global.puzzle.useSyntax(syntax);
                                }
                                if (done) done();
                            });

                    } else if (extention.toLowerCase() == "js") {
                        if (environment != 'node') return global.puzzle.output('feature not available in this environment')

                        if (fileName.charAt(0) != '/') fileName = './' + fileName;
                        var file = require(fileName);
                        global.puzzle.useSyntax(file);
                        if (done) done();
                    } else if (fileName.indexOf('var:') == 0) {
                        // 
                        try {
                            global.puzzle.useSyntax(window[fileName.substring(4)]);
                        } catch (e) {
                            global.puzzle.useSyntax(global[fileName.substring(4)]);
                        }
                        if (done) done();
                    } else {
                        global.puzzle.output('unsupported file type');
                        if (done) done();
                    }

                } catch (e) {
                    global.puzzle.output('Use Error', e);
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

                } else if (extention.toLowerCase() == "puzzle") {
                    if (fileName.charAt(0) != '/') fileName = './' + fileName;
                    fs.readFile(fileName, function(err, data) {
                        if (err) return global.puzzle.output('Error reading file');
                        file = data;
                    });
                    includeScript(file)
                    if (done) done();
                } else {
                    global.puzzle.output('unsupported file type');
                    if (done) done();
                }
            } else if (done) done();
        }
    },
    "$": {
        default: {
            include: {
                manual: "include a puzzle file",
                follow: ["{file}"],
                method: function(ctx, file) {
                    ctx['includeNamespace'] = global.puzzle.getRawStatement(file);
                }
            },
            define: {
                manual: "Defines somethng",
                follow: ["$syntax", "$token"],
                method: function(ctx, data) {
                    ctx.define = true;
                }
            },
            undefine: {
                manual: "Undefines somethng",
                follow: ["$syntax", "$token"],
                method: function(ctx, data) {
                    ctx.unDefine = true;
                }
            },
            syntax: {
                manual: "Defines a syntax",
                follow: ["{data}"],
                method: function(ctx, data) {
                    if(ctx.define) {
                        inlineSyntax = eval('('+data+')');
                        ctx.syntaxNamespace = Object.keys(inlineSyntax.$)[0];
                        ctx['useNamespace'] = 'var:inlineSyntax';
                    } else if(ctx.unDefine){
                        ctx['unUseNamespace'] = 'inlineSyntax';
                    }
                }
            },
            token: {
                manual: "Defines a custom token for the active syntax",
                follow: ["{name}", "$width"],
                method: function(ctx, name) {
                    if(ctx.define) {
                        ctx.tokenName = name;
                    }
                }
            },
            width: {
                follow: ["$follow", "$method"],
                method: function(ctx, name) {
                    if(ctx.define) {
                        ctx.tokenName = name;
                    }
                }
            },
            follow: {
                follow: ["{follow}", "$and"],
                method: function(ctx, follow) {
                    if(ctx.define) {
                        console.log(global.puzzle.getRawStatement(follow))
                        ctx.tokenFollow = JSON.parse('['+ global.puzzle.getRawStatement(follow) + ']');
                    }
                }
            },
            method: {
                follow: ["{method}", "$and"],
                method: function(ctx, method) {
                    if(ctx.define) {
                        console.log(global.puzzle.getRawStatement(method))
                        ctx.tokenMethod = new Function('ctx','data', global.puzzle.getRawStatement(method))
                    }
                }
            },
            and: {
                follow: ["$follow", "$method"],
                method: function(ctx, follow) {
                    if(ctx.define) {
                       
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
                    global.puzzle.vars[data.key] = data.value;

                }
            },
            local: {
                manual: "Persists a variable",
                follow: ["{key,value}"],
                method: function(ctx, data) {
                    localStorage.setItem('var:' + data.key, data.value);
                    global.puzzle.vars[data.key] = data.value;
                }
            },
            func: {
                manual: "Sets a function",
                follow: ["{key,params,body}"],
                method: function(ctx, data) {
                    global.puzzle.funcs[data.key] = { params: data.params, body: data.body };

                    console.log('fs', global.puzzle.funcs);
                }
            },
            if: {
                follow: ["{condition}", "$then"],
                method: function(ctx, condition) {
                    ctx.if = condition;
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
                    }
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
                follow: ["$file"],
                method: function(ctx) {
                    ctx.fileOperation = 'read';
                }
            },
            remove: {
                follow: ["$file", "$dir"],
                method: function(ctx) {
                    ctx.fileOperation = 'remove';
                    ctx.dirOperation = 'remove';
                }
            },
            make: {
                follow: ["$dir"],
                method: function(ctx) {
                    ctx.dirOperation = 'make';
                }
            },
            file: {
                follow: ["{name,content}"],
                method: function(ctx, file) {
                    var content = file.content;
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
            dir: {
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
                    }
                }
            },
            print: {
                follow: ["{text}"],
                method: function(ctx, text) {
                    global.puzzle.output(global.puzzle.getRawStatement(text))
                }
            },
            js: {
                follow: ["{code}"],
                method: function(ctx, text) {
                    try {
                        global.puzzle.output(eval(global.puzzle.getRawStatement(text)))
                    } catch (e) {
                        global.puzzle.output('JavaScript Error', e)
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
                                    var man = "";
                                    if (lang['$'][ns][c].manual) man = ' (' + lang['$'][ns][c].manual + ')';
                                    var seq = "";
                                    lang['$'][ns][c].follow.forEach(f => {
                                        seq += f + " ";
                                    })
                                    global.puzzle.output('  ', c, seq, '\t', man)
                                    global.puzzle.output('\n')
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
        }

    }

}

module.exports = lang;