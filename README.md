# luke

An abstract, extendable programming language for domain specific solutions

## Table of contents

* [ Getting started ](#getting-started)
* [ Examples ](#examples)
* [ Modules ](#modules)
* [ License ](#license)

## Getting started

luke runs on JavaScript Engines and can be used on Node, Browsers and via it's CLI.


### Luke CLI:

```shell
$ npm i luke --global`
$ luke
```

or execute a luke file:

```shell
$ luke run example.luke
```


### Luke JS (npm module):

```javascript
npm i luke --save


const luke = require('luke');
luke.parse('print "Hello World');
```

### Luke JS (Browser):

```javascript
<script src="luke.js">

...

luke.parse('print "Hello World');
```

## Examples

```javascript
use rest.js;

ns rest;

POST {name: "Peter"} to https://url.com/api
```

## Modules

luke is an open and collaborative platform. Developers can descibe their own syntax and create custom modules for any domain.


### Build a custom syntax/module

Modules are single JS files in a given structure. They describe a certain syntax for specific domains and purposes. 

Example (example.luke.js):

```javascript
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

Use it in your code:

```shell
use example.luke.js;

echo "Hello";
````

### Contribute a module

luke modules can be contributed to the official module repository and used by others in their code.


[ luke-catalog ](https://github.com/luke-lang/luke-catalog)


## License

luke is a free open source project licensed under the MIT license.

[ LICENSE ](LICENSE)