var environment = 'browser';
if ((typeof process !== 'undefined') && ((process.release || {}).name === 'node')) {

    environment = "node";
    const dependencies = require('./dependencies.js');
    pjson = require('./package.json');
    localStorage = new dependencies.localStorage.LocalStorage("localStorage");

    fs = dependencies.fs;
    fetch = dependencies.fetch;
    os = dependencies.os;
} else {
    global = window;

    var LightningFS = require('./dependencies/lightning-fs.min.js');

    fs = new LightningFS('fs')
}

var pz;

var _puzzle = function() { 

	var self = this;

	return {

		// BASICS

		print: (data) => {
			console.log(data);
		},
		set: (k,v) => {
			global[k] = v;
			return {
				local: () => {
					localStorage.setItem(k, v);
				}
			}
		},
		unset: (k,v) => {
			delete global[k];
			return {
				local: () => {
					localStorage.removeItem(k);
				}
			}
		},
		run: (data, params) => {
			// if function is defined
			if(global.hasOwnProperty(data)){
				if(params) global[data](...params);
				else global[data]();
			}
			// if data is string
			else if(typeof data === "string"){
				try {
					new Function(data)();
				} catch(e) { /*ERROR???*/ } 
			}
			// if data if function
			else {
				if(params) data(...params);
				else data();
			} 
		},
		load: (url) => {
			console.log('loading...', url)
			return {
				as: (name) => {
					global[name] = url;
				}
			}
		},
		after: (time) => {
			return {
				run: (data, params) => {
					setTimeout(()=>{
						pz.run(data, params)
					}, time)
				}
			}
		},
		every: (time) => {
			return {
				run: (data, params) => {
					pz.run(data, params)
				}
			}
		},
		with: (params) => {
			return {
				run: (data) => {
					pz.run(data, params)
				}
			}
		},
		repeat: (times) => {
			return {
				run: (data, params) => {
					var c = 0;
					while(c < times){
						pz.run(data, params)
						c++;
					}
					
				}
			}
		},
		loop: {
			over: (data) => {
				return {
					do: (fn) => {
						data.forEach(it => {
							var i = it;
							fn(i);
						})	
					}
				}
			}
		},


		calc: (params) => {
			var result = eval(params);
			return {
				as : (name) => {
					global[name] = result;
				}
			}
		},
		min: (params) => {
			var result = Math.min(...params)
			return {
				as : (name) => {
					global[name] = result;
				}
			}
		},
		max: (params) => {
			var result = Math.max(...params)
			return {
				as : (name) => {
					global[name] = result;
				}
			}
		},
		avg: (params) => {
			var average = arr => arr.reduce( ( p, c ) => p + c, 0 ) / arr.length;
			var result = average(params)
			return {
				as : (name) => {
					global[name] = result;
				}
			}
		},

		https: (params) => {
			return {
				get : (name) => {
					global[name] = result;
				}
			}
		},
	}

}

pz = new _puzzle();

Object.keys(pz).forEach(k => {
	global[k] = pz[k]
});