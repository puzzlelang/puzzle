# luke

An abstract, extendable programming language for domain specific solutions



## Table of contents

* [ Docs ](#full-documentation)
* [ Getting started ](#getting-started)
* [ Examples ](#examples)
* [ Modules ](#modules)
* [ License ](#license)

## Full Documentation

The complete documentaion can be found ***[ here ](Docs.md)***

## Getting started

luke runs on JavaScript Engines and can be used on Node, Browsers and via it's CLI.


### Interactive Shell:

```shell
$ npm i luke --global`
$ luke
```

### Run a file

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

```html
<script src="luke.js" />

<script>
luke.parse('print "Hello World');
</script>
```


## Example

```javascript
// use a module
use rest.js;

// set the module namespace
ns rest;

// use module-specific code
POST {name: "Peter"} to https://url.com/api
```


### Modules

luke has an extendable module system. Modules provide custom syntax for different domains and usages.

How to use a module?

```luke
use example.luke.js;
```

### Namespaces

Namespaces provide a way to seperate syntax from different modules. Namespaces begin with the `ns` keyword and end when another namespace begins or on the end of the script.

```luke
ns example;

// example-specific code

ns default;

// default code
```

#### Default namespace

luke comes with a default namespace, which is initalized by default. The default nameapace contains some basic syntax:

```luke
use <module>;
ns <namespcace>
```

Syntax from the default namespace will automatically be available in any other module-specific namespace.



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