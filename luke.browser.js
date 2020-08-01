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
        execStatement: function(done) {

            if (lang.context[lang.context.importNamespace]) {
                if (environment != 'node') return global.luke.output('feature not available in this environment')
                try {
                    lang.context[lang.context.importNamespace] = require(lang.context.importUrl);
                } catch (e) {
                    global.luke.output('Import Error:', e)
                }
                if (done) done();
            }

            if (lang.context['unUseNamespace']) {
                if (global.luke.moduleStorage.get('_' + lang.context['unUseNamespace'])) {
                    global.luke.moduleStorage.remove('_' + lang.context['unUseNamespace']);
                    global.luke.output(lang.context['unUseNamespace'], 'unused');
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
                        if (environment != 'node') return global.luke.output('feature not available in this environment')

                        if (fileName.charAt(0) != '/') fileName = './' + fileName;
                        var file = require(fileName);
                        global.luke.useSyntax(file);
                        if (done) done();
                    } else {
                        global.luke.output('unsupported file type');
                        if (done) done();
                    }


                } catch (e) {
                    global.luke.output('Use Error', e);
                    if (done) done();
                }
            } else if (lang.context['includeNamespace']) {

                function includeScript(code) {
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
                        if (err) return global.luke.output('Error reading file');
                        file = data;
                    });
                    includeScript(file)
                    if (done) done();
                } else {
                    global.luke.output('unsupported file type');
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

                    lang.context['includeNamespace'] = global.luke.getRawStatement(file);

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
                    global.luke.vars[data.key] = data.value;

                }
            },
            func: {
                manual: "Sets a function",
                follow: ["{key,params,body}"],
                method: function(ctx, data) {
                    global.luke.funcs[data.key] = { params: data.params, body: data.body };

                    console.log('fs', global.luke.funcs);
                }
            },
            if: {
                follow: ["{condition}", "$then"],
                method: function(ctx, condition) {
                    lang.context.if = condition;
                }
            },
            then: {
                follow: ["{statement}", "$else"],
                method: function(ctx, statement) {
                    if (lang.context.if) {
                        lang.context.if = lang.context.if.replace(/AND/g, '&&').replace(/OR/g, '||')
                        if (eval(lang.context.if)) {
                            lang.context.conditionMet = true;
                            global.luke.parse(global.luke.getRawStatement(statement));
                        }
                    }
                }
            },
            else: {
                follow: ["{statement}"],
                method: function(ctx, statement) {
                    if (lang.context.if && !lang.context.conditionMet) {
                        global.luke.parse(global.luke.getRawStatement(statement));
                    }
                }
            },
            while: {
                follow: ["{condition}", "$do"],
                method: function(ctx, condition) {
                    lang.context.while = condition;
                }
            },
            for: {
                follow: ["{condition}", "$do"],
                method: function(ctx, condition) {
                    lang.context.for = condition;
                }
            },
            do: {
                follow: ["{statement}"],
                method: function(ctx, statement) {
                    //new Function("module = {}; " + data + " return syntax;")();
                    if (lang.context.while) {
                        lang.context.while = lang.context.while.replace(/AND/g, '&&').replace(/OR/g, '||')
                        new Function("while(" + global.luke.getRawStatement(lang.context.while)+"){ luke.parse('" + global.luke.getRawStatement(statement) + "') };")()
                    } else if (lang.context.for) {
                        lang.context.for = lang.context.for.replace(/AND/g, '&&').replace(/OR/g, '||');
                        new Function("for(" + global.luke.getRawStatement(lang.context.for) + "){ luke.parse('var i '+i+'; " + global.luke.getRawStatement(statement) + "') };")()
                    }
                }
            },
            version: {
                manual: "See the installed version of luke",
                follow: [],
                method: function(ctx, data) {
                    global.luke.output('luke version: ', pjson.version)
                }
            },
            use: {
                follow: ["$permanent", "{file}"],
                method: function(ctx, ns) {
                    lang.context['useNamespace'] = global.luke.getRawStatement(ns);

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
                    lang.context['useNamespace'] = global.luke.getRawStatement(file);
                    lang.context['_' + file + 'permanent'] = true;
                }
            },
            write: {
                follow: ["$file"],
                method: function(ctx) {
                    lang.context.fileOperation = 'write';
                }
            },
            read: {
                follow: ["$file"],
                method: function(ctx) {
                    lang.context.fileOperation = 'read';
                }
            },
            remove: {
                follow: ["$file", "$dir"],
                method: function(ctx) {
                    lang.context.fileOperation = 'remove';
                    lang.context.dirOperation = 'remove';
                }
            },
            make: {
                follow: ["$dir"],
                method: function(ctx) {
                    lang.context.dirOperation = 'make';
                }
            },
            file: {
                follow: ["{name,content}"],
                method: function(ctx, file) {
                    var content = file.content;
                    if(environment == 'web') content = new TextEncoder("utf-8").encode(file.content);

                    switch(lang.context.fileOperation){
                        case 'write':
                        fs.writeFile(file.name, content, 'utf8', function(err, data){
                            if(err) return global.luke.output(err);
                            global.luke.output(data);
                        })
                        break;
                        case 'read':
                        fs.readFile(file.name, function(err, data){
                            if(err) return global.luke.output(err);
                            global.luke.output(data.toString());
                        })
                        break;
                        case 'remove':
                        fs.unlink(file.name, function(err, data){
                            if(err) return global.luke.output(err);
                            global.luke.output(data);
                        })
                        break;
                    }
                }
            },
            dir: {
                follow: ["{dir}"],
                method: function(ctx, dir) {
                    switch(lang.context.dirOperation){
                        case 'make':
                        fs.mkdir(dir, {}, function(err, data){
                            if(err) return global.luke.output(err);
                            global.luke.output(data);
                        })
                        break;
                        case 'remove':
                        fs.rmdir(dir, function(err, data){
                            if(err) return global.luke.output(err);
                            global.luke.output(data);
                        })
                        break;
                    }
                }
            },
            print: {
                follow: ["{text}"],
                method: function(ctx, text) {
                    global.luke.output(global.luke.getRawStatement(text))
                }
            },
            list: {
                follow: ["{param}"],
                method: function(ctx, param) {
                    switch (param) {
                        case 'modules':
                            global.luke.output(Object.keys(lang['$']).join(', '));
                            break;
                        case 'commands':
                            Object.keys(lang['$']).forEach((ns) => {
                                global.luke.output('namespace:', ns, '\n');
                                Object.keys(lang['$'][ns]).forEach(c => {
                                    var man = "";
                                    if (lang['$'][ns][c].manual) man = ' (' + lang['$'][ns][c].manual + ')';
                                    var seq = "";
                                    lang['$'][ns][c].follow.forEach(f => {
                                        seq += f + " ";
                                    })
                                    global.luke.output('  ', c, seq, '\t', man)
                                    global.luke.output('\n')
                                })
                            })
                            break;
                    }
                }
            },
            download: {
                follow: ["{param}"],
                method: function(ctx, param) {

                    if (environment != 'node') return global.luke.output('download not available in this environment')

                    fetch(param)
                        .then(res => res.text())
                        .then(data => {

                            var fileName = param.split('/')[param.split('/').length - 1];
                            fs.writeFile(fileName, data, function(err, data) {
                                global.luke.output(fileName, 'downloaded');
                            })
                        });

                }
            },
            install: {
                follow: ["{param}"],
                method: function(ctx, param) {

                    if (!npm) return global.luke.output('npm not available in this environment');

                    npm.load({
                        loaded: false
                    }, function(err) {
                        npm.commands.install([param], function(er, data) {
                            global.luke.output(er, data);
                        });
                        npm.on("log", function(message) {
                            global.luke.output(message);
                        });
                    });
                }
            },
        }

    }

}

