# luke

An abstract, extendable programming language for domain specific solutions

## Getting started

luke runs on JavaScript Engines and can be used on Node, Browsers and via it's CLI.


### Luke CLI:

`npm i luke --global`

Then in the terminal, run:

`$ luke`

or execute a luke file:

`$ luke run example.luke`


### Luke JS (npm module):

`npm i luke --save`

```
const luke = require('luke');
luke.parse('print "Hello World');
```

### Luke JS (Browser):

`<script src="luke.js">`

```
luke.parse('print "Hello World');
```

## Examples

```
use rest.js;

ns rest;

POST {name: "Peter"} to https://url.com/api
```

## Modules

luke is an open and collaborative platform. Developers can descibe their own syntax and create custom modules for any domain.
These modules can be contributed and used by others in their code.

### luke module repo

There is a module repository that holds different modules for everyone to use.

First, get the repo:

`npm i luke-catalog` OR `git clone https://github.com/luke-lang/luke-catalog.git` 

Then use them in your luke script:

`use email.luke.js;`


### Build a custom syntax/module

Modules are single JS files in a given structure. They describe a certain syntax for specific domains and purposes. 

Example:

```
dsl = {
	lang: {
    	$: {
        	echo: {
        		follow: ["{param}"],
        		method: function(param){
        			console.log(param)
        		}
        	}
    	}
}
module.exports = dsl;
```

### Contribute a module

Get the official repo:

```
git clone https://github.com/luke-lang/luke-catalog.git
cd luke-catalog/modules
```

Add your module with the filename:

`<MODULE>.luke.js`

Create a pull request to add it to the repo

