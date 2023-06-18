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

                    if(ctx.fetch){

                        var options = {
                               method: ctx.method
                           };

                           if (ctx.method == 'post') options.body = ctx.payload;
                           else if (ctx.method == 'get' && ctx.payload) url += '?' + ctx.payload;
                           else if (ctx.method == 'delete') options.body = ctx.payload;

                           fetch(ctx.url, options).then(res => res.text())
                           .then(text => {
                               try {
                                   text = JSON.parse(text)
                               } catch(e){};
                               ctx.return = text;
                                done();
                              });
                        return;
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
                    } else if(ctx.fetch){
                        ctx.url = varName;
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
                    } else if(ctx.fetch){
                        ctx.url = varName;
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

                    ctx._asVariable = asVariable;
                    
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
                        if(isObject(global.puzzle.vars[v]) && (global.puzzle.vars[v] || {}).nodeType) {}
                        else if(Array.isArray(global.puzzle.vars[v])) codeStr+="var "+v+" = "+ JSON.stringify(global.puzzle.vars[v])+";";
                        else if(isObject(global.puzzle.vars[v])) codeStr+="var "+v+" = "+ JSON.stringify(global.puzzle.vars[v])+";";
                        else if(typeof global.puzzle.vars[v] === "string") codeStr+="var "+v+" = "+(+global.puzzle.vars[v])+";";
                        else codeStr+="var "+v+" = "+global.puzzle.vars[v]+";";
                    })

                if(ctx.vars){
                    Object.keys(ctx.vars).forEach(v => {
                        if(isObject(ctx.vars[v]) && (ctx[v] || {}).nodeType) {}
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
            sum: {
              follow: ["{params}"],
              method: function(ctx, param){
                  var params = global.puzzle.getRawStatement(param);
                  params = params.split(',');
                  var result = 0;
                  params.forEach(p => {
                    p = p.trim();
                    if(Object.byString(ctx.vars, p))
                        p = Object.byString(ctx.vars, p);
                    if(Object.byString(global.puzzle.vars, p))
                        p = Object.byString(global.puzzle.vars, p)
                    result += parseInt(p);
                  })
                  ctx.return = result
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
                            if (ctx.if.includes(v)){
                                var val = ctx.vars[v];
                                if(typeof ctx.vars[v] == "string") val = '"'+ctx.vars[v]+'"';
                                if(isObject(ctx.vars[v])) val = '"'+ctx.vars[v]+'"';
                                ctx.if = ctx.if.replace(v, val)
                            } 
                        })
                    }
                    Object.keys(global.puzzle.vars).forEach(v => {
                        var val = global.puzzle.vars[v];
                        if(typeof global.puzzle.vars[v] == "string") val = '"'+global.puzzle.vars[v]+'"';
                        if (ctx.if.includes(v)) ctx.if = ctx.if.replace(v, val)
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
            },

            post: {
                follow: ["{data}", "$to"],
                method: function(ctx, data) {
                    ctx.fetch = true;
                    ctx.method = 'post';
                    ctx.payload = data;
                }
            },
            patch: {
                follow: ["{data}", "$to"],
                method: function(ctx, data) {
                    ctx.fetch = true;
                    ctx.method = 'patch';
                    ctx.payload = data;
                }
            },
            put: {
                follow: ["{data}", "$to"],
                method: function(ctx, data) {
                    ctx.fetch = true;
                    ctx.method = 'put';
                    ctx.payload = data;
                }
            },
            fetch: {
                follow: ["$from", "{query}"],
                method: function(ctx, query) {
                    ctx.fetch = true;
                    ctx.method = 'get';
                    ctx.payload = query;
                }
            },
            delete: {
                follow: ["$from", "{query}"],
                method: function(ctx, query) {
                    ctx.fetch = true;
                    ctx.method = 'delete';
                    ctx.payload = query;
                }
            }
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