module.exports = lang;
}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./dependencies.js":5,"./dependencies/lightning-fs.min.js":2,"./package.json":4,"_process":6}],2:[function(require,module,exports){
!function(t,e){"object"==typeof exports&&"object"==typeof module?module.exports=e():"function"==typeof define&&define.amd?define([],e):"object"==typeof exports?exports.LightningFS=e():t.LightningFS=e()}(self,function(){return function(t){var e={};function i(r){if(e[r])return e[r].exports;var n=e[r]={i:r,l:!1,exports:{}};return t[r].call(n.exports,n,n.exports,i),n.l=!0,n.exports}return i.m=t,i.c=e,i.d=function(t,e,r){i.o(t,e)||Object.defineProperty(t,e,{enumerable:!0,get:r})},i.r=function(t){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(t,"__esModule",{value:!0})},i.t=function(t,e){if(1&e&&(t=i(t)),8&e)return t;if(4&e&&"object"==typeof t&&t&&t.__esModule)return t;var r=Object.create(null);if(i.r(r),Object.defineProperty(r,"default",{enumerable:!0,value:t}),2&e&&"string"!=typeof t)for(var n in t)i.d(r,n,function(e){return t[e]}.bind(null,n));return r},i.n=function(t){var e=t&&t.__esModule?function(){return t.default}:function(){return t};return i.d(e,"a",e),e},i.o=function(t,e){return Object.prototype.hasOwnProperty.call(t,e)},i.p="",i(i.s=3)}([function(t,e){function i(t){if(0===t.length)return".";let e=n(t);return e=e.reduce(s,[]),r(...e)}function r(...t){if(0===t.length)return"";let e=t.join("/");return e=e.replace(/\/{2,}/g,"/")}function n(t){if(0===t.length)return[];if("/"===t)return["/"];let e=t.split("/");return""===e[e.length-1]&&e.pop(),"/"===t[0]?e[0]="/":"."!==e[0]&&e.unshift("."),e}function s(t,e){if(0===t.length)return t.push(e),t;if("."===e)return t;if(".."===e){if(1===t.length){if("/"===t[0])throw new Error("Unable to normalize path - traverses above root directory");if("."===t[0])return t.push(e),t}return".."===t[t.length-1]?(t.push(".."),t):(t.pop(),t)}return t.push(e),t}t.exports={join:r,normalize:i,split:n,basename:function(t){if("/"===t)throw new Error(`Cannot get basename of "${t}"`);const e=t.lastIndexOf("/");return-1===e?t:t.slice(e+1)},dirname:function(t){const e=t.lastIndexOf("/");if(-1===e)throw new Error(`Cannot get dirname of "${t}"`);return 0===e?"/":t.slice(0,e)},resolve:function(...t){let e="";for(let n of t)e=n.startsWith("/")?n:i(r(e,n));return e}}},function(t,e){function i(t){return class extends Error{constructor(...e){super(...e),this.code=t,this.message?this.message=t+": "+this.message:this.message=t}}}const r=i("EEXIST"),n=i("ENOENT"),s=i("ENOTDIR"),o=i("ENOTEMPTY"),a=i("ETIMEDOUT");t.exports={EEXIST:r,ENOENT:n,ENOTDIR:s,ENOTEMPTY:o,ETIMEDOUT:a}},function(t,e,i){"use strict";i.r(e),i.d(e,"Store",function(){return r}),i.d(e,"get",function(){return o}),i.d(e,"set",function(){return a}),i.d(e,"update",function(){return h}),i.d(e,"del",function(){return c}),i.d(e,"clear",function(){return l}),i.d(e,"keys",function(){return u}),i.d(e,"close",function(){return d});class r{constructor(t="keyval-store",e="keyval"){this.storeName=e,this._dbName=t,this._storeName=e,this._init()}_init(){this._dbp||(this._dbp=new Promise((t,e)=>{const i=indexedDB.open(this._dbName);i.onerror=(()=>e(i.error)),i.onsuccess=(()=>t(i.result)),i.onupgradeneeded=(()=>{i.result.createObjectStore(this._storeName)})}))}_withIDBStore(t,e){return this._init(),this._dbp.then(i=>new Promise((r,n)=>{const s=i.transaction(this.storeName,t);s.oncomplete=(()=>r()),s.onabort=s.onerror=(()=>n(s.error)),e(s.objectStore(this.storeName))}))}_close(){return this._init(),this._dbp.then(t=>{t.close(),this._dbp=void 0})}}let n;function s(){return n||(n=new r),n}function o(t,e=s()){let i;return e._withIDBStore("readwrite",e=>{i=e.get(t)}).then(()=>i.result)}function a(t,e,i=s()){return i._withIDBStore("readwrite",i=>{i.put(e,t)})}function h(t,e,i=s()){return i._withIDBStore("readwrite",i=>{const r=i.get(t);r.onsuccess=(()=>{i.put(e(r.result),t)})})}function c(t,e=s()){return e._withIDBStore("readwrite",e=>{e.delete(t)})}function l(t=s()){return t._withIDBStore("readwrite",t=>{t.clear()})}function u(t=s()){const e=[];return t._withIDBStore("readwrite",t=>{(t.openKeyCursor||t.openCursor).call(t).onsuccess=function(){this.result&&(e.push(this.result.key),this.result.continue())}}).then(()=>e)}function d(t=s()){return t._close()}},function(t,e,i){const r=i(4),n=i(5);function s(t,e){"function"==typeof t&&(e=t);return[(...t)=>e(null,...t),e=r(e)]}t.exports=class{constructor(...t){this.promises=new n(...t),this.init=this.init.bind(this),this.readFile=this.readFile.bind(this),this.writeFile=this.writeFile.bind(this),this.unlink=this.unlink.bind(this),this.readdir=this.readdir.bind(this),this.mkdir=this.mkdir.bind(this),this.rmdir=this.rmdir.bind(this),this.rename=this.rename.bind(this),this.stat=this.stat.bind(this),this.lstat=this.lstat.bind(this),this.readlink=this.readlink.bind(this),this.symlink=this.symlink.bind(this),this.backFile=this.backFile.bind(this),this.du=this.du.bind(this)}init(t,e){this.promises.init(t,e)}readFile(t,e,i){const[r,n]=s(e,i);this.promises.readFile(t,e).then(r).catch(n)}writeFile(t,e,i,r){const[n,o]=s(i,r);this.promises.writeFile(t,e,i).then(n).catch(o)}unlink(t,e,i){const[r,n]=s(e,i);this.promises.unlink(t,e).then(r).catch(n)}readdir(t,e,i){const[r,n]=s(e,i);this.promises.readdir(t,e).then(r).catch(n)}mkdir(t,e,i){const[r,n]=s(e,i);this.promises.mkdir(t,e).then(r).catch(n)}rmdir(t,e,i){const[r,n]=s(e,i);this.promises.rmdir(t,e).then(r).catch(n)}rename(t,e,i){const[r,n]=s(i);this.promises.rename(t,e).then(r).catch(n)}stat(t,e,i){const[r,n]=s(e,i);this.promises.stat(t).then(r).catch(n)}lstat(t,e,i){const[r,n]=s(e,i);this.promises.lstat(t).then(r).catch(n)}readlink(t,e,i){const[r,n]=s(e,i);this.promises.readlink(t).then(r).catch(n)}symlink(t,e,i){const[r,n]=s(i);this.promises.symlink(t,e).then(r).catch(n)}backFile(t,e,i){const[r,n]=s(e,i);this.promises.backFile(t,e).then(r).catch(n)}du(t,e){const[i,r]=s(e);this.promises.du(t).then(i).catch(r)}}},function(t,e){t.exports=function(t){var e,i;if("function"!=typeof t)throw new Error("expected a function but got "+t);return function(){return e?i:(e=!0,i=t.apply(this,arguments))}}},function(t,e,i){const{encode:r,decode:n}=i(6),s=i(9),o=i(10),a=i(11),{ENOENT:h,ENOTEMPTY:c,ETIMEDOUT:l}=i(1),u=i(12),d=i(13),_=i(14),p=i(15),m=i(0);i(16);function f(t,e){return void 0!==e&&"function"!=typeof e||(e={}),"string"==typeof e&&(e={encoding:e}),[t=m.normalize(t),e]}function w(t,e){return[m.normalize(t),m.normalize(e)]}t.exports=class{constructor(t,e){this.init=this.init.bind(this),this.readFile=this._wrap(this.readFile,!1),this.writeFile=this._wrap(this.writeFile,!0),this.unlink=this._wrap(this.unlink,!0),this.readdir=this._wrap(this.readdir,!1),this.mkdir=this._wrap(this.mkdir,!0),this.rmdir=this._wrap(this.rmdir,!0),this.rename=this._wrap(this.rename,!0),this.stat=this._wrap(this.stat,!1),this.lstat=this._wrap(this.lstat,!1),this.readlink=this._wrap(this.readlink,!1),this.symlink=this._wrap(this.symlink,!0),this.backFile=this._wrap(this.backFile,!0),this.du=this._wrap(this.du,!1),this.saveSuperblock=s(()=>{this._saveSuperblock()},500),this._deactivationPromise=null,this._deactivationTimeout=null,this._activationPromise=null,this._operations=new Set,t&&this.init(t,e)}async init(...t){return this._initPromiseResolve&&await this._initPromise,this._initPromise=this._init(...t),this._initPromise}async _init(t,{wipe:e,url:i,urlauto:r,fileDbName:n=t,fileStoreName:s=t+"_files",lockDbName:o=t+"_lock",lockStoreName:h=t+"_lock",defer:c=!1}={}){await this._gracefulShutdown(),this._name=t,this._idb=new u(n,s),this._mutex=navigator.locks?new p(t):new _(o,h),this._cache=new a(t),this._opts={wipe:e,url:i},this._needsWipe=!!e,i&&(this._http=new d(i),this._urlauto=!!r),this._initPromiseResolve&&(this._initPromiseResolve(),this._initPromiseResolve=null),c||this.stat("/")}async _gracefulShutdown(){this._operations.size>0&&(this._isShuttingDown=!0,await new Promise(t=>this._gracefulShutdownResolve=t),this._isShuttingDown=!1,this._gracefulShutdownResolve=null)}_wrap(t,e){return async(...i)=>{let r={name:t.name,args:i};this._operations.add(r);try{return await this._activate(),await t.apply(this,i)}finally{this._operations.delete(r),e&&this.saveSuperblock(),0===this._operations.size&&(this._deactivationTimeout||clearTimeout(this._deactivationTimeout),this._deactivationTimeout=setTimeout(this._deactivate.bind(this),500))}}}async _activate(){if(this._initPromise||console.warn(new Error(`Attempted to use LightningFS ${this._name} before it was initialized.`)),await this._initPromise,this._deactivationTimeout&&(clearTimeout(this._deactivationTimeout),this._deactivationTimeout=null),this._deactivationPromise&&await this._deactivationPromise,this._deactivationPromise=null,this._activationPromise||(this._activationPromise=this.__activate()),await this._activationPromise,!await this._mutex.has())throw new l}async __activate(){if(this._cache.activated)return;this._needsWipe&&(this._needsWipe=!1,await this._idb.wipe(),await this._mutex.release({force:!0})),await this._mutex.has()||await this._mutex.wait();const t=await this._idb.loadSuperblock();if(t)this._cache.activate(t);else if(this._http){const t=await this._http.loadSuperblock();this._cache.activate(t),await this._saveSuperblock()}else this._cache.activate()}async _deactivate(){return this._activationPromise&&await this._activationPromise,this._deactivationPromise||(this._deactivationPromise=this.__deactivate()),this._activationPromise=null,this._gracefulShutdownResolve&&this._gracefulShutdownResolve(),this._deactivationPromise}async __deactivate(){await this._mutex.has()&&await this._saveSuperblock(),this._cache.deactivate();try{await this._mutex.release()}catch(t){console.log(t)}await this._idb.close()}async _saveSuperblock(){this._cache.activated&&(this._lastSavedAt=Date.now(),await this._idb.saveSuperblock(this._cache._root))}async _writeStat(t,e,i){let r=m.split(m.dirname(t)),n=r.shift();for(let t of r){n=m.join(n,t);try{this._cache.mkdir(n,{mode:511})}catch(t){}}return this._cache.writeStat(t,e,i)}async readFile(t,e){[t,e]=f(t,e);const{encoding:i}=e;if(i&&"utf8"!==i)throw new Error('Only "utf8" encoding is supported in readFile');let r=null,s=null;try{s=this._cache.stat(t),r=await this._idb.readFile(s.ino)}catch(t){if(!this._urlauto)throw t}if(!r&&this._http){let e=this._cache.lstat(t);for(;"symlink"===e.type;)t=m.resolve(m.dirname(t),e.target),e=this._cache.lstat(t);r=await this._http.readFile(t)}if(r&&(s&&s.size==r.byteLength||(s=await this._writeStat(t,r.byteLength,{mode:s?s.mode:438}),this.saveSuperblock()),"utf8"===i&&(r=n(r))),!s)throw new h(t);return r}async writeFile(t,e,i){[t,i]=f(t,i);const{mode:n,encoding:s="utf8"}=i;if("string"==typeof e){if("utf8"!==s)throw new Error('Only "utf8" encoding is supported in writeFile');e=r(e)}const o=await this._cache.writeStat(t,e.byteLength,{mode:n});return await this._idb.writeFile(o.ino,e),null}async unlink(t,e){[t,e]=f(t,e);const i=this._cache.lstat(t);return this._cache.unlink(t),"symlink"!==i.type&&await this._idb.unlink(i.ino),null}async readdir(t,e){return[t,e]=f(t,e),this._cache.readdir(t)}async mkdir(t,e){[t,e]=f(t,e);const{mode:i=511}=e;return await this._cache.mkdir(t,{mode:i}),null}async rmdir(t,e){if([t,e]=f(t,e),"/"===t)throw new c;return this._cache.rmdir(t),null}async rename(t,e){return[t,e]=w(t,e),this._cache.rename(t,e),null}async stat(t,e){[t,e]=f(t,e);const i=this._cache.stat(t);return new o(i)}async lstat(t,e){[t,e]=f(t,e);let i=this._cache.lstat(t);return new o(i)}async readlink(t,e){return[t,e]=f(t,e),this._cache.readlink(t)}async symlink(t,e){return[t,e]=w(t,e),this._cache.symlink(t,e),null}async backFile(t,e){[t,e]=f(t,e);let i=await this._http.sizeFile(t);return await this._writeStat(t,i,e),null}async du(t){return this._cache.du(t)}}},function(t,e,i){i(7),t.exports={encode:t=>(new TextEncoder).encode(t),decode:t=>(new TextDecoder).decode(t)}},function(t,e,i){(function(t){!function(t){function e(t){if("utf-8"!==(t=void 0===t?"utf-8":t))throw new RangeError("Failed to construct 'TextEncoder': The encoding label provided ('"+t+"') is invalid.")}function i(t,e){if(e=void 0===e?{fatal:!1}:e,"utf-8"!==(t=void 0===t?"utf-8":t))throw new RangeError("Failed to construct 'TextDecoder': The encoding label provided ('"+t+"') is invalid.");if(e.fatal)throw Error("Failed to construct 'TextDecoder': the 'fatal' option is unsupported.")}if(t.TextEncoder&&t.TextDecoder)return!1;Object.defineProperty(e.prototype,"encoding",{value:"utf-8"}),e.prototype.encode=function(t,e){if((e=void 0===e?{stream:!1}:e).stream)throw Error("Failed to encode: the 'stream' option is unsupported.");e=0;for(var i=t.length,r=0,n=Math.max(32,i+(i>>1)+7),s=new Uint8Array(n>>3<<3);e<i;){var o=t.charCodeAt(e++);if(55296<=o&&56319>=o){if(e<i){var a=t.charCodeAt(e);56320==(64512&a)&&(++e,o=((1023&o)<<10)+(1023&a)+65536)}if(55296<=o&&56319>=o)continue}if(r+4>s.length&&(n+=8,n=(n*=1+e/t.length*2)>>3<<3,(a=new Uint8Array(n)).set(s),s=a),0==(4294967168&o))s[r++]=o;else{if(0==(4294965248&o))s[r++]=o>>6&31|192;else if(0==(4294901760&o))s[r++]=o>>12&15|224,s[r++]=o>>6&63|128;else{if(0!=(4292870144&o))continue;s[r++]=o>>18&7|240,s[r++]=o>>12&63|128,s[r++]=o>>6&63|128}s[r++]=63&o|128}}return s.slice(0,r)},Object.defineProperty(i.prototype,"encoding",{value:"utf-8"}),Object.defineProperty(i.prototype,"fatal",{value:!1}),Object.defineProperty(i.prototype,"ignoreBOM",{value:!1}),i.prototype.decode=function(t,e){if((e=void 0===e?{stream:!1}:e).stream)throw Error("Failed to decode: the 'stream' option is unsupported.");e=0;for(var i=(t=new Uint8Array(t)).length,r=[];e<i;){var n=t[e++];if(0===n)break;if(0==(128&n))r.push(n);else if(192==(224&n)){var s=63&t[e++];r.push((31&n)<<6|s)}else if(224==(240&n)){s=63&t[e++];var o=63&t[e++];r.push((31&n)<<12|s<<6|o)}else if(240==(248&n)){65535<(n=(7&n)<<18|(s=63&t[e++])<<12|(o=63&t[e++])<<6|63&t[e++])&&(n-=65536,r.push(n>>>10&1023|55296),n=56320|1023&n),r.push(n)}}return String.fromCharCode.apply(null,r)},t.TextEncoder=e,t.TextDecoder=i}("undefined"!=typeof window?window:void 0!==t?t:this)}).call(this,i(8))},function(t,e){var i;i=function(){return this}();try{i=i||new Function("return this")()}catch(t){"object"==typeof window&&(i=window)}t.exports=i},function(t,e){t.exports=function(t,e,i){var r;return function(){if(!e)return t.apply(this,arguments);var n=this,s=arguments,o=i&&!r;return clearTimeout(r),r=setTimeout(function(){if(r=null,!o)return t.apply(n,s)},e),o?t.apply(this,arguments):void 0}}},function(t,e){t.exports=class{constructor(t){this.type=t.type,this.mode=t.mode,this.size=t.size,this.ino=t.ino,this.mtimeMs=t.mtimeMs,this.ctimeMs=t.ctimeMs||t.mtimeMs,this.uid=1,this.gid=1,this.dev=1}isFile(){return"file"===this.type}isDirectory(){return"dir"===this.type}isSymbolicLink(){return"symlink"===this.type}}},function(t,e,i){const r=i(0),{EEXIST:n,ENOENT:s,ENOTDIR:o,ENOTEMPTY:a}=i(1),h=0;t.exports=class{constructor(){}_makeRoot(t=new Map){return t.set(h,{mode:511,type:"dir",size:0,ino:0,mtimeMs:Date.now()}),t}activate(t=null){this._root=null===t?new Map([["/",this._makeRoot()]]):"string"==typeof t?new Map([["/",this._makeRoot(this.parse(t))]]):t}get activated(){return!!this._root}deactivate(){this._root=void 0}size(){return this._countInodes(this._root.get("/"))-1}_countInodes(t){let e=1;for(let[i,r]of t)i!==h&&(e+=this._countInodes(r));return e}autoinc(){return this._maxInode(this._root.get("/"))+1}_maxInode(t){let e=t.get(h).ino;for(let[i,r]of t)i!==h&&(e=Math.max(e,this._maxInode(r)));return e}print(t=this._root.get("/")){let e="";const i=(t,r)=>{for(let[n,s]of t){if(0===n)continue;let t=s.get(h),o=t.mode.toString(8);e+=`${"\t".repeat(r)}${n}\t${o}`,"file"===t.type?e+=`\t${t.size}\t${t.mtimeMs}\n`:(e+="\n",i(s,r+1))}};return i(t,0),e}parse(t){let e=0;function i(t){const i=++e,r=1===t.length?"dir":"file";let[n,s,o]=t;return n=parseInt(n,8),s=s?parseInt(s):0,o=o?parseInt(o):Date.now(),new Map([[h,{mode:n,type:r,size:s,mtimeMs:o,ino:i}]])}let r=t.trim().split("\n"),n=this._makeRoot(),s=[{indent:-1,node:n},{indent:0,node:null}];for(let t of r){let e=t.match(/^\t*/)[0].length;t=t.slice(e);let[r,...n]=t.split("\t"),o=i(n);if(e<=s[s.length-1].indent)for(;e<=s[s.length-1].indent;)s.pop();s.push({indent:e,node:o}),s[s.length-2].node.set(r,o)}return n}_lookup(t,e=!0){let i=this._root,n="/",o=r.split(t);for(let a=0;a<o.length;++a){let c=o[a];if(!(i=i.get(c)))throw new s(t);if(e||a<o.length-1){const t=i.get(h);if("symlink"===t.type){let e=r.resolve(n,t.target);i=this._lookup(e)}n=n?r.join(n,c):c}}return i}mkdir(t,{mode:e}){if("/"===t)throw new n;let i=this._lookup(r.dirname(t)),s=r.basename(t);if(i.has(s))throw new n;let o=new Map,a={mode:e,type:"dir",size:0,mtimeMs:Date.now(),ino:this.autoinc()};o.set(h,a),i.set(s,o)}rmdir(t){let e=this._lookup(t);if("dir"!==e.get(h).type)throw new o;if(e.size>1)throw new a;let i=this._lookup(r.dirname(t)),n=r.basename(t);i.delete(n)}readdir(t){let e=this._lookup(t);if("dir"!==e.get(h).type)throw new o;return[...e.keys()].filter(t=>"string"==typeof t)}writeStat(t,e,{mode:i}){let n;try{let e=this.stat(t);null==i&&(i=e.mode),n=e.ino}catch(t){}null==i&&(i=438),null==n&&(n=this.autoinc());let s=this._lookup(r.dirname(t)),o=r.basename(t),a={mode:i,type:"file",size:e,mtimeMs:Date.now(),ino:n},c=new Map;return c.set(h,a),s.set(o,c),a}unlink(t){let e=this._lookup(r.dirname(t)),i=r.basename(t);e.delete(i)}rename(t,e){let i=r.basename(e),n=this._lookup(t);this._lookup(r.dirname(e)).set(i,n),this.unlink(t)}stat(t){return this._lookup(t).get(h)}lstat(t){return this._lookup(t,!1).get(h)}readlink(t){return this._lookup(t,!1).get(h).target}symlink(t,e){let i,n;try{let t=this.stat(e);null===n&&(n=t.mode),i=t.ino}catch(t){}null==n&&(n=40960),null==i&&(i=this.autoinc());let s=this._lookup(r.dirname(e)),o=r.basename(e),a={mode:n,type:"symlink",target:t,size:0,mtimeMs:Date.now(),ino:i},c=new Map;return c.set(h,a),s.set(o,c),a}_du(t){let e=0;for(const[i,r]of t.entries())e+=i===h?r.size:this._du(r);return e}du(t){let e=this._lookup(t);return this._du(e)}}},function(t,e,i){const r=i(2);t.exports=class{constructor(t,e){this._database=t,this._storename=e,this._store=new r.Store(this._database,this._storename)}saveSuperblock(t){return r.set("!root",t,this._store)}loadSuperblock(){return r.get("!root",this._store)}readFile(t){return r.get(t,this._store)}writeFile(t,e){return r.set(t,e,this._store)}unlink(t){return r.del(t,this._store)}wipe(){return r.clear(this._store)}close(){return r.close(this._store)}}},function(t,e){t.exports=class{constructor(t){this._url=t}loadSuperblock(){return fetch(this._url+"/.superblock.txt").then(t=>t.ok?t.text():null)}async readFile(t){const e=await fetch(this._url+t);if(200===e.status)return e.arrayBuffer();throw new Error("ENOENT")}async sizeFile(t){const e=await fetch(this._url+t,{method:"HEAD"});if(200===e.status)return e.headers.get("content-length");throw new Error("ENOENT")}}},function(t,e,i){const r=i(2),n=t=>new Promise(e=>setTimeout(e,t));t.exports=class{constructor(t,e){this._id=Math.random(),this._database=t,this._storename=e,this._store=new r.Store(this._database,this._storename),this._lock=null}async has({margin:t=2e3}={}){if(this._lock&&this._lock.holder===this._id){const e=Date.now();return this._lock.expires>e+t||await this.renew()}return!1}async renew({ttl:t=5e3}={}){let e;return await r.update("lock",i=>{const r=Date.now()+t;return e=i&&i.holder===this._id,this._lock=e?{holder:this._id,expires:r}:i,this._lock},this._store),e}async acquire({ttl:t=5e3}={}){let e,i,n;if(await r.update("lock",r=>{const s=Date.now(),o=s+t;return i=r&&r.expires<s,e=void 0===r||i,n=r&&r.holder===this._id,this._lock=e?{holder:this._id,expires:o}:r,this._lock},this._store),n)throw new Error("Mutex double-locked");return e}async wait({interval:t=100,limit:e=6e3,ttl:i}={}){for(;e--;){if(await this.acquire({ttl:i}))return!0;await n(t)}throw new Error("Mutex timeout")}async release({force:t=!1}={}){let e,i,n;if(await r.update("lock",r=>(e=t||r&&r.holder===this._id,i=void 0===r,n=r&&r.holder!==this._id,this._lock=e?void 0:r,this._lock),this._store),await r.close(this._store),!e&&!t){if(i)throw new Error("Mutex double-freed");if(n)throw new Error("Mutex lost ownership")}return e}}},function(t,e){t.exports=class{constructor(t){this._id=Math.random(),this._database=t,this._has=!1,this._release=null}async has(){return this._has}async acquire(){return new Promise(t=>{navigator.locks.request(this._database+"_lock",{ifAvailable:!0},e=>(this._has=!!e,t(!!e),new Promise(t=>{this._release=t})))})}async wait({timeout:t=6e5}={}){return new Promise((e,i)=>{const r=new AbortController;setTimeout(()=>{r.abort(),i(new Error("Mutex timeout"))},t),navigator.locks.request(this._database+"_lock",{signal:r.signal},t=>(this._has=!!t,e(!!t),new Promise(t=>{this._release=t})))})}async release({force:t=!1}={}){this._has=!1,this._release?this._release():t&&navigator.locks.request(this._database+"_lock",{steal:!0},t=>!0)}}},function(t,e){const i="undefined"==typeof window?"worker":"main";t.exports=function(t){return performance.mark(`${t} start`),console.log(`${i}: ${t}`),console.time(`${i}: ${t}`),function(){performance.mark(`${t} end`),console.timeEnd(`${i}: ${t}`),performance.measure(`${t}`,`${t} start`,`${t} end`)}}}])});
},{}],3:[function(require,module,exports){
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

    // functions
    funcs: {},

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

    output: function() {
        for (arg of arguments) {
            console.info(arg);
        }
    },

    useSyntax: function(jsObject) {

        var _defaultSyntax = this.lang['$'].default;

        Object.assign(this.lang, jsObject)
        console.log(Object.keys(jsObject['$'])[0], 'can now be used');

        this.lang['$'].default = _defaultSyntax;

        //console.log('lang', this.lang);

        this.lang.currentNamespace = Object.keys(jsObject['$'])[0];

    },

    // Returns the raw statement from an input. e.g. (print hello) will return print hello
    getRawStatement: function(statement) {
        if (this.groupingOperators.includes(statement.charAt(0)) && this.groupingOperators.includes(statement.charAt(statement.length - 1))) {
            return statement.substring(1, statement.length - 1)
        } else return statement;
    },

    parse: function(code, vars, funcs) {

        if (!vars) vars = {};
        if (!funcs) funcs = {};

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

                    if (vars[bestMatching] || global.luke.vars[bestMatching]) {

                        callTokenFunction(global.luke.ctx[partId], t, vars[bestMatching] || global.luke.vars[bestMatching]);
                        tokens.shift();
                    } else if (global.luke.funcs[bestMatching]) {

                        //callTokenFunction(global.luke.ctx[partId], t, global.luke.vars[bestMatching]);
                        tokens.shift();
                    } else if ((bestMatchingInstruction || "").includes(",")) {
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
                        // console.log('safasf', bestMatching, tokens)
                        callTokenFunction(global.luke.ctx[partId], token, bestMatching)
                        tokens.shift();
                    }

                    //console.log('a', tokens, bestMatching)
                    bestMatching = getMatchingFollow(nextInstructions, tokens[0]);
                    //console.log('b', tokens, bestMatching)
                    sequence(tokens, tokens[0], bestMatching, partId, done);
                }

            } else if (token.includes('(') && funcs || global.luke.funcs[token.substring(0, token.indexOf('('))]) {
                execFunctionBody(token, vars, funcs)
            } else {
                console.log('unequal', instructionKey, token);
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
                //console.log('params', inputParams);

                bestMatching = bestMatching.substring(0, bestMatching.indexOf('('));
                var rawDefinedParams = global.luke.funcs[bestMatching].params;
                rawDefinedParams = rawDefinedParams.substring(rawDefinedParams.indexOf('(') + 1, rawDefinedParams.indexOf(')'));
                var definedParams = rawDefinedParams.split(",");
                //console.log('definedParams', definedParams);

                definedParams.forEach(function(param, i) {
                    scope.vars[param] = inputParams[i]
                })

                //console.log(global.luke.funcs[bestMatching].body)

                var body = global.luke.funcs[bestMatching].body;

                luke.parse(body.substring(body.indexOf('{') + 1, body.indexOf('}')), scope.vars, scope.funcs);

            }
        }

        var splitInit = (parts) => {
            parts.forEach(p => {

                p = p.trim();

                // Ignore comments for parsing
                if (p.indexOf('//') == 0) return;

                var partId = Math.random();

                luke.schedule.push({
                    partId: partId,
                    fn: (done) => {

                        if (!p) return;

                        global.luke.ctx[partId] = {
                            sequence: [],
                            data: {}
                        };

                        var tokens = p.match(/\{[^\}]+?[\}]|\([^\)]+?[\)]|[\""].+?[\""]|[^ ]+/g);

                        tokens.push(this.lang.delimeter);

                        var t = tokens[0].replace(/(\r\n|\n|\r)/gm, "");

                        tokens.shift();

                        var definition = Object.assign(this.lang['$'][this.lang.currentNamespace] || {}, this.lang['$'].default)


                        if (definition[t]) {

                            var bestMatching = getMatchingFollow(definition[t].follow, tokens[0]);
                            var bestMatchingInstruction = getMatchingFollowInstruction(definition[t].follow, tokens[0]);

                            if ((bestMatching || "").charAt(0) == "$") {
                                callTokenFunction(global.luke.ctx[partId], t);
                                sequence(tokens, tokens[0], bestMatching, partId, done);
                            } else {

                                if (vars[bestMatching] || global.luke.vars[bestMatching]) {

                                    callTokenFunction(global.luke.ctx[partId], t, vars[bestMatching] || global.luke.vars[bestMatching]);
                                    tokens.shift();
                                } else if (global.luke.funcs[bestMatching] || (bestMatching.includes('(') && global.luke.funcs[bestMatching.substring(0, bestMatching.indexOf('('))])) {

                                    execFunctionBody(bestMatching, vars, funcs)

                                    //callTokenFunction(global.luke.ctx[partId], t, global.luke.funcs[bestMatching]);
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

                        } else if (t.includes('(') && funcs || global.luke.funcs[t.substring(0, t.indexOf('('))]) {
                            execFunctionBody(t, vars, funcs)
                        } else {
                            console.log(t, 'is not defined');
                        }


                    }
                })

            })


            function execSchedule(next) {
                //console.log('next', next);
                if (!next) return;
                next.fn(function() {
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

        localStorage,
        luke.moduleStorage.all._keys.forEach(function(key) {
            if (key.charAt(0) == "_") {
                var syntax = new Function("module = {}; " + luke.moduleStorage.get(key) + " return syntax;")();
                luke.useSyntax(syntax);
            }
        })
    }
}


global.luke = luke;

module.exports = luke;
}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./default.luke.js":1,"./dependencies.js":5,"_process":6}],4:[function(require,module,exports){
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

},{}],5:[function(require,module,exports){

},{}],6:[function(require,module,exports){
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

},{}]},{},[3]);
