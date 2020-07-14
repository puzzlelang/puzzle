# luke Docs

luke as an abstract, extendable programming language that allows custom syntax for domain specific solutions.

***important Resources:***

* [Luke Website](https://luke-lang.github.io)
* [Luke Module Catalog](https://luke-lang.github.io/modules) (Documentation of all available modules)
* [npm](...)

# Install

luke runs on JavaScript Engines and can be used on Node, Browsers and via it's CLI.


## CLI

```shell
$ npm i luke --global
```

## npm module

```javascript
npm i luke --save
```

## Browser

```html
<script src="luke.js">
```

# Usage


After you have installed luke via npm, you can use it in your terminal as an interactive CLI or run your luke script files

## Interactive Shell

```shell
$ luke
$ print "Hello World!"
"Hello World"
```

## Run a File

```javascript
// hello.luke
print "I am a luke file"
```


```shell
$ luke run hello.luke
"I am a luke file"
```


## Embedded (JavaScript)

luke scripts can also be run inside JavaScript:

```javascript
// For Node.js
const luke = require('luke-lang');

// For browsers:
<script src="luke.js"/>
```

```javascript
luke.parse('Hello, I am embedded!')
```


# Language

The luke language aims to provide simple language to build solutions that are taylored for different domains and probblems.

The main concepts of luke are:


* ***Simple, clean language***
* ***Understandable for developers and non-developers***
* ***Custom syntax creation***
* ***Open and free platform for modules***


## Tutoral

***Example***

```luke
// 1. Use a module
use example.luke.js

// 2. Set the module context
ns example;

// 3. Use module-specific code
print "Hello World"

// 4. Use another module (modules can be used anywhere)
use antoher.luke.js

// ...

```


***Default namespace***

luke comes with a default namespace, which is initalized by default. The default nameapace contains some basic functionalities.

[ Learn more ](https://luke-lang.github.io/modules)

Syntax from the default namespace will automatically be available in any other module-specific namespace.



# Custom syntax

The luke language is a platform for different syntax. Each syntax ist delivered using a module. Basically any module syntax can be different, however they are all aimed at simplicity.


## Create a Syntax module

Building your own custom syntax is fairly simple. It's defined using a JavaScript Object with a common structure.

```javascript
lang = {
  $: {
    echo: {
      follow: ["{param}", "$and"],
      method: function(param){
        console.log(param)
      }
    },
    and: {
      follow: ["{param}", "$and"],
      method: function(param){
        console.log(param)
      }
    }
  }
}
module.exports = dsl;
```

Define your available tokens as keys under the "$" object. Each key has an attached `method`, which will be executed, when that token is parsed and an array `follow`, which defines, which tokens can follow the current token.

Following tokens can either be wildcards for user input (`{param}`) or another token, specified with a leading "$" (e.g. `$and`).

These instructions let you create token chains and build your own syntax.


```luke

|-------------- Statement ------------|

  echo    "Peter"   and  "Nicole"   ;

   ^        ^        ^      ^       ^
command  command  command command delimeter;

 $.echo  {param}   $.and  {param}

```

## Publish your module

Your custom syntax modules can be contributed to the official luke module repo, called [luke-catalog](...)

# License

luke is open source and released under the MIT License.

[ See the license ](https://github.com/luke-lang/luke/blob/master/LICENSE)