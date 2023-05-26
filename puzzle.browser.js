(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__dirname){(function (){
var environment = 'browser';
if ((typeof process !== 'undefined') && ((process.release || {}).name === 'node')) {

    if(process.env.sandbox) {
        environment = "sandbox";
        dependencies = require('./dependencies_sandboxed.js');
        localStorage = new dependencies.localStorage.LocalStorage();
    } else {
        environment = "node";
        const dependencies = require('./dependencies.js');
        pjson = require('./package.json');
    }

    fs = dependencies.fs;
    fetch = dependencies.fetch;
    os = dependencies.os;
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

var isLiteral = (a) => {
    if(!a) return false;
    var literalParts = ['"', '(', '{', "'"];
    if(literalParts.includes(a.charAt(0))) return true;
    return false;
}

Object.setByString = function(o, k, v) {
    if(!isNaN(k)) return;
    let schema = o;
    const pList = k.split('.');
    const len = pList.length;
    for (var i = 0; i < len - 1; i++) {
      var elem = pList[i];
      if (schema[elem] === undefined) schema[elem] = {}
      schema = schema[elem];
    }
    if (v === undefined) {
      return schema[pList[len - 1]];
    }
    schema[pList[len - 1]] = v;
    return o;
}

var lang = {
    default: {
            _static: {
               execStatement: function(done, ctx) {

                    var relevantNamespace = ctx.insideNamespace || 'default';

                    if(ctx.waitTime){
                        lang.delays[Math.random()] = setTimeout(()=>{
                            done();
                        }, parseInt(ctx.waitTime))
                        return;
                    }

                    if (ctx.define) {
                        if (ctx.tokenName) {
                            // console.log('ctx.insideNamespace', ctx.insideNamespace)
                            lang[relevantNamespace][ctx.tokenName] = {
                                follow: ctx.tokenFollow,
                                method: ctx.tokenMethod
                            }
                        } else {
                            //lang[relevantNamespace] = global[relevantNamespace]
                        }

                    } else if (ctx.unDefine) {
                        if (ctx.tokenName)
                            if (lang[relevantNamespace][ctx.tokenName]) delete lang[relevantNamespace][ctx.tokenName];
                    }
                    
                    if (ctx['unUseNamespace']) {
                        if (global.puzzle.moduleStorage.get('_' + ctx['unUseNamespace'])) {
                            global.puzzle.moduleStorage.remove('_' + ctx['unUseNamespace']);
                        }
                        if (lang[ctx['unUseNamespace']]) delete lang[ctx['unUseNamespace']];
                        global.puzzle.output(ctx['unUseNamespace'], 'unused');
                    }

                    if (ctx['useNamespace']) {

                        function downloadModule(fileName, done) {
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

                                        var tempDir = __dirname;//os.tmpdir();

                                        var fileName = Math.random() + ".js";

                                        fs.writeFile(tempDir + '/' + fileName, data, function(err, data) {

                                            var file = require(tempDir + '/' + fileName);
                                            global.puzzle.useSyntax(file, false, done);
                                            //lang.currentNamespace = Object.keys(file)[0]

                                            fs.unlinkSync(tempDir + '/' +fileName);
                                        })

                                    } else if(environment == 'sandbox') {
                                        eval(data)
                                        global.puzzle.useSyntax(syntax, false, done);
                                        //lang.currentNamespace = Object.keys(syntax)[0]
                                    } else {
                                        var syntax = new Function("module = {}; " + data + " return syntax")();
                                        global.puzzle.useSyntax(syntax, false, done);

                                        //lang.currentNamespace = Object.keys(syntax)[0]
                                    }

                                });
                        }

                        try {
                            var fileName = ctx['useNamespace'];

                            if(typeof fileName === "object"){
                                return global.puzzle.useSyntax(fileName, false, done);

                            }

                            var extention = fileName.split(".")[fileName.split(".").length - 1];
                            if (!fileName.includes('.')) extention = null;

                            if (fileName.indexOf('https://') == 0 || fileName.indexOf('http://') == 0) {

                                downloadModule(fileName, done)

                            } else if (extention && environment == 'node') {
                                var file = require(fileName);
                                
                                global.puzzle.useSyntax(file, false, done);
                                //lang.currentNamespace = Object.keys(file)[0]

                            } else if (extention && environment == 'sandbox') { 
                                fs.readFile(fileName, function(err, data) {
                                    eval(data)
                                    global.puzzle.useSyntax(syntax, false, done);
                                    //lang.currentNamespace = Object.keys(syntax)[0]
                                })
                            } else if (extention && environment != 'node') {
                                
                                if(location.protocol.includes('http') || location.hostname == 'localhost'){
                                    // fetch can be used
                                    fetch(fileName)
                                        .then(res => res.text())
                                        .then(data => {
                                            
                                            if (err) return global.puzzle.error('Error reading file');
                                            var _file = data.toString();
                                            
                                            var syntax = new Function("module = {}; " + _file + " return syntax")();
                                            global.puzzle.useSyntax(syntax, false, done);
                                            //lang.currentNamespace = Object.keys(syntax)[0]

                                        });

                                } else {

                                    fs.readFile(fileName, function(err, data) {

                                        if (err) return global.puzzle.error('Error reading file');
                                        var _file = data.toString();
                                        
                                        var syntax = new Function("module = {}; " + _file + " return syntax")();
                                        global.puzzle.useSyntax(syntax, false, done);
                                        //lang.currentNamespace = Object.keys(syntax)[0]
                                    });

                                    //if (done) done();
                                }

                               
                            } else if (fileName.indexOf('var:') == 0) {
                                // 

                                if (ctx.define) global.puzzle.useSyntax(global[fileName.substring(4)], true, done);
                                else global.puzzle.useSyntax(global[fileName.substring(4)], false, done);

                               // lang.currentNamespace = Object.keys(global[fileName.substring(4)])[0]

                            } else {

                                var moduleUrl = global.puzzle.mainRepo.replace('<module>', fileName);
                                var moduleFileName = 'index.js';
                                if (fileName.includes('.')) {
                                    moduleFileName = 'index.' + fileName.split('.')[1] + '.js';
                                }
                                downloadModule(moduleUrl + '/' + moduleFileName, done);
                                //lang.currentNamespace = moduleFileName;
                            }

                        } catch (e) {
                            console.log(e)
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

                            if(location.protocol.includes('http')  || location.hostname == 'localhost'){
                                fetch(fileName)
                                    .then(res => res.text())
                                    .then(data => {
                                        includeScript(data);
                                        if (done) done();
                                    });
                            } else {
                                fs.readFile(fileName, function(err, data) {

                                    if (err) return global.puzzle.error('Error reading file');
                                    file = data.toString();
                                    includeScript(file)
                                    if (done) done();
                                });
                            }
                            //if (fileName.charAt(0) != '/') fileName = './' + fileName;
                            
                            
                        } 
                    } else if (done) {
                         done();
                    }

                    //console.log('lang', lang)
                }
            },
            "bind-vars": {
                manual: "bind vars from parent javascript",
                follow: ["{value}"],
                method: function(ctx, value) {
                    global.puzzle.vars = eval('('+value+');');
                }
            },
            "isolate-vars": {
                manual: "unuse all global vars",
                follow: ["{value}"],
                method: function(ctx, file) {
                    global.puzzle.vars = {};
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
                follow: ["$syntax", "$livesyntax", "$token", "$function", "$script"],
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
                    lang[data.name] = {
                        $: {}
                    };
                    lang[data.name] = {
                        _static: {
                            execStatement: function(done, ctx) { return new Function(global.puzzle.getRawStatement(data.func)) }
                        },
                    };

                    global[data.name] = { $: {} };
                    global[data.name].$[data.name] = lang[data.name]
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
                follow: ["{param}", "$follow", "$method", "$do", "$run"],
                method: function(ctx, param) {
                    ctx.withParam = param;
                }
            },
            stop: {
                follow: [],
                method: function(ctx, param) {
                    
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
            random: {
                follow: ["$number"],
                method: function(ctx, ns) {
                    
                },
                innerSequence: {
                    number: {
                        follow: ["$as"],
                        method: function(ctx, ns) {
                            ctx.return = Math.floor(Math.random() * 999) + 1;
                        }
                    },
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

                    if (data === undefined) return;
                    if(!isNaN(data.value)) data.value = +data.value
                    data.value = global.puzzle.getRawStatement(data.value, ctx);



                    // TODO CHECK SCOPES!!!

                    /*
                    
                    // set global value
                    set one 1;
    
                    // set global global
                    set eins one;
                    

                    set one 11;

                    loop over something with dome so (
                        set uno 1;

                        set one eins;
                        set one 111;
                        set one uno;
                        set uno 111;
                    )


                    */

                    try {
                        data.value = JSON.parse(data.value);
                    } catch(e){

                    }

                    Object.setByString(global.puzzle.vars, data.key,data.value)

                  /*
                    if(/*Object.keys(ctx.vars).length* !ctx.isRoot){
                        if(Object.byString(global.puzzle.vars, data.key) !== undefined)
                        {
                            if(Object.byString(global.puzzle.vars, data.value) !== undefined){
                                Object.setByString(global.puzzle.vars, data.key, Object.byString(global.puzzle.vars, data.value))
                            } else if(Object.byString(ctx.vars, data.value) !== undefined){
                                Object.setByString(global.puzzle.vars, data.key, Object.byString(ctx.vars, data.value))
                            } else Object.setByString(global.puzzle.vars, data.key, data.value);
                        } else if(Object.byString(ctx.vars, data.value) !== undefined){
                            Object.setByString(ctx.vars, data.key, Object.byString(ctx.vars, data.value))
                        } else Object.setByString(ctx.vars, data.key, data.value)
                    } else {
                         if(Object.byString(global.puzzle.vars, data.value) !== undefined){
                                Object.setByString(global.puzzle.vars, data.key, Object.byString(global.puzzle.vars, data.value))
                            } else {
                                Object.setByString(global.puzzle.vars, data.key,data.value)
                            }
                    }*/


/*
                    try {
                        //global.puzzle.vars[data.key] = JSON.parse(data.value);
                        if(Object.byString(global.puzzle.vars, data.value)){
                            Object.setByString(global.puzzle.vars, data.key, Object.byString(global.puzzle.vars, data.value))
                        } else {
                            var arr = JSON.parse(data.value);
                            Object.setByString(global.puzzle.vars, data.key, JSON.parse(data.value))
                        }
                    } catch (e) {
                        //global.puzzle.vars[data.key] = global.puzzle.evaluateRawStatement(data.value || '');
                        Object.setByString(global.puzzle.vars, data.key, global.puzzle.evaluateRawStatement(data.value || ''))
                    }*/




                    ctx.return = data.value;


                    /*if (!data) return;
                    data.value = global.puzzle.getRawStatement(data.value, ctx);
                    if(!isNaN(data.value)) data.value = +data.value
                    // SWAP!!!!!
                        console.log(data.key, data.value)

                        function trySet (obj, key, val){
                            try{
                                Object.setByString(obj, key, JSON.parse(val))
                            } catch (e) { 
                                Object.setByString(obj, key, val)
                            }
                        }

                        if(Object.keys(ctx.vars).length){
                            
                            // set localVar globalVar
                            // set globalVar localVar
                            // set localVar localVar
                            // set localVar val
                            // set globalVar val

                            var value;
                            if(Object.byString(global.puzzle.vars, data.value)) value = Object.byString(global.puzzle.vars, data.value);
                            else if(Object.byString(ctx.vars, data.value)) value = Object.byString(ctx.vars, data.value);
                            else value = data.value;

                            var obj;
                            var key = data.key;
                            if(Object.byString(global.puzzle.vars, data.key)){
                                obj = global.puzzle.vars
                            } 
                            else obj = ctx.vars;


                            trySet(Object.setByString(obj, key, val))
                            

                        } else {
                             if(Object.byString(global.puzzle.vars, data.value))
                             {
                                trySet(Object.setByString(global.puzzle.vars, data.key, Object.byString(global.puzzle.vars, data.value)))
                             } else {
                                console.log('dk', data.key, 'dv', data.value)
                                trySet(Object.setByString(global.puzzle.vars, data.key, data.value));
                            }
                        }



                        // 3. check if value is local


                       /* var isGlobal = false;
                        if(Object.byString(global.puzzle.vars, data.key)){
                            console.log('ss', Object.byString(global.puzzle.vars, data.key))
                            Object.setByString(global.puzzle.vars, data.key, Object.byString(global.puzzle.vars, data.value))
                            isGlobal = true;
                            console.log('global')
                        } else {
                            var arr = JSON.parse(data.value);
                            Object.setByString(global.puzzle.vars, data.key, JSON.parse(data.value));
                            isGlobal = true;
                        }


                        if(Object.keys(ctx.vars).length && !isGlobal){

                            if(Object.byString(gctx.vars, data.value)){
                                Object.setByString(ctx.vars, data.key, Object.byString(ctx.vars, data.value))
                            } else {
                                var arr = JSON.parse(data.value);
                                Object.setByString(ctx.vars, data.key, JSON.parse(data.value))
                            }
                        
                        } */
                  /*  } catch (e) {
                        //global.puzzle.vars[data.key] = global.puzzle.evaluateRawStatement(data.value || '');
                        if(Object.keys(ctx.vars).length) Object.setByString(ctx.vars, data.key, global.puzzle.evaluateRawStatement(data.value || ''))
                        else Object.setByString(global.puzzle.vars, data.key, global.puzzle.evaluateRawStatement(data.value || ''))
                    }*/
                   /* ctx.return = data.value;*/
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
            get: {
                manual: "",
                follow: ["{arr}", "$at"],
                method: function(ctx, arr) {
                    ctx.arr = global.puzzle.getRawStatement(arr, ctx);
                },
                innerSequence: {
                    at: {
                        manual: "",
                        follow: ["{pos}"],
                        method: function(ctx, pos) {
                            if(Array.isArray(ctx.arr))
                                ctx.return = ctx.arr[global.puzzle.getRawStatement(pos, ctx)];
                            else {
                                ctx.return = Object.byString(ctx.arr, global.puzzle.getRawStatement(pos, ctx));
                            }
                        }
                    },
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
            as: {
                manual: "",
                follow: ["{asVariable}"],
                method: function(ctx, asVariable) {

                    try {
                        data.value = JSON.parse(data.value);
                    } catch(e){

                    }

                    ctx.vars = ctx.vars || {};
                    var ret = (ctx || {}).return;

                  

                    Object.setByString(global.puzzle.vars, asVariable, ret)

                    ctx.done();

                    /*if(/*Object.keys(ctx.vars).length* !ctx.isRoot){

                        if(Object.byString(global.puzzle.vars, asVariable) !== undefined)
                        {
                            if(Object.byString(global.puzzle.vars, ret) !== undefined){
                                Object.setByString(global.puzzle.vars, asVariable, ret)
                            } else if(Object.byString(ctx.vars, ret) !== undefined){
                                Object.setByString(global.puzzle.vars, asVariable, Object.byString(ctx.vars, ret))
                            } 
                        } else if(Object.byString(ctx.vars, ret) !== undefined){

                            Object.setByString(ctx.vars, asVariable, Object.byString(ctx.vars, ret))
                        } else {
                            
                            Object.setByString(ctx.vars, asVariable, ret)
                        }
                    } else {
                         if(Object.byString(global.puzzle.vars, ret) !== undefined){
                                Object.setByString(global.puzzle.vars, asVariable, Object.byString(global.puzzle.vars, ret))
                            } else {
                                Object.setByString(global.puzzle.vars, asVariable, ret)
                            }
                    }*/

                    /*
                    if(Object.keys((ctx || {}).vars).length){
                        // @TODO: check if var available in scope, then take global or local scope
                        (ctx || {}).vars[asVariable] = (ctx || {}).return;
                    } 
                    else window.puzzle.vars[asVariable] = (ctx || {}).return;
                    */
                }
            },
            runner: {
                manual: "Sets a function (subscript)",
                follow: ["{key,body}"],
                method: function(ctx, data) {
                    global.puzzle.subscripts[data.key] = { body: global.puzzle.getRawStatement(data.body) };
                }
            },
            script: {
                manual: "Sets a function (subscript)",
                follow: ["{key,body}"],
                method: function(ctx, data) {
                    global.puzzle.subscripts[data.key] = { body: global.puzzle.getRawStatement(data.body) };
                }
            },
            run: {
                manual: "Runs a function",
                follow: ["{subscript}"],
                method: function(ctx, subscript) {
                    function run(){

                        var vars = {};

                        if(ctx.withParam){
                            ctx.withParam.split(',').forEach(p => {
                                var val = global.puzzle.getRawStatement(p.split(':')[1], ctx);
                                if(!isNaN(val)) val = +val;
                                vars[p.split(':')[0]] = val;
                            })
                        }

                        if (global.puzzle.subscripts[subscript]) {
                            var func = global.puzzle.subscripts[subscript];
                            global.puzzle.parse(func.body, Object.assign(ctx.vars, vars));
                        } else if(Object.byString(global.puzzle.vars, subscript)) {
                            global.puzzle.parse(Object.byString(global.puzzle.vars, subscript), Object.assign(ctx.vars, vars));
                        } else if(isLiteral(subscript)) {
                            global.puzzle.parse(global.puzzle.getRawStatement(subscript), Object.assign(ctx.vars, vars));
                        } 
                    }

                    if(ctx.intervalTime){
                        lang.intervals[Math.random()] = setInterval(() => {
                            run()
                        }, parseInt(ctx.intervalTime))
                    } else if(ctx.timeoutTime){
                        lang.delays[Math.random()] = setTimeout(() => {
                            run()
                        }, parseInt(ctx.timeoutTime))
                    } else run();
                }
            },

            // Math
            calc: {
              follow: ["$min", "$max", "$add", "$subtract", "{param}"],
              method: function(ctx, param){
                var codeStr = "";

                Object.keys(global.puzzle.vars).forEach(v => {
                        if(global.puzzle.vars[v] instanceof HTMLElement) {}
                        else if(Array.isArray(global.puzzle.vars[v])) codeStr+="var "+v+" = "+ JSON.stringify(global.puzzle.vars[v])+";";
                        else if(isObject(global.puzzle.vars[v])) codeStr+="var "+v+" = "+ JSON.stringify(global.puzzle.vars[v])+";";
                        else if(typeof global.puzzle.vars[v] === "string") codeStr+="var "+v+" = "+(+global.puzzle.vars[v])+";";
                        else codeStr+="var "+v+" = "+global.puzzle.vars[v]+";";
                    })

                if(ctx.vars){
                    Object.keys(ctx.vars).forEach(v => {
                        if(ctx.vars[v] instanceof HTMLElement) {}
                        else if(Array.isArray(ctx.vars[v])) codeStr+="var "+v+" = "+ JSON.stringify(ctx.vars[v])+";";
                        else if(isObject(ctx.vars[v])) codeStr+="var "+v+" = "+ JSON.stringify(ctx.vars[v])+";";
                        else if(typeof ctx.vars[v] === "string") codeStr+="var "+v+" = "+(+ctx.vars[v])+";";
                        else codeStr+="var "+v+" = "+ctx.vars[v]+";";
                    })
                } 
                codeStr = codeStr.replace(/(\r\n|\n|\r)/gm,"");

                ctx.return = eval(codeStr + global.puzzle.getRawStatement(param))
              },
            },
            min: {
              follow: ["{params}"],
              method: function(ctx, param){
                  var params = global.puzzle.getRawStatement(param);
                  params = params.split(',');
                  var _params = [];
                  params.forEach(p => {
                    if(Object.byString(ctx.vars, p) !== undefined)
                        p = Object.byString(ctx.vars, p);
                    else if(Object.byString(global.puzzle.vars, p) !== undefined)
                        p = Object.byString(global.puzzle.vars, p)
                    
                    _params.push(parseInt(p))
                  })
                  ctx.return = Math.min(..._params)
              }
            },
            max: {
              follow: ["{params}"],
              method: function(ctx, param){
                  var params = global.puzzle.getRawStatement(param);
                  params = params.split(',');
                  var _params = [];
                  params.forEach(p => {
                    if(Object.byString(ctx.vars, p) !== undefined)
                        p = Object.byString(ctx.vars, p);
                    else if(Object.byString(global.puzzle.vars, p) !== undefined)
                        p = Object.byString(global.puzzle.vars, p)
                    _params.push(parseInt(p))
                  })
                  ctx.return = Math.max(..._params)
              }
            },
            add: {
              follow: ["{params}", "$to"],
              method: function(ctx, param){
                try {
                  ctx.addData = JSON.parse(global.puzzle.getRawStatement(param));
                 } catch(e) {
                    ctx.addData = global.puzzle.getRawStatement(param);
                 }
                  
              }
            },
            subtract: {
              follow: ["{params}"],
              method: function(ctx, param){
                  var params = global.puzzle.getRawStatement(param);
                  params = params.split(',');
                  var _params = [];
                  var result = params[0];
                  params.pop();
                  params.forEach(p => {
                    if(Object.byString(ctx.vars, p) !== undefined)
                        p = Object.byString(ctx.vars, p);
                    else if(Object.byString(global.puzzle.vars, p) !== undefined)
                        p = Object.byString(global.puzzle.vars, p)
                    result -= parseInt(p);
                  })
                  ctx.return = result
              }
            },

            every: {
                follow: ["{time}", "$run"],
                method: function(ctx, data) {
                    ctx.intervalTime = data;
                }
            },
            after: {
                follow: ["{time}", "$run"],
                method: function(ctx, data) {
                    ctx.timeoutTime = data;
                }
            },
            wait: {
                follow: ["{time}"],
                method: function(ctx, data) {
                    ctx.waitTime = data;
                }
            },
            if: {
                follow: ["{condition}", "$then"],
                method: function(ctx, condition) {
                    ctx.if = condition;
                    if(!ctx.isRoot){
                        Object.keys(ctx.vars).forEach(v => {
                            if (ctx.if.includes(v)) ctx.if = ctx.if.replace(v, ctx.vars[v])
                        })
                    }
                    Object.keys(global.puzzle.vars).forEach(v => {
                        if (ctx.if.includes(v)) ctx.if = ctx.if.replace(v, global.puzzle.vars[v])
                    })
                }
            },
            then: {
                follow: ["{statement}", "$else", "$stop"],
                method: function(ctx, statement) {
                    if (ctx.if) {
                        ctx.if = ctx.if.replace(/AND/g, '&&').replace(/OR/g, '||')
                        if (eval(ctx.if)) {
                            ctx.conditionMet = true;
                            global.puzzle.parse(global.puzzle.getRawStatement(statement, ctx), ctx.vars);
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
            repeat: {
                follow: ["{param}", "$times"],
                method: function(ctx, param) {
                    ctx.repeatCount = global.puzzle.getRawStatement(param, ctx);
                },
                innerSequence: {
                    times: {
                        follow: ["{script}"],
                        method: function(ctx, script) {
                           var c = 0;
                           while(c < ctx.repeatCount){
                            puzzle.parse(global.puzzle.getRawStatement(script), {idx: c});
                            c++;
                           }
                        }
                    }
                }
            },
            over: {
                follow: ["{variable}", "$do"],
                method: function(ctx, variable) {
                    var variable = global.puzzle.getRawStatement(variable);
                    if(typeof variable !== 'string') ctx.loopData = variable;
                    else if(Object.byString(ctx.vars || {}, variable) !== undefined) ctx.loopData = Object.byString(ctx.vars || {}, variable);
                    else if(Object.byString(global.puzzle.vars || {}, variable) !== undefined) ctx.loopData = Object.byString(global.puzzle.vars || {}, variable)
                    else ctx.loopData = variable;
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
                            global.puzzle.parse(global.puzzle.getRawStatement(statement), Object.assign(varsObj, ctx.vars))
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

                    //if(global.puzzle.vars[content]) content = global.puzzle.vars[content];

                    switch (ctx.fileOperation) {
                        case 'write':
                            fs.writeFile(file.name, content, function(err, data) {
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
                    global.puzzle.output(global.puzzle.getRawStatement(text, ctx))
                }
            },
            js: {
                follow: ["{code}"],
                method: function(ctx, text) {
                    try {
                        var result = eval(global.puzzle.getRawStatement(text));
                        ctx.return = result;
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
                            global.puzzle.output(Object.keys(lang).join(', '));
                            break;
                        case 'commands':
                            Object.keys(lang).forEach((ns) => {
                                global.puzzle.output('namespace:', ns, '\n');
                                Object.keys(lang[ns]).forEach(c => {
                                    try {
                                        var man = "";
                                        if (lang[ns][c].manual) man = ' (' + lang[ns][c].manual + ')';
                                        var seq = "";
                                        lang[ns][c].follow.forEach(f => {
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
            "->": {
                follow: ["{code}"],
                method: function(ctx, code) {
                    global.puzzle.parse(global.puzzle.getRawStatement(code))

                }
            },
            jsonify: {
                follow: ["{data}"],
                method: function(ctx, data) {
                    try {
                        ctx.return = JSON.parse(data);
                    } catch (e){
                        global.puzzle.error('error parsing json')
                    }
                }
            },
            stringify: {
                follow: ["{data}"],
                method: function(ctx, data) {
                    try {
                        ctx.return = JSON.stringify(data);
                    } catch (e){
                        global.puzzle.error('error parsing json')
                    }
                }
            },
            encode: {
                follow: ["{data}"],
                method: function(ctx, data) {
                    var _data = global.puzzle.getRawStatement(data)
                    if(environment == 'browser') ctx.return = atob(_data);
                    else if(environment == 'node') ctx.return = Buffer.from(_data).toString('base64')
                }
            },
            decode: {
                follow: ["{data}"],
                method: function(ctx, data) {
                    var _data = global.puzzle.getRawStatement(data)
                    if(environment == 'browser') ctx.return = btoa(_data);
                    else if(environment == 'node') ctx.return = Buffer.from(_data, 'base64').toString()
                }
            }
            // UI:
        },
        delimeter: ";",
        assignmentOperator: "=",
        context: {},
        vars: {},
        intervals: {},
        delays: {},
        currentNamespace: "default",
}

module.exports = lang;
}).call(this)}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/")
},{"./dependencies.js":9,"./dependencies/lightning-fs.min.js":2,"./dependencies_sandboxed.js":5,"./package.json":7,"_process":14,"buffer":11}],2:[function(require,module,exports){
!function(t,e){"object"==typeof exports&&"object"==typeof module?module.exports=e():"function"==typeof define&&define.amd?define([],e):"object"==typeof exports?exports.LightningFS=e():t.LightningFS=e()}(self,function(){return function(t){var e={};function i(r){if(e[r])return e[r].exports;var n=e[r]={i:r,l:!1,exports:{}};return t[r].call(n.exports,n,n.exports,i),n.l=!0,n.exports}return i.m=t,i.c=e,i.d=function(t,e,r){i.o(t,e)||Object.defineProperty(t,e,{enumerable:!0,get:r})},i.r=function(t){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(t,"__esModule",{value:!0})},i.t=function(t,e){if(1&e&&(t=i(t)),8&e)return t;if(4&e&&"object"==typeof t&&t&&t.__esModule)return t;var r=Object.create(null);if(i.r(r),Object.defineProperty(r,"default",{enumerable:!0,value:t}),2&e&&"string"!=typeof t)for(var n in t)i.d(r,n,function(e){return t[e]}.bind(null,n));return r},i.n=function(t){var e=t&&t.__esModule?function(){return t.default}:function(){return t};return i.d(e,"a",e),e},i.o=function(t,e){return Object.prototype.hasOwnProperty.call(t,e)},i.p="",i(i.s=3)}([function(t,e){function i(t){if(0===t.length)return".";let e=n(t);return e=e.reduce(s,[]),r(...e)}function r(...t){if(0===t.length)return"";let e=t.join("/");return e=e.replace(/\/{2,}/g,"/")}function n(t){if(0===t.length)return[];if("/"===t)return["/"];let e=t.split("/");return""===e[e.length-1]&&e.pop(),"/"===t[0]?e[0]="/":"."!==e[0]&&e.unshift("."),e}function s(t,e){if(0===t.length)return t.push(e),t;if("."===e)return t;if(".."===e){if(1===t.length){if("/"===t[0])throw new Error("Unable to normalize path - traverses above root directory");if("."===t[0])return t.push(e),t}return".."===t[t.length-1]?(t.push(".."),t):(t.pop(),t)}return t.push(e),t}t.exports={join:r,normalize:i,split:n,basename:function(t){if("/"===t)throw new Error(`Cannot get basename of "${t}"`);const e=t.lastIndexOf("/");return-1===e?t:t.slice(e+1)},dirname:function(t){const e=t.lastIndexOf("/");if(-1===e)throw new Error(`Cannot get dirname of "${t}"`);return 0===e?"/":t.slice(0,e)},resolve:function(...t){let e="";for(let n of t)e=n.startsWith("/")?n:i(r(e,n));return e}}},function(t,e){function i(t){return class extends Error{constructor(...e){super(...e),this.code=t,this.message?this.message=t+": "+this.message:this.message=t}}}const r=i("EEXIST"),n=i("ENOENT"),s=i("ENOTDIR"),o=i("ENOTEMPTY"),a=i("ETIMEDOUT");t.exports={EEXIST:r,ENOENT:n,ENOTDIR:s,ENOTEMPTY:o,ETIMEDOUT:a}},function(t,e,i){"use strict";i.r(e),i.d(e,"Store",function(){return r}),i.d(e,"get",function(){return o}),i.d(e,"set",function(){return a}),i.d(e,"update",function(){return h}),i.d(e,"del",function(){return c}),i.d(e,"clear",function(){return l}),i.d(e,"keys",function(){return u}),i.d(e,"close",function(){return d});class r{constructor(t="keyval-store",e="keyval"){this.storeName=e,this._dbName=t,this._storeName=e,this._init()}_init(){this._dbp||(this._dbp=new Promise((t,e)=>{const i=indexedDB.open(this._dbName);i.onerror=(()=>e(i.error)),i.onsuccess=(()=>t(i.result)),i.onupgradeneeded=(()=>{i.result.createObjectStore(this._storeName)})}))}_withIDBStore(t,e){return this._init(),this._dbp.then(i=>new Promise((r,n)=>{const s=i.transaction(this.storeName,t);s.oncomplete=(()=>r()),s.onabort=s.onerror=(()=>n(s.error)),e(s.objectStore(this.storeName))}))}_close(){return this._init(),this._dbp.then(t=>{t.close(),this._dbp=void 0})}}let n;function s(){return n||(n=new r),n}function o(t,e=s()){let i;return e._withIDBStore("readwrite",e=>{i=e.get(t)}).then(()=>i.result)}function a(t,e,i=s()){return i._withIDBStore("readwrite",i=>{i.put(e,t)})}function h(t,e,i=s()){return i._withIDBStore("readwrite",i=>{const r=i.get(t);r.onsuccess=(()=>{i.put(e(r.result),t)})})}function c(t,e=s()){return e._withIDBStore("readwrite",e=>{e.delete(t)})}function l(t=s()){return t._withIDBStore("readwrite",t=>{t.clear()})}function u(t=s()){const e=[];return t._withIDBStore("readwrite",t=>{(t.openKeyCursor||t.openCursor).call(t).onsuccess=function(){this.result&&(e.push(this.result.key),this.result.continue())}}).then(()=>e)}function d(t=s()){return t._close()}},function(t,e,i){const r=i(4),n=i(5);function s(t,e){"function"==typeof t&&(e=t);return[(...t)=>e(null,...t),e=r(e)]}t.exports=class{constructor(...t){this.promises=new n(...t),this.init=this.init.bind(this),this.readFile=this.readFile.bind(this),this.writeFile=this.writeFile.bind(this),this.unlink=this.unlink.bind(this),this.readdir=this.readdir.bind(this),this.mkdir=this.mkdir.bind(this),this.rmdir=this.rmdir.bind(this),this.rename=this.rename.bind(this),this.stat=this.stat.bind(this),this.lstat=this.lstat.bind(this),this.readlink=this.readlink.bind(this),this.symlink=this.symlink.bind(this),this.backFile=this.backFile.bind(this),this.du=this.du.bind(this)}init(t,e){this.promises.init(t,e)}readFile(t,e,i){const[r,n]=s(e,i);this.promises.readFile(t,e).then(r).catch(n)}writeFile(t,e,i,r){const[n,o]=s(i,r);this.promises.writeFile(t,e,i).then(n).catch(o)}unlink(t,e,i){const[r,n]=s(e,i);this.promises.unlink(t,e).then(r).catch(n)}readdir(t,e,i){const[r,n]=s(e,i);this.promises.readdir(t,e).then(r).catch(n)}mkdir(t,e,i){const[r,n]=s(e,i);this.promises.mkdir(t,e).then(r).catch(n)}rmdir(t,e,i){const[r,n]=s(e,i);this.promises.rmdir(t,e).then(r).catch(n)}rename(t,e,i){const[r,n]=s(i);this.promises.rename(t,e).then(r).catch(n)}stat(t,e,i){const[r,n]=s(e,i);this.promises.stat(t).then(r).catch(n)}lstat(t,e,i){const[r,n]=s(e,i);this.promises.lstat(t).then(r).catch(n)}readlink(t,e,i){const[r,n]=s(e,i);this.promises.readlink(t).then(r).catch(n)}symlink(t,e,i){const[r,n]=s(i);this.promises.symlink(t,e).then(r).catch(n)}backFile(t,e,i){const[r,n]=s(e,i);this.promises.backFile(t,e).then(r).catch(n)}du(t,e){const[i,r]=s(e);this.promises.du(t).then(i).catch(r)}}},function(t,e){t.exports=function(t){var e,i;if("function"!=typeof t)throw new Error("expected a function but got "+t);return function(){return e?i:(e=!0,i=t.apply(this,arguments))}}},function(t,e,i){const{encode:r,decode:n}=i(6),s=i(9),o=i(10),a=i(11),{ENOENT:h,ENOTEMPTY:c,ETIMEDOUT:l}=i(1),u=i(12),d=i(13),_=i(14),p=i(15),m=i(0);i(16);function f(t,e){return void 0!==e&&"function"!=typeof e||(e={}),"string"==typeof e&&(e={encoding:e}),[t=m.normalize(t),e]}function w(t,e){return[m.normalize(t),m.normalize(e)]}t.exports=class{constructor(t,e){this.init=this.init.bind(this),this.readFile=this._wrap(this.readFile,!1),this.writeFile=this._wrap(this.writeFile,!0),this.unlink=this._wrap(this.unlink,!0),this.readdir=this._wrap(this.readdir,!1),this.mkdir=this._wrap(this.mkdir,!0),this.rmdir=this._wrap(this.rmdir,!0),this.rename=this._wrap(this.rename,!0),this.stat=this._wrap(this.stat,!1),this.lstat=this._wrap(this.lstat,!1),this.readlink=this._wrap(this.readlink,!1),this.symlink=this._wrap(this.symlink,!0),this.backFile=this._wrap(this.backFile,!0),this.du=this._wrap(this.du,!1),this.saveSuperblock=s(()=>{this._saveSuperblock()},500),this._deactivationPromise=null,this._deactivationTimeout=null,this._activationPromise=null,this._operations=new Set,t&&this.init(t,e)}async init(...t){return this._initPromiseResolve&&await this._initPromise,this._initPromise=this._init(...t),this._initPromise}async _init(t,{wipe:e,url:i,urlauto:r,fileDbName:n=t,fileStoreName:s=t+"_files",lockDbName:o=t+"_lock",lockStoreName:h=t+"_lock",defer:c=!1}={}){await this._gracefulShutdown(),this._name=t,this._idb=new u(n,s),this._mutex=navigator.locks?new p(t):new _(o,h),this._cache=new a(t),this._opts={wipe:e,url:i},this._needsWipe=!!e,i&&(this._http=new d(i),this._urlauto=!!r),this._initPromiseResolve&&(this._initPromiseResolve(),this._initPromiseResolve=null),c||this.stat("/")}async _gracefulShutdown(){this._operations.size>0&&(this._isShuttingDown=!0,await new Promise(t=>this._gracefulShutdownResolve=t),this._isShuttingDown=!1,this._gracefulShutdownResolve=null)}_wrap(t,e){return async(...i)=>{let r={name:t.name,args:i};this._operations.add(r);try{return await this._activate(),await t.apply(this,i)}finally{this._operations.delete(r),e&&this.saveSuperblock(),0===this._operations.size&&(this._deactivationTimeout||clearTimeout(this._deactivationTimeout),this._deactivationTimeout=setTimeout(this._deactivate.bind(this),500))}}}async _activate(){if(this._initPromise||console.warn(new Error(`Attempted to use LightningFS ${this._name} before it was initialized.`)),await this._initPromise,this._deactivationTimeout&&(clearTimeout(this._deactivationTimeout),this._deactivationTimeout=null),this._deactivationPromise&&await this._deactivationPromise,this._deactivationPromise=null,this._activationPromise||(this._activationPromise=this.__activate()),await this._activationPromise,!await this._mutex.has())throw new l}async __activate(){if(this._cache.activated)return;this._needsWipe&&(this._needsWipe=!1,await this._idb.wipe(),await this._mutex.release({force:!0})),await this._mutex.has()||await this._mutex.wait();const t=await this._idb.loadSuperblock();if(t)this._cache.activate(t);else if(this._http){const t=await this._http.loadSuperblock();this._cache.activate(t),await this._saveSuperblock()}else this._cache.activate()}async _deactivate(){return this._activationPromise&&await this._activationPromise,this._deactivationPromise||(this._deactivationPromise=this.__deactivate()),this._activationPromise=null,this._gracefulShutdownResolve&&this._gracefulShutdownResolve(),this._deactivationPromise}async __deactivate(){await this._mutex.has()&&await this._saveSuperblock(),this._cache.deactivate();try{await this._mutex.release()}catch(t){console.log(t)}await this._idb.close()}async _saveSuperblock(){this._cache.activated&&(this._lastSavedAt=Date.now(),await this._idb.saveSuperblock(this._cache._root))}async _writeStat(t,e,i){let r=m.split(m.dirname(t)),n=r.shift();for(let t of r){n=m.join(n,t);try{this._cache.mkdir(n,{mode:511})}catch(t){}}return this._cache.writeStat(t,e,i)}async readFile(t,e){[t,e]=f(t,e);const{encoding:i}=e;if(i&&"utf8"!==i)throw new Error('Only "utf8" encoding is supported in readFile');let r=null,s=null;try{s=this._cache.stat(t),r=await this._idb.readFile(s.ino)}catch(t){if(!this._urlauto)throw t}if(!r&&this._http){let e=this._cache.lstat(t);for(;"symlink"===e.type;)t=m.resolve(m.dirname(t),e.target),e=this._cache.lstat(t);r=await this._http.readFile(t)}if(r&&(s&&s.size==r.byteLength||(s=await this._writeStat(t,r.byteLength,{mode:s?s.mode:438}),this.saveSuperblock()),"utf8"===i&&(r=n(r))),!s)throw new h(t);return r}async writeFile(t,e,i){[t,i]=f(t,i);const{mode:n,encoding:s="utf8"}=i;if("string"==typeof e){if("utf8"!==s)throw new Error('Only "utf8" encoding is supported in writeFile');e=r(e)}const o=await this._cache.writeStat(t,e.byteLength,{mode:n});return await this._idb.writeFile(o.ino,e),null}async unlink(t,e){[t,e]=f(t,e);const i=this._cache.lstat(t);return this._cache.unlink(t),"symlink"!==i.type&&await this._idb.unlink(i.ino),null}async readdir(t,e){return[t,e]=f(t,e),this._cache.readdir(t)}async mkdir(t,e){[t,e]=f(t,e);const{mode:i=511}=e;return await this._cache.mkdir(t,{mode:i}),null}async rmdir(t,e){if([t,e]=f(t,e),"/"===t)throw new c;return this._cache.rmdir(t),null}async rename(t,e){return[t,e]=w(t,e),this._cache.rename(t,e),null}async stat(t,e){[t,e]=f(t,e);const i=this._cache.stat(t);return new o(i)}async lstat(t,e){[t,e]=f(t,e);let i=this._cache.lstat(t);return new o(i)}async readlink(t,e){return[t,e]=f(t,e),this._cache.readlink(t)}async symlink(t,e){return[t,e]=w(t,e),this._cache.symlink(t,e),null}async backFile(t,e){[t,e]=f(t,e);let i=await this._http.sizeFile(t);return await this._writeStat(t,i,e),null}async du(t){return this._cache.du(t)}}},function(t,e,i){i(7),t.exports={encode:t=>(new TextEncoder).encode(t),decode:t=>(new TextDecoder).decode(t)}},function(t,e,i){(function(t){!function(t){function e(t){if("utf-8"!==(t=void 0===t?"utf-8":t))throw new RangeError("Failed to construct 'TextEncoder': The encoding label provided ('"+t+"') is invalid.")}function i(t,e){if(e=void 0===e?{fatal:!1}:e,"utf-8"!==(t=void 0===t?"utf-8":t))throw new RangeError("Failed to construct 'TextDecoder': The encoding label provided ('"+t+"') is invalid.");if(e.fatal)throw Error("Failed to construct 'TextDecoder': the 'fatal' option is unsupported.")}if(t.TextEncoder&&t.TextDecoder)return!1;Object.defineProperty(e.prototype,"encoding",{value:"utf-8"}),e.prototype.encode=function(t,e){if((e=void 0===e?{stream:!1}:e).stream)throw Error("Failed to encode: the 'stream' option is unsupported.");e=0;for(var i=t.length,r=0,n=Math.max(32,i+(i>>1)+7),s=new Uint8Array(n>>3<<3);e<i;){var o=t.charCodeAt(e++);if(55296<=o&&56319>=o){if(e<i){var a=t.charCodeAt(e);56320==(64512&a)&&(++e,o=((1023&o)<<10)+(1023&a)+65536)}if(55296<=o&&56319>=o)continue}if(r+4>s.length&&(n+=8,n=(n*=1+e/t.length*2)>>3<<3,(a=new Uint8Array(n)).set(s),s=a),0==(4294967168&o))s[r++]=o;else{if(0==(4294965248&o))s[r++]=o>>6&31|192;else if(0==(4294901760&o))s[r++]=o>>12&15|224,s[r++]=o>>6&63|128;else{if(0!=(4292870144&o))continue;s[r++]=o>>18&7|240,s[r++]=o>>12&63|128,s[r++]=o>>6&63|128}s[r++]=63&o|128}}return s.slice(0,r)},Object.defineProperty(i.prototype,"encoding",{value:"utf-8"}),Object.defineProperty(i.prototype,"fatal",{value:!1}),Object.defineProperty(i.prototype,"ignoreBOM",{value:!1}),i.prototype.decode=function(t,e){if((e=void 0===e?{stream:!1}:e).stream)throw Error("Failed to decode: the 'stream' option is unsupported.");e=0;for(var i=(t=new Uint8Array(t)).length,r=[];e<i;){var n=t[e++];if(0===n)break;if(0==(128&n))r.push(n);else if(192==(224&n)){var s=63&t[e++];r.push((31&n)<<6|s)}else if(224==(240&n)){s=63&t[e++];var o=63&t[e++];r.push((31&n)<<12|s<<6|o)}else if(240==(248&n)){65535<(n=(7&n)<<18|(s=63&t[e++])<<12|(o=63&t[e++])<<6|63&t[e++])&&(n-=65536,r.push(n>>>10&1023|55296),n=56320|1023&n),r.push(n)}}return String.fromCharCode.apply(null,r)},t.TextEncoder=e,t.TextDecoder=i}("undefined"!=typeof window?window:void 0!==t?t:this)}).call(this,i(8))},function(t,e){var i;i=function(){return this}();try{i=i||new Function("return this")()}catch(t){"object"==typeof window&&(i=window)}t.exports=i},function(t,e){t.exports=function(t,e,i){var r;return function(){if(!e)return t.apply(this,arguments);var n=this,s=arguments,o=i&&!r;return clearTimeout(r),r=setTimeout(function(){if(r=null,!o)return t.apply(n,s)},e),o?t.apply(this,arguments):void 0}}},function(t,e){t.exports=class{constructor(t){this.type=t.type,this.mode=t.mode,this.size=t.size,this.ino=t.ino,this.mtimeMs=t.mtimeMs,this.ctimeMs=t.ctimeMs||t.mtimeMs,this.uid=1,this.gid=1,this.dev=1}isFile(){return"file"===this.type}isDirectory(){return"dir"===this.type}isSymbolicLink(){return"symlink"===this.type}}},function(t,e,i){const r=i(0),{EEXIST:n,ENOENT:s,ENOTDIR:o,ENOTEMPTY:a}=i(1),h=0;t.exports=class{constructor(){}_makeRoot(t=new Map){return t.set(h,{mode:511,type:"dir",size:0,ino:0,mtimeMs:Date.now()}),t}activate(t=null){this._root=null===t?new Map([["/",this._makeRoot()]]):"string"==typeof t?new Map([["/",this._makeRoot(this.parse(t))]]):t}get activated(){return!!this._root}deactivate(){this._root=void 0}size(){return this._countInodes(this._root.get("/"))-1}_countInodes(t){let e=1;for(let[i,r]of t)i!==h&&(e+=this._countInodes(r));return e}autoinc(){return this._maxInode(this._root.get("/"))+1}_maxInode(t){let e=t.get(h).ino;for(let[i,r]of t)i!==h&&(e=Math.max(e,this._maxInode(r)));return e}print(t=this._root.get("/")){let e="";const i=(t,r)=>{for(let[n,s]of t){if(0===n)continue;let t=s.get(h),o=t.mode.toString(8);e+=`${"\t".repeat(r)}${n}\t${o}`,"file"===t.type?e+=`\t${t.size}\t${t.mtimeMs}\n`:(e+="\n",i(s,r+1))}};return i(t,0),e}parse(t){let e=0;function i(t){const i=++e,r=1===t.length?"dir":"file";let[n,s,o]=t;return n=parseInt(n,8),s=s?parseInt(s):0,o=o?parseInt(o):Date.now(),new Map([[h,{mode:n,type:r,size:s,mtimeMs:o,ino:i}]])}let r=t.trim().split("\n"),n=this._makeRoot(),s=[{indent:-1,node:n},{indent:0,node:null}];for(let t of r){let e=t.match(/^\t*/)[0].length;t=t.slice(e);let[r,...n]=t.split("\t"),o=i(n);if(e<=s[s.length-1].indent)for(;e<=s[s.length-1].indent;)s.pop();s.push({indent:e,node:o}),s[s.length-2].node.set(r,o)}return n}_lookup(t,e=!0){let i=this._root,n="/",o=r.split(t);for(let a=0;a<o.length;++a){let c=o[a];if(!(i=i.get(c)))throw new s(t);if(e||a<o.length-1){const t=i.get(h);if("symlink"===t.type){let e=r.resolve(n,t.target);i=this._lookup(e)}n=n?r.join(n,c):c}}return i}mkdir(t,{mode:e}){if("/"===t)throw new n;let i=this._lookup(r.dirname(t)),s=r.basename(t);if(i.has(s))throw new n;let o=new Map,a={mode:e,type:"dir",size:0,mtimeMs:Date.now(),ino:this.autoinc()};o.set(h,a),i.set(s,o)}rmdir(t){let e=this._lookup(t);if("dir"!==e.get(h).type)throw new o;if(e.size>1)throw new a;let i=this._lookup(r.dirname(t)),n=r.basename(t);i.delete(n)}readdir(t){let e=this._lookup(t);if("dir"!==e.get(h).type)throw new o;return[...e.keys()].filter(t=>"string"==typeof t)}writeStat(t,e,{mode:i}){let n;try{let e=this.stat(t);null==i&&(i=e.mode),n=e.ino}catch(t){}null==i&&(i=438),null==n&&(n=this.autoinc());let s=this._lookup(r.dirname(t)),o=r.basename(t),a={mode:i,type:"file",size:e,mtimeMs:Date.now(),ino:n},c=new Map;return c.set(h,a),s.set(o,c),a}unlink(t){let e=this._lookup(r.dirname(t)),i=r.basename(t);e.delete(i)}rename(t,e){let i=r.basename(e),n=this._lookup(t);this._lookup(r.dirname(e)).set(i,n),this.unlink(t)}stat(t){return this._lookup(t).get(h)}lstat(t){return this._lookup(t,!1).get(h)}readlink(t){return this._lookup(t,!1).get(h).target}symlink(t,e){let i,n;try{let t=this.stat(e);null===n&&(n=t.mode),i=t.ino}catch(t){}null==n&&(n=40960),null==i&&(i=this.autoinc());let s=this._lookup(r.dirname(e)),o=r.basename(e),a={mode:n,type:"symlink",target:t,size:0,mtimeMs:Date.now(),ino:i},c=new Map;return c.set(h,a),s.set(o,c),a}_du(t){let e=0;for(const[i,r]of t.entries())e+=i===h?r.size:this._du(r);return e}du(t){let e=this._lookup(t);return this._du(e)}}},function(t,e,i){const r=i(2);t.exports=class{constructor(t,e){this._database=t,this._storename=e,this._store=new r.Store(this._database,this._storename)}saveSuperblock(t){return r.set("!root",t,this._store)}loadSuperblock(){return r.get("!root",this._store)}readFile(t){return r.get(t,this._store)}writeFile(t,e){return r.set(t,e,this._store)}unlink(t){return r.del(t,this._store)}wipe(){return r.clear(this._store)}close(){return r.close(this._store)}}},function(t,e){t.exports=class{constructor(t){this._url=t}loadSuperblock(){return fetch(this._url+"/.superblock.txt").then(t=>t.ok?t.text():null)}async readFile(t){const e=await fetch(this._url+t);if(200===e.status)return e.arrayBuffer();throw new Error("ENOENT")}async sizeFile(t){const e=await fetch(this._url+t,{method:"HEAD"});if(200===e.status)return e.headers.get("content-length");throw new Error("ENOENT")}}},function(t,e,i){const r=i(2),n=t=>new Promise(e=>setTimeout(e,t));t.exports=class{constructor(t,e){this._id=Math.random(),this._database=t,this._storename=e,this._store=new r.Store(this._database,this._storename),this._lock=null}async has({margin:t=2e3}={}){if(this._lock&&this._lock.holder===this._id){const e=Date.now();return this._lock.expires>e+t||await this.renew()}return!1}async renew({ttl:t=5e3}={}){let e;return await r.update("lock",i=>{const r=Date.now()+t;return e=i&&i.holder===this._id,this._lock=e?{holder:this._id,expires:r}:i,this._lock},this._store),e}async acquire({ttl:t=5e3}={}){let e,i,n;if(await r.update("lock",r=>{const s=Date.now(),o=s+t;return i=r&&r.expires<s,e=void 0===r||i,n=r&&r.holder===this._id,this._lock=e?{holder:this._id,expires:o}:r,this._lock},this._store),n)throw new Error("Mutex double-locked");return e}async wait({interval:t=100,limit:e=6e3,ttl:i}={}){for(;e--;){if(await this.acquire({ttl:i}))return!0;await n(t)}throw new Error("Mutex timeout")}async release({force:t=!1}={}){let e,i,n;if(await r.update("lock",r=>(e=t||r&&r.holder===this._id,i=void 0===r,n=r&&r.holder!==this._id,this._lock=e?void 0:r,this._lock),this._store),await r.close(this._store),!e&&!t){if(i)throw new Error("Mutex double-freed");if(n)throw new Error("Mutex lost ownership")}return e}}},function(t,e){t.exports=class{constructor(t){this._id=Math.random(),this._database=t,this._has=!1,this._release=null}async has(){return this._has}async acquire(){return new Promise(t=>{navigator.locks.request(this._database+"_lock",{ifAvailable:!0},e=>(this._has=!!e,t(!!e),new Promise(t=>{this._release=t})))})}async wait({timeout:t=6e5}={}){return new Promise((e,i)=>{const r=new AbortController;setTimeout(()=>{r.abort(),i(new Error("Mutex timeout"))},t),navigator.locks.request(this._database+"_lock",{signal:r.signal},t=>(this._has=!!t,e(!!t),new Promise(t=>{this._release=t})))})}async release({force:t=!1}={}){this._has=!1,this._release?this._release():t&&navigator.locks.request(this._database+"_lock",{steal:!0},t=>!0)}}},function(t,e){const i="undefined"==typeof window?"worker":"main";t.exports=function(t){return performance.mark(`${t} start`),console.log(`${i}: ${t}`),console.time(`${i}: ${t}`),function(){performance.mark(`${t} end`),console.timeEnd(`${i}: ${t}`),performance.measure(`${t}`,`${t} start`,`${t} end`)}}}])});
},{}],3:[function(require,module,exports){
module.exports = {
	LocalStorage: function() {
		return {
			data: {},
			_keys: [],
			setItem: function(key, value) {
				this.data[key] = value;
				this._keys.push(key);
			},
			getItem: function(key) {
				return this.data[key];
			},
			removeItem: function(key) {
				var self = this;
				delete this.data[key];
				this._keys.forEach((k,i) => {
					if(key == k) self._keys.splice(i,1);
				})
			}
		}
	}
}
},{}],4:[function(require,module,exports){
module.exports = {
	files: {},

	writeFile: function(fileName, data, cb) {
		console.log('args', arguments)
		this.files[fileName] = data;
		if(cb) cb(false, data); 
	},
	unlinkSync: function(fileName) {
		delete this.files[fileName]
	},
	unlink: function(fileName, cb) {
		var oldFile = this.files[fileName]+'';
		delete this.files[fileName];
		if(cb) cb(false, oldFile); 
	},
	readFile: function(fileName, cb) {
		if(cb) cb(false, this.files[fileName]); 
	},
	readFileSync: function(fileName) {
		return this.files[fileName]; 
	},
	mkdir: function(dirName, cb) {

	},
	rmdir: function(dirName, cb) {

	},
	readdir: function(dirName, cb) {

	}
}
},{}],5:[function(require,module,exports){
module.exports = {
    fs: require('./dependencies/virtualFS.js'),
    fetch: require('node-fetch'),
    localStorage: require('./dependencies/localStorage.js'),
    os: require('os')
}
},{"./dependencies/localStorage.js":3,"./dependencies/virtualFS.js":4,"node-fetch":6,"os":13}],6:[function(require,module,exports){
(function (global){(function (){
"use strict";

// ref: https://github.com/tc39/proposal-global
var getGlobal = function () {
	// the only reliable means to get the global object is
	// `Function('return this')()`
	// However, this causes CSP violations in Chrome apps.
	if (typeof self !== 'undefined') { return self; }
	if (typeof window !== 'undefined') { return window; }
	if (typeof global !== 'undefined') { return global; }
	throw new Error('unable to locate global object');
}

var global = getGlobal();

module.exports = exports = global.fetch;

// Needed for TypeScript and Webpack.
if (global.fetch) {
	exports.default = global.fetch.bind(global);
}

exports.Headers = global.Headers;
exports.Request = global.Request;
exports.Response = global.Response;
}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],7:[function(require,module,exports){
module.exports={
  "name": "puzzlelang",
  "version": "0.0.967",
  "description": "An abstract, extendable programing language",
  "main": "puzzle.js",
  "bin": {
    "puzzle": "./cli.js"
  },
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1",
    "build-browser": "browserify puzzle.js -i ./dependencies.js -o puzzle.browser.js"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/puzzlelang/puzzle.git"
  },
  "author": "Marco Boelling",
  "license": "MIT",
  "bugs": {
    "url": "https://github.com/puzzlelang/puzzle/issues"
  },
  "homepage": "https://puzzlelang.org",
  "dependencies": {
    "commander": "^5.1.0",
    "inquirer": "^7.3.0",
    "node-fetch": "^2.6.7",
    "node-fetch-npm": "^2.0.4",
    "node-localstorage": "^2.1.6",
    "npmview": "0.0.4",
    "tinyify": "^2.5.2"
  },
  "devDependencies": {}
}
},{}],8:[function(require,module,exports){
(function (process,global){(function (){
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
    if(o[s] !== undefined) return o[s];
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
        puzzle.parse(dependencies.fs.readFileSync(file).toString(), {}, {}, true)
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
        for (var arg of arguments) {
            console.info(arg);
        }
    },

    error: function() {
        for (var arg of arguments) {
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
    getRawStatement: function(statement, ctx) {
        if(statement === undefined) return;
        var returnValue;
        var vars = (ctx || {}).vars;
        /*
            @TODO: evaluate raw inputs
            var possibleVarParts = splitMulti(statement, ['=', ',', ':', '+', '-', '*', '/', '\\', '(', ')', '{', '}', '[', ']'])
        */


        if(typeof statement !== 'string') returnValue = statement;

        if(isObject(statement)) return statement;

        if(Array.isArray(statement)) return statement;

        if(!isNaN(statement)) return statement;

        if (this.groupingOperators.includes(statement.charAt(0)) && this.groupingOperators.includes(statement.charAt(statement.length - 1))) {
            returnValue = statement.substring(1, statement.length - 1)
        } else if(statement.includes('+')) {
            var parts = statement.split('+');
            var newStatement = "";
            parts.forEach(part => {
                if(vars){
                    if(Object.byString(vars, part) !== undefined) newStatement += Object.byString(vars, part);
                    else if(Object.byString(global.puzzle.vars, part) !== undefined) newStatement += Object.byString(global.puzzle.vars, part);
                    else newStatement += part;
                } else if(Object.byString(global.puzzle.vars, part) !== undefined) newStatement += Object.byString(global.puzzle.vars, part);
                else newStatement += part;
            })

            return newStatement;

        } else returnValue = statement;

       

        if(Object.byString(vars || {}, returnValue) !== undefined) returnValue = Object.byString(vars, returnValue);
        else if(Object.byString(global.puzzle.vars, returnValue) !== undefined) {
            returnValue = Object.byString(global.puzzle.vars, returnValue);
        }

       
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
               
                if(statement.includes('+') && !this.groupingOperators.includes(statement.charAt(0)) && !this.groupingOperators.includes(statement.charAt(statement.length - 1))){
                    var parts = statement.split('+');
                    var newStatement = "";
                    parts.forEach(part => {

                        if(vars){
                            if(Object.byString(vars, part) !== undefined) newStatement += Object.byString(vars, part);
                            else newStatement += part;
                        } else if(Object.byString(global.puzzle.vars, part) !== undefined) newStatement += Object.byString(global.puzzle.vars, part);
                        else newStatement += part;

                    })

                    return newStatement;
                }

                if(Object.byString(vars || {}, statement) !== undefined) statement = Object.byString(vars, statement);
                else if(Object.byString(global.puzzle.vars, statement) !== undefined) statement = Object.byString(global.puzzle.vars, statement);

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

    parse: function(code, vars, funcs, isRoot) {

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

            if(!ctx._sequence.includes('as')){
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
 //console.log('execNamespace', token, tokens, execNamespace, global.puzzle.ctx[partId]._sequence[0])
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
                            isRoot: isRoot,
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
                            if(this.lang.default[t]) namespace = this.lang.default[t].ns || 'default';
                            else namespace = 'default';
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
                    window.puzzle.parse(s.innerHTML, {}, {}, true);
                }
            })

        });
    } catch (e) {}

} catch (e) {

}

module.exports = puzzle;
}).call(this)}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./default.puzzle.js":1,"./dependencies.js":9,"./dependencies_sandboxed.js":5,"_process":14}],9:[function(require,module,exports){

},{}],10:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function getLens (b64) {
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=')
  if (validLen === -1) validLen = len

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4)

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))

  var curByte = 0

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen

  var i
  for (i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)]
    arr[curByte++] = (tmp >> 16) & 0xFF
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    )
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1]
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    )
  }

  return parts.join('')
}

},{}],11:[function(require,module,exports){
(function (Buffer){(function (){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = { __proto__: Uint8Array.prototype, foo: function () { return 42 } }
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

Object.defineProperty(Buffer.prototype, 'parent', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.buffer
  }
})

Object.defineProperty(Buffer.prototype, 'offset', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.byteOffset
  }
})

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('The value "' + length + '" is invalid for option "size"')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  buf.__proto__ = Buffer.prototype
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new TypeError(
        'The "string" argument must be of type string. Received type number'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species != null &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  if (ArrayBuffer.isView(value)) {
    return fromArrayLike(value)
  }

  if (value == null) {
    throw TypeError(
      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
      'or Array-like Object. Received type ' + (typeof value)
    )
  }

  if (isInstance(value, ArrayBuffer) ||
      (value && isInstance(value.buffer, ArrayBuffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'number') {
    throw new TypeError(
      'The "value" argument must not be of type number. Received type number'
    )
  }

  var valueOf = value.valueOf && value.valueOf()
  if (valueOf != null && valueOf !== value) {
    return Buffer.from(valueOf, encodingOrOffset, length)
  }

  var b = fromObject(value)
  if (b) return b

  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
      typeof value[Symbol.toPrimitive] === 'function') {
    return Buffer.from(
      value[Symbol.toPrimitive]('string'), encodingOrOffset, length
    )
  }

  throw new TypeError(
    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
    'or Array-like Object. Received type ' + (typeof value)
  )
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Buffer.prototype.__proto__ = Uint8Array.prototype
Buffer.__proto__ = Uint8Array

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
  } else if (size < 0) {
    throw new RangeError('The value "' + size + '" is invalid for option "size"')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  buf.__proto__ = Buffer.prototype
  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj.length !== undefined) {
    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
      return createBuffer(0)
    }
    return fromArrayLike(obj)
  }

  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
    return fromArrayLike(obj.data)
  }
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true &&
    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
}

Buffer.compare = function compare (a, b) {
  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength)
  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength)
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError(
      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
    )
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (isInstance(buf, Uint8Array)) {
      buf = Buffer.from(buf)
    }
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    throw new TypeError(
      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
      'Received type ' + typeof string
    )
  }

  var len = string.length
  var mustMatch = (arguments.length > 2 && arguments[2] === true)
  if (!mustMatch && len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) {
          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
        }
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.toLocaleString = Buffer.prototype.toString

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim()
  if (this.length > max) str += ' ... '
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (isInstance(target, Uint8Array)) {
    target = Buffer.from(target, target.offset, target.byteLength)
  }
  if (!Buffer.isBuffer(target)) {
    throw new TypeError(
      'The "target" argument must be one of type Buffer or Uint8Array. ' +
      'Received type ' + (typeof target)
    )
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  var strLen = string.length

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
        : (firstByte > 0xBF) ? 2
          : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  newBuf.__proto__ = Buffer.prototype
  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end)
  } else if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (var i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, end),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if ((encoding === 'utf8' && code < 128) ||
          encoding === 'latin1') {
        // Fast path: If `val` fits into a single byte, use that numeric value.
        val = code
      }
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : Buffer.from(val, encoding)
    var len = bytes.length
    if (len === 0) {
      throw new TypeError('The value "' + val +
        '" is invalid for argument "value"')
    }
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node takes equal signs as end of the Base64 encoding
  str = str.split('=')[0]
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
// the `instanceof` check but they should be treated as of that type.
// See: https://github.com/feross/buffer/issues/166
function isInstance (obj, type) {
  return obj instanceof type ||
    (obj != null && obj.constructor != null && obj.constructor.name != null &&
      obj.constructor.name === type.name)
}
function numberIsNaN (obj) {
  // For IE11 support
  return obj !== obj // eslint-disable-line no-self-compare
}

}).call(this)}).call(this,require("buffer").Buffer)
},{"base64-js":10,"buffer":11,"ieee754":12}],12:[function(require,module,exports){
/*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],13:[function(require,module,exports){
exports.endianness = function () { return 'LE' };

exports.hostname = function () {
    if (typeof location !== 'undefined') {
        return location.hostname
    }
    else return '';
};

exports.loadavg = function () { return [] };

exports.uptime = function () { return 0 };

exports.freemem = function () {
    return Number.MAX_VALUE;
};

exports.totalmem = function () {
    return Number.MAX_VALUE;
};

exports.cpus = function () { return [] };

exports.type = function () { return 'Browser' };

exports.release = function () {
    if (typeof navigator !== 'undefined') {
        return navigator.appVersion;
    }
    return '';
};

exports.networkInterfaces
= exports.getNetworkInterfaces
= function () { return {} };

exports.arch = function () { return 'javascript' };

exports.platform = function () { return 'browser' };

exports.tmpdir = exports.tmpDir = function () {
    return '/tmp';
};

exports.EOL = '\n';

exports.homedir = function () {
	return '/'
};

},{}],14:[function(require,module,exports){
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

},{}]},{},[8]);
