# luke

luke as an abstract, extendable programming language and platform that allows custom syntax for domain specific solutions.


***Important:*** The luke project is in early stage and under development. It's not yet production ready. If you'd like to contribute to the code or the module ecosystem, feel free to open a PR.


# Table of contents

* [Resources](#resources)
* [Examples](#examples)
* [Install](#install)
* [Usage](#usage)
* [Language](#language)
* [Custom syntax](#custom-syntax-modules)
* [License](#license)


# Resources

| Resource        | Description           | 
| ------------- |-------------| -----|
| [Luke Website](https://luke-lang.github.io)  | Official website of the luke project |
| [Luke Module Catalog](https://luke-lang.github.io/modules)    | Complete collection and documentation of luke modules     |  
| [Luke on npm](https://npmjs.com/package/luke-lang) | Official npm package   |  
| [Luke on GitHub](https://github.com/luke-lang/luke) | Official luke core repo   |  


# Examples


***Code***

```luke
print "Starting luke program";
```


***Modules***

```luke
// 1. Use a module (local or remote)

use rest.luke.js;
use https://domain.com/rest.luke.js;


// 2. Set the module namespace

ns rest;


// 3. Use module-specific code

POST {name "Hello"} to https://api.com/resource
```


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

You can also include existing luke files into your interactive shell:

```shell
$ luke include main.luke
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
luke.parse('print "Hello, I am embedded"')
```


# Language

The luke language aims to provide simple language to build solutions that are taylored for different domains and problems.

The main concepts of luke are:


* ***Simple, clean language***
* ***Understandable for developers and non-developers***
* ***Custom syntax creation***
* ***Open and free platform for modules***


[ Check out the Modules ](https://luke-lang.github.io/modules)


***Default namespace***

luke comes with a default namespace, which is initalized by default. The default nameapace contains some basic functionalities.

[ Default module ](https://luke-lang.github.io/modules)

Syntax from the default namespace will automatically be available in any other module-specific namespace.


# Custom syntax, modules

The luke language is a platform for different syntax. Each syntax ist delivered using a module. Basically any module syntax can be different, however they are all aimed at simplicity.


![module packing](https://raw.githubusercontent.com/luke-lang/luke/master/assets/images/module-packing.png "Custom syntax becomes a module")


## Create a syntax

Building your own custom syntax is fairly simple. It's defined using a JavaScript Object with a common structure.

```javascript
lang = {
  $: {
    mymodule: { // your namespace name
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
}
module.exports = lang;
```



***The required keys and fields in your syntax definition are:***


| Key        | Description           | Example  |
| ------------- |-------------| -----|
| lang.$.NAMESPACE      | The name of your moudle/namespace | `example` |
| lang.$.NAMESPACE.TOKEN     | Custom tokens      |   `echo` |
| lang.$.NAMESPACE.TOKEN.follow | A list of possible tokens that can follow.   |    `["{param}", "$and"]` |
| lang.$.NAMESPACE.TOKEN.method | The function to be executed, when that token ist parsed     |    `function(param){console.log(param)}` |



***Follow tokens can be defined as follows:***


| Follow token        | Description    | 
| ------------- |-------------| 
| `$and`      | Corresponds to the exact token without the leading dollar sign. |
| `{param}`     | A custom input of any type. This will be available as single parameter in your method: `method: function(param){}`      |
| `{param1,param2}` | Multiple custom inputs followed by another. These will be available as object parameter: `method: function(obj){//obj.param1, obj.param2}`  | 



Define your available tokens as keys under the "$" object. Each key has an attached `method`, which will be executed, when that token is parsed and an array `follow`, which defines, which tokens can follow the current token.

***Following tokens***

Following tokens can either be wildcards for user input (`{param}`) or another token, specified with a leading "$" (e.g. `$and`).

These instructions let you create token chains and build your own syntax.


```luke

|-------------- Statement ------------|

  echo    "Peter"   and  "Nicole"   ;

   ^        ^        ^      ^       ^
command  command  command command delimeter;

 $.echo  {param}   $.and  {param}

```

## Publish syntax as module

Your custom syntax modules can be contributed to the official luke module repo.

Learn more: [ Luke Module Repo](https://luke-lang.github.io/modules)

# License

luke is open source and released under the MIT License.

[ See the license ](https://github.com/luke-lang/luke/blob/master/LICENSE)