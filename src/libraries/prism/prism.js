/* PrismJS 1.17.1
https://prismjs.com/download.html#themes=prism-okaidia&languages=markup+css+clike+javascript+bash+css-extras+diff+markup-templating+docker+git+go+http+java+php+javadoclike+markdown+json+js-templates+jsdoc+phpdoc+php-extras+sql+powershell+scss+js-extras+plsql+javadoc+shell-session+pug+regex+vim&plugins=line-highlight+line-numbers+autolinker+wpd+custom-class+file-highlight+toolbar+highlight-keywords+inline-color+previewers+autoloader+unescaped-markup+command-line+normalize-whitespace+keep-markup+show-language+copy-to-clipboard+download-button+match-braces+diff-highlight */
var _self = (typeof window !== 'undefined')
	? window   // if in browser
	: (
		(typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope)
		? self // if in worker
		: {}   // if in node js
	);

/**
 * Prism: Lightweight, robust, elegant syntax highlighting
 * MIT license http://www.opensource.org/licenses/mit-license.php/
 * @author Lea Verou http://lea.verou.me
 */

var Prism = (function (_self){

// Private helper vars
var lang = /\blang(?:uage)?-([\w-]+)\b/i;
var uniqueId = 0;

/**
 * Returns the Prism language of the given element set by a `language-xxxx` or `lang-xxxx` class.
 *
 * If no language is set for the element or the element is `null` or `undefined`, `none` will be returned.
 *
 * @param {Element} element
 * @returns {string}
 */
function getLanguage(element) {
	while (element && !lang.test(element.className)) {
		element = element.parentNode;
	}
	if (element) {
		return (element.className.match(lang) || [, 'none'])[1].toLowerCase();
	}
	return 'none';
}


var _ = {
	manual: _self.Prism && _self.Prism.manual,
	disableWorkerMessageHandler: _self.Prism && _self.Prism.disableWorkerMessageHandler,
	util: {
		encode: function (tokens) {
			if (tokens instanceof Token) {
				return new Token(tokens.type, _.util.encode(tokens.content), tokens.alias);
			} else if (Array.isArray(tokens)) {
				return tokens.map(_.util.encode);
			} else {
				return tokens.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\u00a0/g, ' ');
			}
		},

		type: function (o) {
			return Object.prototype.toString.call(o).slice(8, -1);
		},

		objId: function (obj) {
			if (!obj['__id']) {
				Object.defineProperty(obj, '__id', { value: ++uniqueId });
			}
			return obj['__id'];
		},

		// Deep clone a language definition (e.g. to extend it)
		clone: function deepClone(o, visited) {
			var clone, id, type = _.util.type(o);
			visited = visited || {};

			switch (type) {
				case 'Object':
					id = _.util.objId(o);
					if (visited[id]) {
						return visited[id];
					}
					clone = {};
					visited[id] = clone;

					for (var key in o) {
						if (o.hasOwnProperty(key)) {
							clone[key] = deepClone(o[key], visited);
						}
					}

					return clone;

				case 'Array':
					id = _.util.objId(o);
					if (visited[id]) {
						return visited[id];
					}
					clone = [];
					visited[id] = clone;

					o.forEach(function (v, i) {
						clone[i] = deepClone(v, visited);
					});

					return clone;

				default:
					return o;
			}
		},

		/**
		 * Returns the script element that is currently executing.
		 *
		 * This does __not__ work for line script element.
		 *
		 * @returns {HTMLScriptElement | null}
		 */
		currentScript: function () {
			if (typeof document === 'undefined') {
				return null;
			}
			if ('currentScript' in document) {
				return document.currentScript;
			}

			// IE11 workaround
			// we'll get the src of the current script by parsing IE11's error stack trace
			// this will not work for inline scripts

			try {
				throw new Error();
			} catch (err) {
				// Get file src url from stack. Specifically works with the format of stack traces in IE.
				// A stack will look like this:
				//
				// Error
				//    at _.util.currentScript (http://localhost/components/prism-core.js:119:5)
				//    at Global code (http://localhost/components/prism-core.js:606:1)

				var src = (/at [^(\r\n]*\((.*):.+:.+\)$/i.exec(err.stack) || [])[1];
				if (src) {
					var scripts = document.getElementsByTagName('script');
					for (var i in scripts) {
						if (scripts[i].src == src) {
							return scripts[i];
						}
					}
				}
				return null;
			}
		}
	},

	languages: {
		extend: function (id, redef) {
			var lang = _.util.clone(_.languages[id]);

			for (var key in redef) {
				lang[key] = redef[key];
			}

			return lang;
		},

		/**
		 * Insert a token before another token in a language literal
		 * As this needs to recreate the object (we cannot actually insert before keys in object literals),
		 * we cannot just provide an object, we need an object and a key.
		 * @param inside The key (or language id) of the parent
		 * @param before The key to insert before.
		 * @param insert Object with the key/value pairs to insert
		 * @param root The object that contains `inside`. If equal to Prism.languages, it can be omitted.
		 */
		insertBefore: function (inside, before, insert, root) {
			root = root || _.languages;
			var grammar = root[inside];
			var ret = {};

			for (var token in grammar) {
				if (grammar.hasOwnProperty(token)) {

					if (token == before) {
						for (var newToken in insert) {
							if (insert.hasOwnProperty(newToken)) {
								ret[newToken] = insert[newToken];
							}
						}
					}

					// Do not insert token which also occur in insert. See #1525
					if (!insert.hasOwnProperty(token)) {
						ret[token] = grammar[token];
					}
				}
			}

			var old = root[inside];
			root[inside] = ret;

			// Update references in other language definitions
			_.languages.DFS(_.languages, function(key, value) {
				if (value === old && key != inside) {
					this[key] = ret;
				}
			});

			return ret;
		},

		// Traverse a language definition with Depth First Search
		DFS: function DFS(o, callback, type, visited) {
			visited = visited || {};

			var objId = _.util.objId;

			for (var i in o) {
				if (o.hasOwnProperty(i)) {
					callback.call(o, i, o[i], type || i);

					var property = o[i],
					    propertyType = _.util.type(property);

					if (propertyType === 'Object' && !visited[objId(property)]) {
						visited[objId(property)] = true;
						DFS(property, callback, null, visited);
					}
					else if (propertyType === 'Array' && !visited[objId(property)]) {
						visited[objId(property)] = true;
						DFS(property, callback, i, visited);
					}
				}
			}
		}
	},
	plugins: {},

	highlightAll: function(async, callback) {
		_.highlightAllUnder(document, async, callback);
	},

	highlightAllUnder: function(container, async, callback) {
		var env = {
			callback: callback,
			selector: 'code[class*="language-"], [class*="language-"] code, code[class*="lang-"], [class*="lang-"] code'
		};

		_.hooks.run('before-highlightall', env);

		var elements = container.querySelectorAll(env.selector);

		for (var i=0, element; element = elements[i++];) {
			_.highlightElement(element, async === true, env.callback);
		}
	},

	highlightElement: function(element, async, callback) {
		// Find language
		var language = getLanguage(element);
		var grammar = _.languages[language];

		// Set language on the element, if not present
		element.className = element.className.replace(lang, '').replace(/\s+/g, ' ') + ' language-' + language;

		// Set language on the parent, for styling
		var parent = element.parentNode;
		if (parent && parent.nodeName.toLowerCase() === 'pre') {
			parent.className = parent.className.replace(lang, '').replace(/\s+/g, ' ') + ' language-' + language;
		}

		var code = element.textContent;

		var env = {
			element: element,
			language: language,
			grammar: grammar,
			code: code
		};

		function insertHighlightedCode(highlightedCode) {
			env.highlightedCode = highlightedCode;

			_.hooks.run('before-insert', env);

			env.element.innerHTML = env.highlightedCode;

			_.hooks.run('after-highlight', env);
			_.hooks.run('complete', env);
			callback && callback.call(env.element);
		}

		_.hooks.run('before-sanity-check', env);

		if (!env.code) {
			_.hooks.run('complete', env);
			callback && callback.call(env.element);
			return;
		}

		_.hooks.run('before-highlight', env);

		if (!env.grammar) {
			insertHighlightedCode(_.util.encode(env.code));
			return;
		}

		if (async && _self.Worker) {
			var worker = new Worker(_.filename);

			worker.onmessage = function(evt) {
				insertHighlightedCode(evt.data);
			};

			worker.postMessage(JSON.stringify({
				language: env.language,
				code: env.code,
				immediateClose: true
			}));
		}
		else {
			insertHighlightedCode(_.highlight(env.code, env.grammar, env.language));
		}
	},

	highlight: function (text, grammar, language) {
		var env = {
			code: text,
			grammar: grammar,
			language: language
		};
		_.hooks.run('before-tokenize', env);
		env.tokens = _.tokenize(env.code, env.grammar);
		_.hooks.run('after-tokenize', env);
		return Token.stringify(_.util.encode(env.tokens), env.language);
	},

	matchGrammar: function (text, strarr, grammar, index, startPos, oneshot, target) {
		for (var token in grammar) {
			if (!grammar.hasOwnProperty(token) || !grammar[token]) {
				continue;
			}

			var patterns = grammar[token];
			patterns = Array.isArray(patterns) ? patterns : [patterns];

			for (var j = 0; j < patterns.length; ++j) {
				if (target && target == token + ',' + j) {
					return;
				}

				var pattern = patterns[j],
					inside = pattern.inside,
					lookbehind = !!pattern.lookbehind,
					greedy = !!pattern.greedy,
					lookbehindLength = 0,
					alias = pattern.alias;

				if (greedy && !pattern.pattern.global) {
					// Without the global flag, lastIndex won't work
					var flags = pattern.pattern.toString().match(/[imsuy]*$/)[0];
					pattern.pattern = RegExp(pattern.pattern.source, flags + 'g');
				}

				pattern = pattern.pattern || pattern;

				// Don’t cache length as it changes during the loop
				for (var i = index, pos = startPos; i < strarr.length; pos += strarr[i].length, ++i) {

					var str = strarr[i];

					if (strarr.length > text.length) {
						// Something went terribly wrong, ABORT, ABORT!
						return;
					}

					if (str instanceof Token) {
						continue;
					}

					if (greedy && i != strarr.length - 1) {
						pattern.lastIndex = pos;
						var match = pattern.exec(text);
						if (!match) {
							break;
						}

						var from = match.index + (lookbehind && match[1] ? match[1].length : 0),
						    to = match.index + match[0].length,
						    k = i,
						    p = pos;

						for (var len = strarr.length; k < len && (p < to || (!strarr[k].type && !strarr[k - 1].greedy)); ++k) {
							p += strarr[k].length;
							// Move the index i to the element in strarr that is closest to from
							if (from >= p) {
								++i;
								pos = p;
							}
						}

						// If strarr[i] is a Token, then the match starts inside another Token, which is invalid
						if (strarr[i] instanceof Token) {
							continue;
						}

						// Number of tokens to delete and replace with the new match
						delNum = k - i;
						str = text.slice(pos, p);
						match.index -= pos;
					} else {
						pattern.lastIndex = 0;

						var match = pattern.exec(str),
							delNum = 1;
					}

					if (!match) {
						if (oneshot) {
							break;
						}

						continue;
					}

					if(lookbehind) {
						lookbehindLength = match[1] ? match[1].length : 0;
					}

					var from = match.index + lookbehindLength,
					    match = match[0].slice(lookbehindLength),
					    to = from + match.length,
					    before = str.slice(0, from),
					    after = str.slice(to);

					var args = [i, delNum];

					if (before) {
						++i;
						pos += before.length;
						args.push(before);
					}

					var wrapped = new Token(token, inside? _.tokenize(match, inside) : match, alias, match, greedy);

					args.push(wrapped);

					if (after) {
						args.push(after);
					}

					Array.prototype.splice.apply(strarr, args);

					if (delNum != 1)
						_.matchGrammar(text, strarr, grammar, i, pos, true, token + ',' + j);

					if (oneshot)
						break;
				}
			}
		}
	},

	tokenize: function(text, grammar) {
		var strarr = [text];

		var rest = grammar.rest;

		if (rest) {
			for (var token in rest) {
				grammar[token] = rest[token];
			}

			delete grammar.rest;
		}

		_.matchGrammar(text, strarr, grammar, 0, 0, false);

		return strarr;
	},

	hooks: {
		all: {},

		add: function (name, callback) {
			var hooks = _.hooks.all;

			hooks[name] = hooks[name] || [];

			hooks[name].push(callback);
		},

		run: function (name, env) {
			var callbacks = _.hooks.all[name];

			if (!callbacks || !callbacks.length) {
				return;
			}

			for (var i=0, callback; callback = callbacks[i++];) {
				callback(env);
			}
		}
	},

	Token: Token
};

_self.Prism = _;

function Token(type, content, alias, matchedStr, greedy) {
	this.type = type;
	this.content = content;
	this.alias = alias;
	// Copy of the full string this token was created from
	this.length = (matchedStr || '').length|0;
	this.greedy = !!greedy;
}

Token.stringify = function(o, language) {
	if (typeof o == 'string') {
		return o;
	}

	if (Array.isArray(o)) {
		return o.map(function(element) {
			return Token.stringify(element, language);
		}).join('');
	}

	var env = {
		type: o.type,
		content: Token.stringify(o.content, language),
		tag: 'span',
		classes: ['token', o.type],
		attributes: {},
		language: language
	};

	if (o.alias) {
		var aliases = Array.isArray(o.alias) ? o.alias : [o.alias];
		Array.prototype.push.apply(env.classes, aliases);
	}

	_.hooks.run('wrap', env);

	var attributes = Object.keys(env.attributes).map(function(name) {
		return name + '="' + (env.attributes[name] || '').replace(/"/g, '&quot;') + '"';
	}).join(' ');

	return '<' + env.tag + ' class="' + env.classes.join(' ') + '"' + (attributes ? ' ' + attributes : '') + '>' + env.content + '</' + env.tag + '>';
};

if (!_self.document) {
	if (!_self.addEventListener) {
		// in Node.js
		return _;
	}

	if (!_.disableWorkerMessageHandler) {
		// In worker
		_self.addEventListener('message', function (evt) {
			var message = JSON.parse(evt.data),
				lang = message.language,
				code = message.code,
				immediateClose = message.immediateClose;

			_self.postMessage(_.highlight(code, _.languages[lang], lang));
			if (immediateClose) {
				_self.close();
			}
		}, false);
	}

	return _;
}

//Get current script and highlight
var script = _.util.currentScript();

if (script) {
	_.filename = script.src;

	if (script.hasAttribute('data-manual')) {
		_.manual = true;
	}
}

if (!_.manual) {
	function highlightAutomaticallyCallback() {
		if (!_.manual) {
			_.highlightAll();
		}
	}

	// If the document state is "loading", then we'll use DOMContentLoaded.
	// If the document state is "interactive" and the prism.js script is deferred, then we'll also use the
	// DOMContentLoaded event because there might be some plugins or languages which have also been deferred and they
	// might take longer one animation frame to execute which can create a race condition where only some plugins have
	// been loaded when Prism.highlightAll() is executed, depending on how fast resources are loaded.
	// See https://github.com/PrismJS/prism/issues/2102
	var readyState = document.readyState;
	if (readyState === 'loading' || readyState === 'interactive' && script && script.defer) {
		document.addEventListener('DOMContentLoaded', highlightAutomaticallyCallback);
	} else {
		if (window.requestAnimationFrame) {
			window.requestAnimationFrame(highlightAutomaticallyCallback);
		} else {
			window.setTimeout(highlightAutomaticallyCallback, 16);
		}
	}
}

return _;

})(_self);

if (typeof module !== 'undefined' && module.exports) {
	module.exports = Prism;
}

// hack for components to work correctly in node.js
if (typeof global !== 'undefined') {
	global.Prism = Prism;
}
;
Prism.languages.markup = {
	'comment': /<!--[\s\S]*?-->/,
	'prolog': /<\?[\s\S]+?\?>/,
	'doctype': {
		pattern: /<!DOCTYPE(?:[^>"'[\]]|"[^"]*"|'[^']*')+(?:\[(?:(?!<!--)[^"'\]]|"[^"]*"|'[^']*'|<!--[\s\S]*?-->)*\]\s*)?>/i,
		greedy: true
	},
	'cdata': /<!\[CDATA\[[\s\S]*?]]>/i,
	'tag': {
		pattern: /<\/?(?!\d)[^\s>\/=$<%]+(?:\s(?:\s*[^\s>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+(?=[\s>]))|(?=[\s/>])))+)?\s*\/?>/i,
		greedy: true,
		inside: {
			'tag': {
				pattern: /^<\/?[^\s>\/]+/i,
				inside: {
					'punctuation': /^<\/?/,
					'namespace': /^[^\s>\/:]+:/
				}
			},
			'attr-value': {
				pattern: /=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+)/i,
				inside: {
					'punctuation': [
						/^=/,
						{
							pattern: /^(\s*)["']|["']$/,
							lookbehind: true
						}
					]
				}
			},
			'punctuation': /\/?>/,
			'attr-name': {
				pattern: /[^\s>\/]+/,
				inside: {
					'namespace': /^[^\s>\/:]+:/
				}
			}

		}
	},
	'entity': /&#?[\da-z]{1,8};/i
};

Prism.languages.markup['tag'].inside['attr-value'].inside['entity'] =
	Prism.languages.markup['entity'];

// Plugin to make entity title show the real entity, idea by Roman Komarov
Prism.hooks.add('wrap', function(env) {

	if (env.type === 'entity') {
		env.attributes['title'] = env.content.replace(/&amp;/, '&');
	}
});

Object.defineProperty(Prism.languages.markup.tag, 'addInlined', {
	/**
	 * Adds an inlined language to markup.
	 *
	 * An example of an inlined language is CSS with `<style>` tags.
	 *
	 * @param {string} tagName The name of the tag that contains the inlined language. This name will be treated as
	 * case insensitive.
	 * @param {string} lang The language key.
	 * @example
	 * addInlined('style', 'css');
	 */
	value: function addInlined(tagName, lang) {
		var includedCdataInside = {};
		includedCdataInside['language-' + lang] = {
			pattern: /(^<!\[CDATA\[)[\s\S]+?(?=\]\]>$)/i,
			lookbehind: true,
			inside: Prism.languages[lang]
		};
		includedCdataInside['cdata'] = /^<!\[CDATA\[|\]\]>$/i;

		var inside = {
			'included-cdata': {
				pattern: /<!\[CDATA\[[\s\S]*?\]\]>/i,
				inside: includedCdataInside
			}
		};
		inside['language-' + lang] = {
			pattern: /[\s\S]+/,
			inside: Prism.languages[lang]
		};

		var def = {};
		def[tagName] = {
			pattern: RegExp(/(<__[\s\S]*?>)(?:<!\[CDATA\[[\s\S]*?\]\]>\s*|[\s\S])*?(?=<\/__>)/.source.replace(/__/g, tagName), 'i'),
			lookbehind: true,
			greedy: true,
			inside: inside
		};

		Prism.languages.insertBefore('markup', 'cdata', def);
	}
});

Prism.languages.xml = Prism.languages.extend('markup', {});
Prism.languages.html = Prism.languages.markup;
Prism.languages.mathml = Prism.languages.markup;
Prism.languages.svg = Prism.languages.markup;

(function (Prism) {

	var string = /("|')(?:\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/;

	Prism.languages.css = {
		'comment': /\/\*[\s\S]*?\*\//,
		'atrule': {
			pattern: /@[\w-]+[\s\S]*?(?:;|(?=\s*\{))/,
			inside: {
				'rule': /@[\w-]+/
				// See rest below
			}
		},
		'url': {
			pattern: RegExp('url\\((?:' + string.source + '|[^\n\r()]*)\\)', 'i'),
			inside: {
				'function': /^url/i,
				'punctuation': /^\(|\)$/
			}
		},
		'selector': RegExp('[^{}\\s](?:[^{};"\']|' + string.source + ')*?(?=\\s*\\{)'),
		'string': {
			pattern: string,
			greedy: true
		},
		'property': /[-_a-z\xA0-\uFFFF][-\w\xA0-\uFFFF]*(?=\s*:)/i,
		'important': /!important\b/i,
		'function': /[-a-z0-9]+(?=\()/i,
		'punctuation': /[(){};:,]/
	};

	Prism.languages.css['atrule'].inside.rest = Prism.languages.css;

	var markup = Prism.languages.markup;
	if (markup) {
		markup.tag.addInlined('style', 'css');

		Prism.languages.insertBefore('inside', 'attr-value', {
			'style-attr': {
				pattern: /\s*style=("|')(?:\\[\s\S]|(?!\1)[^\\])*\1/i,
				inside: {
					'attr-name': {
						pattern: /^\s*style/i,
						inside: markup.tag.inside
					},
					'punctuation': /^\s*=\s*['"]|['"]\s*$/,
					'attr-value': {
						pattern: /.+/i,
						inside: Prism.languages.css
					}
				},
				alias: 'language-css'
			}
		}, markup.tag);
	}

}(Prism));

Prism.languages.clike = {
	'comment': [
		{
			pattern: /(^|[^\\])\/\*[\s\S]*?(?:\*\/|$)/,
			lookbehind: true
		},
		{
			pattern: /(^|[^\\:])\/\/.*/,
			lookbehind: true,
			greedy: true
		}
	],
	'string': {
		pattern: /(["'])(?:\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/,
		greedy: true
	},
	'class-name': {
		pattern: /(\b(?:class|interface|extends|implements|trait|instanceof|new)\s+|\bcatch\s+\()[\w.\\]+/i,
		lookbehind: true,
		inside: {
			'punctuation': /[.\\]/
		}
	},
	'keyword': /\b(?:if|else|while|do|for|return|in|instanceof|function|new|try|throw|catch|finally|null|break|continue)\b/,
	'boolean': /\b(?:true|false)\b/,
	'function': /\w+(?=\()/,
	'number': /\b0x[\da-f]+\b|(?:\b\d+\.?\d*|\B\.\d+)(?:e[+-]?\d+)?/i,
	'operator': /[<>]=?|[!=]=?=?|--?|\+\+?|&&?|\|\|?|[?*/~^%]/,
	'punctuation': /[{}[\];(),.:]/
};

Prism.languages.javascript = Prism.languages.extend('clike', {
	'class-name': [
		Prism.languages.clike['class-name'],
		{
			pattern: /(^|[^$\w\xA0-\uFFFF])[_$A-Z\xA0-\uFFFF][$\w\xA0-\uFFFF]*(?=\.(?:prototype|constructor))/,
			lookbehind: true
		}
	],
	'keyword': [
		{
			pattern: /((?:^|})\s*)(?:catch|finally)\b/,
			lookbehind: true
		},
		{
			pattern: /(^|[^.])\b(?:as|async(?=\s*(?:function\b|\(|[$\w\xA0-\uFFFF]|$))|await|break|case|class|const|continue|debugger|default|delete|do|else|enum|export|extends|for|from|function|get|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|set|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)\b/,
			lookbehind: true
		},
	],
	'number': /\b(?:(?:0[xX](?:[\dA-Fa-f](?:_[\dA-Fa-f])?)+|0[bB](?:[01](?:_[01])?)+|0[oO](?:[0-7](?:_[0-7])?)+)n?|(?:\d(?:_\d)?)+n|NaN|Infinity)\b|(?:\b(?:\d(?:_\d)?)+\.?(?:\d(?:_\d)?)*|\B\.(?:\d(?:_\d)?)+)(?:[Ee][+-]?(?:\d(?:_\d)?)+)?/,
	// Allow for all non-ASCII characters (See http://stackoverflow.com/a/2008444)
	'function': /#?[_$a-zA-Z\xA0-\uFFFF][$\w\xA0-\uFFFF]*(?=\s*(?:\.\s*(?:apply|bind|call)\s*)?\()/,
	'operator': /--|\+\+|\*\*=?|=>|&&|\|\||[!=]==|<<=?|>>>?=?|[-+*/%&|^!=<>]=?|\.{3}|\?[.?]?|[~:]/
});

Prism.languages.javascript['class-name'][0].pattern = /(\b(?:class|interface|extends|implements|instanceof|new)\s+)[\w.\\]+/;

Prism.languages.insertBefore('javascript', 'keyword', {
	'regex': {
		pattern: /((?:^|[^$\w\xA0-\uFFFF."'\])\s])\s*)\/(?:\[(?:[^\]\\\r\n]|\\.)*]|\\.|[^/\\\[\r\n])+\/[gimyus]{0,6}(?=\s*(?:$|[\r\n,.;})\]]))/,
		lookbehind: true,
		greedy: true
	},
	// This must be declared before keyword because we use "function" inside the look-forward
	'function-variable': {
		pattern: /#?[_$a-zA-Z\xA0-\uFFFF][$\w\xA0-\uFFFF]*(?=\s*[=:]\s*(?:async\s*)?(?:\bfunction\b|(?:\((?:[^()]|\([^()]*\))*\)|[_$a-zA-Z\xA0-\uFFFF][$\w\xA0-\uFFFF]*)\s*=>))/,
		alias: 'function'
	},
	'parameter': [
		{
			pattern: /(function(?:\s+[_$A-Za-z\xA0-\uFFFF][$\w\xA0-\uFFFF]*)?\s*\(\s*)(?!\s)(?:[^()]|\([^()]*\))+?(?=\s*\))/,
			lookbehind: true,
			inside: Prism.languages.javascript
		},
		{
			pattern: /[_$a-z\xA0-\uFFFF][$\w\xA0-\uFFFF]*(?=\s*=>)/i,
			inside: Prism.languages.javascript
		},
		{
			pattern: /(\(\s*)(?!\s)(?:[^()]|\([^()]*\))+?(?=\s*\)\s*=>)/,
			lookbehind: true,
			inside: Prism.languages.javascript
		},
		{
			pattern: /((?:\b|\s|^)(?!(?:as|async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally|for|from|function|get|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|set|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)(?![$\w\xA0-\uFFFF]))(?:[_$A-Za-z\xA0-\uFFFF][$\w\xA0-\uFFFF]*\s*)\(\s*)(?!\s)(?:[^()]|\([^()]*\))+?(?=\s*\)\s*\{)/,
			lookbehind: true,
			inside: Prism.languages.javascript
		}
	],
	'constant': /\b[A-Z](?:[A-Z_]|\dx?)*\b/
});

Prism.languages.insertBefore('javascript', 'string', {
	'template-string': {
		pattern: /`(?:\\[\s\S]|\${(?:[^{}]|{(?:[^{}]|{[^}]*})*})+}|(?!\${)[^\\`])*`/,
		greedy: true,
		inside: {
			'template-punctuation': {
				pattern: /^`|`$/,
				alias: 'string'
			},
			'interpolation': {
				pattern: /((?:^|[^\\])(?:\\{2})*)\${(?:[^{}]|{(?:[^{}]|{[^}]*})*})+}/,
				lookbehind: true,
				inside: {
					'interpolation-punctuation': {
						pattern: /^\${|}$/,
						alias: 'punctuation'
					},
					rest: Prism.languages.javascript
				}
			},
			'string': /[\s\S]+/
		}
	}
});

if (Prism.languages.markup) {
	Prism.languages.markup.tag.addInlined('script', 'javascript');
}

Prism.languages.js = Prism.languages.javascript;

(function(Prism) {
	// $ set | grep '^[A-Z][^[:space:]]*=' | cut -d= -f1 | tr '\n' '|'
	// + LC_ALL, RANDOM, REPLY, SECONDS.
	// + make sure PS1..4 are here as they are not always set,
	// - some useless things.
	var envVars = '\\b(?:BASH|BASHOPTS|BASH_ALIASES|BASH_ARGC|BASH_ARGV|BASH_CMDS|BASH_COMPLETION_COMPAT_DIR|BASH_LINENO|BASH_REMATCH|BASH_SOURCE|BASH_VERSINFO|BASH_VERSION|COLORTERM|COLUMNS|COMP_WORDBREAKS|DBUS_SESSION_BUS_ADDRESS|DEFAULTS_PATH|DESKTOP_SESSION|DIRSTACK|DISPLAY|EUID|GDMSESSION|GDM_LANG|GNOME_KEYRING_CONTROL|GNOME_KEYRING_PID|GPG_AGENT_INFO|GROUPS|HISTCONTROL|HISTFILE|HISTFILESIZE|HISTSIZE|HOME|HOSTNAME|HOSTTYPE|IFS|INSTANCE|JOB|LANG|LANGUAGE|LC_ADDRESS|LC_ALL|LC_IDENTIFICATION|LC_MEASUREMENT|LC_MONETARY|LC_NAME|LC_NUMERIC|LC_PAPER|LC_TELEPHONE|LC_TIME|LESSCLOSE|LESSOPEN|LINES|LOGNAME|LS_COLORS|MACHTYPE|MAILCHECK|MANDATORY_PATH|NO_AT_BRIDGE|OLDPWD|OPTERR|OPTIND|ORBIT_SOCKETDIR|OSTYPE|PAPERSIZE|PATH|PIPESTATUS|PPID|PS1|PS2|PS3|PS4|PWD|RANDOM|REPLY|SECONDS|SELINUX_INIT|SESSION|SESSIONTYPE|SESSION_MANAGER|SHELL|SHELLOPTS|SHLVL|SSH_AUTH_SOCK|TERM|UID|UPSTART_EVENTS|UPSTART_INSTANCE|UPSTART_JOB|UPSTART_SESSION|USER|WINDOWID|XAUTHORITY|XDG_CONFIG_DIRS|XDG_CURRENT_DESKTOP|XDG_DATA_DIRS|XDG_GREETER_DATA_DIR|XDG_MENU_PREFIX|XDG_RUNTIME_DIR|XDG_SEAT|XDG_SEAT_PATH|XDG_SESSION_DESKTOP|XDG_SESSION_ID|XDG_SESSION_PATH|XDG_SESSION_TYPE|XDG_VTNR|XMODIFIERS)\\b';
	var insideString = {
		'environment': {
			pattern: RegExp("\\$" + envVars),
			alias: 'constant'
		},
		'variable': [
			// [0]: Arithmetic Environment
			{
				pattern: /\$?\(\([\s\S]+?\)\)/,
				greedy: true,
				inside: {
					// If there is a $ sign at the beginning highlight $(( and )) as variable
					'variable': [
						{
							pattern: /(^\$\(\([\s\S]+)\)\)/,
							lookbehind: true
						},
						/^\$\(\(/
					],
					'number': /\b0x[\dA-Fa-f]+\b|(?:\b\d+\.?\d*|\B\.\d+)(?:[Ee]-?\d+)?/,
					// Operators according to https://www.gnu.org/software/bash/manual/bashref.html#Shell-Arithmetic
					'operator': /--?|-=|\+\+?|\+=|!=?|~|\*\*?|\*=|\/=?|%=?|<<=?|>>=?|<=?|>=?|==?|&&?|&=|\^=?|\|\|?|\|=|\?|:/,
					// If there is no $ sign at the beginning highlight (( and )) as punctuation
					'punctuation': /\(\(?|\)\)?|,|;/
				}
			},
			// [1]: Command Substitution
			{
				pattern: /\$\((?:\([^)]+\)|[^()])+\)|`[^`]+`/,
				greedy: true,
				inside: {
					'variable': /^\$\(|^`|\)$|`$/
				}
			},
			// [2]: Brace expansion
			{
				pattern: /\$\{[^}]+\}/,
				greedy: true,
				inside: {
					'operator': /:[-=?+]?|[!\/]|##?|%%?|\^\^?|,,?/,
					'punctuation': /[\[\]]/,
					'environment': {
						pattern: RegExp("(\\{)" + envVars),
						lookbehind: true,
						alias: 'constant'
					}
				}
			},
			/\$(?:\w+|[#?*!@$])/
		],
		// Escape sequences from echo and printf's manuals, and escaped quotes.
		'entity': /\\(?:[abceEfnrtv\\"]|O?[0-7]{1,3}|x[0-9a-fA-F]{1,2}|u[0-9a-fA-F]{4}|U[0-9a-fA-F]{8})/
	};

	Prism.languages.bash = {
		'shebang': {
			pattern: /^#!\s*\/.*/,
			alias: 'important'
		},
		'comment': {
			pattern: /(^|[^"{\\$])#.*/,
			lookbehind: true
		},
		'function-name': [
			// a) function foo {
			// b) foo() {
			// c) function foo() {
			// but not “foo {”
			{
				// a) and c)
				pattern: /(\bfunction\s+)\w+(?=(?:\s*\(?:\s*\))?\s*\{)/,
				lookbehind: true,
				alias: 'function'
			},
			{
				// b)
				pattern: /\b\w+(?=\s*\(\s*\)\s*\{)/,
				alias: 'function'
			}
		],
		// Highlight variable names as variables in for and select beginnings.
		'for-or-select': {
			pattern: /(\b(?:for|select)\s+)\w+(?=\s+in\s)/,
			alias: 'variable',
			lookbehind: true
		},
		// Highlight variable names as variables in the left-hand part
		// of assignments (“=” and “+=”).
		'assign-left': {
			pattern: /(^|[\s;|&]|[<>]\()\w+(?=\+?=)/,
			inside: {
				'environment': {
					pattern: RegExp("(^|[\\s;|&]|[<>]\\()" + envVars),
					lookbehind: true,
					alias: 'constant'
				}
			},
			alias: 'variable',
			lookbehind: true
		},
		'string': [
			// Support for Here-documents https://en.wikipedia.org/wiki/Here_document
			{
				pattern: /((?:^|[^<])<<-?\s*)(\w+?)\s*(?:\r?\n|\r)(?:[\s\S])*?(?:\r?\n|\r)\2/,
				lookbehind: true,
				greedy: true,
				inside: insideString
			},
			// Here-document with quotes around the tag
			// → No expansion (so no “inside”).
			{
				pattern: /((?:^|[^<])<<-?\s*)(["'])(\w+)\2\s*(?:\r?\n|\r)(?:[\s\S])*?(?:\r?\n|\r)\3/,
				lookbehind: true,
				greedy: true
			},
			// “Normal” string
			{
				pattern: /(["'])(?:\\[\s\S]|\$\([^)]+\)|`[^`]+`|(?!\1)[^\\])*\1/,
				greedy: true,
				inside: insideString
			}
		],
		'environment': {
			pattern: RegExp("\\$?" + envVars),
			alias: 'constant'
		},
		'variable': insideString.variable,
		'function': {
			pattern: /(^|[\s;|&]|[<>]\()(?:add|apropos|apt|aptitude|apt-cache|apt-get|aspell|automysqlbackup|awk|basename|bash|bc|bconsole|bg|bzip2|cal|cat|cfdisk|chgrp|chkconfig|chmod|chown|chroot|cksum|clear|cmp|column|comm|cp|cron|crontab|csplit|curl|cut|date|dc|dd|ddrescue|debootstrap|df|diff|diff3|dig|dir|dircolors|dirname|dirs|dmesg|du|egrep|eject|env|ethtool|expand|expect|expr|fdformat|fdisk|fg|fgrep|file|find|fmt|fold|format|free|fsck|ftp|fuser|gawk|git|gparted|grep|groupadd|groupdel|groupmod|groups|grub-mkconfig|gzip|halt|head|hg|history|host|hostname|htop|iconv|id|ifconfig|ifdown|ifup|import|install|ip|jobs|join|kill|killall|less|link|ln|locate|logname|logrotate|look|lpc|lpr|lprint|lprintd|lprintq|lprm|ls|lsof|lynx|make|man|mc|mdadm|mkconfig|mkdir|mke2fs|mkfifo|mkfs|mkisofs|mknod|mkswap|mmv|more|most|mount|mtools|mtr|mutt|mv|nano|nc|netstat|nice|nl|nohup|notify-send|npm|nslookup|op|open|parted|passwd|paste|pathchk|ping|pkill|pnpm|popd|pr|printcap|printenv|ps|pushd|pv|quota|quotacheck|quotactl|ram|rar|rcp|reboot|remsync|rename|renice|rev|rm|rmdir|rpm|rsync|scp|screen|sdiff|sed|sendmail|seq|service|sftp|sh|shellcheck|shuf|shutdown|sleep|slocate|sort|split|ssh|stat|strace|su|sudo|sum|suspend|swapon|sync|tac|tail|tar|tee|time|timeout|top|touch|tr|traceroute|tsort|tty|umount|uname|unexpand|uniq|units|unrar|unshar|unzip|update-grub|uptime|useradd|userdel|usermod|users|uudecode|uuencode|v|vdir|vi|vim|virsh|vmstat|wait|watch|wc|wget|whereis|which|who|whoami|write|xargs|xdg-open|yarn|yes|zenity|zip|zsh|zypper)(?=$|[)\s;|&])/,
			lookbehind: true
		},
		'keyword': {
			pattern: /(^|[\s;|&]|[<>]\()(?:if|then|else|elif|fi|for|while|in|case|esac|function|select|do|done|until)(?=$|[)\s;|&])/,
			lookbehind: true
		},
		// https://www.gnu.org/software/bash/manual/html_node/Shell-Builtin-Commands.html
		'builtin': {
			pattern: /(^|[\s;|&]|[<>]\()(?:\.|:|break|cd|continue|eval|exec|exit|export|getopts|hash|pwd|readonly|return|shift|test|times|trap|umask|unset|alias|bind|builtin|caller|command|declare|echo|enable|help|let|local|logout|mapfile|printf|read|readarray|source|type|typeset|ulimit|unalias|set|shopt)(?=$|[)\s;|&])/,
			lookbehind: true,
			// Alias added to make those easier to distinguish from strings.
			alias: 'class-name'
		},
		'boolean': {
			pattern: /(^|[\s;|&]|[<>]\()(?:true|false)(?=$|[)\s;|&])/,
			lookbehind: true
		},
		'file-descriptor': {
			pattern: /\B&\d\b/,
			alias: 'important'
		},
		'operator': {
			// Lots of redirections here, but not just that.
			pattern: /\d?<>|>\||\+=|==?|!=?|=~|<<[<-]?|[&\d]?>>|\d?[<>]&?|&[>&]?|\|[&|]?|<=?|>=?/,
			inside: {
				'file-descriptor': {
					pattern: /^\d/,
					alias: 'important'
				}
			}
		},
		'punctuation': /\$?\(\(?|\)\)?|\.\.|[{}[\];\\]/,
		'number': {
			pattern: /(^|\s)(?:[1-9]\d*|0)(?:[.,]\d+)?\b/,
			lookbehind: true
		}
	};

	/* Patterns in command substitution. */
	var toBeCopied = [
		'comment',
		'function-name',
		'for-or-select',
		'assign-left',
		'string',
		'environment',
		'function',
		'keyword',
		'builtin',
		'boolean',
		'file-descriptor',
		'operator',
		'punctuation',
		'number'
	];
	var inside = insideString.variable[1].inside;
	for(var i = 0; i < toBeCopied.length; i++) {
		inside[toBeCopied[i]] = Prism.languages.bash[toBeCopied[i]];
	}

	Prism.languages.shell = Prism.languages.bash;
})(Prism);

(function (Prism) {

	Prism.languages.css.selector = {
		pattern: Prism.languages.css.selector,
		inside: {
			'pseudo-element': /:(?:after|before|first-letter|first-line|selection)|::[-\w]+/,
			'pseudo-class': /:[-\w]+/,
			'class': /\.[-:.\w]+/,
			'id': /#[-:.\w]+/,
			'attribute': {
				pattern: /\[(?:[^[\]"']|("|')(?:\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1)*\]/,
				greedy: true,
				inside: {
					'punctuation': /^\[|\]$/,
					'case-sensitivity': {
						pattern: /(\s)[si]$/i,
						lookbehind: true,
						alias: 'keyword'
					},
					'namespace': {
						pattern: /^(\s*)[-*\w\xA0-\uFFFF]*\|(?!=)/,
						lookbehind: true,
						inside: {
							'punctuation': /\|$/
						}
					},
					'attribute': {
						pattern: /^(\s*)[-\w\xA0-\uFFFF]+/,
						lookbehind: true
					},
					'value': [
						/("|')(?:\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/,
						{
							pattern: /(=\s*)[-\w\xA0-\uFFFF]+(?=\s*$)/,
							lookbehind: true
						}
					],
					'operator': /[|~*^$]?=/
				}
			},
			'n-th': [
				{
					pattern: /(\(\s*)[+-]?\d*[\dn](?:\s*[+-]\s*\d+)?(?=\s*\))/,
					lookbehind: true,
					inside: {
						'number': /[\dn]+/,
						'operator': /[+-]/
					}
				},
				{
					pattern: /(\(\s*)(?:even|odd)(?=\s*\))/i,
					lookbehind: true
				}
			],
			'punctuation': /[()]/
		}
	};

	Prism.languages.insertBefore('css', 'property', {
		'variable': {
			pattern: /(^|[^-\w\xA0-\uFFFF])--[-_a-z\xA0-\uFFFF][-\w\xA0-\uFFFF]*/i,
			lookbehind: true
		}
	});

	var unit = {
		pattern: /(\d)(?:%|[a-z]+)/,
		lookbehind: true
	};
	// 123 -123 .123 -.123 12.3 -12.3
	var number = {
		pattern: /(^|[^\w.-])-?\d*\.?\d+/,
		lookbehind: true
	};

	Prism.languages.insertBefore('css', 'function', {
		'operator': {
			pattern: /(\s)[+\-*\/](?=\s)/,
			lookbehind: true
		},
		// CAREFUL!
		// Previewers and Inline color use hexcode and color.
		'hexcode': {
			pattern: /\B#(?:[\da-f]{1,2}){3,4}\b/i,
			alias: 'color'
		},
		'color': [
			/\b(?:AliceBlue|AntiqueWhite|Aqua|Aquamarine|Azure|Beige|Bisque|Black|BlanchedAlmond|Blue|BlueViolet|Brown|BurlyWood|CadetBlue|Chartreuse|Chocolate|Coral|CornflowerBlue|Cornsilk|Crimson|Cyan|DarkBlue|DarkCyan|DarkGoldenRod|DarkGr[ae]y|DarkGreen|DarkKhaki|DarkMagenta|DarkOliveGreen|DarkOrange|DarkOrchid|DarkRed|DarkSalmon|DarkSeaGreen|DarkSlateBlue|DarkSlateGr[ae]y|DarkTurquoise|DarkViolet|DeepPink|DeepSkyBlue|DimGr[ae]y|DodgerBlue|FireBrick|FloralWhite|ForestGreen|Fuchsia|Gainsboro|GhostWhite|Gold|GoldenRod|Gr[ae]y|Green|GreenYellow|HoneyDew|HotPink|IndianRed|Indigo|Ivory|Khaki|Lavender|LavenderBlush|LawnGreen|LemonChiffon|LightBlue|LightCoral|LightCyan|LightGoldenRodYellow|LightGr[ae]y|LightGreen|LightPink|LightSalmon|LightSeaGreen|LightSkyBlue|LightSlateGr[ae]y|LightSteelBlue|LightYellow|Lime|LimeGreen|Linen|Magenta|Maroon|MediumAquaMarine|MediumBlue|MediumOrchid|MediumPurple|MediumSeaGreen|MediumSlateBlue|MediumSpringGreen|MediumTurquoise|MediumVioletRed|MidnightBlue|MintCream|MistyRose|Moccasin|NavajoWhite|Navy|OldLace|Olive|OliveDrab|Orange|OrangeRed|Orchid|PaleGoldenRod|PaleGreen|PaleTurquoise|PaleVioletRed|PapayaWhip|PeachPuff|Peru|Pink|Plum|PowderBlue|Purple|Red|RosyBrown|RoyalBlue|SaddleBrown|Salmon|SandyBrown|SeaGreen|SeaShell|Sienna|Silver|SkyBlue|SlateBlue|SlateGr[ae]y|Snow|SpringGreen|SteelBlue|Tan|Teal|Thistle|Tomato|Turquoise|Violet|Wheat|White|WhiteSmoke|Yellow|YellowGreen)\b/i,
			{
				pattern: /\b(?:rgb|hsl)\(\s*\d{1,3}\s*,\s*\d{1,3}%?\s*,\s*\d{1,3}%?\s*\)\B|\b(?:rgb|hsl)a\(\s*\d{1,3}\s*,\s*\d{1,3}%?\s*,\s*\d{1,3}%?\s*,\s*(?:0|0?\.\d+|1)\s*\)\B/i,
				inside: {
					'unit': unit,
					'number': number,
					'function': /[\w-]+(?=\()/,
					'punctuation': /[(),]/
				}
			}
		],
		'entity': /\\[\da-f]{1,8}/i,
		'unit': unit,
		'number': number
	});

})(Prism);

(function (Prism) {

	Prism.languages.diff = {
		'coord': [
			// Match all kinds of coord lines (prefixed by "+++", "---" or "***").
			/^(?:\*{3}|-{3}|\+{3}).*$/m,
			// Match "@@ ... @@" coord lines in unified diff.
			/^@@.*@@$/m,
			// Match coord lines in normal diff (starts with a number).
			/^\d+.*$/m
		]

		// deleted, inserted, unchanged, diff
	};

	/**
	 * A map from the name of a block to its line prefix.
	 *
	 * @type {Object<string, string>}
	 */
	var PREFIXES = {
		'deleted-sign': '-',
		'deleted-arrow': '<',
		'inserted-sign': '+',
		'inserted-arrow': '>',
		'unchanged': ' ',
		'diff': '!',
	};

	// add a token for each prefix
	Object.keys(PREFIXES).forEach(function (name) {
		var prefix = PREFIXES[name];

		var alias = [];
		if (!/^\w+$/.test(name)) { // "deleted-sign" -> "deleted"
			alias.push(/\w+/.exec(name)[0]);
		}
		if (name === "diff") {
			alias.push("bold");
		}

		Prism.languages.diff[name] = {
			// pattern: /^(?:[_].*(?:\r\n?|\n|(?![\s\S])))+/m
			pattern: RegExp('^(?:[' + prefix + '].*(?:\r\n?|\n|(?![\\s\\S])))+', 'm'),
			alias: alias
		};
	});

	// make prefixes available to Diff plugin
	Object.defineProperty(Prism.languages.diff, 'PREFIXES', {
		value: PREFIXES
	});

}(Prism));

(function (Prism) {

	/**
	 * Returns the placeholder for the given language id and index.
	 *
	 * @param {string} language
	 * @param {string|number} index
	 * @returns {string}
	 */
	function getPlaceholder(language, index) {
		return '___' + language.toUpperCase() + index + '___';
	}

	Object.defineProperties(Prism.languages['markup-templating'] = {}, {
		buildPlaceholders: {
			/**
			 * Tokenize all inline templating expressions matching `placeholderPattern`.
			 *
			 * If `replaceFilter` is provided, only matches of `placeholderPattern` for which `replaceFilter` returns
			 * `true` will be replaced.
			 *
			 * @param {object} env The environment of the `before-tokenize` hook.
			 * @param {string} language The language id.
			 * @param {RegExp} placeholderPattern The matches of this pattern will be replaced by placeholders.
			 * @param {(match: string) => boolean} [replaceFilter]
			 */
			value: function (env, language, placeholderPattern, replaceFilter) {
				if (env.language !== language) {
					return;
				}

				var tokenStack = env.tokenStack = [];

				env.code = env.code.replace(placeholderPattern, function (match) {
					if (typeof replaceFilter === 'function' && !replaceFilter(match)) {
						return match;
					}
					var i = tokenStack.length;
					var placeholder;

					// Check for existing strings
					while (env.code.indexOf(placeholder = getPlaceholder(language, i)) !== -1)
						++i;

					// Create a sparse array
					tokenStack[i] = match;

					return placeholder;
				});

				// Switch the grammar to markup
				env.grammar = Prism.languages.markup;
			}
		},
		tokenizePlaceholders: {
			/**
			 * Replace placeholders with proper tokens after tokenizing.
			 *
			 * @param {object} env The environment of the `after-tokenize` hook.
			 * @param {string} language The language id.
			 */
			value: function (env, language) {
				if (env.language !== language || !env.tokenStack) {
					return;
				}

				// Switch the grammar back
				env.grammar = Prism.languages[language];

				var j = 0;
				var keys = Object.keys(env.tokenStack);

				function walkTokens(tokens) {
					for (var i = 0; i < tokens.length; i++) {
						// all placeholders are replaced already
						if (j >= keys.length) {
							break;
						}

						var token = tokens[i];
						if (typeof token === 'string' || (token.content && typeof token.content === 'string')) {
							var k = keys[j];
							var t = env.tokenStack[k];
							var s = typeof token === 'string' ? token : token.content;
							var placeholder = getPlaceholder(language, k);

							var index = s.indexOf(placeholder);
							if (index > -1) {
								++j;

								var before = s.substring(0, index);
								var middle = new Prism.Token(language, Prism.tokenize(t, env.grammar), 'language-' + language, t);
								var after = s.substring(index + placeholder.length);

								var replacement = [];
								if (before) {
									replacement.push.apply(replacement, walkTokens([before]));
								}
								replacement.push(middle);
								if (after) {
									replacement.push.apply(replacement, walkTokens([after]));
								}

								if (typeof token === 'string') {
									tokens.splice.apply(tokens, [i, 1].concat(replacement));
								} else {
									token.content = replacement;
								}
							}
						} else if (token.content /* && typeof token.content !== 'string' */) {
							walkTokens(token.content);
						}
					}

					return tokens;
				}

				walkTokens(env.tokens);
			}
		}
	});

}(Prism));

Prism.languages.docker = {
	'keyword': {
		pattern: /(^\s*)(?:ADD|ARG|CMD|COPY|ENTRYPOINT|ENV|EXPOSE|FROM|HEALTHCHECK|LABEL|MAINTAINER|ONBUILD|RUN|SHELL|STOPSIGNAL|USER|VOLUME|WORKDIR)(?=\s)/mi,
		lookbehind: true
	},
	'string': /("|')(?:(?!\1)[^\\\r\n]|\\(?:\r\n|[\s\S]))*\1/,
	'comment': /#.*/,
	'punctuation': /---|\.\.\.|[:[\]{}\-,|>?]/
};

Prism.languages.dockerfile = Prism.languages.docker;

Prism.languages.git = {
	/*
	 * A simple one line comment like in a git status command
	 * For instance:
	 * $ git status
	 * # On branch infinite-scroll
	 * # Your branch and 'origin/sharedBranches/frontendTeam/infinite-scroll' have diverged,
	 * # and have 1 and 2 different commits each, respectively.
	 * nothing to commit (working directory clean)
	 */
	'comment': /^#.*/m,

	/*
	 * Regexp to match the changed lines in a git diff output. Check the example below.
	 */
	'deleted': /^[-–].*/m,
	'inserted': /^\+.*/m,

	/*
	 * a string (double and simple quote)
	 */
	'string': /("|')(?:\\.|(?!\1)[^\\\r\n])*\1/m,

	/*
	 * a git command. It starts with a random prompt finishing by a $, then "git" then some other parameters
	 * For instance:
	 * $ git add file.txt
	 */
	'command': {
		pattern: /^.*\$ git .*$/m,
		inside: {
			/*
			 * A git command can contain a parameter starting by a single or a double dash followed by a string
			 * For instance:
			 * $ git diff --cached
			 * $ git log -p
			 */
			'parameter': /\s--?\w+/m
		}
	},

	/*
	 * Coordinates displayed in a git diff command
	 * For instance:
	 * $ git diff
	 * diff --git file.txt file.txt
	 * index 6214953..1d54a52 100644
	 * --- file.txt
	 * +++ file.txt
	 * @@ -1 +1,2 @@
	 * -Here's my tetx file
	 * +Here's my text file
	 * +And this is the second line
	 */
	'coord': /^@@.*@@$/m,

	/*
	 * Match a "commit [SHA1]" line in a git log output.
	 * For instance:
	 * $ git log
	 * commit a11a14ef7e26f2ca62d4b35eac455ce636d0dc09
	 * Author: lgiraudel
	 * Date:   Mon Feb 17 11:18:34 2014 +0100
	 *
	 *     Add of a new line
	 */
	'commit_sha1': /^commit \w{40}$/m
};

Prism.languages.go = Prism.languages.extend('clike', {
	'keyword': /\b(?:break|case|chan|const|continue|default|defer|else|fallthrough|for|func|go(?:to)?|if|import|interface|map|package|range|return|select|struct|switch|type|var)\b/,
	'builtin': /\b(?:bool|byte|complex(?:64|128)|error|float(?:32|64)|rune|string|u?int(?:8|16|32|64)?|uintptr|append|cap|close|complex|copy|delete|imag|len|make|new|panic|print(?:ln)?|real|recover)\b/,
	'boolean': /\b(?:_|iota|nil|true|false)\b/,
	'operator': /[*\/%^!=]=?|\+[=+]?|-[=-]?|\|[=|]?|&(?:=|&|\^=?)?|>(?:>=?|=)?|<(?:<=?|=|-)?|:=|\.\.\./,
	'number': /(?:\b0x[a-f\d]+|(?:\b\d+\.?\d*|\B\.\d+)(?:e[-+]?\d+)?)i?/i,
	'string': {
		pattern: /(["'`])(?:\\[\s\S]|(?!\1)[^\\])*\1/,
		greedy: true
	}
});
delete Prism.languages.go['class-name'];

(function (Prism) {
	Prism.languages.http = {
		'request-line': {
			pattern: /^(?:POST|GET|PUT|DELETE|OPTIONS|PATCH|TRACE|CONNECT)\s(?:https?:\/\/|\/)\S+\sHTTP\/[0-9.]+/m,
			inside: {
				// HTTP Verb
				'property': /^(?:POST|GET|PUT|DELETE|OPTIONS|PATCH|TRACE|CONNECT)\b/,
				// Path or query argument
				'attr-name': /:\w+/
			}
		},
		'response-status': {
			pattern: /^HTTP\/1.[01] \d+.*/m,
			inside: {
				// Status, e.g. 200 OK
				'property': {
					pattern: /(^HTTP\/1.[01] )\d+.*/i,
					lookbehind: true
				}
			}
		},
		// HTTP header name
		'header-name': {
			pattern: /^[\w-]+:(?=.)/m,
			alias: 'keyword'
		}
	};

	// Create a mapping of Content-Type headers to language definitions
	var langs = Prism.languages;
	var httpLanguages = {
		'application/javascript': langs.javascript,
		'application/json': langs.json || langs.javascript,
		'application/xml': langs.xml,
		'text/xml': langs.xml,
		'text/html': langs.html,
		'text/css': langs.css
	};

	// Declare which types can also be suffixes
	var suffixTypes = {
		'application/json': true,
		'application/xml': true
	};

	/**
	 * Returns a pattern for the given content type which matches it and any type which has it as a suffix.
	 *
	 * @param {string} contentType
	 * @returns {string}
	 */
	function getSuffixPattern(contentType) {
		var suffix = contentType.replace(/^[a-z]+\//, '');
		var suffixPattern = '\\w+/(?:[\\w.-]+\\+)+' + suffix + '(?![+\\w.-])';
		return '(?:' + contentType + '|' + suffixPattern + ')';
	}

	// Insert each content type parser that has its associated language
	// currently loaded.
	var options;
	for (var contentType in httpLanguages) {
		if (httpLanguages[contentType]) {
			options = options || {};

			var pattern = suffixTypes[contentType] ? getSuffixPattern(contentType) : contentType;
			options[contentType.replace(/\//g, '-')] = {
				pattern: RegExp('(content-type:\\s*' + pattern + '[\\s\\S]*?)(?:\\r?\\n|\\r){2}[\\s\\S]*', 'i'),
				lookbehind: true,
				inside: httpLanguages[contentType]
			};
		}
	}
	if (options) {
		Prism.languages.insertBefore('http', 'header-name', options);
	}

}(Prism));

(function (Prism) {

	var keywords = /\b(?:abstract|assert|boolean|break|byte|case|catch|char|class|const|continue|default|do|double|else|enum|exports|extends|final|finally|float|for|goto|if|implements|import|instanceof|int|interface|long|module|native|new|null|open|opens|package|private|protected|provides|public|requires|return|short|static|strictfp|super|switch|synchronized|this|throw|throws|to|transient|transitive|try|uses|var|void|volatile|while|with|yield)\b/;

	// based on the java naming conventions
	var className = /\b[A-Z](?:\w*[a-z]\w*)?\b/;

	Prism.languages.java = Prism.languages.extend('clike', {
		'class-name': [
			className,

			// variables and parameters
			// this to support class names (or generic parameters) which do not contain a lower case letter (also works for methods)
			/\b[A-Z]\w*(?=\s+\w+\s*[;,=())])/
		],
		'keyword': keywords,
		'function': [
			Prism.languages.clike.function,
			{
				pattern: /(\:\:)[a-z_]\w*/,
				lookbehind: true
			}
		],
		'number': /\b0b[01][01_]*L?\b|\b0x[\da-f_]*\.?[\da-f_p+-]+\b|(?:\b\d[\d_]*\.?[\d_]*|\B\.\d[\d_]*)(?:e[+-]?\d[\d_]*)?[dfl]?/i,
		'operator': {
			pattern: /(^|[^.])(?:<<=?|>>>?=?|->|--|\+\+|&&|\|\||::|[?:~]|[-+*/%&|^!=<>]=?)/m,
			lookbehind: true
		}
	});

	Prism.languages.insertBefore('java', 'string', {
		'triple-quoted-string': {
			// http://openjdk.java.net/jeps/355#Description
			pattern: /"""[ \t]*[\r\n](?:(?:"|"")?(?:\\.|[^"\\]))*"""/,
			greedy: true,
			alias: 'string'
		}
	});

	Prism.languages.insertBefore('java', 'class-name', {
		'annotation': {
			alias: 'punctuation',
			pattern: /(^|[^.])@\w+/,
			lookbehind: true
		},
		'namespace': {
			pattern: /(\b(?:exports|import(?:\s+static)?|module|open|opens|package|provides|requires|to|transitive|uses|with)\s+)[a-z]\w*(?:\.[a-z]\w*)+/,
			lookbehind: true,
			inside: {
				'punctuation': /\./,
			}
		},
		'generics': {
			pattern: /<(?:[\w\s,.&?]|<(?:[\w\s,.&?]|<(?:[\w\s,.&?]|<[\w\s,.&?]*>)*>)*>)*>/,
			inside: {
				'class-name': className,
				'keyword': keywords,
				'punctuation': /[<>(),.:]/,
				'operator': /[?&|]/
			}
		}
	});
}(Prism));

/**
 * Original by Aaron Harun: http://aahacreative.com/2012/07/31/php-syntax-highlighting-prism/
 * Modified by Miles Johnson: http://milesj.me
 *
 * Supports the following:
 * 		- Extends clike syntax
 * 		- Support for PHP 5.3+ (namespaces, traits, generators, etc)
 * 		- Smarter constant and function matching
 *
 * Adds the following new token classes:
 * 		constant, delimiter, variable, function, package
 */
(function (Prism) {
	Prism.languages.php = Prism.languages.extend('clike', {
		'keyword': /\b(?:__halt_compiler|abstract|and|array|as|break|callable|case|catch|class|clone|const|continue|declare|default|die|do|echo|else|elseif|empty|enddeclare|endfor|endforeach|endif|endswitch|endwhile|eval|exit|extends|final|finally|for|foreach|function|global|goto|if|implements|include|include_once|instanceof|insteadof|interface|isset|list|namespace|new|or|parent|print|private|protected|public|require|require_once|return|static|switch|throw|trait|try|unset|use|var|while|xor|yield)\b/i,
		'boolean': {
			pattern: /\b(?:false|true)\b/i,
			alias: 'constant'
		},
		'constant': [
			/\b[A-Z_][A-Z0-9_]*\b/,
			/\b(?:null)\b/i,
		],
		'comment': {
			pattern: /(^|[^\\])(?:\/\*[\s\S]*?\*\/|\/\/.*)/,
			lookbehind: true
		}
	});

	Prism.languages.insertBefore('php', 'string', {
		'shell-comment': {
			pattern: /(^|[^\\])#.*/,
			lookbehind: true,
			alias: 'comment'
		}
	});

	Prism.languages.insertBefore('php', 'comment', {
		'delimiter': {
			pattern: /\?>$|^<\?(?:php(?=\s)|=)?/i,
			alias: 'important'
		}
	});

	Prism.languages.insertBefore('php', 'keyword', {
		'variable': /\$+(?:\w+\b|(?={))/i,
		'package': {
			pattern: /(\\|namespace\s+|use\s+)[\w\\]+/,
			lookbehind: true,
			inside: {
				punctuation: /\\/
			}
		}
	});

	// Must be defined after the function pattern
	Prism.languages.insertBefore('php', 'operator', {
		'property': {
			pattern: /(->)[\w]+/,
			lookbehind: true
		}
	});

	var string_interpolation = {
		pattern: /{\$(?:{(?:{[^{}]+}|[^{}]+)}|[^{}])+}|(^|[^\\{])\$+(?:\w+(?:\[.+?]|->\w+)*)/,
		lookbehind: true,
		inside: Prism.languages.php
	};

	Prism.languages.insertBefore('php', 'string', {
		'nowdoc-string': {
			pattern: /<<<'([^']+)'(?:\r\n?|\n)(?:.*(?:\r\n?|\n))*?\1;/,
			greedy: true,
			alias: 'string',
			inside: {
				'delimiter': {
					pattern: /^<<<'[^']+'|[a-z_]\w*;$/i,
					alias: 'symbol',
					inside: {
						'punctuation': /^<<<'?|[';]$/
					}
				}
			}
		},
		'heredoc-string': {
			pattern: /<<<(?:"([^"]+)"(?:\r\n?|\n)(?:.*(?:\r\n?|\n))*?\1;|([a-z_]\w*)(?:\r\n?|\n)(?:.*(?:\r\n?|\n))*?\2;)/i,
			greedy: true,
			alias: 'string',
			inside: {
				'delimiter': {
					pattern: /^<<<(?:"[^"]+"|[a-z_]\w*)|[a-z_]\w*;$/i,
					alias: 'symbol',
					inside: {
						'punctuation': /^<<<"?|[";]$/
					}
				},
				'interpolation': string_interpolation // See below
			}
		},
		'single-quoted-string': {
			pattern: /'(?:\\[\s\S]|[^\\'])*'/,
			greedy: true,
			alias: 'string'
		},
		'double-quoted-string': {
			pattern: /"(?:\\[\s\S]|[^\\"])*"/,
			greedy: true,
			alias: 'string',
			inside: {
				'interpolation': string_interpolation // See below
			}
		}
	});
	// The different types of PHP strings "replace" the C-like standard string
	delete Prism.languages.php['string'];

	Prism.hooks.add('before-tokenize', function(env) {
		if (!/<\?/.test(env.code)) {
			return;
		}

		var phpPattern = /<\?(?:[^"'/#]|\/(?![*/])|("|')(?:\\[\s\S]|(?!\1)[^\\])*\1|(?:\/\/|#)(?:[^?\n\r]|\?(?!>))*|\/\*[\s\S]*?(?:\*\/|$))*?(?:\?>|$)/ig;
		Prism.languages['markup-templating'].buildPlaceholders(env, 'php', phpPattern);
	});

	Prism.hooks.add('after-tokenize', function(env) {
		Prism.languages['markup-templating'].tokenizePlaceholders(env, 'php');
	});

}(Prism));

(function (Prism) {

	var javaDocLike = Prism.languages.javadoclike = {
		'parameter': {
			pattern: /(^\s*(?:\/{3}|\*|\/\*\*)\s*@(?:param|arg|arguments)\s+)\w+/m,
			lookbehind: true
		},
		'keyword': {
			// keywords are the first word in a line preceded be an `@` or surrounded by curly braces.
			// @word, {@word}
			pattern: /(^\s*(?:\/{3}|\*|\/\*\*)\s*|\{)@[a-z][a-zA-Z-]+\b/m,
			lookbehind: true
		},
		'punctuation': /[{}]/
	};


	/**
	 * Adds doc comment support to the given language and calls a given callback on each doc comment pattern.
	 *
	 * @param {string} lang the language add doc comment support to.
	 * @param {(pattern: {inside: {rest: undefined}}) => void} callback the function called with each doc comment pattern as argument.
	 */
	function docCommentSupport(lang, callback) {
		var tokenName = 'doc-comment';

		var grammar = Prism.languages[lang];
		if (!grammar) {
			return;
		}
		var token = grammar[tokenName];

		if (!token) {
			// add doc comment: /** */
			var definition = {};
			definition[tokenName] = {
				pattern: /(^|[^\\])\/\*\*[^/][\s\S]*?(?:\*\/|$)/,
				lookbehind: true,
				alias: 'comment'
			};

			grammar = Prism.languages.insertBefore(lang, 'comment', definition);
			token = grammar[tokenName];
		}

		if (token instanceof RegExp) { // convert regex to object
			token = grammar[tokenName] = { pattern: token };
		}

		if (Array.isArray(token)) {
			for (var i = 0, l = token.length; i < l; i++) {
				if (token[i] instanceof RegExp) {
					token[i] = { pattern: token[i] };
				}
				callback(token[i]);
			}
		} else {
			callback(token);
		}
	}

	/**
	 * Adds doc-comment support to the given languages for the given documentation language.
	 *
	 * @param {string[]|string} languages
	 * @param {Object} docLanguage
	 */
	function addSupport(languages, docLanguage) {
		if (typeof languages === 'string') {
			languages = [languages];
		}

		languages.forEach(function (lang) {
			docCommentSupport(lang, function (pattern) {
				if (!pattern.inside) {
					pattern.inside = {};
				}
				pattern.inside.rest = docLanguage;
			});
		});
	}

	Object.defineProperty(javaDocLike, 'addSupport', { value: addSupport });

	javaDocLike.addSupport(['java', 'javascript', 'php'], javaDocLike);

}(Prism));

(function (Prism) {

	// Allow only one line break
	var inner = /(?:\\.|[^\\\n\r]|(?:\r?\n|\r)(?!\r?\n|\r))/.source;

	/**
	 * This function is intended for the creation of the bold or italic pattern.
	 *
	 * This also adds a lookbehind group to the given pattern to ensure that the pattern is not backslash-escaped.
	 *
	 * _Note:_ Keep in mind that this adds a capturing group.
	 *
	 * @param {string} pattern
	 * @param {boolean} starAlternative Whether to also add an alternative where all `_`s are replaced with `*`s.
	 * @returns {RegExp}
	 */
	function createInline(pattern, starAlternative) {
		pattern = pattern.replace(/<inner>/g, inner);
		if (starAlternative) {
			pattern = pattern + '|' + pattern.replace(/_/g, '\\*');
		}
		return RegExp(/((?:^|[^\\])(?:\\{2})*)/.source + '(?:' + pattern + ')');
	}


	var tableCell = /(?:\\.|``.+?``|`[^`\r\n]+`|[^\\|\r\n`])+/.source;
	var tableRow = /\|?__(?:\|__)+\|?(?:(?:\r?\n|\r)|$)/.source.replace(/__/g, tableCell);
	var tableLine = /\|?[ \t]*:?-{3,}:?[ \t]*(?:\|[ \t]*:?-{3,}:?[ \t]*)+\|?(?:\r?\n|\r)/.source;


	Prism.languages.markdown = Prism.languages.extend('markup', {});
	Prism.languages.insertBefore('markdown', 'prolog', {
		'blockquote': {
			// > ...
			pattern: /^>(?:[\t ]*>)*/m,
			alias: 'punctuation'
		},
		'table': {
			pattern: RegExp('^' + tableRow + tableLine + '(?:' + tableRow + ')*', 'm'),
			inside: {
				'table-data-rows': {
					pattern: RegExp('^(' + tableRow + tableLine + ')(?:' + tableRow + ')*$'),
					lookbehind: true,
					inside: {
						'table-data': {
							pattern: RegExp(tableCell),
							inside: Prism.languages.markdown
						},
						'punctuation': /\|/
					}
				},
				'table-line': {
					pattern: RegExp('^(' + tableRow + ')' + tableLine + '$'),
					lookbehind: true,
					inside: {
						'punctuation': /\||:?-{3,}:?/
					}
				},
				'table-header-row': {
					pattern: RegExp('^' + tableRow + '$'),
					inside: {
						'table-header': {
							pattern: RegExp(tableCell),
							alias: 'important',
							inside: Prism.languages.markdown
						},
						'punctuation': /\|/
					}
				}
			}
		},
		'code': [
			{
				// Prefixed by 4 spaces or 1 tab and preceded by an empty line
				pattern: /(^[ \t]*(?:\r?\n|\r))(?: {4}|\t).+(?:(?:\r?\n|\r)(?: {4}|\t).+)*/m,
				lookbehind: true,
				alias: 'keyword'
			},
			{
				// `code`
				// ``code``
				pattern: /``.+?``|`[^`\r\n]+`/,
				alias: 'keyword'
			},
			{
				// ```optional language
				// code block
				// ```
				pattern: /^```[\s\S]*?^```$/m,
				greedy: true,
				inside: {
					'code-block': {
						pattern: /^(```.*(?:\r?\n|\r))[\s\S]+?(?=(?:\r?\n|\r)^```$)/m,
						lookbehind: true
					},
					'code-language': {
						pattern: /^(```).+/,
						lookbehind: true
					},
					'punctuation': /```/
				}
			}
		],
		'title': [
			{
				// title 1
				// =======

				// title 2
				// -------
				pattern: /\S.*(?:\r?\n|\r)(?:==+|--+)(?=[ \t]*$)/m,
				alias: 'important',
				inside: {
					punctuation: /==+$|--+$/
				}
			},
			{
				// # title 1
				// ###### title 6
				pattern: /(^\s*)#+.+/m,
				lookbehind: true,
				alias: 'important',
				inside: {
					punctuation: /^#+|#+$/
				}
			}
		],
		'hr': {
			// ***
			// ---
			// * * *
			// -----------
			pattern: /(^\s*)([*-])(?:[\t ]*\2){2,}(?=\s*$)/m,
			lookbehind: true,
			alias: 'punctuation'
		},
		'list': {
			// * item
			// + item
			// - item
			// 1. item
			pattern: /(^\s*)(?:[*+-]|\d+\.)(?=[\t ].)/m,
			lookbehind: true,
			alias: 'punctuation'
		},
		'url-reference': {
			// [id]: http://example.com "Optional title"
			// [id]: http://example.com 'Optional title'
			// [id]: http://example.com (Optional title)
			// [id]: <http://example.com> "Optional title"
			pattern: /!?\[[^\]]+\]:[\t ]+(?:\S+|<(?:\\.|[^>\\])+>)(?:[\t ]+(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\((?:\\.|[^)\\])*\)))?/,
			inside: {
				'variable': {
					pattern: /^(!?\[)[^\]]+/,
					lookbehind: true
				},
				'string': /(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\((?:\\.|[^)\\])*\))$/,
				'punctuation': /^[\[\]!:]|[<>]/
			},
			alias: 'url'
		},
		'bold': {
			// **strong**
			// __strong__

			// allow one nested instance of italic text using the same delimiter
			pattern: createInline(/__(?:(?!_)<inner>|_(?:(?!_)<inner>)+_)+__/.source, true),
			lookbehind: true,
			greedy: true,
			inside: {
				'content': {
					pattern: /(^..)[\s\S]+(?=..$)/,
					lookbehind: true,
					inside: {} // see below
				},
				'punctuation': /\*\*|__/
			}
		},
		'italic': {
			// *em*
			// _em_

			// allow one nested instance of bold text using the same delimiter
			pattern: createInline(/_(?:(?!_)<inner>|__(?:(?!_)<inner>)+__)+_/.source, true),
			lookbehind: true,
			greedy: true,
			inside: {
				'content': {
					pattern: /(^.)[\s\S]+(?=.$)/,
					lookbehind: true,
					inside: {} // see below
				},
				'punctuation': /[*_]/
			}
		},
		'strike': {
			// ~~strike through~~
			// ~strike~
			pattern: createInline(/(~~?)(?:(?!~)<inner>)+?\2/.source, false),
			lookbehind: true,
			greedy: true,
			inside: {
				'content': {
					pattern: /(^~~?)[\s\S]+(?=\1$)/,
					lookbehind: true,
					inside: {} // see below
				},
				'punctuation': /~~?/
			}
		},
		'url': {
			// [example](http://example.com "Optional title")
			// [example][id]
			// [example] [id]
			pattern: createInline(/!?\[(?:(?!\])<inner>)+\](?:\([^\s)]+(?:[\t ]+"(?:\\.|[^"\\])*")?\)| ?\[(?:(?!\])<inner>)+\])/.source, false),
			lookbehind: true,
			greedy: true,
			inside: {
				'variable': {
					pattern: /(\[)[^\]]+(?=\]$)/,
					lookbehind: true
				},
				'content': {
					pattern: /(^!?\[)[^\]]+(?=\])/,
					lookbehind: true,
					inside: {} // see below
				},
				'string': {
					pattern: /"(?:\\.|[^"\\])*"(?=\)$)/
				}
			}
		}
	});

	['url', 'bold', 'italic', 'strike'].forEach(function (token) {
		['url', 'bold', 'italic', 'strike'].forEach(function (inside) {
			if (token !== inside) {
				Prism.languages.markdown[token].inside.content.inside[inside] = Prism.languages.markdown[inside];
			}
		});
	});

	Prism.hooks.add('after-tokenize', function (env) {
		if (env.language !== 'markdown' && env.language !== 'md') {
			return;
		}

		function walkTokens(tokens) {
			if (!tokens || typeof tokens === 'string') {
				return;
			}

			for (var i = 0, l = tokens.length; i < l; i++) {
				var token = tokens[i];

				if (token.type !== 'code') {
					walkTokens(token.content);
					continue;
				}

				/*
				 * Add the correct `language-xxxx` class to this code block. Keep in mind that the `code-language` token
				 * is optional. But the grammar is defined so that there is only one case we have to handle:
				 *
				 * token.content = [
				 *     <span class="punctuation">```</span>,
				 *     <span class="code-language">xxxx</span>,
				 *     '\n', // exactly one new lines (\r or \n or \r\n)
				 *     <span class="code-block">...</span>,
				 *     '\n', // exactly one new lines again
				 *     <span class="punctuation">```</span>
				 * ];
				 */

				var codeLang = token.content[1];
				var codeBlock = token.content[3];

				if (codeLang && codeBlock &&
					codeLang.type === 'code-language' && codeBlock.type === 'code-block' &&
					typeof codeLang.content === 'string') {

					// this might be a language that Prism does not support
					var alias = 'language-' + codeLang.content.trim().split(/\s+/)[0].toLowerCase();

					// add alias
					if (!codeBlock.alias) {
						codeBlock.alias = [alias];
					} else if (typeof codeBlock.alias === 'string') {
						codeBlock.alias = [codeBlock.alias, alias];
					} else {
						codeBlock.alias.push(alias);
					}
				}
			}
		}

		walkTokens(env.tokens);
	});

	Prism.hooks.add('wrap', function (env) {
		if (env.type !== 'code-block') {
			return;
		}

		var codeLang = '';
		for (var i = 0, l = env.classes.length; i < l; i++) {
			var cls = env.classes[i];
			var match = /language-(.+)/.exec(cls);
			if (match) {
				codeLang = match[1];
				break;
			}
		}

		var grammar = Prism.languages[codeLang];

		if (!grammar) {
			if (codeLang && codeLang !== 'none' && Prism.plugins.autoloader) {
				var id = 'md-' + new Date().valueOf() + '-' + Math.floor(Math.random() * 1e16);
				env.attributes['id'] = id;

				Prism.plugins.autoloader.loadLanguages(codeLang, function () {
					var ele = document.getElementById(id);
					if (ele) {
						ele.innerHTML = Prism.highlight(ele.textContent, Prism.languages[codeLang], codeLang);
					}
				});
			}
		} else {
			// reverse Prism.util.encode
			var code = env.content.replace(/&lt;/g, '<').replace(/&amp;/g, '&');

			env.content = Prism.highlight(code, grammar, codeLang);
		}
	});

	Prism.languages.md = Prism.languages.markdown;

}(Prism));

Prism.languages.json = {
	'property': {
		pattern: /"(?:\\.|[^\\"\r\n])*"(?=\s*:)/,
		greedy: true
	},
	'string': {
		pattern: /"(?:\\.|[^\\"\r\n])*"(?!\s*:)/,
		greedy: true
	},
	'comment': /\/\/.*|\/\*[\s\S]*?(?:\*\/|$)/,
	'number': /-?\d+\.?\d*(?:e[+-]?\d+)?/i,
	'punctuation': /[{}[\],]/,
	'operator': /:/,
	'boolean': /\b(?:true|false)\b/,
	'null': {
		pattern: /\bnull\b/,
		alias: 'keyword'
	}
};

(function (Prism) {

	var templateString = Prism.languages.javascript['template-string'];

	// see the pattern in prism-javascript.js
	var templateLiteralPattern = templateString.pattern.source;
	var interpolationObject = templateString.inside['interpolation'];
	var interpolationPunctuationObject = interpolationObject.inside['interpolation-punctuation'];
	var interpolationPattern = interpolationObject.pattern.source;


	/**
	 * Creates a new pattern to match a template string with a special tag.
	 *
	 * This will return `undefined` if there is no grammar with the given language id.
	 *
	 * @param {string} language The language id of the embedded language. E.g. `markdown`.
	 * @param {string} tag The regex pattern to match the tag.
	 * @returns {object | undefined}
	 * @example
	 * createTemplate('css', /\bcss/.source);
	 */
	function createTemplate(language, tag) {
		if (!Prism.languages[language]) {
			return undefined;
		}

		return {
			pattern: RegExp('((?:' + tag + ')\\s*)' + templateLiteralPattern),
			lookbehind: true,
			greedy: true,
			inside: {
				'template-punctuation': {
					pattern: /^`|`$/,
					alias: 'string'
				},
				'embedded-code': {
					pattern: /[\s\S]+/,
					alias: language
				}
			}
		};
	}


	Prism.languages.javascript['template-string'] = [
		// styled-jsx:
		//   css`a { color: #25F; }`
		// styled-components:
		//   styled.h1`color: red;`
		createTemplate('css', /\b(?:styled(?:\([^)]*\))?(?:\s*\.\s*\w+(?:\([^)]*\))*)*|css(?:\s*\.\s*(?:global|resolve))?|createGlobalStyle|keyframes)/.source),

		// html`<p></p>`
		// div.innerHTML = `<p></p>`
		createTemplate('html', /\bhtml|\.\s*(?:inner|outer)HTML\s*\+?=/.source),

		// svg`<path fill="#fff" d="M55.37 ..."/>`
		createTemplate('svg', /\bsvg/.source),

		// md`# h1`, markdown`## h2`
		createTemplate('markdown', /\b(?:md|markdown)/.source),

		// gql`...`, graphql`...`, graphql.experimental`...`
		createTemplate('graphql', /\b(?:gql|graphql(?:\s*\.\s*experimental)?)/.source),

		// vanilla template string
		templateString
	].filter(Boolean);


	/**
	 * Returns a specific placeholder literal for the given language.
	 *
	 * @param {number} counter
	 * @param {string} language
	 * @returns {string}
	 */
	function getPlaceholder(counter, language) {
		return '___' + language.toUpperCase() + '_' + counter + '___';
	}

	/**
	 * Returns the tokens of `Prism.tokenize` but also runs the `before-tokenize` and `after-tokenize` hooks.
	 *
	 * @param {string} code
	 * @param {any} grammar
	 * @param {string} language
	 * @returns {(string|Token)[]}
	 */
	function tokenizeWithHooks(code, grammar, language) {
		var env = {
			code: code,
			grammar: grammar,
			language: language
		};
		Prism.hooks.run('before-tokenize', env);
		env.tokens = Prism.tokenize(env.code, env.grammar);
		Prism.hooks.run('after-tokenize', env);
		return env.tokens;
	}

	/**
	 * Returns the token of the given JavaScript interpolation expression.
	 *
	 * @param {string} expression The code of the expression. E.g. `"${42}"`
	 * @returns {Token}
	 */
	function tokenizeInterpolationExpression(expression) {
		var tempGrammar = {};
		tempGrammar['interpolation-punctuation'] = interpolationPunctuationObject;

		/** @type {Array} */
		var tokens = Prism.tokenize(expression, tempGrammar);
		if (tokens.length === 3) {
			/**
			 * The token array will look like this
			 * [
			 *     ["interpolation-punctuation", "${"]
			 *     "..." // JavaScript expression of the interpolation
			 *     ["interpolation-punctuation", "}"]
			 * ]
			 */

			var args = [1, 1];
			args.push.apply(args, tokenizeWithHooks(tokens[1], Prism.languages.javascript, 'javascript'));

			tokens.splice.apply(tokens, args);
		}

		return new Prism.Token('interpolation', tokens, interpolationObject.alias, expression);
	}

	/**
	 * Tokenizes the given code with support for JavaScript interpolation expressions mixed in.
	 *
	 * This function has 3 phases:
	 *
	 * 1. Replace all JavaScript interpolation expression with a placeholder.
	 *    The placeholder will have the syntax of a identify of the target language.
	 * 2. Tokenize the code with placeholders.
	 * 3. Tokenize the interpolation expressions and re-insert them into the tokenize code.
	 *    The insertion only works if a placeholder hasn't been "ripped apart" meaning that the placeholder has been
	 *    tokenized as two tokens by the grammar of the embedded language.
	 *
	 * @param {string} code
	 * @param {object} grammar
	 * @param {string} language
	 * @returns {Token}
	 */
	function tokenizeEmbedded(code, grammar, language) {
		// 1. First filter out all interpolations

		// because they might be escaped, we need a lookbehind, so we use Prism
		/** @type {(Token|string)[]} */
		var _tokens = Prism.tokenize(code, {
			'interpolation': {
				pattern: RegExp(interpolationPattern),
				lookbehind: true
			}
		});

		// replace all interpolations with a placeholder which is not in the code already
		var placeholderCounter = 0;
		/** @type {Object<string, string>} */
		var placeholderMap = {};
		var embeddedCode = _tokens.map(function (token) {
			if (typeof token === 'string') {
				return token;
			} else {
				var interpolationExpression = token.content;

				var placeholder;
				while (code.indexOf(placeholder = getPlaceholder(placeholderCounter++, language)) !== -1) { }
				placeholderMap[placeholder] = interpolationExpression;
				return placeholder;
			}
		}).join('');


		// 2. Tokenize the embedded code

		var embeddedTokens = tokenizeWithHooks(embeddedCode, grammar, language);


		// 3. Re-insert the interpolation

		var placeholders = Object.keys(placeholderMap);
		placeholderCounter = 0;

		/**
		 *
		 * @param {(Token|string)[]} tokens
		 * @returns {void}
		 */
		function walkTokens(tokens) {
			for (var i = 0; i < tokens.length; i++) {
				if (placeholderCounter >= placeholders.length) {
					return;
				}

				var token = tokens[i];

				if (typeof token === 'string' || typeof token.content === 'string') {
					var placeholder = placeholders[placeholderCounter];
					var s = typeof token === 'string' ? token : /** @type {string} */ (token.content);

					var index = s.indexOf(placeholder);
					if (index !== -1) {
						++placeholderCounter;

						var before = s.substring(0, index);
						var middle = tokenizeInterpolationExpression(placeholderMap[placeholder]);
						var after = s.substring(index + placeholder.length);

						var replacement = [];
						if (before) {
							replacement.push(before);
						}
						replacement.push(middle);
						if (after) {
							var afterTokens = [after];
							walkTokens(afterTokens);
							replacement.push.apply(replacement, afterTokens);
						}

						if (typeof token === 'string') {
							tokens.splice.apply(tokens, [i, 1].concat(replacement));
							i += replacement.length - 1;
						} else {
							token.content = replacement;
						}
					}
				} else {
					var content = token.content;
					if (Array.isArray(content)) {
						walkTokens(content);
					} else {
						walkTokens([content]);
					}
				}
			}
		}
		walkTokens(embeddedTokens);

		return new Prism.Token(language, embeddedTokens, 'language-' + language, code);
	}

	/**
	 * The languages for which JS templating will handle tagged template literals.
	 *
	 * JS templating isn't active for only JavaScript but also related languages like TypeScript, JSX, and TSX.
	 */
	var supportedLanguages = {
		'javascript': true,
		'js': true,
		'typescript': true,
		'ts': true,
		'jsx': true,
		'tsx': true,
	};
	Prism.hooks.add('after-tokenize', function (env) {
		if (!(env.language in supportedLanguages)) {
			return;
		}

		/**
		 * Finds and tokenizes all template strings with an embedded languages.
		 *
		 * @param {(Token | string)[]} tokens
		 * @returns {void}
		 */
		function findTemplateStrings(tokens) {
			for (var i = 0, l = tokens.length; i < l; i++) {
				var token = tokens[i];

				if (typeof token === 'string') {
					continue;
				}

				var content = token.content;
				if (!Array.isArray(content)) {
					if (typeof content !== 'string') {
						findTemplateStrings([content]);
					}
					continue;
				}

				if (token.type === 'template-string') {
					/**
					 * A JavaScript template-string token will look like this:
					 *
					 * ["template-string", [
					 *     ["template-punctuation", "`"],
					 *     (
					 *         An array of "string" and "interpolation" tokens. This is the simple string case.
					 *         or
					 *         ["embedded-code", "..."] This is the token containing the embedded code.
					 *                                  It also has an alias which is the language of the embedded code.
					 *     ),
					 *     ["template-punctuation", "`"]
					 * ]]
					 */

					var embedded = content[1];
					if (content.length === 3 && typeof embedded !== 'string' && embedded.type === 'embedded-code') {
						// get string content
						var code = stringContent(embedded);

						var alias = embedded.alias;
						var language = Array.isArray(alias) ? alias[0] : alias;

						var grammar = Prism.languages[language];
						if (!grammar) {
							// the embedded language isn't registered.
							continue;
						}

						content[1] = tokenizeEmbedded(code, grammar, language);
					}
				} else {
					findTemplateStrings(content);
				}
			}
		}

		findTemplateStrings(env.tokens);
	});


	/**
	 * Returns the string content of a token or token stream.
	 *
	 * @param {string | Token | (string | Token)[]} value
	 * @returns {string}
	 */
	function stringContent(value) {
		if (typeof value === 'string') {
			return value;
		} else if (Array.isArray(value)) {
			return value.map(stringContent).join('');
		} else {
			return stringContent(value.content);
		}
	}

}(Prism));

(function (Prism) {

	var javascript = Prism.languages.javascript;

	var type = /{(?:[^{}]|{(?:[^{}]|{[^{}]*})*})+}/.source;
	var parameterPrefix = '(@(?:param|arg|argument|property)\\s+(?:' + type + '\\s+)?)';

	Prism.languages.jsdoc = Prism.languages.extend('javadoclike', {
		'parameter': {
			// @param {string} foo - foo bar
			pattern: RegExp(parameterPrefix + /[$\w\xA0-\uFFFF.]+(?=\s|$)/.source),
			lookbehind: true,
			inside: {
				'punctuation': /\./
			}
		}
	});

	Prism.languages.insertBefore('jsdoc', 'keyword', {
		'optional-parameter': {
			// @param {string} [baz.foo="bar"] foo bar
			pattern: RegExp(parameterPrefix + /\[[$\w\xA0-\uFFFF.]+(?:=[^[\]]+)?\](?=\s|$)/.source),
			lookbehind: true,
			inside: {
				'parameter': {
					pattern: /(^\[)[$\w\xA0-\uFFFF\.]+/,
					lookbehind: true,
					inside: {
						'punctuation': /\./
					}
				},
				'code': {
					pattern: /(=)[\s\S]*(?=\]$)/,
					lookbehind: true,
					inside: javascript,
					alias: 'language-javascript'
				},
				'punctuation': /[=[\]]/
			}
		},
		'class-name': [
			{
				pattern: RegExp('(@[a-z]+\\s+)' + type),
				lookbehind: true,
				inside: {
					'punctuation': /[.,:?=<>|{}()[\]]/
				}
			},
			{
				pattern: /(@(?:augments|extends|class|interface|memberof!?|this)\s+)[A-Z]\w*(?:\.[A-Z]\w*)*/,
				lookbehind: true,
				inside: {
					'punctuation': /\./
				}
			}
		],
		'example': {
			pattern: /(@example\s+)[^@]+?(?=\s*(?:\*\s*)?(?:@\w|\*\/))/,
			lookbehind: true,
			inside: {
				'code': {
					pattern: /^(\s*(?:\*\s*)?).+$/m,
					lookbehind: true,
					inside: javascript,
					alias: 'language-javascript'
				}
			}
		}
	});

	Prism.languages.javadoclike.addSupport('javascript', Prism.languages.jsdoc);

}(Prism));

(function (Prism) {

	var typeExpression = /(?:[a-zA-Z]\w*|[|\\[\]])+/.source;

	Prism.languages.phpdoc = Prism.languages.extend('javadoclike', {
		'parameter': {
			pattern: RegExp('(@(?:global|param|property(?:-read|-write)?|var)\\s+(?:' + typeExpression + '\\s+)?)\\$\\w+'),
			lookbehind: true
		}
	});

	Prism.languages.insertBefore('phpdoc', 'keyword', {
		'class-name': [
			{
				pattern: RegExp('(@(?:global|package|param|property(?:-read|-write)?|return|subpackage|throws|var)\\s+)' + typeExpression),
				lookbehind: true,
				inside: {
					'keyword': /\b(?:callback|resource|boolean|integer|double|object|string|array|false|float|mixed|bool|null|self|true|void|int)\b/,
					'punctuation': /[|\\[\]()]/
				}
			}
		],
	});

	Prism.languages.javadoclike.addSupport('php', Prism.languages.phpdoc);

}(Prism));

Prism.languages.insertBefore('php', 'variable', {
	'this': /\$this\b/,
	'global': /\$(?:_(?:SERVER|GET|POST|FILES|REQUEST|SESSION|ENV|COOKIE)|GLOBALS|HTTP_RAW_POST_DATA|argc|argv|php_errormsg|http_response_header)\b/,
	'scope': {
		pattern: /\b[\w\\]+::/,
		inside: {
			keyword: /static|self|parent/,
			punctuation: /::|\\/
		}
	}
});
Prism.languages.sql = {
	'comment': {
		pattern: /(^|[^\\])(?:\/\*[\s\S]*?\*\/|(?:--|\/\/|#).*)/,
		lookbehind: true
	},
	'variable': [
		{
			pattern: /@(["'`])(?:\\[\s\S]|(?!\1)[^\\])+\1/,
			greedy: true
		},
		/@[\w.$]+/
	],
	'string': {
		pattern: /(^|[^@\\])("|')(?:\\[\s\S]|(?!\2)[^\\]|\2\2)*\2/,
		greedy: true,
		lookbehind: true
	},
	'function': /\b(?:AVG|COUNT|FIRST|FORMAT|LAST|LCASE|LEN|MAX|MID|MIN|MOD|NOW|ROUND|SUM|UCASE)(?=\s*\()/i, // Should we highlight user defined functions too?
	'keyword': /\b(?:ACTION|ADD|AFTER|ALGORITHM|ALL|ALTER|ANALYZE|ANY|APPLY|AS|ASC|AUTHORIZATION|AUTO_INCREMENT|BACKUP|BDB|BEGIN|BERKELEYDB|BIGINT|BINARY|BIT|BLOB|BOOL|BOOLEAN|BREAK|BROWSE|BTREE|BULK|BY|CALL|CASCADED?|CASE|CHAIN|CHAR(?:ACTER|SET)?|CHECK(?:POINT)?|CLOSE|CLUSTERED|COALESCE|COLLATE|COLUMNS?|COMMENT|COMMIT(?:TED)?|COMPUTE|CONNECT|CONSISTENT|CONSTRAINT|CONTAINS(?:TABLE)?|CONTINUE|CONVERT|CREATE|CROSS|CURRENT(?:_DATE|_TIME|_TIMESTAMP|_USER)?|CURSOR|CYCLE|DATA(?:BASES?)?|DATE(?:TIME)?|DAY|DBCC|DEALLOCATE|DEC|DECIMAL|DECLARE|DEFAULT|DEFINER|DELAYED|DELETE|DELIMITERS?|DENY|DESC|DESCRIBE|DETERMINISTIC|DISABLE|DISCARD|DISK|DISTINCT|DISTINCTROW|DISTRIBUTED|DO|DOUBLE|DROP|DUMMY|DUMP(?:FILE)?|DUPLICATE|ELSE(?:IF)?|ENABLE|ENCLOSED|END|ENGINE|ENUM|ERRLVL|ERRORS|ESCAPED?|EXCEPT|EXEC(?:UTE)?|EXISTS|EXIT|EXPLAIN|EXTENDED|FETCH|FIELDS|FILE|FILLFACTOR|FIRST|FIXED|FLOAT|FOLLOWING|FOR(?: EACH ROW)?|FORCE|FOREIGN|FREETEXT(?:TABLE)?|FROM|FULL|FUNCTION|GEOMETRY(?:COLLECTION)?|GLOBAL|GOTO|GRANT|GROUP|HANDLER|HASH|HAVING|HOLDLOCK|HOUR|IDENTITY(?:_INSERT|COL)?|IF|IGNORE|IMPORT|INDEX|INFILE|INNER|INNODB|INOUT|INSERT|INT|INTEGER|INTERSECT|INTERVAL|INTO|INVOKER|ISOLATION|ITERATE|JOIN|KEYS?|KILL|LANGUAGE|LAST|LEAVE|LEFT|LEVEL|LIMIT|LINENO|LINES|LINESTRING|LOAD|LOCAL|LOCK|LONG(?:BLOB|TEXT)|LOOP|MATCH(?:ED)?|MEDIUM(?:BLOB|INT|TEXT)|MERGE|MIDDLEINT|MINUTE|MODE|MODIFIES|MODIFY|MONTH|MULTI(?:LINESTRING|POINT|POLYGON)|NATIONAL|NATURAL|NCHAR|NEXT|NO|NONCLUSTERED|NULLIF|NUMERIC|OFF?|OFFSETS?|ON|OPEN(?:DATASOURCE|QUERY|ROWSET)?|OPTIMIZE|OPTION(?:ALLY)?|ORDER|OUT(?:ER|FILE)?|OVER|PARTIAL|PARTITION|PERCENT|PIVOT|PLAN|POINT|POLYGON|PRECEDING|PRECISION|PREPARE|PREV|PRIMARY|PRINT|PRIVILEGES|PROC(?:EDURE)?|PUBLIC|PURGE|QUICK|RAISERROR|READS?|REAL|RECONFIGURE|REFERENCES|RELEASE|RENAME|REPEAT(?:ABLE)?|REPLACE|REPLICATION|REQUIRE|RESIGNAL|RESTORE|RESTRICT|RETURNS?|REVOKE|RIGHT|ROLLBACK|ROUTINE|ROW(?:COUNT|GUIDCOL|S)?|RTREE|RULE|SAVE(?:POINT)?|SCHEMA|SECOND|SELECT|SERIAL(?:IZABLE)?|SESSION(?:_USER)?|SET(?:USER)?|SHARE|SHOW|SHUTDOWN|SIMPLE|SMALLINT|SNAPSHOT|SOME|SONAME|SQL|START(?:ING)?|STATISTICS|STATUS|STRIPED|SYSTEM_USER|TABLES?|TABLESPACE|TEMP(?:ORARY|TABLE)?|TERMINATED|TEXT(?:SIZE)?|THEN|TIME(?:STAMP)?|TINY(?:BLOB|INT|TEXT)|TOP?|TRAN(?:SACTIONS?)?|TRIGGER|TRUNCATE|TSEQUAL|TYPES?|UNBOUNDED|UNCOMMITTED|UNDEFINED|UNION|UNIQUE|UNLOCK|UNPIVOT|UNSIGNED|UPDATE(?:TEXT)?|USAGE|USE|USER|USING|VALUES?|VAR(?:BINARY|CHAR|CHARACTER|YING)|VIEW|WAITFOR|WARNINGS|WHEN|WHERE|WHILE|WITH(?: ROLLUP|IN)?|WORK|WRITE(?:TEXT)?|YEAR)\b/i,
	'boolean': /\b(?:TRUE|FALSE|NULL)\b/i,
	'number': /\b0x[\da-f]+\b|\b\d+\.?\d*|\B\.\d+\b/i,
	'operator': /[-+*\/=%^~]|&&?|\|\|?|!=?|<(?:=>?|<|>)?|>[>=]?|\b(?:AND|BETWEEN|IN|LIKE|NOT|OR|IS|DIV|REGEXP|RLIKE|SOUNDS LIKE|XOR)\b/i,
	'punctuation': /[;[\]()`,.]/
};

(function (Prism) {

	var powershell = Prism.languages.powershell = {
		'comment': [
			{
				pattern: /(^|[^`])<#[\s\S]*?#>/,
				lookbehind: true
			},
			{
				pattern: /(^|[^`])#.*/,
				lookbehind: true
			}
		],
		'string': [
			{
				pattern: /"(?:`[\s\S]|[^`"])*"/,
				greedy: true,
				inside: {
					'function': {
						// Allow for one level of nesting
						pattern: /(^|[^`])\$\((?:\$\(.*?\)|(?!\$\()[^\r\n)])*\)/,
						lookbehind: true,
						// Populated at end of file
						inside: {}
					}
				}
			},
			{
				pattern: /'(?:[^']|'')*'/,
				greedy: true
			}
		],
		// Matches name spaces as well as casts, attribute decorators. Force starting with letter to avoid matching array indices
		// Supports two levels of nested brackets (e.g. `[OutputType([System.Collections.Generic.List[int]])]`)
		'namespace': /\[[a-z](?:\[(?:\[[^\]]*]|[^\[\]])*]|[^\[\]])*]/i,
		'boolean': /\$(?:true|false)\b/i,
		'variable': /\$\w+\b/i,
		// Cmdlets and aliases. Aliases should come last, otherwise "write" gets preferred over "write-host" for example
		// Get-Command | ?{ $_.ModuleName -match "Microsoft.PowerShell.(Util|Core|Management)" }
		// Get-Alias | ?{ $_.ReferencedCommand.Module.Name -match "Microsoft.PowerShell.(Util|Core|Management)" }
		'function': [
			/\b(?:Add-(?:Computer|Content|History|Member|PSSnapin|Type)|Checkpoint-Computer|Clear-(?:Content|EventLog|History|Item|ItemProperty|Variable)|Compare-Object|Complete-Transaction|Connect-PSSession|ConvertFrom-(?:Csv|Json|StringData)|Convert-Path|ConvertTo-(?:Csv|Html|Json|Xml)|Copy-(?:Item|ItemProperty)|Debug-Process|Disable-(?:ComputerRestore|PSBreakpoint|PSRemoting|PSSessionConfiguration)|Disconnect-PSSession|Enable-(?:ComputerRestore|PSBreakpoint|PSRemoting|PSSessionConfiguration)|Enter-PSSession|Exit-PSSession|Export-(?:Alias|Clixml|Console|Csv|FormatData|ModuleMember|PSSession)|ForEach-Object|Format-(?:Custom|List|Table|Wide)|Get-(?:Alias|ChildItem|Command|ComputerRestorePoint|Content|ControlPanelItem|Culture|Date|Event|EventLog|EventSubscriber|FormatData|Help|History|Host|HotFix|Item|ItemProperty|Job|Location|Member|Module|Process|PSBreakpoint|PSCallStack|PSDrive|PSProvider|PSSession|PSSessionConfiguration|PSSnapin|Random|Service|TraceSource|Transaction|TypeData|UICulture|Unique|Variable|WmiObject)|Group-Object|Import-(?:Alias|Clixml|Csv|LocalizedData|Module|PSSession)|Invoke-(?:Command|Expression|History|Item|RestMethod|WebRequest|WmiMethod)|Join-Path|Limit-EventLog|Measure-(?:Command|Object)|Move-(?:Item|ItemProperty)|New-(?:Alias|Event|EventLog|Item|ItemProperty|Module|ModuleManifest|Object|PSDrive|PSSession|PSSessionConfigurationFile|PSSessionOption|PSTransportOption|Service|TimeSpan|Variable|WebServiceProxy)|Out-(?:Default|File|GridView|Host|Null|Printer|String)|Pop-Location|Push-Location|Read-Host|Receive-(?:Job|PSSession)|Register-(?:EngineEvent|ObjectEvent|PSSessionConfiguration|WmiEvent)|Remove-(?:Computer|Event|EventLog|Item|ItemProperty|Job|Module|PSBreakpoint|PSDrive|PSSession|PSSnapin|TypeData|Variable|WmiObject)|Rename-(?:Computer|Item|ItemProperty)|Reset-ComputerMachinePassword|Resolve-Path|Restart-(?:Computer|Service)|Restore-Computer|Resume-(?:Job|Service)|Save-Help|Select-(?:Object|String|Xml)|Send-MailMessage|Set-(?:Alias|Content|Date|Item|ItemProperty|Location|PSBreakpoint|PSDebug|PSSessionConfiguration|Service|StrictMode|TraceSource|Variable|WmiInstance)|Show-(?:Command|ControlPanelItem|EventLog)|Sort-Object|Split-Path|Start-(?:Job|Process|Service|Sleep|Transaction)|Stop-(?:Computer|Job|Process|Service)|Suspend-(?:Job|Service)|Tee-Object|Test-(?:ComputerSecureChannel|Connection|ModuleManifest|Path|PSSessionConfigurationFile)|Trace-Command|Unblock-File|Undo-Transaction|Unregister-(?:Event|PSSessionConfiguration)|Update-(?:FormatData|Help|List|TypeData)|Use-Transaction|Wait-(?:Event|Job|Process)|Where-Object|Write-(?:Debug|Error|EventLog|Host|Output|Progress|Verbose|Warning))\b/i,
			/\b(?:ac|cat|chdir|clc|cli|clp|clv|compare|copy|cp|cpi|cpp|cvpa|dbp|del|diff|dir|ebp|echo|epal|epcsv|epsn|erase|fc|fl|ft|fw|gal|gbp|gc|gci|gcs|gdr|gi|gl|gm|gp|gps|group|gsv|gu|gv|gwmi|iex|ii|ipal|ipcsv|ipsn|irm|iwmi|iwr|kill|lp|ls|measure|mi|mount|move|mp|mv|nal|ndr|ni|nv|ogv|popd|ps|pushd|pwd|rbp|rd|rdr|ren|ri|rm|rmdir|rni|rnp|rp|rv|rvpa|rwmi|sal|saps|sasv|sbp|sc|select|set|shcm|si|sl|sleep|sls|sort|sp|spps|spsv|start|sv|swmi|tee|trcm|type|write)\b/i
		],
		// per http://technet.microsoft.com/en-us/library/hh847744.aspx
		'keyword': /\b(?:Begin|Break|Catch|Class|Continue|Data|Define|Do|DynamicParam|Else|ElseIf|End|Exit|Filter|Finally|For|ForEach|From|Function|If|InlineScript|Parallel|Param|Process|Return|Sequence|Switch|Throw|Trap|Try|Until|Using|Var|While|Workflow)\b/i,
		'operator': {
			pattern: /(\W?)(?:!|-(?:eq|ne|gt|ge|lt|le|sh[lr]|not|b?(?:and|x?or)|(?:Not)?(?:Like|Match|Contains|In)|Replace|Join|is(?:Not)?|as)\b|-[-=]?|\+[+=]?|[*\/%]=?)/i,
			lookbehind: true
		},
		'punctuation': /[|{}[\];(),.]/
	};

	// Variable interpolation inside strings, and nested expressions
	var stringInside = powershell.string[0].inside;
	stringInside.boolean = powershell.boolean;
	stringInside.variable = powershell.variable;
	stringInside.function.inside = powershell;

}(Prism));

Prism.languages.scss = Prism.languages.extend('css', {
	'comment': {
		pattern: /(^|[^\\])(?:\/\*[\s\S]*?\*\/|\/\/.*)/,
		lookbehind: true
	},
	'atrule': {
		pattern: /@[\w-]+(?:\([^()]+\)|[^(])*?(?=\s+[{;])/,
		inside: {
			'rule': /@[\w-]+/
			// See rest below
		}
	},
	// url, compassified
	'url': /(?:[-a-z]+-)?url(?=\()/i,
	// CSS selector regex is not appropriate for Sass
	// since there can be lot more things (var, @ directive, nesting..)
	// a selector must start at the end of a property or after a brace (end of other rules or nesting)
	// it can contain some characters that aren't used for defining rules or end of selector, & (parent selector), or interpolated variable
	// the end of a selector is found when there is no rules in it ( {} or {\s}) or if there is a property (because an interpolated var
	// can "pass" as a selector- e.g: proper#{$erty})
	// this one was hard to do, so please be careful if you edit this one :)
	'selector': {
		// Initial look-ahead is used to prevent matching of blank selectors
		pattern: /(?=\S)[^@;{}()]?(?:[^@;{}()]|#\{\$[-\w]+\})+(?=\s*\{(?:\}|\s|[^}]+[:{][^}]+))/m,
		inside: {
			'parent': {
				pattern: /&/,
				alias: 'important'
			},
			'placeholder': /%[-\w]+/,
			'variable': /\$[-\w]+|#\{\$[-\w]+\}/
		}
	},
	'property': {
		pattern: /(?:[\w-]|\$[-\w]+|#\{\$[-\w]+\})+(?=\s*:)/,
		inside: {
			'variable': /\$[-\w]+|#\{\$[-\w]+\}/
		}
	}
});

Prism.languages.insertBefore('scss', 'atrule', {
	'keyword': [
		/@(?:if|else(?: if)?|for|each|while|import|extend|debug|warn|mixin|include|function|return|content)/i,
		{
			pattern: /( +)(?:from|through)(?= )/,
			lookbehind: true
		}
	]
});

Prism.languages.insertBefore('scss', 'important', {
	// var and interpolated vars
	'variable': /\$[-\w]+|#\{\$[-\w]+\}/
});

Prism.languages.insertBefore('scss', 'function', {
	'placeholder': {
		pattern: /%[-\w]+/,
		alias: 'selector'
	},
	'statement': {
		pattern: /\B!(?:default|optional)\b/i,
		alias: 'keyword'
	},
	'boolean': /\b(?:true|false)\b/,
	'null': {
		pattern: /\bnull\b/,
		alias: 'keyword'
	},
	'operator': {
		pattern: /(\s)(?:[-+*\/%]|[=!]=|<=?|>=?|and|or|not)(?=\s)/,
		lookbehind: true
	}
});

Prism.languages.scss['atrule'].inside.rest = Prism.languages.scss;

(function (Prism) {

	Prism.languages.insertBefore('javascript', 'function-variable', {
		'method-variable': {
			pattern: RegExp('(\\.\\s*)' + Prism.languages.javascript['function-variable'].pattern.source),
			lookbehind: true,
			alias: ['function-variable', 'method', 'function', 'property-access']
		}
	});

	Prism.languages.insertBefore('javascript', 'function', {
		'method': {
			pattern: RegExp('(\\.\\s*)' + Prism.languages.javascript['function'].source),
			lookbehind: true,
			alias: ['function', 'property-access']
		}
	});

	Prism.languages.insertBefore('javascript', 'constant', {
		'known-class-name': [
			{
				// standard built-ins
				// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects
				pattern: /\b(?:(?:(?:Uint|Int)(?:8|16|32)|Uint8Clamped|Float(?:32|64))?Array|ArrayBuffer|BigInt|Boolean|DataView|Date|Error|Function|Intl|JSON|Math|Number|Object|Promise|Proxy|Reflect|RegExp|String|Symbol|(?:Weak)?(?:Set|Map)|WebAssembly)\b/,
				alias: 'class-name'
			},
			{
				// errors
				pattern: /\b(?:[A-Z]\w*)Error\b/,
				alias: 'class-name'
			}
		]
	});

	Prism.languages.javascript['keyword'].unshift(
		{
			pattern: /\b(?:as|default|export|from|import)\b/,
			alias: 'module'
		},
		{
			pattern: /\bnull\b/,
			alias: ['null', 'nil']
		},
		{
			pattern: /\bundefined\b/,
			alias: 'nil'
		}
	);

	Prism.languages.insertBefore('javascript', 'operator', {
		'spread': {
			pattern: /\.{3}/,
			alias: 'operator'
		},
		'arrow': {
			pattern: /=>/,
			alias: 'operator'
		}
	});

	Prism.languages.insertBefore('javascript', 'punctuation', {
		'property-access': {
			pattern: /(\.\s*)#?[_$a-zA-Z\xA0-\uFFFF][$\w\xA0-\uFFFF]*/,
			lookbehind: true
		},
		'maybe-class-name': {
			pattern: /(^|[^$\w\xA0-\uFFFF])[A-Z][$\w\xA0-\uFFFF]+/,
			lookbehind: true
		},
		'dom': {
			// this contains only a few commonly used DOM variables
			pattern: /\b(?:document|location|navigator|performance|(?:local|session)Storage|window)\b/,
			alias: 'variable'
		},
		'console': {
			pattern: /\bconsole(?=\s*\.)/,
			alias: 'class-name'
		}
	});


	// add 'maybe-class-name' to tokens which might be a class name
	var maybeClassNameTokens = ['function', 'function-variable', 'method', 'method-variable', 'property-access'];

	for (var i = 0; i < maybeClassNameTokens.length; i++) {
		var token = maybeClassNameTokens[i];
		var value = Prism.languages.javascript[token];

		// convert regex to object
		if (Prism.util.type(value) === 'RegExp') {
			value = Prism.languages.javascript[token] = {
				pattern: value
			};
		}

		// keep in mind that we don't support arrays

		var inside = value.inside || {};
		value.inside = inside;

		inside['maybe-class-name'] = /^[A-Z][\s\S]*/;
	}

}(Prism));

(function (Prism) {

	var plsql = Prism.languages.plsql = Prism.languages.extend('sql', {
		'comment': [
			/\/\*[\s\S]*?\*\//,
			/--.*/
		]
	});

	var keyword = plsql['keyword'];
	if (!Array.isArray(keyword)) {
		keyword = plsql['keyword'] = [keyword];
	}
	keyword.unshift(
		/\b(?:ACCESS|AGENT|AGGREGATE|ARRAY|ARROW|AT|ATTRIBUTE|AUDIT|AUTHID|BFILE_BASE|BLOB_BASE|BLOCK|BODY|BOTH|BOUND|BYTE|CALLING|CHAR_BASE|CHARSET(?:FORM|ID)|CLOB_BASE|COLAUTH|COLLECT|CLUSTERS?|COMPILED|COMPRESS|CONSTANT|CONSTRUCTOR|CONTEXT|CRASH|CUSTOMDATUM|DANGLING|DATE_BASE|DEFINE|DETERMINISTIC|DURATION|ELEMENT|EMPTY|EXCEPTIONS?|EXCLUSIVE|EXTERNAL|FINAL|FORALL|FORM|FOUND|GENERAL|HEAP|HIDDEN|IDENTIFIED|IMMEDIATE|INCLUDING|INCREMENT|INDICATOR|INDEXES|INDICES|INFINITE|INITIAL|ISOPEN|INSTANTIABLE|INTERFACE|INVALIDATE|JAVA|LARGE|LEADING|LENGTH|LIBRARY|LIKE[24C]|LIMITED|LONG|LOOP|MAP|MAXEXTENTS|MAXLEN|MEMBER|MINUS|MLSLABEL|MULTISET|NAME|NAN|NATIVE|NEW|NOAUDIT|NOCOMPRESS|NOCOPY|NOTFOUND|NOWAIT|NUMBER(?:_BASE)?|OBJECT|OCI(?:COLL|DATE|DATETIME|DURATION|INTERVAL|LOBLOCATOR|NUMBER|RAW|REF|REFCURSOR|ROWID|STRING|TYPE)|OFFLINE|ONLINE|ONLY|OPAQUE|OPERATOR|ORACLE|ORADATA|ORGANIZATION|ORL(?:ANY|VARY)|OTHERS|OVERLAPS|OVERRIDING|PACKAGE|PARALLEL_ENABLE|PARAMETERS?|PASCAL|PCTFREE|PIPE(?:LINED)?|PRAGMA|PRIOR|PRIVATE|RAISE|RANGE|RAW|RECORD|REF|REFERENCE|REM|REMAINDER|RESULT|RESOURCE|RETURNING|REVERSE|ROW(?:ID|NUM|TYPE)|SAMPLE|SB[124]|SEGMENT|SELF|SEPARATE|SEQUENCE|SHORT|SIZE(?:_T)?|SPARSE|SQL(?:CODE|DATA|NAME|STATE)|STANDARD|STATIC|STDDEV|STORED|STRING|STRUCT|STYLE|SUBMULTISET|SUBPARTITION|SUBSTITUTABLE|SUBTYPE|SUCCESSFUL|SYNONYM|SYSDATE|TABAUTH|TDO|THE|TIMEZONE_(?:ABBR|HOUR|MINUTE|REGION)|TRAILING|TRANSAC(?:TIONAL)?|TRUSTED|UB[124]|UID|UNDER|UNTRUSTED|VALIDATE|VALIST|VARCHAR2|VARIABLE|VARIANCE|VARRAY|VIEWS|VOID|WHENEVER|WRAPPED|ZONE)\b/i
	);

	var operator = plsql['operator'];
	if (!Array.isArray(operator)) {
		operator = plsql['operator'] = [operator];
	}
	operator.unshift(
		/:=/
	);

}(Prism));

(function (Prism) {

	var codeLines = {
		'code': {
			pattern: /(^(?:\s*(?:\*\s*)*)).*[^*\s].+$/m,
			lookbehind: true,
			inside: Prism.languages.java,
			alias: 'language-java'
		}
	};

	Prism.languages.javadoc = Prism.languages.extend('javadoclike', {});
	Prism.languages.insertBefore('javadoc', 'keyword', {
		'class-name': [
			{
				pattern: /(@(?:exception|throws|see|link|linkplain|value)\s+(?:[a-z\d]+\.)*)[A-Z](?:\w*[a-z]\w*)?(?:\.[A-Z](?:\w*[a-z]\w*)?)*/,
				lookbehind: true,
				inside: {
					'punctuation': /\./
				}
			},
			{
				// @param <T> the first generic type parameter
				pattern: /(@param\s+)<[A-Z]\w*>/,
				lookbehind: true,
				inside: {
					'punctuation': /[.<>]/
				}
			}
		],
		'namespace': {
			pattern: /(@(?:exception|throws|see|link|linkplain)\s+)(?:[a-z\d]+\.)+/,
			lookbehind: true,
			inside: {
				'punctuation': /\./
			}
		},
		'code-section': [
			{
				pattern: /(\{@code\s+)(?:[^{}]|\{[^{}]*\})+?(?=\s*\})/,
				lookbehind: true,
				inside: codeLines
			},
			{
				pattern: /(<(code|tt)>\s*)[\s\S]+?(?=\s*<\/\2>)/,
				lookbehind: true,
				inside: codeLines
			}
		],
		'tag': Prism.languages.markup.tag,
	});

	Prism.languages.javadoclike.addSupport('java', Prism.languages.javadoc);
}(Prism));

Prism.languages['shell-session'] = {
	'command': {
		pattern: /\$(?:[^\r\n'"<]|(["'])(?:\\[\s\S]|\$\([^)]+\)|`[^`]+`|(?!\1)[^\\])*\1|(?:^|[^<])<<\s*["']?(?:\w+?)["']?\s*(?:\r\n?|\n)(?:[\s\S])*?(?:\r\n?|\n)\3)+/,
		inside: {
			'bash': {
				pattern: /(\$\s*)[\s\S]+/,
				lookbehind: true,
				alias: 'language-bash',
				inside: Prism.languages.bash
			},
			'sh': {
				pattern: /^\$/,
				alias: 'important'
			}
		}
	},
	'output': {
		pattern: /.(?:.*(?:\r\n?|\n|.$))*/
		// output highlighting?
	}
}
;
(function(Prism) {
	// TODO:
	// - Add CSS highlighting inside <style> tags
	// - Add support for multi-line code blocks
	// - Add support for interpolation #{} and !{}
	// - Add support for tag interpolation #[]
	// - Add explicit support for plain text using |
	// - Add support for markup embedded in plain text

	Prism.languages.pug = {

		// Multiline stuff should appear before the rest

		// This handles both single-line and multi-line comments
		'comment': {
			pattern: /(^([\t ]*))\/\/.*(?:(?:\r?\n|\r)\2[\t ]+.+)*/m,
			lookbehind: true
		},

		// All the tag-related part is in lookbehind
		// so that it can be highlighted by the "tag" pattern
		'multiline-script': {
			pattern: /(^([\t ]*)script\b.*\.[\t ]*)(?:(?:\r?\n|\r(?!\n))(?:\2[\t ]+.+|\s*?(?=\r?\n|\r)))+/m,
			lookbehind: true,
			inside: Prism.languages.javascript
		},

		// See at the end of the file for known filters
		'filter': {
			pattern: /(^([\t ]*)):.+(?:(?:\r?\n|\r(?!\n))(?:\2[\t ]+.+|\s*?(?=\r?\n|\r)))+/m,
			lookbehind: true,
			inside: {
				'filter-name': {
					pattern: /^:[\w-]+/,
					alias: 'variable'
				}
			}
		},

		'multiline-plain-text': {
			pattern: /(^([\t ]*)[\w\-#.]+\.[\t ]*)(?:(?:\r?\n|\r(?!\n))(?:\2[\t ]+.+|\s*?(?=\r?\n|\r)))+/m,
			lookbehind: true
		},
		'markup': {
			pattern: /(^[\t ]*)<.+/m,
			lookbehind: true,
			inside: Prism.languages.markup
		},
		'doctype': {
			pattern: /((?:^|\n)[\t ]*)doctype(?: .+)?/,
			lookbehind: true
		},

		// This handle all conditional and loop keywords
		'flow-control': {
			pattern: /(^[\t ]*)(?:if|unless|else|case|when|default|each|while)\b(?: .+)?/m,
			lookbehind: true,
			inside: {
				'each': {
					pattern: /^each .+? in\b/,
					inside: {
						'keyword': /\b(?:each|in)\b/,
						'punctuation': /,/
					}
				},
				'branch': {
					pattern: /^(?:if|unless|else|case|when|default|while)\b/,
					alias: 'keyword'
				},
				rest: Prism.languages.javascript
			}
		},
		'keyword': {
			pattern: /(^[\t ]*)(?:block|extends|include|append|prepend)\b.+/m,
			lookbehind: true
		},
		'mixin': [
			// Declaration
			{
				pattern: /(^[\t ]*)mixin .+/m,
				lookbehind: true,
				inside: {
					'keyword': /^mixin/,
					'function': /\w+(?=\s*\(|\s*$)/,
					'punctuation': /[(),.]/
				}
			},
			// Usage
			{
				pattern: /(^[\t ]*)\+.+/m,
				lookbehind: true,
				inside: {
					'name': {
						pattern: /^\+\w+/,
						alias: 'function'
					},
					rest: Prism.languages.javascript
				}
			}
		],
		'script': {
			pattern: /(^[\t ]*script(?:(?:&[^(]+)?\([^)]+\))*[\t ]+).+/m,
			lookbehind: true,
			inside: Prism.languages.javascript
		},

		'plain-text': {
			pattern: /(^[\t ]*(?!-)[\w\-#.]*[\w\-](?:(?:&[^(]+)?\([^)]+\))*\/?[\t ]+).+/m,
			lookbehind: true
		},
		'tag': {
			pattern: /(^[\t ]*)(?!-)[\w\-#.]*[\w\-](?:(?:&[^(]+)?\([^)]+\))*\/?:?/m,
			lookbehind: true,
			inside: {
				'attributes': [
					{
						pattern: /&[^(]+\([^)]+\)/,
						inside: Prism.languages.javascript
					},
					{
						pattern: /\([^)]+\)/,
						inside: {
							'attr-value': {
								pattern: /(=\s*)(?:\{[^}]*\}|[^,)\r\n]+)/,
								lookbehind: true,
								inside: Prism.languages.javascript
							},
							'attr-name': /[\w-]+(?=\s*!?=|\s*[,)])/,
							'punctuation': /[!=(),]+/
						}
					}
				],
				'punctuation': /:/
			}
		},
		'code': [
			{
				pattern: /(^[\t ]*(?:-|!?=)).+/m,
				lookbehind: true,
				inside: Prism.languages.javascript
			}
		],
		'punctuation': /[.\-!=|]+/
	};

	var filter_pattern = /(^([\t ]*)):{{filter_name}}(?:(?:\r?\n|\r(?!\n))(?:\2[\t ]+.+|\s*?(?=\r?\n|\r)))+/.source;

	// Non exhaustive list of available filters and associated languages
	var filters = [
		{filter:'atpl',language:'twig'},
		{filter:'coffee',language:'coffeescript'},
		'ejs',
		'handlebars',
		'less',
		'livescript',
		'markdown',
		{filter:'sass',language:'scss'},
		'stylus'
	];
	var all_filters = {};
	for (var i = 0, l = filters.length; i < l; i++) {
		var filter = filters[i];
		filter = typeof filter === 'string' ? {filter: filter, language: filter} : filter;
		if (Prism.languages[filter.language]) {
			all_filters['filter-' + filter.filter] = {
				pattern: RegExp(filter_pattern.replace('{{filter_name}}', filter.filter), 'm'),
				lookbehind: true,
				inside: {
					'filter-name': {
						pattern: /^:[\w-]+/,
						alias: 'variable'
					},
					rest: Prism.languages[filter.language]
				}
			}
		}
	}

	Prism.languages.insertBefore('pug', 'filter', all_filters);

}(Prism));

(function (Prism) {

	var specialEscape = {
		pattern: /\\[\\(){}[\]^$+*?|.]/,
		alias: 'escape'
	};
	var escape = /\\(?:x[\da-fA-F]{2}|u[\da-fA-F]{4}|u\{[\da-fA-F]+\}|c[a-zA-Z]|0[0-7]{0,2}|[123][0-7]{2}|.)/
	var charClass = /\\[wsd]|\.|\\p{[^{}]+}/i

	var rangeChar = '(?:[^\\\\-]|' + escape.source + ')';
	var range = RegExp(rangeChar + '-' + rangeChar);

	// the name of a capturing group
	var groupName = {
		pattern: /(<|')[^<>']+(?=[>']$)/,
		lookbehind: true,
		alias: 'variable'
	};

	var backreference = [
		/\\(?![123][0-7]{2})[1-9]/, // a backreference which is not an octal escape
		{
			pattern: /\\k<[^<>']+>/,
			inside: {
				'group-name': groupName
			}
		}
	];

	Prism.languages.regex = {
		'charset': {
			pattern: /((?:^|[^\\])(?:\\\\)*)\[(?:[^\\\]]|\\[\s\S])*\]/,
			lookbehind: true,
			inside: {
				'charset-negation': {
					pattern: /(^\[)\^/,
					lookbehind: true,
				},
				'charset-punctuation': /^\[|\]$/,
				'range': {
					pattern: range,
					inside: {
						'escape': escape,
						'range-punctuation': /-/
					}
				},
				'special-escape': specialEscape,
				'charclass': charClass,
				'backreference': backreference,
				'escape': escape
			}
		},
		'special-escape': specialEscape,
		'charclass': charClass,
		'backreference': backreference,
		'anchor': /[$^]|\\[ABbGZz]/,
		'escape': escape,
		'group': [
			{
				// https://docs.oracle.com/javase/10/docs/api/java/util/regex/Pattern.html
				// https://docs.microsoft.com/en-us/dotnet/standard/base-types/regular-expression-language-quick-reference?view=netframework-4.7.2#grouping-constructs

				// (), (?<name>), (?'name'), (?>), (?:), (?=), (?!), (?<=), (?<!), (?is-m), (?i-m:)
				pattern: /\((?:\?(?:<[^<>']+>|'[^<>']+'|[>:]|<?[=!]|[idmnsuxU]+(?:-[idmnsuxU]+)?:?))?/,
				inside: {
					'group-name': groupName
				}
			},
			/\)/
		],
		'quantifier': /[+*?]|\{(?:\d+,?\d*)\}/,
		'alternation': /\|/
	};


	[
		'actionscript',
		'coffescript',
		'flow',
		'javascript',
		'typescript',
		'vala'
	].forEach(function (lang) {
		var grammar = Prism.languages[lang];
		if (grammar) {
			grammar['regex'].inside = {
				'regex-flags': /[a-z]+$/,
				'regex-delimiter': /^\/|\/$/,
				'language-regex': {
					pattern: /[\s\S]+/,
					inside: Prism.languages.regex
				}
			};
		}
	});

}(Prism))
;
Prism.languages.vim = {
	'string': /"(?:[^"\\\r\n]|\\.)*"|'(?:[^'\r\n]|'')*'/,
	'comment': /".*/,
	'function': /\w+(?=\()/,
	'keyword': /\b(?:ab|abbreviate|abc|abclear|abo|aboveleft|al|all|arga|argadd|argd|argdelete|argdo|arge|argedit|argg|argglobal|argl|arglocal|ar|args|argu|argument|as|ascii|bad|badd|ba|ball|bd|bdelete|be|bel|belowright|bf|bfirst|bl|blast|bm|bmodified|bn|bnext|bN|bNext|bo|botright|bp|bprevious|brea|break|breaka|breakadd|breakd|breakdel|breakl|breaklist|br|brewind|bro|browse|bufdo|b|buffer|buffers|bun|bunload|bw|bwipeout|ca|cabbrev|cabc|cabclear|caddb|caddbuffer|cad|caddexpr|caddf|caddfile|cal|call|cat|catch|cb|cbuffer|cc|ccl|cclose|cd|ce|center|cex|cexpr|cf|cfile|cfir|cfirst|cgetb|cgetbuffer|cgete|cgetexpr|cg|cgetfile|c|change|changes|chd|chdir|che|checkpath|checkt|checktime|cla|clast|cl|clist|clo|close|cmapc|cmapclear|cnew|cnewer|cn|cnext|cN|cNext|cnf|cnfile|cNfcNfile|cnorea|cnoreabbrev|col|colder|colo|colorscheme|comc|comclear|comp|compiler|conf|confirm|con|continue|cope|copen|co|copy|cpf|cpfile|cp|cprevious|cq|cquit|cr|crewind|cuna|cunabbrev|cu|cunmap|cw|cwindow|debugg|debuggreedy|delc|delcommand|d|delete|delf|delfunction|delm|delmarks|diffg|diffget|diffoff|diffpatch|diffpu|diffput|diffsplit|diffthis|diffu|diffupdate|dig|digraphs|di|display|dj|djump|dl|dlist|dr|drop|ds|dsearch|dsp|dsplit|earlier|echoe|echoerr|echom|echomsg|echon|e|edit|el|else|elsei|elseif|em|emenu|endfo|endfor|endf|endfunction|endfun|en|endif|endt|endtry|endw|endwhile|ene|enew|ex|exi|exit|exu|exusage|f|file|files|filetype|fina|finally|fin|find|fini|finish|fir|first|fix|fixdel|fo|fold|foldc|foldclose|folddoc|folddoclosed|foldd|folddoopen|foldo|foldopen|for|fu|fun|function|go|goto|gr|grep|grepa|grepadd|ha|hardcopy|h|help|helpf|helpfind|helpg|helpgrep|helpt|helptags|hid|hide|his|history|ia|iabbrev|iabc|iabclear|if|ij|ijump|il|ilist|imapc|imapclear|in|inorea|inoreabbrev|isearch|isp|isplit|iuna|iunabbrev|iu|iunmap|j|join|ju|jumps|k|keepalt|keepj|keepjumps|kee|keepmarks|laddb|laddbuffer|lad|laddexpr|laddf|laddfile|lan|language|la|last|later|lb|lbuffer|lc|lcd|lch|lchdir|lcl|lclose|let|left|lefta|leftabove|lex|lexpr|lf|lfile|lfir|lfirst|lgetb|lgetbuffer|lgete|lgetexpr|lg|lgetfile|lgr|lgrep|lgrepa|lgrepadd|lh|lhelpgrep|l|list|ll|lla|llast|lli|llist|lmak|lmake|lm|lmap|lmapc|lmapclear|lnew|lnewer|lne|lnext|lN|lNext|lnf|lnfile|lNf|lNfile|ln|lnoremap|lo|loadview|loc|lockmarks|lockv|lockvar|lol|lolder|lop|lopen|lpf|lpfile|lp|lprevious|lr|lrewind|ls|lt|ltag|lu|lunmap|lv|lvimgrep|lvimgrepa|lvimgrepadd|lw|lwindow|mak|make|ma|mark|marks|mat|match|menut|menutranslate|mk|mkexrc|mks|mksession|mksp|mkspell|mkvie|mkview|mkv|mkvimrc|mod|mode|m|move|mzf|mzfile|mz|mzscheme|nbkey|new|n|next|N|Next|nmapc|nmapclear|noh|nohlsearch|norea|noreabbrev|nu|number|nun|nunmap|omapc|omapclear|on|only|o|open|opt|options|ou|ounmap|pc|pclose|ped|pedit|pe|perl|perld|perldo|po|pop|popu|popup|pp|ppop|pre|preserve|prev|previous|p|print|P|Print|profd|profdel|prof|profile|promptf|promptfind|promptr|promptrepl|ps|psearch|pta|ptag|ptf|ptfirst|ptj|ptjump|ptl|ptlast|ptn|ptnext|ptN|ptNext|ptp|ptprevious|ptr|ptrewind|pts|ptselect|pu|put|pw|pwd|pyf|pyfile|py|python|qa|qall|q|quit|quita|quitall|r|read|rec|recover|redi|redir|red|redo|redr|redraw|redraws|redrawstatus|reg|registers|res|resize|ret|retab|retu|return|rew|rewind|ri|right|rightb|rightbelow|rub|ruby|rubyd|rubydo|rubyf|rubyfile|ru|runtime|rv|rviminfo|sal|sall|san|sandbox|sa|sargument|sav|saveas|sba|sball|sbf|sbfirst|sbl|sblast|sbm|sbmodified|sbn|sbnext|sbN|sbNext|sbp|sbprevious|sbr|sbrewind|sb|sbuffer|scripte|scriptencoding|scrip|scriptnames|se|set|setf|setfiletype|setg|setglobal|setl|setlocal|sf|sfind|sfir|sfirst|sh|shell|sign|sil|silent|sim|simalt|sla|slast|sl|sleep|sm|smagic|sm|smap|smapc|smapclear|sme|smenu|sn|snext|sN|sNext|sni|sniff|sno|snomagic|snor|snoremap|snoreme|snoremenu|sor|sort|so|source|spelld|spelldump|spe|spellgood|spelli|spellinfo|spellr|spellrepall|spellu|spellundo|spellw|spellwrong|sp|split|spr|sprevious|sre|srewind|sta|stag|startg|startgreplace|star|startinsert|startr|startreplace|stj|stjump|st|stop|stopi|stopinsert|sts|stselect|sun|sunhide|sunm|sunmap|sus|suspend|sv|sview|syncbind|t|tab|tabc|tabclose|tabd|tabdo|tabe|tabedit|tabf|tabfind|tabfir|tabfirst|tabl|tablast|tabm|tabmove|tabnew|tabn|tabnext|tabN|tabNext|tabo|tabonly|tabp|tabprevious|tabr|tabrewind|tabs|ta|tag|tags|tc|tcl|tcld|tcldo|tclf|tclfile|te|tearoff|tf|tfirst|th|throw|tj|tjump|tl|tlast|tm|tm|tmenu|tn|tnext|tN|tNext|to|topleft|tp|tprevious|tr|trewind|try|ts|tselect|tu|tu|tunmenu|una|unabbreviate|u|undo|undoj|undojoin|undol|undolist|unh|unhide|unlet|unlo|unlockvar|unm|unmap|up|update|verb|verbose|ve|version|vert|vertical|vie|view|vim|vimgrep|vimgrepa|vimgrepadd|vi|visual|viu|viusage|vmapc|vmapclear|vne|vnew|vs|vsplit|vu|vunmap|wa|wall|wh|while|winc|wincmd|windo|winp|winpos|win|winsize|wn|wnext|wN|wNext|wp|wprevious|wq|wqa|wqall|w|write|ws|wsverb|wv|wviminfo|X|xa|xall|x|xit|xm|xmap|xmapc|xmapclear|xme|xmenu|XMLent|XMLns|xn|xnoremap|xnoreme|xnoremenu|xu|xunmap|y|yank)\b/,
	'builtin': /\b(?:autocmd|acd|ai|akm|aleph|allowrevins|altkeymap|ambiwidth|ambw|anti|antialias|arab|arabic|arabicshape|ari|arshape|autochdir|autoindent|autoread|autowrite|autowriteall|aw|awa|background|backspace|backup|backupcopy|backupdir|backupext|backupskip|balloondelay|ballooneval|balloonexpr|bdir|bdlay|beval|bex|bexpr|bg|bh|bin|binary|biosk|bioskey|bk|bkc|bomb|breakat|brk|browsedir|bs|bsdir|bsk|bt|bufhidden|buflisted|buftype|casemap|ccv|cdpath|cedit|cfu|ch|charconvert|ci|cin|cindent|cink|cinkeys|cino|cinoptions|cinw|cinwords|clipboard|cmdheight|cmdwinheight|cmp|cms|columns|com|comments|commentstring|compatible|complete|completefunc|completeopt|consk|conskey|copyindent|cot|cpo|cpoptions|cpt|cscopepathcomp|cscopeprg|cscopequickfix|cscopetag|cscopetagorder|cscopeverbose|cspc|csprg|csqf|cst|csto|csverb|cuc|cul|cursorcolumn|cursorline|cwh|debug|deco|def|define|delcombine|dex|dg|dict|dictionary|diff|diffexpr|diffopt|digraph|dip|dir|directory|dy|ea|ead|eadirection|eb|ed|edcompatible|ef|efm|ei|ek|enc|encoding|endofline|eol|ep|equalalways|equalprg|errorbells|errorfile|errorformat|esckeys|et|eventignore|expandtab|exrc|fcl|fcs|fdc|fde|fdi|fdl|fdls|fdm|fdn|fdo|fdt|fen|fenc|fencs|fex|ff|ffs|fileencoding|fileencodings|fileformat|fileformats|fillchars|fk|fkmap|flp|fml|fmr|foldcolumn|foldenable|foldexpr|foldignore|foldlevel|foldlevelstart|foldmarker|foldmethod|foldminlines|foldnestmax|foldtext|formatexpr|formatlistpat|formatoptions|formatprg|fp|fs|fsync|ft|gcr|gd|gdefault|gfm|gfn|gfs|gfw|ghr|gp|grepformat|grepprg|gtl|gtt|guicursor|guifont|guifontset|guifontwide|guiheadroom|guioptions|guipty|guitablabel|guitabtooltip|helpfile|helpheight|helplang|hf|hh|hi|hidden|highlight|hk|hkmap|hkmapp|hkp|hl|hlg|hls|hlsearch|ic|icon|iconstring|ignorecase|im|imactivatekey|imak|imc|imcmdline|imd|imdisable|imi|iminsert|ims|imsearch|inc|include|includeexpr|incsearch|inde|indentexpr|indentkeys|indk|inex|inf|infercase|insertmode|isf|isfname|isi|isident|isk|iskeyword|isprint|joinspaces|js|key|keymap|keymodel|keywordprg|km|kmp|kp|langmap|langmenu|laststatus|lazyredraw|lbr|lcs|linebreak|lines|linespace|lisp|lispwords|listchars|loadplugins|lpl|lsp|lz|macatsui|magic|makeef|makeprg|matchpairs|matchtime|maxcombine|maxfuncdepth|maxmapdepth|maxmem|maxmempattern|maxmemtot|mco|mef|menuitems|mfd|mh|mis|mkspellmem|ml|mls|mm|mmd|mmp|mmt|modeline|modelines|modifiable|modified|more|mouse|mousef|mousefocus|mousehide|mousem|mousemodel|mouses|mouseshape|mouset|mousetime|mp|mps|msm|mzq|mzquantum|nf|nrformats|numberwidth|nuw|odev|oft|ofu|omnifunc|opendevice|operatorfunc|opfunc|osfiletype|pa|para|paragraphs|paste|pastetoggle|patchexpr|patchmode|path|pdev|penc|pex|pexpr|pfn|ph|pheader|pi|pm|pmbcs|pmbfn|popt|preserveindent|previewheight|previewwindow|printdevice|printencoding|printexpr|printfont|printheader|printmbcharset|printmbfont|printoptions|prompt|pt|pumheight|pvh|pvw|qe|quoteescape|readonly|remap|report|restorescreen|revins|rightleft|rightleftcmd|rl|rlc|ro|rs|rtp|ruf|ruler|rulerformat|runtimepath|sbo|sc|scb|scr|scroll|scrollbind|scrolljump|scrolloff|scrollopt|scs|sect|sections|secure|sel|selection|selectmode|sessionoptions|sft|shcf|shellcmdflag|shellpipe|shellquote|shellredir|shellslash|shelltemp|shelltype|shellxquote|shiftround|shiftwidth|shm|shortmess|shortname|showbreak|showcmd|showfulltag|showmatch|showmode|showtabline|shq|si|sidescroll|sidescrolloff|siso|sj|slm|smartcase|smartindent|smarttab|smc|smd|softtabstop|sol|spc|spell|spellcapcheck|spellfile|spelllang|spellsuggest|spf|spl|splitbelow|splitright|sps|sr|srr|ss|ssl|ssop|stal|startofline|statusline|stl|stmp|su|sua|suffixes|suffixesadd|sw|swapfile|swapsync|swb|swf|switchbuf|sws|sxq|syn|synmaxcol|syntax|tabline|tabpagemax|tabstop|tagbsearch|taglength|tagrelative|tagstack|tal|tb|tbi|tbidi|tbis|tbs|tenc|term|termbidi|termencoding|terse|textauto|textmode|textwidth|tgst|thesaurus|tildeop|timeout|timeoutlen|title|titlelen|titleold|titlestring|toolbar|toolbariconsize|top|tpm|tsl|tsr|ttimeout|ttimeoutlen|ttm|tty|ttybuiltin|ttyfast|ttym|ttymouse|ttyscroll|ttytype|tw|tx|uc|ul|undolevels|updatecount|updatetime|ut|vb|vbs|vdir|verbosefile|vfile|viewdir|viewoptions|viminfo|virtualedit|visualbell|vop|wak|warn|wb|wc|wcm|wd|weirdinvert|wfh|wfw|whichwrap|wi|wig|wildchar|wildcharm|wildignore|wildmenu|wildmode|wildoptions|wim|winaltkeys|window|winfixheight|winfixwidth|winheight|winminheight|winminwidth|winwidth|wiv|wiw|wm|wmh|wmnu|wmw|wop|wrap|wrapmargin|wrapscan|writeany|writebackup|writedelay|ww|noacd|noai|noakm|noallowrevins|noaltkeymap|noanti|noantialias|noar|noarab|noarabic|noarabicshape|noari|noarshape|noautochdir|noautoindent|noautoread|noautowrite|noautowriteall|noaw|noawa|nobackup|noballooneval|nobeval|nobin|nobinary|nobiosk|nobioskey|nobk|nobl|nobomb|nobuflisted|nocf|noci|nocin|nocindent|nocompatible|noconfirm|noconsk|noconskey|nocopyindent|nocp|nocscopetag|nocscopeverbose|nocst|nocsverb|nocuc|nocul|nocursorcolumn|nocursorline|nodeco|nodelcombine|nodg|nodiff|nodigraph|nodisable|noea|noeb|noed|noedcompatible|noek|noendofline|noeol|noequalalways|noerrorbells|noesckeys|noet|noex|noexpandtab|noexrc|nofen|nofk|nofkmap|nofoldenable|nogd|nogdefault|noguipty|nohid|nohidden|nohk|nohkmap|nohkmapp|nohkp|nohls|noic|noicon|noignorecase|noim|noimc|noimcmdline|noimd|noincsearch|noinf|noinfercase|noinsertmode|nois|nojoinspaces|nojs|nolazyredraw|nolbr|nolinebreak|nolisp|nolist|noloadplugins|nolpl|nolz|noma|nomacatsui|nomagic|nomh|noml|nomod|nomodeline|nomodifiable|nomodified|nomore|nomousef|nomousefocus|nomousehide|nonu|nonumber|noodev|noopendevice|nopaste|nopi|nopreserveindent|nopreviewwindow|noprompt|nopvw|noreadonly|noremap|norestorescreen|norevins|nori|norightleft|norightleftcmd|norl|norlc|noro|nors|noru|noruler|nosb|nosc|noscb|noscrollbind|noscs|nosecure|nosft|noshellslash|noshelltemp|noshiftround|noshortname|noshowcmd|noshowfulltag|noshowmatch|noshowmode|nosi|nosm|nosmartcase|nosmartindent|nosmarttab|nosmd|nosn|nosol|nospell|nosplitbelow|nosplitright|nospr|nosr|nossl|nosta|nostartofline|nostmp|noswapfile|noswf|nota|notagbsearch|notagrelative|notagstack|notbi|notbidi|notbs|notermbidi|noterse|notextauto|notextmode|notf|notgst|notildeop|notimeout|notitle|noto|notop|notr|nottimeout|nottybuiltin|nottyfast|notx|novb|novisualbell|nowa|nowarn|nowb|noweirdinvert|nowfh|nowfw|nowildmenu|nowinfixheight|nowinfixwidth|nowiv|nowmnu|nowrap|nowrapscan|nowrite|nowriteany|nowritebackup|nows|invacd|invai|invakm|invallowrevins|invaltkeymap|invanti|invantialias|invar|invarab|invarabic|invarabicshape|invari|invarshape|invautochdir|invautoindent|invautoread|invautowrite|invautowriteall|invaw|invawa|invbackup|invballooneval|invbeval|invbin|invbinary|invbiosk|invbioskey|invbk|invbl|invbomb|invbuflisted|invcf|invci|invcin|invcindent|invcompatible|invconfirm|invconsk|invconskey|invcopyindent|invcp|invcscopetag|invcscopeverbose|invcst|invcsverb|invcuc|invcul|invcursorcolumn|invcursorline|invdeco|invdelcombine|invdg|invdiff|invdigraph|invdisable|invea|inveb|inved|invedcompatible|invek|invendofline|inveol|invequalalways|inverrorbells|invesckeys|invet|invex|invexpandtab|invexrc|invfen|invfk|invfkmap|invfoldenable|invgd|invgdefault|invguipty|invhid|invhidden|invhk|invhkmap|invhkmapp|invhkp|invhls|invhlsearch|invic|invicon|invignorecase|invim|invimc|invimcmdline|invimd|invincsearch|invinf|invinfercase|invinsertmode|invis|invjoinspaces|invjs|invlazyredraw|invlbr|invlinebreak|invlisp|invlist|invloadplugins|invlpl|invlz|invma|invmacatsui|invmagic|invmh|invml|invmod|invmodeline|invmodifiable|invmodified|invmore|invmousef|invmousefocus|invmousehide|invnu|invnumber|invodev|invopendevice|invpaste|invpi|invpreserveindent|invpreviewwindow|invprompt|invpvw|invreadonly|invremap|invrestorescreen|invrevins|invri|invrightleft|invrightleftcmd|invrl|invrlc|invro|invrs|invru|invruler|invsb|invsc|invscb|invscrollbind|invscs|invsecure|invsft|invshellslash|invshelltemp|invshiftround|invshortname|invshowcmd|invshowfulltag|invshowmatch|invshowmode|invsi|invsm|invsmartcase|invsmartindent|invsmarttab|invsmd|invsn|invsol|invspell|invsplitbelow|invsplitright|invspr|invsr|invssl|invsta|invstartofline|invstmp|invswapfile|invswf|invta|invtagbsearch|invtagrelative|invtagstack|invtbi|invtbidi|invtbs|invtermbidi|invterse|invtextauto|invtextmode|invtf|invtgst|invtildeop|invtimeout|invtitle|invto|invtop|invtr|invttimeout|invttybuiltin|invttyfast|invtx|invvb|invvisualbell|invwa|invwarn|invwb|invweirdinvert|invwfh|invwfw|invwildmenu|invwinfixheight|invwinfixwidth|invwiv|invwmnu|invwrap|invwrapscan|invwrite|invwriteany|invwritebackup|invws|t_AB|t_AF|t_al|t_AL|t_bc|t_cd|t_ce|t_Ce|t_cl|t_cm|t_Co|t_cs|t_Cs|t_CS|t_CV|t_da|t_db|t_dl|t_DL|t_EI|t_F1|t_F2|t_F3|t_F4|t_F5|t_F6|t_F7|t_F8|t_F9|t_fs|t_IE|t_IS|t_k1|t_K1|t_k2|t_k3|t_K3|t_k4|t_K4|t_k5|t_K5|t_k6|t_K6|t_k7|t_K7|t_k8|t_K8|t_k9|t_K9|t_KA|t_kb|t_kB|t_KB|t_KC|t_kd|t_kD|t_KD|t_ke|t_KE|t_KF|t_KG|t_kh|t_KH|t_kI|t_KI|t_KJ|t_KK|t_kl|t_KL|t_kN|t_kP|t_kr|t_ks|t_ku|t_le|t_mb|t_md|t_me|t_mr|t_ms|t_nd|t_op|t_RI|t_RV|t_Sb|t_se|t_Sf|t_SI|t_so|t_sr|t_te|t_ti|t_ts|t_ue|t_us|t_ut|t_vb|t_ve|t_vi|t_vs|t_WP|t_WS|t_xs|t_ZH|t_ZR)\b/,
	'number': /\b(?:0x[\da-f]+|\d+(?:\.\d+)?)\b/i,
	'operator': /\|\||&&|[-+.]=?|[=!](?:[=~][#?]?)?|[<>]=?[#?]?|[*\/%?]|\b(?:is(?:not)?)\b/,
	'punctuation': /[{}[\](),;:]/
};
(function () {

	if (typeof self === 'undefined' || !self.Prism || !self.document || !document.querySelector) {
		return;
	}

	function $$(expr, con) {
		return Array.prototype.slice.call((con || document).querySelectorAll(expr));
	}

	function hasClass(element, className) {
		className = " " + className + " ";
		return (" " + element.className + " ").replace(/[\n\t]/g, " ").indexOf(className) > -1
	}

	function callFunction(func) {
		func();
	}

	// Some browsers round the line-height, others don't.
	// We need to test for it to position the elements properly.
	var isLineHeightRounded = (function () {
		var res;
		return function () {
			if (typeof res === 'undefined') {
				var d = document.createElement('div');
				d.style.fontSize = '13px';
				d.style.lineHeight = '1.5';
				d.style.padding = 0;
				d.style.border = 0;
				d.innerHTML = '&nbsp;<br />&nbsp;';
				document.body.appendChild(d);
				// Browsers that round the line-height should have offsetHeight === 38
				// The others should have 39.
				res = d.offsetHeight === 38;
				document.body.removeChild(d);
			}
			return res;
		}
	}());

	/**
	 * Highlights the lines of the given pre.
	 *
	 * This function is split into a DOM measuring and mutate phase to improve performance.
	 * The returned function mutates the DOM when called.
	 *
	 * @param {HTMLElement} pre
	 * @param {string} [lines]
	 * @param {string} [classes='']
	 * @returns {() => void}
	 */
	function highlightLines(pre, lines, classes) {
		lines = typeof lines === 'string' ? lines : pre.getAttribute('data-line');

		var ranges = lines.replace(/\s+/g, '').split(',');
		var offset = +pre.getAttribute('data-line-offset') || 0;

		var parseMethod = isLineHeightRounded() ? parseInt : parseFloat;
		var lineHeight = parseMethod(getComputedStyle(pre).lineHeight);
		var hasLineNumbers = hasClass(pre, 'line-numbers');
		var parentElement = hasLineNumbers ? pre : pre.querySelector('code') || pre;
		var mutateActions = /** @type {(() => void)[]} */ ([]);

		ranges.forEach(function (currentRange) {
			var range = currentRange.split('-');

			var start = +range[0];
			var end = +range[1] || start;

			var line = pre.querySelector('.line-highlight[data-range="' + currentRange + '"]') || document.createElement('div');

			mutateActions.push(function () {
				line.setAttribute('aria-hidden', 'true');
				line.setAttribute('data-range', currentRange);
				line.className = (classes || '') + ' line-highlight';
			});

			// if the line-numbers plugin is enabled, then there is no reason for this plugin to display the line numbers
			if (hasLineNumbers && Prism.plugins.lineNumbers) {
				var startNode = Prism.plugins.lineNumbers.getLine(pre, start);
				var endNode = Prism.plugins.lineNumbers.getLine(pre, end);

				if (startNode) {
					var top = startNode.offsetTop + 'px';
					mutateActions.push(function () {
						line.style.top = top;
					});
				}

				if (endNode) {
					var height = (endNode.offsetTop - startNode.offsetTop) + endNode.offsetHeight + 'px';
					mutateActions.push(function () {
						line.style.height = height;
					});
				}
			} else {
				mutateActions.push(function () {
					line.setAttribute('data-start', start);

					if (end > start) {
						line.setAttribute('data-end', end);
					}

					line.style.top = (start - offset - 1) * lineHeight + 'px';

					line.textContent = new Array(end - start + 2).join(' \n');
				});
			}

			mutateActions.push(function () {
				// allow this to play nicely with the line-numbers plugin
				// need to attack to pre as when line-numbers is enabled, the code tag is relatively which screws up the positioning
				parentElement.appendChild(line);
			});
		});

		return function () {
			mutateActions.forEach(callFunction);
		};
	}

	function applyHash() {
		var hash = location.hash.slice(1);

		// Remove pre-existing temporary lines
		$$('.temporary.line-highlight').forEach(function (line) {
			line.parentNode.removeChild(line);
		});

		var range = (hash.match(/\.([\d,-]+)$/) || [, ''])[1];

		if (!range || document.getElementById(hash)) {
			return;
		}

		var id = hash.slice(0, hash.lastIndexOf('.')),
			pre = document.getElementById(id);

		if (!pre) {
			return;
		}

		if (!pre.hasAttribute('data-line')) {
			pre.setAttribute('data-line', '');
		}

		var mutateDom = highlightLines(pre, range, 'temporary ');
		mutateDom();

		document.querySelector('.temporary.line-highlight').scrollIntoView();
	}

	var fakeTimer = 0; // Hack to limit the number of times applyHash() runs

	Prism.hooks.add('before-sanity-check', function (env) {
		var pre = env.element.parentNode;
		var lines = pre && pre.getAttribute('data-line');

		if (!pre || !lines || !/pre/i.test(pre.nodeName)) {
			return;
		}

		/*
		 * Cleanup for other plugins (e.g. autoloader).
		 *
		 * Sometimes <code> blocks are highlighted multiple times. It is necessary
		 * to cleanup any left-over tags, because the whitespace inside of the <div>
		 * tags change the content of the <code> tag.
		 */
		var num = 0;
		$$('.line-highlight', pre).forEach(function (line) {
			num += line.textContent.length;
			line.parentNode.removeChild(line);
		});
		// Remove extra whitespace
		if (num && /^( \n)+$/.test(env.code.slice(-num))) {
			env.code = env.code.slice(0, -num);
		}
	});

	Prism.hooks.add('complete', function completeHook(env) {
		var pre = env.element.parentNode;
		var lines = pre && pre.getAttribute('data-line');

		if (!pre || !lines || !/pre/i.test(pre.nodeName)) {
			return;
		}

		clearTimeout(fakeTimer);

		var hasLineNumbers = Prism.plugins.lineNumbers;
		var isLineNumbersLoaded = env.plugins && env.plugins.lineNumbers;

		if (hasClass(pre, 'line-numbers') && hasLineNumbers && !isLineNumbersLoaded) {
			Prism.hooks.add('line-numbers', completeHook);
		} else {
			var mutateDom = highlightLines(pre, lines);
			mutateDom();
			fakeTimer = setTimeout(applyHash, 1);
		}
	});

	window.addEventListener('hashchange', applyHash);
	window.addEventListener('resize', function () {
		var actions = [];
		$$('pre[data-line]').forEach(function (pre) {
			actions.push(highlightLines(pre));
		});
		actions.forEach(callFunction);
	});

})();

(function () {

	if (typeof self === 'undefined' || !self.Prism || !self.document) {
		return;
	}

	/**
	 * Plugin name which is used as a class name for <pre> which is activating the plugin
	 * @type {String}
	 */
	var PLUGIN_NAME = 'line-numbers';

	/**
	 * Regular expression used for determining line breaks
	 * @type {RegExp}
	 */
	var NEW_LINE_EXP = /\n(?!$)/g;

	/**
	 * Resizes line numbers spans according to height of line of code
	 * @param {Element} element <pre> element
	 */
	var _resizeElement = function (element) {
		var codeStyles = getStyles(element);
		var whiteSpace = codeStyles['white-space'];

		if (whiteSpace === 'pre-wrap' || whiteSpace === 'pre-line') {
			var codeElement = element.querySelector('code');
			var lineNumbersWrapper = element.querySelector('.line-numbers-rows');
			var lineNumberSizer = element.querySelector('.line-numbers-sizer');
			var codeLines = codeElement.textContent.split(NEW_LINE_EXP);

			if (!lineNumberSizer) {
				lineNumberSizer = document.createElement('span');
				lineNumberSizer.className = 'line-numbers-sizer';

				codeElement.appendChild(lineNumberSizer);
			}

			lineNumberSizer.style.display = 'block';

			codeLines.forEach(function (line, lineNumber) {
				lineNumberSizer.textContent = line || '\n';
				var lineSize = lineNumberSizer.getBoundingClientRect().height;
				lineNumbersWrapper.children[lineNumber].style.height = lineSize + 'px';
			});

			lineNumberSizer.textContent = '';
			lineNumberSizer.style.display = 'none';
		}
	};

	/**
	 * Returns style declarations for the element
	 * @param {Element} element
	 */
	var getStyles = function (element) {
		if (!element) {
			return null;
		}

		return window.getComputedStyle ? getComputedStyle(element) : (element.currentStyle || null);
	};

	window.addEventListener('resize', function () {
		Array.prototype.forEach.call(document.querySelectorAll('pre.' + PLUGIN_NAME), _resizeElement);
	});

	Prism.hooks.add('complete', function (env) {
		if (!env.code) {
			return;
		}

		var code = env.element;
		var pre = code.parentNode;

		// works only for <code> wrapped inside <pre> (not inline)
		if (!pre || !/pre/i.test(pre.nodeName)) {
			return;
		}

		// Abort if line numbers already exists
		if (code.querySelector('.line-numbers-rows')) {
			return;
		}

		var addLineNumbers = false;
		var lineNumbersRegex = /(?:^|\s)line-numbers(?:\s|$)/;

		for (var element = code; element; element = element.parentNode) {
			if (lineNumbersRegex.test(element.className)) {
				addLineNumbers = true;
				break;
			}
		}

		// only add line numbers if <code> or one of its ancestors has the `line-numbers` class
		if (!addLineNumbers) {
			return;
		}

		// Remove the class 'line-numbers' from the <code>
		code.className = code.className.replace(lineNumbersRegex, ' ');
		// Add the class 'line-numbers' to the <pre>
		if (!lineNumbersRegex.test(pre.className)) {
			pre.className += ' line-numbers';
		}

		var match = env.code.match(NEW_LINE_EXP);
		var linesNum = match ? match.length + 1 : 1;
		var lineNumbersWrapper;

		var lines = new Array(linesNum + 1).join('<span></span>');

		lineNumbersWrapper = document.createElement('span');
		lineNumbersWrapper.setAttribute('aria-hidden', 'true');
		lineNumbersWrapper.className = 'line-numbers-rows';
		lineNumbersWrapper.innerHTML = lines;

		if (pre.hasAttribute('data-start')) {
			pre.style.counterReset = 'linenumber ' + (parseInt(pre.getAttribute('data-start'), 10) - 1);
		}

		env.element.appendChild(lineNumbersWrapper);

		_resizeElement(pre);

		Prism.hooks.run('line-numbers', env);
	});

	Prism.hooks.add('line-numbers', function (env) {
		env.plugins = env.plugins || {};
		env.plugins.lineNumbers = true;
	});

	/**
	 * Global exports
	 */
	Prism.plugins.lineNumbers = {
		/**
		 * Get node for provided line number
		 * @param {Element} element pre element
		 * @param {Number} number line number
		 * @return {Element|undefined}
		 */
		getLine: function (element, number) {
			if (element.tagName !== 'PRE' || !element.classList.contains(PLUGIN_NAME)) {
				return;
			}

			var lineNumberRows = element.querySelector('.line-numbers-rows');
			var lineNumberStart = parseInt(element.getAttribute('data-start'), 10) || 1;
			var lineNumberEnd = lineNumberStart + (lineNumberRows.children.length - 1);

			if (number < lineNumberStart) {
				number = lineNumberStart;
			}
			if (number > lineNumberEnd) {
				number = lineNumberEnd;
			}

			var lineIndex = number - lineNumberStart;

			return lineNumberRows.children[lineIndex];
		}
	};

}());

(function(){

if (
	typeof self !== 'undefined' && !self.Prism ||
	typeof global !== 'undefined' && !global.Prism
) {
	return;
}

var url = /\b([a-z]{3,7}:\/\/|tel:)[\w\-+%~/.:=&@]+(?:\?[\w\-+%~/.:=?&!$'()*,;@]*)?(?:#[\w\-+%~/.:#=?&!$'()*,;@]*)?/,
    email = /\b\S+@[\w.]+[a-z]{2}/,
    linkMd = /\[([^\]]+)]\(([^)]+)\)/,

	// Tokens that may contain URLs and emails
    candidates = ['comment', 'url', 'attr-value', 'string'];

Prism.plugins.autolinker = {
	processGrammar: function (grammar) {
		// Abort if grammar has already been processed
		if (!grammar || grammar['url-link']) {
			return;
		}
		Prism.languages.DFS(grammar, function (key, def, type) {
			if (candidates.indexOf(type) > -1 && !Array.isArray(def)) {
				if (!def.pattern) {
					def = this[key] = {
						pattern: def
					};
				}

				def.inside = def.inside || {};

				if (type == 'comment') {
					def.inside['md-link'] = linkMd;
				}
				if (type == 'attr-value') {
					Prism.languages.insertBefore('inside', 'punctuation', { 'url-link': url }, def);
				}
				else {
					def.inside['url-link'] = url;
				}

				def.inside['email-link'] = email;
			}
		});
		grammar['url-link'] = url;
		grammar['email-link'] = email;
	}
};

Prism.hooks.add('before-highlight', function(env) {
	Prism.plugins.autolinker.processGrammar(env.grammar);
});

Prism.hooks.add('wrap', function(env) {
	if (/-link$/.test(env.type)) {
		env.tag = 'a';

		var href = env.content;

		if (env.type == 'email-link' && href.indexOf('mailto:') != 0) {
			href = 'mailto:' + href;
		}
		else if (env.type == 'md-link') {
			// Markdown
			var match = env.content.match(linkMd);

			href = match[2];
			env.content = match[1];
		}

		env.attributes.href = href;

		// Silently catch any error thrown by decodeURIComponent (#1186)
		try {
			env.content = decodeURIComponent(env.content);
		} catch(e) {}
	}
});

})();

(function(){

if (
	typeof self !== 'undefined' && !self.Prism ||
	typeof global !== 'undefined' && !global.Prism
) {
	return;
}

if (Prism.languages.css) {
	// check whether the selector is an advanced pattern before extending it
	if (Prism.languages.css.selector.pattern)
	{
		Prism.languages.css.selector.inside['pseudo-class'] = /:[\w-]+/;
		Prism.languages.css.selector.inside['pseudo-element'] = /::[\w-]+/;
	}
	else
	{
		Prism.languages.css.selector = {
			pattern: Prism.languages.css.selector,
			inside: {
				'pseudo-class': /:[\w-]+/,
				'pseudo-element': /::[\w-]+/
			}
		};
	}
}

if (Prism.languages.markup) {
	Prism.languages.markup.tag.inside.tag.inside['tag-id'] = /[\w-]+/;
	
	var Tags = {
		HTML: {
			'a': 1, 'abbr': 1, 'acronym': 1, 'b': 1, 'basefont': 1, 'bdo': 1, 'big': 1, 'blink': 1, 'cite': 1, 'code': 1, 'dfn': 1, 'em': 1, 'kbd': 1,  'i': 1, 
			'rp': 1, 'rt': 1, 'ruby': 1, 's': 1, 'samp': 1, 'small': 1, 'spacer': 1, 'strike': 1, 'strong': 1, 'sub': 1, 'sup': 1, 'time': 1, 'tt': 1,  'u': 1, 
			'var': 1, 'wbr': 1, 'noframes': 1, 'summary': 1, 'command': 1, 'dt': 1, 'dd': 1, 'figure': 1, 'figcaption': 1, 'center': 1, 'section': 1, 'nav': 1,
			'article': 1, 'aside': 1, 'hgroup': 1, 'header': 1, 'footer': 1, 'address': 1, 'noscript': 1, 'isIndex': 1, 'main': 1, 'mark': 1, 'marquee': 1,
			'meter': 1, 'menu': 1
		},
		SVG: {
			'animateColor': 1, 'animateMotion': 1, 'animateTransform': 1, 'glyph': 1, 'feBlend': 1, 'feColorMatrix': 1, 'feComponentTransfer': 1, 
			'feFuncR': 1, 'feFuncG': 1, 'feFuncB': 1, 'feFuncA': 1, 'feComposite': 1, 'feConvolveMatrix': 1, 'feDiffuseLighting': 1, 'feDisplacementMap': 1, 
			'feFlood': 1, 'feGaussianBlur': 1, 'feImage': 1, 'feMerge': 1, 'feMergeNode': 1, 'feMorphology': 1, 'feOffset': 1, 'feSpecularLighting': 1, 
			'feTile': 1, 'feTurbulence': 1, 'feDistantLight': 1, 'fePointLight': 1, 'feSpotLight': 1, 'linearGradient': 1, 'radialGradient': 1, 'altGlyph': 1, 
			'textPath': 1, 'tref': 1, 'altglyph': 1, 'textpath': 1, 'altglyphdef': 1, 'altglyphitem': 1, 'clipPath': 1, 'color-profile': 1, 'cursor': 1,
			'font-face': 1, 'font-face-format': 1, 'font-face-name': 1, 'font-face-src': 1, 'font-face-uri': 1, 'foreignObject': 1, 'glyphRef': 1,
			'hkern': 1, 'vkern': 1
		},
		MathML: {}
	}
}

var language;

Prism.hooks.add('wrap', function(env) {
	if ((env.type == 'tag-id'
		|| (env.type == 'property' && env.content.indexOf('-') != 0)
		|| (env.type == 'rule'&& env.content.indexOf('@-') != 0)
		|| (env.type == 'pseudo-class'&& env.content.indexOf(':-') != 0) 
		|| (env.type == 'pseudo-element'&& env.content.indexOf('::-') != 0) 
        || (env.type == 'attr-name' && env.content.indexOf('data-') != 0)
		) && env.content.indexOf('<') === -1
	) {
		if (env.language == 'css'
			|| env.language == 'scss'
			|| env.language == 'markup'
		) {
			var href = 'https://webplatform.github.io/docs/';
			var content = env.content;

			if (env.language == 'css' || env.language == 'scss') {
				href += 'css/';

				if (env.type == 'property') {
					href += 'properties/';
				}
				else if (env.type == 'rule') {
					href += 'atrules/';
					content = content.substring(1);
				}
				else if (env.type == 'pseudo-class') {
					href += 'selectors/pseudo-classes/';
					content = content.substring(1);
				}
				else if (env.type == 'pseudo-element') {
					href += 'selectors/pseudo-elements/';
					content = content.substring(2);
				}
			}
			else if (env.language == 'markup') {
				if (env.type == 'tag-id') {
					// Check language
					language = getLanguage(env.content) || language;

					if (language) {
						href += language + '/elements/';
					}
					else {
						return; // Abort
					}
				}
				else if (env.type == 'attr-name') {
					if (language) {
						href += language + '/attributes/';
					}
					else {
						return; // Abort
					}
				}
			}

			href += content;
			env.tag = 'a';
			env.attributes.href = href;
			env.attributes.target = '_blank';
		}
	}
});

function getLanguage(tag) {
	var tagL = tag.toLowerCase();
	
	if (Tags.HTML[tagL]) {
		return 'html';
	}
	else if (Tags.SVG[tag]) {
		return 'svg';
	}
	else if (Tags.MathML[tag]) {
		return 'mathml';
	}
	
	// Not in dictionary, perform check
	if (Tags.HTML[tagL] !== 0 && typeof document !== 'undefined') {
		var htmlInterface = (document.createElement(tag).toString().match(/\[object HTML(.+)Element\]/) || [])[1];
		
		if (htmlInterface && htmlInterface != 'Unknown') {
			Tags.HTML[tagL] = 1;
			return 'html';
		}
	}
	
	Tags.HTML[tagL] = 0;
	
	if (Tags.SVG[tag] !== 0 && typeof document !== 'undefined') {
		var svgInterface = (document.createElementNS('http://www.w3.org/2000/svg', tag).toString().match(/\[object SVG(.+)Element\]/) || [])[1];
		
		if (svgInterface && svgInterface != 'Unknown') {
			Tags.SVG[tag] = 1;
			return 'svg';
		}
	}
	
	Tags.SVG[tag] = 0;
	
	// Lame way to detect MathML, but browsers don’t expose interface names there :(
	if (Tags.MathML[tag] !== 0) {
		if (tag.indexOf('m') === 0) {
			Tags.MathML[tag] = 1;
			return 'mathml';
		}
	}
	
	Tags.MathML[tag] = 0;
	
	return null;
}

})();
(function(){

if (
	(typeof self === 'undefined' || !self.Prism) &&
	(typeof global === 'undefined' || !global.Prism)
) {
	return;
}

/**
 * @callback ClassMapper
 * @param {string} className
 * @param {string} language
 * @returns {string}
 */
/**
 * @typedef CustomClassOptions
 * @property {ClassMapper} classMap
 * @property {string} prefixString
 */

/** @type {ClassMapper} */
var defaultClassMap = function (className) { return className; };

/** @type {CustomClassOptions} */
var options = {
	classMap: defaultClassMap,
	prefixString: ''
};

Prism.plugins.customClass = {
	/**
	 * Maps all class names using the given object or map function.
	 *
	 * This does not affect the prefix.
	 *
	 * @param {Object<string, string> | ClassMapper} classMap
	 */
	map: function map(classMap) {
		if (typeof classMap === 'function') {
			options.classMap = classMap;
		} else {
			options.classMap = function (className) {
				return classMap[className] || className;
			};
		}
	},
	/**
	 * Adds the given prefix to all class names.
	 *
	 * @param {string} string
	 */
	prefix: function prefix(string) {
		options.prefixString = string;
	}
}

Prism.hooks.add('wrap', function (env) {
	if (options.classMap === defaultClassMap && !options.prefixString) {
		return;
	}

	env.classes = env.classes.map(function (c) {
		return options.prefixString + options.classMap(c, env.language);
	});
});

})();

(function () {
	if (typeof self === 'undefined' || !self.Prism || !self.document || !document.querySelector) {
		return;
	}

	/**
	 * @param {Element} [container=document]
	 */
	self.Prism.fileHighlight = function(container) {
		container = container || document;

		var Extensions = {
			'js': 'javascript',
			'py': 'python',
			'rb': 'ruby',
			'ps1': 'powershell',
			'psm1': 'powershell',
			'sh': 'bash',
			'bat': 'batch',
			'h': 'c',
			'tex': 'latex'
		};

		Array.prototype.slice.call(container.querySelectorAll('pre[data-src]')).forEach(function (pre) {
			// ignore if already loaded
			if (pre.hasAttribute('data-src-loaded')) {
				return;
			}

			// load current
			var src = pre.getAttribute('data-src');

			var language, parent = pre;
			var lang = /\blang(?:uage)?-([\w-]+)\b/i;
			while (parent && !lang.test(parent.className)) {
				parent = parent.parentNode;
			}

			if (parent) {
				language = (pre.className.match(lang) || [, ''])[1];
			}

			if (!language) {
				var extension = (src.match(/\.(\w+)$/) || [, ''])[1];
				language = Extensions[extension] || extension;
			}

			var code = document.createElement('code');
			code.className = 'language-' + language;

			pre.textContent = '';

			code.textContent = 'Loading…';

			pre.appendChild(code);

			var xhr = new XMLHttpRequest();

			xhr.open('GET', src, true);

			xhr.onreadystatechange = function () {
				if (xhr.readyState == 4) {

					if (xhr.status < 400 && xhr.responseText) {
						code.textContent = xhr.responseText;

						Prism.highlightElement(code);
						// mark as loaded
						pre.setAttribute('data-src-loaded', '');
					}
					else if (xhr.status >= 400) {
						code.textContent = '✖ Error ' + xhr.status + ' while fetching file: ' + xhr.statusText;
					}
					else {
						code.textContent = '✖ Error: File does not exist or is empty';
					}
				}
			};

			xhr.send(null);
		});
	};

	document.addEventListener('DOMContentLoaded', function () {
		// execute inside handler, for dropping Event as argument
		self.Prism.fileHighlight();
	});

})();

(function(){
	if (typeof self === 'undefined' || !self.Prism || !self.document) {
		return;
	}

	var callbacks = [];
	var map = {};
	var noop = function() {};

	Prism.plugins.toolbar = {};

	/**
	 * @typedef ButtonOptions
	 * @property {string} text The text displayed.
	 * @property {string} [url] The URL of the link which will be created.
	 * @property {Function} [onClick] The event listener for the `click` event of the created button.
	 * @property {string} [className] The class attribute to include with element.
	 */

	/**
	 * Register a button callback with the toolbar.
	 *
	 * @param {string} key
	 * @param {ButtonOptions|Function} opts
	 */
	var registerButton = Prism.plugins.toolbar.registerButton = function (key, opts) {
		var callback;

		if (typeof opts === 'function') {
			callback = opts;
		} else {
			callback = function (env) {
				var element;

				if (typeof opts.onClick === 'function') {
					element = document.createElement('button');
					element.type = 'button';
					element.addEventListener('click', function () {
						opts.onClick.call(this, env);
					});
				} else if (typeof opts.url === 'string') {
					element = document.createElement('a');
					element.href = opts.url;
				} else {
					element = document.createElement('span');
				}

				if (opts.className) {
					element.classList.add(opts.className);
				}

				element.textContent = opts.text;

				return element;
			};
		}

		if (key in map) {
			console.warn('There is a button with the key "' + key + '" registered already.');
			return;
		}

		callbacks.push(map[key] = callback);
	};

	/**
	 * Post-highlight Prism hook callback.
	 *
	 * @param env
	 */
	var hook = Prism.plugins.toolbar.hook = function (env) {
		// Check if inline or actual code block (credit to line-numbers plugin)
		var pre = env.element.parentNode;
		if (!pre || !/pre/i.test(pre.nodeName)) {
			return;
		}

		// Autoloader rehighlights, so only do this once.
		if (pre.parentNode.classList.contains('code-toolbar')) {
			return;
		}

		// Create wrapper for <pre> to prevent scrolling toolbar with content
		var wrapper = document.createElement("div");
		wrapper.classList.add("code-toolbar");
		pre.parentNode.insertBefore(wrapper, pre);
		wrapper.appendChild(pre);

		// Setup the toolbar
		var toolbar = document.createElement('div');
		toolbar.classList.add('toolbar');

		if (document.body.hasAttribute('data-toolbar-order')) {
			callbacks = document.body.getAttribute('data-toolbar-order').split(',').map(function(key) {
				return map[key] || noop;
			});
		}

		callbacks.forEach(function(callback) {
			var element = callback(env);

			if (!element) {
				return;
			}

			var item = document.createElement('div');
			item.classList.add('toolbar-item');

			item.appendChild(element);
			toolbar.appendChild(item);
		});

		// Add our toolbar to the currently created wrapper of <pre> tag
		wrapper.appendChild(toolbar);
	};

	registerButton('label', function(env) {
		var pre = env.element.parentNode;
		if (!pre || !/pre/i.test(pre.nodeName)) {
			return;
		}

		if (!pre.hasAttribute('data-label')) {
			return;
		}

		var element, template;
		var text = pre.getAttribute('data-label');
		try {
			// Any normal text will blow up this selector.
			template = document.querySelector('template#' + text);
		} catch (e) {}

		if (template) {
			element = template.content;
		} else {
			if (pre.hasAttribute('data-url')) {
				element = document.createElement('a');
				element.href = pre.getAttribute('data-url');
			} else {
				element = document.createElement('span');
			}

			element.textContent = text;
		}

		return element;
	});

	/**
	 * Register the toolbar with Prism.
	 */
	Prism.hooks.add('complete', hook);
})();

(function(){

if (
	typeof self !== 'undefined' && !self.Prism ||
	typeof global !== 'undefined' && !global.Prism
) {
	return;
}

Prism.hooks.add('wrap', function(env) {
	if (env.type !== "keyword") {
		return;
	}
	env.classes.push('keyword-' + env.content);
});

})();

(function () {

	if (typeof self === 'undefined' || typeof Prism === 'undefined' || typeof document === 'undefined') {
		return;
	}

	// Copied from the markup language definition
	var HTML_TAG = /<\/?(?!\d)[^\s>\/=$<%]+(?:\s(?:\s*[^\s>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+(?=[\s>]))|(?=[\s/>])))+)?\s*\/?>/g;

	// the regex explained: In first lookahead we check whether the string is valid and then we use the
	// capturing groups to split the string into its components.
	var HEX_COLOR = /^#?(?=(?:[\da-f]{1,2}){3,4}$)([\da-f][\da-f]?)([\da-f][\da-f]?)([\da-f][\da-f]?)([\da-f][\da-f]?)?$/i;

	/**
	 * Parses the given hexadecimal representation and returns the parsed RGBA color.
	 *
	 * If the format of the given string is invalid, `undefined` will be returned.
	 * Valid formats are: `RGB`, `RGBA`, `RRGGBB`, and `RRGGBBAA`.
	 *
	 * @param {string} hex
	 * @returns {string | undefined}
	 */
	function parseHexColor(hex) {
		var match = HEX_COLOR.exec(hex);
		if (!match) {
			return undefined;
		}

		// This is used to scale normalize 4bit and 8bit values
		var scale = hex.length <= 4 ? 1 / 15 : 1 / 255;

		var rgb = match.slice(1, 4).map(function (c) {
			return String(Math.round(parseInt(c, 16) * scale * 255));
		}).join(',');

		var alpha = match[4] === undefined ? '1' : (parseInt(match[4], 16) * scale).toFixed(3);

		return 'rgba(' + rgb + ',' + alpha + ')';
	}

	/**
	 * Validates the given Color using the current browser's internal implementation.
	 *
	 * @param {string} color
	 * @returns {string | undefined}
	 */
	function validateColor(color) {
		var s = new Option().style;
		s.color = color;
		return s.color ? color : undefined;
	}

	/**
	 * An array of function which parse a given string representation of a color.
	 *
	 * These parser serve as validators and as a layer of compatibility to support color formats which the browser
	 * might not support natively.
	 *
	 * @type {((value: string) => (string|undefined))[]}
	 */
	var parsers = [
		parseHexColor,
		validateColor
	];


	Prism.hooks.add('wrap', function (env) {
		if (env.type === 'color' || env.type === 'hexcode') {
			var content = env.content;

			// remove all HTML tags inside
			var rawText = content.split(HTML_TAG).join('');

			var color;
			for (var i = 0, l = parsers.length; i < l && !color; i++) {
				color = parsers[i](rawText);
			}

			if (!color) {
				return;
			}

			var previewElement = '<span class="inline-color" style="background-color:' + color + ';"></span>';
			env.content = previewElement + content;
		}
	});

}());

(function() {

	if (
		typeof self !== 'undefined' && !self.Prism ||
		!self.document || !Function.prototype.bind
	) {
		return;
	}

	var previewers = {
		// gradient must be defined before color and angle
		'gradient': {
			create: (function () {

				// Stores already processed gradients so that we don't
				// make the conversion every time the previewer is shown
				var cache = {};

				/**
				 * Returns a W3C-valid linear gradient
				 * @param {string} prefix Vendor prefix if any ("-moz-", "-webkit-", etc.)
				 * @param {string} func Gradient function name ("linear-gradient")
				 * @param {string[]} values Array of the gradient function parameters (["0deg", "red 0%", "blue 100%"])
				 */
				var convertToW3CLinearGradient = function(prefix, func, values) {
					// Default value for angle
					var angle = '180deg';

					if (/^(?:-?\d*\.?\d+(?:deg|rad)|to\b|top|right|bottom|left)/.test(values[0])) {
						angle = values.shift();
						if (angle.indexOf('to ') < 0) {
							// Angle uses old keywords
							// W3C syntax uses "to" + opposite keywords
							if (angle.indexOf('top') >= 0) {
								if (angle.indexOf('left') >= 0) {
									angle = 'to bottom right';
								} else if (angle.indexOf('right') >= 0) {
									angle = 'to bottom left';
								} else {
									angle = 'to bottom';
								}
							} else if (angle.indexOf('bottom') >= 0) {
								if (angle.indexOf('left') >= 0) {
									angle = 'to top right';
								} else if (angle.indexOf('right') >= 0) {
									angle = 'to top left';
								} else {
									angle = 'to top';
								}
							} else if (angle.indexOf('left') >= 0) {
								angle = 'to right';
							} else if (angle.indexOf('right') >= 0) {
								angle = 'to left';
							} else if (prefix) {
								// Angle is shifted by 90deg in prefixed gradients
								if (angle.indexOf('deg') >= 0) {
									angle = (90 - parseFloat(angle)) + 'deg';
								} else if (angle.indexOf('rad') >= 0) {
									angle = (Math.PI / 2 - parseFloat(angle)) + 'rad';
								}
							}
						}
					}

					return func + '(' + angle + ',' + values.join(',') + ')';
				};

				/**
				 * Returns a W3C-valid radial gradient
				 * @param {string} prefix Vendor prefix if any ("-moz-", "-webkit-", etc.)
				 * @param {string} func Gradient function name ("linear-gradient")
				 * @param {string[]} values Array of the gradient function parameters (["0deg", "red 0%", "blue 100%"])
				 */
				var convertToW3CRadialGradient = function(prefix, func, values) {
					if (values[0].indexOf('at') < 0) {
						// Looks like old syntax

						// Default values
						var position = 'center';
						var shape = 'ellipse';
						var size = 'farthest-corner';

						if (/\bcenter|top|right|bottom|left\b|^\d+/.test(values[0])) {
							// Found a position
							// Remove angle value, if any
							position = values.shift().replace(/\s*-?\d+(?:rad|deg)\s*/, '');
						}
						if (/\bcircle|ellipse|closest|farthest|contain|cover\b/.test(values[0])) {
							// Found a shape and/or size
							var shapeSizeParts = values.shift().split(/\s+/);
							if (shapeSizeParts[0] && (shapeSizeParts[0] === 'circle' || shapeSizeParts[0] === 'ellipse')) {
								shape = shapeSizeParts.shift();
							}
							if (shapeSizeParts[0]) {
								size = shapeSizeParts.shift();
							}

							// Old keywords are converted to their synonyms
							if (size === 'cover') {
								size = 'farthest-corner';
							} else if (size === 'contain') {
								size = 'clothest-side';
							}
						}

						return func + '(' + shape + ' ' + size + ' at ' + position + ',' + values.join(',') + ')';
					}
					return func + '(' + values.join(',') + ')';
				};

				/**
				 * Converts a gradient to a W3C-valid one
				 * Does not support old webkit syntax (-webkit-gradient(linear...) and -webkit-gradient(radial...))
				 * @param {string} gradient The CSS gradient
				 */
				var convertToW3CGradient = function(gradient) {
					if (cache[gradient]) {
						return cache[gradient];
					}
					var parts = gradient.match(/^(\b|\B-[a-z]{1,10}-)((?:repeating-)?(?:linear|radial)-gradient)/);
					// "", "-moz-", etc.
					var prefix = parts && parts[1];
					// "linear-gradient", "radial-gradient", etc.
					var func = parts && parts[2];

					var values = gradient.replace(/^(?:\b|\B-[a-z]{1,10}-)(?:repeating-)?(?:linear|radial)-gradient\(|\)$/g, '').split(/\s*,\s*/);

					if (func.indexOf('linear') >= 0) {
						return cache[gradient] = convertToW3CLinearGradient(prefix, func, values);
					} else if (func.indexOf('radial') >= 0) {
						return cache[gradient] = convertToW3CRadialGradient(prefix, func, values);
					}
					return cache[gradient] = func + '(' + values.join(',') + ')';
				};

				return function () {
					new Prism.plugins.Previewer('gradient', function(value) {
						this.firstChild.style.backgroundImage = '';
						this.firstChild.style.backgroundImage = convertToW3CGradient(value);
						return !!this.firstChild.style.backgroundImage;
					}, '*', function () {
						this._elt.innerHTML = '<div></div>';
					});
				};
			}()),
			tokens: {
				'gradient': {
					pattern: /(?:\b|\B-[a-z]{1,10}-)(?:repeating-)?(?:linear|radial)-gradient\((?:(?:rgb|hsl)a?\(.+?\)|[^\)])+\)/gi,
					inside: {
						'function': /[\w-]+(?=\()/,
						'punctuation': /[(),]/
					}
				}
			},
			languages: {
				'css': true,
				'less': true,
				'sass': [
					{
						lang: 'sass',
						before: 'punctuation',
						inside: 'inside',
						root: Prism.languages.sass && Prism.languages.sass['variable-line']
					},
					{
						lang: 'sass',
						before: 'punctuation',
						inside: 'inside',
						root: Prism.languages.sass && Prism.languages.sass['property-line']
					}
				],
				'scss': true,
				'stylus': [
					{
						lang: 'stylus',
						before: 'func',
						inside: 'rest',
						root: Prism.languages.stylus && Prism.languages.stylus['property-declaration'].inside
					},
					{
						lang: 'stylus',
						before: 'func',
						inside: 'rest',
						root: Prism.languages.stylus && Prism.languages.stylus['variable-declaration'].inside
					}
				]
			}
		},
		'angle': {
			create: function () {
				new Prism.plugins.Previewer('angle', function(value) {
					var num = parseFloat(value);
					var unit = value.match(/[a-z]+$/i);
					var max, percentage;
					if (!num || !unit) {
						return false;
					}
					unit = unit[0];

					switch(unit) {
						case 'deg':
							max = 360;
							break;
						case 'grad':
							max = 400;
							break;
						case 'rad':
							max = 2 * Math.PI;
							break;
						case 'turn':
							max = 1;
					}

					percentage = 100 * num/max;
					percentage %= 100;

					this[(num < 0? 'set' : 'remove') + 'Attribute']('data-negative', '');
					this.querySelector('circle').style.strokeDasharray = Math.abs(percentage) + ',500';
					return true;
				}, '*', function () {
					this._elt.innerHTML = '<svg viewBox="0 0 64 64">' +
						'<circle r="16" cy="32" cx="32"></circle>' +
						'</svg>';
				});
			},
			tokens: {
				'angle': /(?:\b|\B-|(?=\B\.))\d*\.?\d+(?:deg|g?rad|turn)\b/i
			},
			languages: {
				'css': true,
				'less': true,
				'markup': {
					lang: 'markup',
					before: 'punctuation',
					inside: 'inside',
					root: Prism.languages.markup && Prism.languages.markup['tag'].inside['attr-value']
				},
				'sass': [
					{
						lang: 'sass',
						inside: 'inside',
						root: Prism.languages.sass && Prism.languages.sass['property-line']
					},
					{
						lang: 'sass',
						before: 'operator',
						inside: 'inside',
						root: Prism.languages.sass && Prism.languages.sass['variable-line']
					}
				],
				'scss': true,
				'stylus': [
					{
						lang: 'stylus',
						before: 'func',
						inside: 'rest',
						root: Prism.languages.stylus && Prism.languages.stylus['property-declaration'].inside
					},
					{
						lang: 'stylus',
						before: 'func',
						inside: 'rest',
						root: Prism.languages.stylus && Prism.languages.stylus['variable-declaration'].inside
					}
				]
			}
		},
		'color': {
			create: function () {
				new Prism.plugins.Previewer('color', function(value) {
					this.style.backgroundColor = '';
					this.style.backgroundColor = value;
					return !!this.style.backgroundColor;
				});
			},
			tokens: {
				'color': [Prism.languages.css['hexcode']].concat(Prism.languages.css['color'])
			},
			languages: {
				// CSS extras is required, so css and scss are not necessary
				'css': false,
				'less': true,
				'markup': {
					lang: 'markup',
					before: 'punctuation',
					inside: 'inside',
					root: Prism.languages.markup && Prism.languages.markup['tag'].inside['attr-value']
				},
				'sass': [
					{
						lang: 'sass',
						before: 'punctuation',
						inside: 'inside',
						root: Prism.languages.sass && Prism.languages.sass['variable-line']
					},
					{
						lang: 'sass',
						inside: 'inside',
						root: Prism.languages.sass && Prism.languages.sass['property-line']
					}
				],
				'scss': false,
				'stylus': [
					{
						lang: 'stylus',
						before: 'hexcode',
						inside: 'rest',
						root: Prism.languages.stylus && Prism.languages.stylus['property-declaration'].inside
					},
					{
						lang: 'stylus',
						before: 'hexcode',
						inside: 'rest',
						root: Prism.languages.stylus && Prism.languages.stylus['variable-declaration'].inside
					}
				]
			}
		},
		'easing': {
			create: function () {
				new Prism.plugins.Previewer('easing', function (value) {

					value = {
						'linear': '0,0,1,1',
						'ease': '.25,.1,.25,1',
						'ease-in': '.42,0,1,1',
						'ease-out': '0,0,.58,1',
						'ease-in-out':'.42,0,.58,1'
					}[value] || value;

					var p = value.match(/-?\d*\.?\d+/g);

					if(p.length === 4) {
						p = p.map(function(p, i) { return (i % 2? 1 - p : p) * 100; });

						this.querySelector('path').setAttribute('d', 'M0,100 C' + p[0] + ',' + p[1] + ', ' + p[2] + ',' + p[3] + ', 100,0');

						var lines = this.querySelectorAll('line');
						lines[0].setAttribute('x2', p[0]);
						lines[0].setAttribute('y2', p[1]);
						lines[1].setAttribute('x2', p[2]);
						lines[1].setAttribute('y2', p[3]);

						return true;
					}

					return false;
				}, '*', function () {
					this._elt.innerHTML = '<svg viewBox="-20 -20 140 140" width="100" height="100">' +
						'<defs>' +
						'<marker id="prism-previewer-easing-marker" viewBox="0 0 4 4" refX="2" refY="2" markerUnits="strokeWidth">' +
						'<circle cx="2" cy="2" r="1.5" />' +
						'</marker>' +
						'</defs>' +
						'<path d="M0,100 C20,50, 40,30, 100,0" />' +
						'<line x1="0" y1="100" x2="20" y2="50" marker-start="url(' + location.href + '#prism-previewer-easing-marker)" marker-end="url(' + location.href + '#prism-previewer-easing-marker)" />' +
						'<line x1="100" y1="0" x2="40" y2="30" marker-start="url(' + location.href + '#prism-previewer-easing-marker)" marker-end="url(' + location.href + '#prism-previewer-easing-marker)" />' +
						'</svg>';
				});
			},
			tokens: {
				'easing': {
					pattern: /\bcubic-bezier\((?:-?\d*\.?\d+,\s*){3}-?\d*\.?\d+\)\B|\b(?:linear|ease(?:-in)?(?:-out)?)(?=\s|[;}]|$)/i,
					inside: {
						'function': /[\w-]+(?=\()/,
						'punctuation': /[(),]/
					}
				}
			},
			languages: {
				'css': true,
				'less': true,
				'sass': [
					{
						lang: 'sass',
						inside: 'inside',
						before: 'punctuation',
						root: Prism.languages.sass && Prism.languages.sass['variable-line']
					},
					{
						lang: 'sass',
						inside: 'inside',
						root: Prism.languages.sass && Prism.languages.sass['property-line']
					}
				],
				'scss': true,
				'stylus': [
					{
						lang: 'stylus',
						before: 'hexcode',
						inside: 'rest',
						root: Prism.languages.stylus && Prism.languages.stylus['property-declaration'].inside
					},
					{
						lang: 'stylus',
						before: 'hexcode',
						inside: 'rest',
						root: Prism.languages.stylus && Prism.languages.stylus['variable-declaration'].inside
					}
				]
			}
		},

		'time': {
			create: function () {
				new Prism.plugins.Previewer('time', function(value) {
					var num = parseFloat(value);
					var unit = value.match(/[a-z]+$/i);
					if (!num || !unit) {
						return false;
					}
					unit = unit[0];
					this.querySelector('circle').style.animationDuration = 2 * num + unit;
					return true;
				}, '*', function () {
					this._elt.innerHTML = '<svg viewBox="0 0 64 64">' +
						'<circle r="16" cy="32" cx="32"></circle>' +
						'</svg>';
				});
			},
			tokens: {
				'time': /(?:\b|\B-|(?=\B\.))\d*\.?\d+m?s\b/i
			},
			languages: {
				'css': true,
				'less': true,
				'markup': {
					lang: 'markup',
					before: 'punctuation',
					inside: 'inside',
					root: Prism.languages.markup && Prism.languages.markup['tag'].inside['attr-value']
				},
				'sass': [
					{
						lang: 'sass',
						inside: 'inside',
						root: Prism.languages.sass && Prism.languages.sass['property-line']
					},
					{
						lang: 'sass',
						before: 'operator',
						inside: 'inside',
						root: Prism.languages.sass && Prism.languages.sass['variable-line']
					}
				],
				'scss': true,
				'stylus': [
					{
						lang: 'stylus',
						before: 'hexcode',
						inside: 'rest',
						root: Prism.languages.stylus && Prism.languages.stylus['property-declaration'].inside
					},
					{
						lang: 'stylus',
						before: 'hexcode',
						inside: 'rest',
						root: Prism.languages.stylus && Prism.languages.stylus['variable-declaration'].inside
					}
				]
			}
		}
	};

	/**
	 * Returns the absolute X, Y offsets for an element
	 * @param {HTMLElement} element
	 * @returns {{top: number, right: number, bottom: number, left: number, width: number, height: number}}
	 */
	var getOffset = function (element) {
		var elementBounds = element.getBoundingClientRect();
		var left = elementBounds.left;
		var top = elementBounds.top;
		var documentBounds = document.documentElement.getBoundingClientRect();
		left -= documentBounds.left;
		top -= documentBounds.top;

		return {
			top: top,
			right: innerWidth - left - elementBounds.width,
			bottom: innerHeight - top - elementBounds.height,
			left: left,
			width: elementBounds.width,
			height: elementBounds.height
		};
	};

	var tokenRegexp = /(?:^|\s)token(?=$|\s)/;
	var activeRegexp = /(?:^|\s)active(?=$|\s)/g;
	var flippedRegexp = /(?:^|\s)flipped(?=$|\s)/g;

	/**
	 * Previewer constructor
	 * @param {string} type Unique previewer type
	 * @param {function} updater Function that will be called on mouseover.
	 * @param {string[]|string=} supportedLanguages Aliases of the languages this previewer must be enabled for. Defaults to "*", all languages.
	 * @param {function=} initializer Function that will be called on initialization.
	 * @constructor
	 */
	var Previewer = function (type, updater, supportedLanguages, initializer) {
		this._elt = null;
		this._type = type;
		this._clsRegexp = RegExp('(?:^|\\s)' + type + '(?=$|\\s)');
		this._token = null;
		this.updater = updater;
		this._mouseout = this.mouseout.bind(this);
		this.initializer = initializer;

		var self = this;

		if (!supportedLanguages) {
			supportedLanguages = ['*'];
		}
		if (!Array.isArray(supportedLanguages)) {
			supportedLanguages = [supportedLanguages];
		}
		supportedLanguages.forEach(function (lang) {
			if (typeof lang !== 'string') {
				lang = lang.lang;
			}
			if (!Previewer.byLanguages[lang]) {
				Previewer.byLanguages[lang] = [];
			}
			if (Previewer.byLanguages[lang].indexOf(self) < 0) {
				Previewer.byLanguages[lang].push(self);
			}
		});
		Previewer.byType[type] = this;
	};

	/**
	 * Creates the HTML element for the previewer.
	 */
	Previewer.prototype.init = function () {
		if (this._elt) {
			return;
		}
		this._elt = document.createElement('div');
		this._elt.className = 'prism-previewer prism-previewer-' + this._type;
		document.body.appendChild(this._elt);
		if(this.initializer) {
			this.initializer();
		}
	};

	Previewer.prototype.isDisabled = function (token) {
		do {
			if (token.hasAttribute && token.hasAttribute('data-previewers')) {
				var previewers = token.getAttribute('data-previewers');
				return (previewers || '').split(/\s+/).indexOf(this._type) === -1;
			}
		} while(token = token.parentNode);
		return false;
	};

	/**
	 * Checks the class name of each hovered element
	 * @param token
	 */
	Previewer.prototype.check = function (token) {
		if (tokenRegexp.test(token.className) && this.isDisabled(token)) {
			return;
		}
		do {
			if (tokenRegexp.test(token.className) && this._clsRegexp.test(token.className)) {
				break;
			}
		} while(token = token.parentNode);

		if (token && token !== this._token) {
			this._token = token;
			this.show();
		}
	};

	/**
	 * Called on mouseout
	 */
	Previewer.prototype.mouseout = function() {
		this._token.removeEventListener('mouseout', this._mouseout, false);
		this._token = null;
		this.hide();
	};

	/**
	 * Shows the previewer positioned properly for the current token.
	 */
	Previewer.prototype.show = function () {
		if (!this._elt) {
			this.init();
		}
		if (!this._token) {
			return;
		}

		if (this.updater.call(this._elt, this._token.textContent)) {
			this._token.addEventListener('mouseout', this._mouseout, false);

			var offset = getOffset(this._token);
			this._elt.className += ' active';

			if (offset.top - this._elt.offsetHeight > 0) {
				this._elt.className = this._elt.className.replace(flippedRegexp, '');
				this._elt.style.top = offset.top + 'px';
				this._elt.style.bottom = '';
			} else {
				this._elt.className +=  ' flipped';
				this._elt.style.bottom = offset.bottom + 'px';
				this._elt.style.top = '';
			}

			this._elt.style.left = offset.left + Math.min(200, offset.width / 2) + 'px';
		} else {
			this.hide();
		}
	};

	/**
	 * Hides the previewer.
	 */
	Previewer.prototype.hide = function () {
		this._elt.className = this._elt.className.replace(activeRegexp, '');
	};

	/**
	 * Map of all registered previewers by language
	 * @type {{}}
	 */
	Previewer.byLanguages = {};

	/**
	 * Map of all registered previewers by type
	 * @type {{}}
	 */
	Previewer.byType = {};

	/**
	 * Initializes the mouseover event on the code block.
	 * @param {HTMLElement} elt The code block (env.element)
	 * @param {string} lang The language (env.language)
	 */
	Previewer.initEvents = function (elt, lang) {
		var previewers = [];
		if (Previewer.byLanguages[lang]) {
			previewers = previewers.concat(Previewer.byLanguages[lang]);
		}
		if (Previewer.byLanguages['*']) {
			previewers = previewers.concat(Previewer.byLanguages['*']);
		}
		elt.addEventListener('mouseover', function (e) {
			var target = e.target;
			previewers.forEach(function (previewer) {
				previewer.check(target);
			});
		}, false);
	};
	Prism.plugins.Previewer = Previewer;

	Prism.hooks.add('before-highlight', function (env) {
		for (var previewer in previewers) {
			var languages = previewers[previewer].languages;
			if (env.language && languages[env.language] && !languages[env.language].initialized) {
				var lang = languages[env.language];
				if (!Array.isArray(lang)) {
					lang = [lang];
				}
				lang.forEach(function (lang) {
					var before, inside, root, skip;
					if (lang === true) {
						before = 'important';
						inside = env.language;
						lang = env.language;
					} else {
						before = lang.before || 'important';
						inside = lang.inside || lang.lang;
						root = lang.root || Prism.languages;
						skip = lang.skip;
						lang = env.language;
					}

					if (!skip && Prism.languages[lang]) {
						Prism.languages.insertBefore(inside, before, previewers[previewer].tokens, root);
						env.grammar = Prism.languages[lang];

						languages[env.language] = {initialized: true};
					}
				});
			}
		}
	});

	// Initialize the previewers only when needed
	Prism.hooks.add('after-highlight', function (env) {
		if(Previewer.byLanguages['*'] || Previewer.byLanguages[env.language]) {
			Previewer.initEvents(env.element, env.language);
		}
	});

	for (var previewer in previewers) {
		previewers[previewer].create();
	}

}());

(function () {
	if (typeof self === 'undefined' || !self.Prism || !self.document || !document.createElement) {
		return;
	}

	// The dependencies map is built automatically with gulp
	var lang_dependencies = /*dependencies_placeholder[*/{
		"javascript": "clike",
		"actionscript": "javascript",
		"arduino": "cpp",
		"aspnet": [
			"markup",
			"csharp"
		],
		"bison": "c",
		"c": "clike",
		"csharp": "clike",
		"cpp": "c",
		"coffeescript": "javascript",
		"crystal": "ruby",
		"css-extras": "css",
		"d": "clike",
		"dart": "clike",
		"django": "markup-templating",
		"ejs": [
			"javascript",
			"markup-templating"
		],
		"etlua": [
			"lua",
			"markup-templating"
		],
		"erb": [
			"ruby",
			"markup-templating"
		],
		"fsharp": "clike",
		"firestore-security-rules": "clike",
		"flow": "javascript",
		"ftl": "markup-templating",
		"glsl": "clike",
		"gml": "clike",
		"go": "clike",
		"groovy": "clike",
		"haml": "ruby",
		"handlebars": "markup-templating",
		"haxe": "clike",
		"java": "clike",
		"javadoc": [
			"markup",
			"java",
			"javadoclike"
		],
		"jolie": "clike",
		"jsdoc": [
			"javascript",
			"javadoclike"
		],
		"js-extras": "javascript",
		"js-templates": "javascript",
		"jsonp": "json",
		"json5": "json",
		"kotlin": "clike",
		"less": "css",
		"lilypond": "scheme",
		"markdown": "markup",
		"markup-templating": "markup",
		"n4js": "javascript",
		"nginx": "clike",
		"objectivec": "c",
		"opencl": "cpp",
		"parser": "markup",
		"php": [
			"clike",
			"markup-templating"
		],
		"phpdoc": [
			"php",
			"javadoclike"
		],
		"php-extras": "php",
		"plsql": "sql",
		"processing": "clike",
		"protobuf": "clike",
		"pug": [
			"markup",
			"javascript"
		],
		"qore": "clike",
		"jsx": [
			"markup",
			"javascript"
		],
		"tsx": [
			"jsx",
			"typescript"
		],
		"reason": "clike",
		"ruby": "clike",
		"sass": "css",
		"scss": "css",
		"scala": "java",
		"shell-session": "bash",
		"smarty": "markup-templating",
		"solidity": "clike",
		"soy": "markup-templating",
		"sparql": "turtle",
		"sqf": "clike",
		"swift": "clike",
		"tap": "yaml",
		"textile": "markup",
		"tt2": [
			"clike",
			"markup-templating"
		],
		"twig": "markup",
		"typescript": "javascript",
		"t4-cs": [
			"t4-templating",
			"csharp"
		],
		"t4-vb": [
			"t4-templating",
			"visual-basic"
		],
		"vala": "clike",
		"vbnet": "basic",
		"velocity": "markup",
		"wiki": "markup",
		"xeora": "markup",
		"xquery": "markup"
	}/*]*/;

	var lang_aliases = /*aliases_placeholder[*/{
		"html": "markup",
		"xml": "markup",
		"svg": "markup",
		"mathml": "markup",
		"js": "javascript",
		"g4": "antlr4",
		"adoc": "asciidoc",
		"shell": "bash",
		"rbnf": "bnf",
		"cs": "csharp",
		"dotnet": "csharp",
		"coffee": "coffeescript",
		"jinja2": "django",
		"dns-zone": "dns-zone-file",
		"dockerfile": "docker",
		"gamemakerlanguage": "gml",
		"hs": "haskell",
		"tex": "latex",
		"context": "latex",
		"ly": "lilypond",
		"emacs": "lisp",
		"elisp": "lisp",
		"emacs-lisp": "lisp",
		"md": "markdown",
		"moon": "moonscript",
		"n4jsd": "n4js",
		"objectpascal": "pascal",
		"px": "pcaxis",
		"py": "python",
		"robot": "robot-framework",
		"rb": "ruby",
		"rq": "sparql",
		"trig": "turtle",
		"ts": "typescript",
		"t4": "t4-cs",
		"vb": "visual-basic",
		"xeoracube": "xeora",
		"yml": "yaml"
	}/*]*/;

	/**
	 * @typedef LangDataItem
	 * @property {{ success?: () => void, error?: () => void }[]} callbacks
	 * @property {boolean} [error]
	 * @property {boolean} [loading]
	 */
	/** @type {Object<string, LangDataItem>} */
	var lang_data = {};

	var ignored_language = 'none';
	var languages_path = 'components/';

	var script = Prism.util.currentScript();
	if (script) {
		var autoloaderFile = /\bplugins\/autoloader\/prism-autoloader\.(?:min\.)js$/i;
		var prismFile = /[\w-]+\.(?:min\.)js$/i;
		if (script.hasAttribute('data-autoloader-path')) {
			// data-autoloader-path is set, so just use it
			languages_path = script.getAttribute('data-autoloader-path').trim().replace(/\/?$/, '/');
		} else {
			var src = script.src;
			if (autoloaderFile.test(src)) {
				// the script is the original autoloader script in the usual Prism project structure
				languages_path = src.replace(autoloaderFile, 'components/');
			} else if (prismFile.test(src)) {
				// the script is part of a bundle like a custom prism.js from the download page
				languages_path = src.replace(prismFile, 'components/');
			}
		}
	}

	var config = Prism.plugins.autoloader = {
		languages_path: languages_path,
		use_minified: true,
		loadLanguages: loadLanguages
	};


	/**
	 * Lazily loads an external script.
	 *
	 * @param {string} src
	 * @param {() => void} [success]
	 * @param {() => void} [error]
	 */
	function addScript(src, success, error) {
		var s = document.createElement('script');
		s.src = src;
		s.async = true;
		s.onload = function () {
			document.body.removeChild(s);
			success && success();
		};
		s.onerror = function () {
			document.body.removeChild(s);
			error && error();
		};
		document.body.appendChild(s);
	}

	/**
	 * Returns the path to a grammar, using the language_path and use_minified config keys.
	 *
	 * @param {string} lang
	 * @returns {string}
	 */
	function getLanguagePath(lang) {
		return config.languages_path +
			'prism-' + lang
			+ (config.use_minified ? '.min' : '') + '.js'
	}

	/**
	 * Tries to load the grammar(s) and once loaded, highlights the given element again.
	 *
	 * @param {string} lang
	 * @param {HTMLElement} elt
	 */
	function registerElement(lang, elt) {
		if (lang in lang_aliases) {
			lang = lang_aliases[lang];
		}

		// Look for additional dependencies defined on the <code> or <pre> tags
		var deps = elt.getAttribute('data-dependencies');
		var parent = elt.parentElement;
		if (!deps && parent && parent.tagName.toLowerCase() === 'pre') {
			deps = parent.getAttribute('data-dependencies');
		}

		if (deps) {
			deps = deps.split(/\s*,\s*/g);
		} else {
			deps = [];
		}

		loadLanguages(deps, function () {
			loadLanguage(lang, function () {
				Prism.highlightElement(elt);
			});
		});
	}

	/**
	 * Loads all given grammars concurrently.
	 *
	 * @param {string[]|string} languages
	 * @param {(languages: string[]) => void} [success]
	 * @param {(language: string) => void} [error] This callback will be invoked on the first language to fail.
	 */
	function loadLanguages(languages, success, error) {
		if (typeof languages === 'string') {
			languages = [languages];
		}

		var total = languages.length;
		var completed = 0;
		var failed = false;

		if (total === 0) {
			if (success) {
				setTimeout(success, 0);
			}
			return;
		}

		function successCallback() {
			if (failed) {
				return;
			}
			completed++;
			if (completed === total) {
				success && success(languages);
			}
		}

		languages.forEach(function (lang) {
			loadLanguage(lang, successCallback, function () {
				if (failed) {
					return;
				}
				failed = true;
				error && error(lang);
			});
		});
	}

	/**
	 * Loads a grammar with its dependencies.
	 *
	 * @param {string} lang
	 * @param {() => void} [success]
	 * @param {() => void} [error]
	 */
	function loadLanguage(lang, success, error) {
		var force = lang.indexOf('!') >= 0;

		lang = lang.replace('!', '');
		lang = lang_aliases[lang] || lang;

		var load = function () {
			var data = lang_data[lang];
			if (!data) {
				data = lang_data[lang] = {
					callbacks: []
				};
			}
			data.callbacks.push({
				success: success,
				error: error
			});

			if (!force && Prism.languages[lang]) {
				languageCallback(lang, "success");
			} else if (!force && data.error) {
				languageCallback(lang, "error");
			} else if (force || !data.loading) {
				data.loading = true;
				var src = getLanguagePath(lang);
				addScript(src, function () {
					data.loading = false;
					languageCallback(lang, "success");

				}, function () {
					data.loading = false;
					data.error = true;
					languageCallback(lang, "error");
				});
			}
		};

		var dependencies = lang_dependencies[lang];
		if (dependencies && dependencies.length) {
			loadLanguages(dependencies, load, error);
		} else {
			load();
		}
	}

	/**
	 * Runs all callbacks of the given type for the given language.
	 *
	 * @param {string} lang
	 * @param {"success" | "error"} type
	 */
	function languageCallback(lang, type) {
		if (lang_data[lang]) {
			var callbacks = lang_data[lang].callbacks;
			for (var i = 0, l = callbacks.length; i < l; i++) {
				var callback = callbacks[i][type];
				if (callback) {
					setTimeout(callback, 0);
				}
			}
			callbacks.length = 0;
		}
	}

	Prism.hooks.add('complete', function (env) {
		if (env.element && env.language && !env.grammar) {
			if (env.language !== ignored_language) {
				registerElement(env.language, env.element);
			}
		}
	});

}());

(function () {

	if (typeof self === 'undefined' || !self.Prism || !self.document || !Prism.languages.markup) {
		return;
	}

	Prism.plugins.UnescapedMarkup = true;

	Prism.hooks.add('before-highlightall', function (env) {
		env.selector += ", [class*='lang-'] script[type='text/plain'], [class*='language-'] script[type='text/plain']" +
		                ", script[type='text/plain'][class*='lang-'], script[type='text/plain'][class*='language-']";
	});

	Prism.hooks.add('before-sanity-check', function (env) {
		if ((env.element.matches || env.element.msMatchesSelector).call(env.element, "script[type='text/plain']")) {
			var code = document.createElement("code");
			var pre = document.createElement("pre");

			pre.className = code.className = env.element.className;

			if (env.element.dataset) {
				Object.keys(env.element.dataset).forEach(function (key) {
					if (Object.prototype.hasOwnProperty.call(env.element.dataset, key)) {
						pre.dataset[key] = env.element.dataset[key];
					}
				});
			}

			env.code = env.code.replace(/&lt;\/script(>|&gt;)/gi, "</scri" + "pt>");
			code.textContent = env.code;

			pre.appendChild(code);
			env.element.parentNode.replaceChild(pre, env.element);
			env.element = code;
			return;
		}

		var pre = env.element.parentNode;
		if (!env.code && pre && pre.nodeName.toLowerCase() == 'pre' &&
				env.element.childNodes.length && env.element.childNodes[0].nodeName == "#comment") {
			env.element.textContent = env.code = env.element.childNodes[0].textContent;
		}
	});
}());

(function() {

if (typeof self === 'undefined' || !self.Prism || !self.document) {
	return;
}

var clsReg = /(?:^|\s)command-line(?:\s|$)/;

Prism.hooks.add('before-highlight', function (env) {
	var vars = env.vars = env.vars || {};
	var commandLine = vars['command-line'] = vars['command-line'] || {};

	if (commandLine.complete || !env.code) {
		commandLine.complete = true;
		return;
	}

	// Works only for <code> wrapped inside <pre> (not inline).
	var pre = env.element.parentNode;
	if (!pre || !/pre/i.test(pre.nodeName) || // Abort only if neither the <pre> nor the <code> have the class
		(!clsReg.test(pre.className) && !clsReg.test(env.element.className))) {
		commandLine.complete = true;
		return;
	}

	if (env.element.querySelector('.command-line-prompt')) { // Abort if prompt already exists.
		commandLine.complete = true;
		return;
	}

	var codeLines = env.code.split('\n');
	commandLine.numberOfLines = codeLines.length;
	var outputLines = commandLine.outputLines = [];

	var outputSections = pre.getAttribute('data-output');
	var outputFilter = pre.getAttribute('data-filter-output');
	if (outputSections || outputSections === '') { // The user specified the output lines. -- cwells
		outputSections = outputSections.split(',');
		for (var i = 0; i < outputSections.length; i++) { // Parse the output sections into start/end ranges. -- cwells
			var range = outputSections[i].split('-');
			var outputStart = parseInt(range[0], 10);
			var outputEnd = (range.length === 2 ? parseInt(range[1], 10) : outputStart);

			if (!isNaN(outputStart) && !isNaN(outputEnd)) {
				if (outputStart < 1) {
					outputStart = 1;
				}
				if (outputEnd > codeLines.length) {
					outputEnd = codeLines.length;
				}
				// Convert start and end to 0-based to simplify the arrays. -- cwells
				outputStart--;
				outputEnd--;
				// Save the output line in an array and clear it in the code so it's not highlighted. -- cwells
				for (var j = outputStart; j <= outputEnd; j++) {
					outputLines[j] = codeLines[j];
					codeLines[j] = '';
				}
			}
		}
	} else if (outputFilter) { // Treat lines beginning with this string as output. -- cwells
		for (var i = 0; i < codeLines.length; i++) {
			if (codeLines[i].indexOf(outputFilter) === 0) { // This line is output. -- cwells
				outputLines[i] = codeLines[i].slice(outputFilter.length);
				codeLines[i] = '';
			}
		}
	}

	env.code = codeLines.join('\n');
});

Prism.hooks.add('before-insert', function (env) {
	var vars = env.vars = env.vars || {};
	var commandLine = vars['command-line'] = vars['command-line'] || {};
	if (commandLine.complete) {
		return;
	}

	// Reinsert the output lines into the highlighted code. -- cwells
	var codeLines = env.highlightedCode.split('\n');
	for (var i = 0, l = (commandLine.outputLines || []).length; i < l; i++) {
		if (commandLine.outputLines.hasOwnProperty(i)) {
			codeLines[i] = commandLine.outputLines[i];
		}
	}
	env.highlightedCode = codeLines.join('\n');
});

Prism.hooks.add('complete', function (env) {
	var vars = env.vars = env.vars || {};
	var commandLine = vars['command-line'] = vars['command-line'] || {};
	if (commandLine.complete) {
		return;
	}

	var pre = env.element.parentNode;
	if (clsReg.test(env.element.className)) { // Remove the class "command-line" from the <code>
		env.element.className = env.element.className.replace(clsReg, ' ');
	}
	if (!clsReg.test(pre.className)) { // Add the class "command-line" to the <pre>
		pre.className += ' command-line';
	}

	var getAttribute = function(key, defaultValue) {
		return (pre.getAttribute(key) || defaultValue).replace(/"/g, '&quot');
	};

	// Create the "rows" that will become the command-line prompts. -- cwells
	var promptLines = new Array((commandLine.numberOfLines || 0) + 1);
	var promptText = getAttribute('data-prompt', '');
	if (promptText !== '') {
		promptLines = promptLines.join('<span data-prompt="' + promptText + '"></span>');
	} else {
		var user = getAttribute('data-user', 'user');
		var host = getAttribute('data-host', 'localhost');
		promptLines = promptLines.join('<span data-user="' + user + '" data-host="' + host + '"></span>');
	}

	// Create the wrapper element. -- cwells
	var prompt = document.createElement('span');
	prompt.className = 'command-line-prompt';
	prompt.innerHTML = promptLines;

	// Remove the prompt from the output lines. -- cwells
	for (var i = 0, l = (commandLine.outputLines || []).length; i < l; i++) {
		if (commandLine.outputLines.hasOwnProperty(i)) {
			var node = prompt.children[i];
			node.removeAttribute('data-user');
			node.removeAttribute('data-host');
			node.removeAttribute('data-prompt');
		}
	}

	env.element.insertBefore(prompt, env.element.firstChild);
	commandLine.complete = true;
});

}());

(function() {

var assign = Object.assign || function (obj1, obj2) {
	for (var name in obj2) {
		if (obj2.hasOwnProperty(name))
			obj1[name] = obj2[name];
	}
	return obj1;
}

function NormalizeWhitespace(defaults) {
	this.defaults = assign({}, defaults);
}

function toCamelCase(value) {
	return value.replace(/-(\w)/g, function(match, firstChar) {
		return firstChar.toUpperCase();
	});
}

function tabLen(str) {
	var res = 0;
	for (var i = 0; i < str.length; ++i) {
		if (str.charCodeAt(i) == '\t'.charCodeAt(0))
			res += 3;
	}
	return str.length + res;
}

NormalizeWhitespace.prototype = {
	setDefaults: function (defaults) {
		this.defaults = assign(this.defaults, defaults);
	},
	normalize: function (input, settings) {
		settings = assign(this.defaults, settings);

		for (var name in settings) {
			var methodName = toCamelCase(name);
			if (name !== "normalize" && methodName !== 'setDefaults' &&
					settings[name] && this[methodName]) {
				input = this[methodName].call(this, input, settings[name]);
			}
		}

		return input;
	},

	/*
	 * Normalization methods
	 */
	leftTrim: function (input) {
		return input.replace(/^\s+/, '');
	},
	rightTrim: function (input) {
		return input.replace(/\s+$/, '');
	},
	tabsToSpaces: function (input, spaces) {
		spaces = spaces|0 || 4;
		return input.replace(/\t/g, new Array(++spaces).join(' '));
	},
	spacesToTabs: function (input, spaces) {
		spaces = spaces|0 || 4;
		return input.replace(RegExp(' {' + spaces + '}', 'g'), '\t');
	},
	removeTrailing: function (input) {
		return input.replace(/\s*?$/gm, '');
	},
	// Support for deprecated plugin remove-initial-line-feed
	removeInitialLineFeed: function (input) {
		return input.replace(/^(?:\r?\n|\r)/, '');
	},
	removeIndent: function (input) {
		var indents = input.match(/^[^\S\n\r]*(?=\S)/gm);

		if (!indents || !indents[0].length)
			return input;

		indents.sort(function(a, b){return a.length - b.length; });

		if (!indents[0].length)
			return input;

		return input.replace(RegExp('^' + indents[0], 'gm'), '');
	},
	indent: function (input, tabs) {
		return input.replace(/^[^\S\n\r]*(?=\S)/gm, new Array(++tabs).join('\t') + '$&');
	},
	breakLines: function (input, characters) {
		characters = (characters === true) ? 80 : characters|0 || 80;

		var lines = input.split('\n');
		for (var i = 0; i < lines.length; ++i) {
			if (tabLen(lines[i]) <= characters)
				continue;

			var line = lines[i].split(/(\s+)/g),
			    len = 0;

			for (var j = 0; j < line.length; ++j) {
				var tl = tabLen(line[j]);
				len += tl;
				if (len > characters) {
					line[j] = '\n' + line[j];
					len = tl;
				}
			}
			lines[i] = line.join('');
		}
		return lines.join('\n');
	}
};

// Support node modules
if (typeof module !== 'undefined' && module.exports) {
	module.exports = NormalizeWhitespace;
}

// Exit if prism is not loaded
if (typeof Prism === 'undefined') {
	return;
}

Prism.plugins.NormalizeWhitespace = new NormalizeWhitespace({
	'remove-trailing': true,
	'remove-indent': true,
	'left-trim': true,
	'right-trim': true,
	/*'break-lines': 80,
	'indent': 2,
	'remove-initial-line-feed': false,
	'tabs-to-spaces': 4,
	'spaces-to-tabs': 4*/
});

Prism.hooks.add('before-sanity-check', function (env) {
	var Normalizer = Prism.plugins.NormalizeWhitespace;

	// Check settings
	if (env.settings && env.settings['whitespace-normalization'] === false) {
		return;
	}

	// Simple mode if there is no env.element
	if ((!env.element || !env.element.parentNode) && env.code) {
		env.code = Normalizer.normalize(env.code, env.settings);
		return;
	}

	// Normal mode
	var pre = env.element.parentNode;
	var clsReg = /(?:^|\s)no-whitespace-normalization(?:\s|$)/;
	if (!env.code || !pre || pre.nodeName.toLowerCase() !== 'pre' ||
			clsReg.test(pre.className) || clsReg.test(env.element.className))
		return;

	var children = pre.childNodes,
	    before = '',
	    after = '',
	    codeFound = false;

	// Move surrounding whitespace from the <pre> tag into the <code> tag
	for (var i = 0; i < children.length; ++i) {
		var node = children[i];

		if (node == env.element) {
			codeFound = true;
		} else if (node.nodeName === "#text") {
			if (codeFound) {
				after += node.nodeValue;
			} else {
				before += node.nodeValue;
			}

			pre.removeChild(node);
			--i;
		}
	}

	if (!env.element.children.length || !Prism.plugins.KeepMarkup) {
		env.code = before + env.code + after;
		env.code = Normalizer.normalize(env.code, env.settings);
	} else {
		// Preserve markup for keep-markup plugin
		var html = before + env.element.innerHTML + after;
		env.element.innerHTML = Normalizer.normalize(html, env.settings);
		env.code = env.element.textContent;
	}
});

}());

(function (self, document) {

	if (typeof self === 'undefined' || !self.Prism || !self.document || !document.createRange) {
		return;
	}

	Prism.plugins.KeepMarkup = true;

	Prism.hooks.add('before-highlight', function (env) {
		if (!env.element.children.length) {
			return;
		}

		var pos = 0;
		var data = [];
		var f = function (elt, baseNode) {
			var o = {};
			if (!baseNode) {
				// Clone the original tag to keep all attributes
				o.clone = elt.cloneNode(false);
				o.posOpen = pos;
				data.push(o);
			}
			for (var i = 0, l = elt.childNodes.length; i < l; i++) {
				var child = elt.childNodes[i];
				if (child.nodeType === 1) { // element
					f(child);
				} else if(child.nodeType === 3) { // text
					pos += child.data.length;
				}
			}
			if (!baseNode) {
				o.posClose = pos;
			}
		};
		f(env.element, true);

		if (data && data.length) {
			// data is an array of all existing tags
			env.keepMarkup = data;
		}
	});

	Prism.hooks.add('after-highlight', function (env) {
		if(env.keepMarkup && env.keepMarkup.length) {

			var walk = function (elt, nodeState) {
				for (var i = 0, l = elt.childNodes.length; i < l; i++) {

					var child = elt.childNodes[i];

					if (child.nodeType === 1) { // element
						if (!walk(child, nodeState)) {
							return false;
						}

					} else if (child.nodeType === 3) { // text
						if(!nodeState.nodeStart && nodeState.pos + child.data.length > nodeState.node.posOpen) {
							// We found the start position
							nodeState.nodeStart = child;
							nodeState.nodeStartPos = nodeState.node.posOpen - nodeState.pos;
						}
						if(nodeState.nodeStart && nodeState.pos + child.data.length >= nodeState.node.posClose) {
							// We found the end position
							nodeState.nodeEnd = child;
							nodeState.nodeEndPos = nodeState.node.posClose - nodeState.pos;
						}

						nodeState.pos += child.data.length;
					}

					if (nodeState.nodeStart && nodeState.nodeEnd) {
						// Select the range and wrap it with the clone
						var range = document.createRange();
						range.setStart(nodeState.nodeStart, nodeState.nodeStartPos);
						range.setEnd(nodeState.nodeEnd, nodeState.nodeEndPos);
						nodeState.node.clone.appendChild(range.extractContents());
						range.insertNode(nodeState.node.clone);
						range.detach();

						// Process is over
						return false;
					}
				}
				return true;
			};

			// For each tag, we walk the DOM to reinsert it
			env.keepMarkup.forEach(function (node) {
				walk(env.element, {
					node: node,
					pos: 0
				});
			});
			// Store new highlightedCode for later hooks calls
			env.highlightedCode = env.element.innerHTML;
		}
	});
}(self, document));

(function () {

	if (typeof self === 'undefined' || !self.Prism || !self.document) {
		return;
	}

	if (!Prism.plugins.toolbar) {
		console.warn('Show Languages plugin loaded before Toolbar plugin.');

		return;
	}

	// The languages map is built automatically with gulp
	var Languages = /*languages_placeholder[*/{
		"html": "HTML",
		"xml": "XML",
		"svg": "SVG",
		"mathml": "MathML",
		"css": "CSS",
		"clike": "C-like",
		"js": "JavaScript",
		"abap": "ABAP",
		"abnf": "Augmented Backus–Naur form",
		"antlr4": "ANTLR4",
		"g4": "ANTLR4",
		"apacheconf": "Apache Configuration",
		"apl": "APL",
		"aql": "AQL",
		"arff": "ARFF",
		"asciidoc": "AsciiDoc",
		"adoc": "AsciiDoc",
		"asm6502": "6502 Assembly",
		"aspnet": "ASP.NET (C#)",
		"autohotkey": "AutoHotkey",
		"autoit": "AutoIt",
		"shell": "Bash",
		"basic": "BASIC",
		"bbcode": "BBcode",
		"bnf": "Backus–Naur form",
		"rbnf": "Routing Backus–Naur form",
		"csharp": "C#",
		"cs": "C#",
		"dotnet": "C#",
		"cpp": "C++",
		"cil": "CIL",
		"coffee": "CoffeeScript",
		"cmake": "CMake",
		"csp": "Content-Security-Policy",
		"css-extras": "CSS Extras",
		"django": "Django/Jinja2",
		"jinja2": "Django/Jinja2",
		"dns-zone-file": "DNS zone file",
		"dns-zone": "DNS zone file",
		"dockerfile": "Docker",
		"ebnf": "Extended Backus–Naur form",
		"ejs": "EJS",
		"etlua": "Embedded Lua templating",
		"erb": "ERB",
		"fsharp": "F#",
		"firestore-security-rules": "Firestore security rules",
		"ftl": "FreeMarker Template Language",
		"gcode": "G-code",
		"gdscript": "GDScript",
		"gedcom": "GEDCOM",
		"glsl": "GLSL",
		"gml": "GameMaker Language",
		"gamemakerlanguage": "GameMaker Language",
		"graphql": "GraphQL",
		"hs": "Haskell",
		"hcl": "HCL",
		"http": "HTTP",
		"hpkp": "HTTP Public-Key-Pins",
		"hsts": "HTTP Strict-Transport-Security",
		"ichigojam": "IchigoJam",
		"inform7": "Inform 7",
		"javadoc": "JavaDoc",
		"javadoclike": "JavaDoc-like",
		"javastacktrace": "Java stack trace",
		"jq": "JQ",
		"jsdoc": "JSDoc",
		"js-extras": "JS Extras",
		"js-templates": "JS Templates",
		"json": "JSON",
		"jsonp": "JSONP",
		"json5": "JSON5",
		"latex": "LaTeX",
		"tex": "TeX",
		"context": "ConTeXt",
		"lilypond": "LilyPond",
		"ly": "LilyPond",
		"emacs": "Lisp",
		"elisp": "Lisp",
		"emacs-lisp": "Lisp",
		"lolcode": "LOLCODE",
		"md": "Markdown",
		"markup-templating": "Markup templating",
		"matlab": "MATLAB",
		"mel": "MEL",
		"moon": "MoonScript",
		"n1ql": "N1QL",
		"n4js": "N4JS",
		"n4jsd": "N4JS",
		"nand2tetris-hdl": "Nand To Tetris HDL",
		"nasm": "NASM",
		"nginx": "nginx",
		"nsis": "NSIS",
		"objectivec": "Objective-C",
		"ocaml": "OCaml",
		"opencl": "OpenCL",
		"parigp": "PARI/GP",
		"objectpascal": "Object Pascal",
		"pcaxis": "PC-Axis",
		"px": "PC-Axis",
		"php": "PHP",
		"phpdoc": "PHPDoc",
		"php-extras": "PHP Extras",
		"plsql": "PL/SQL",
		"powershell": "PowerShell",
		"properties": ".properties",
		"protobuf": "Protocol Buffers",
		"py": "Python",
		"q": "Q (kdb+ database)",
		"jsx": "React JSX",
		"tsx": "React TSX",
		"renpy": "Ren'py",
		"rest": "reST (reStructuredText)",
		"robot-framework": "Robot Framework",
		"robot": "Robot Framework",
		"rb": "Ruby",
		"sas": "SAS",
		"sass": "Sass (Sass)",
		"scss": "Sass (Scss)",
		"shell-session": "Shell session",
		"solidity": "Solidity (Ethereum)",
		"soy": "Soy (Closure Template)",
		"sparql": "SPARQL",
		"rq": "SPARQL",
		"splunk-spl": "Splunk SPL",
		"sqf": "SQF: Status Quo Function (Arma 3)",
		"sql": "SQL",
		"tap": "TAP",
		"toml": "TOML",
		"tt2": "Template Toolkit 2",
		"trig": "TriG",
		"ts": "TypeScript",
		"t4-cs": "T4 Text Templates (C#)",
		"t4": "T4 Text Templates (C#)",
		"t4-vb": "T4 Text Templates (VB)",
		"t4-templating": "T4 templating",
		"vbnet": "VB.Net",
		"vhdl": "VHDL",
		"vim": "vim",
		"visual-basic": "Visual Basic",
		"vb": "Visual Basic",
		"wasm": "WebAssembly",
		"wiki": "Wiki markup",
		"xeoracube": "XeoraCube",
		"xojo": "Xojo (REALbasic)",
		"xquery": "XQuery",
		"yaml": "YAML",
		"yml": "YAML"
	}/*]*/;

	Prism.plugins.toolbar.registerButton('show-language', function (env) {
		var pre = env.element.parentNode;
		if (!pre || !/pre/i.test(pre.nodeName)) {
			return;
		}

		/**
		 * Tries to guess the name of a language given its id.
		 *
		 * @param {string} id The language id.
		 * @returns {string}
		 */
		function guessTitle(id) {
			if (!id) {
				return id;
			}
			return (id.substring(0, 1).toUpperCase() + id.substring(1)).replace(/s(?=cript)/, 'S');
		}

		var language = pre.getAttribute('data-language') || Languages[env.language] || guessTitle(env.language);

		if (!language) {
			return;
		}
		var element = document.createElement('span');
		element.textContent = language;

		return element;
	});

})();

(function(){
	if (typeof self === 'undefined' || !self.Prism || !self.document) {
		return;
	}

	if (!Prism.plugins.toolbar) {
		console.warn('Copy to Clipboard plugin loaded before Toolbar plugin.');

		return;
	}

	var ClipboardJS = window.ClipboardJS || undefined;

	if (!ClipboardJS && typeof require === 'function') {
		ClipboardJS = require('clipboard');
	}

	var callbacks = [];

	if (!ClipboardJS) {
		var script = document.createElement('script');
		var head = document.querySelector('head');

		script.onload = function() {
			ClipboardJS = window.ClipboardJS;

			if (ClipboardJS) {
				while (callbacks.length) {
					callbacks.pop()();
				}
			}
		};

		script.src = 'https://cdnjs.cloudflare.com/ajax/libs/clipboard.js/2.0.0/clipboard.min.js';
		head.appendChild(script);
	}

	Prism.plugins.toolbar.registerButton('copy-to-clipboard', function (env) {
		var linkCopy = document.createElement('button');
		linkCopy.textContent = 'Copy';

		if (!ClipboardJS) {
			callbacks.push(registerClipboard);
		} else {
			registerClipboard();
		}

		return linkCopy;

		function registerClipboard() {
			var clip = new ClipboardJS(linkCopy, {
				'text': function () {
					return env.code;
				}
			});

			clip.on('success', function() {
				linkCopy.textContent = 'Copied!';

				resetText();
			});
			clip.on('error', function () {
				linkCopy.textContent = 'Press Ctrl+C to copy';

				resetText();
			});
		}

		function resetText() {
			setTimeout(function () {
				linkCopy.textContent = 'Copy';
			}, 5000);
		}
	});
})();

(function () {
	if (typeof self === 'undefined' || !self.Prism || !self.document || !document.querySelector) {
		return;
	}

	Prism.plugins.toolbar.registerButton('download-file', function (env) {
		var pre = env.element.parentNode;
		if (!pre || !/pre/i.test(pre.nodeName) || !pre.hasAttribute('data-src') || !pre.hasAttribute('data-download-link')) {
			return;
		}
		var src = pre.getAttribute('data-src');
		var a = document.createElement('a');
		a.textContent = pre.getAttribute('data-download-link-label') || 'Download';
		a.setAttribute('download', '');
		a.href = src;
		return a;
	});

})();

(function () {

	if (typeof self === 'undefined' || !self.Prism || !self.document) {
		return;
	}

	var MATCH_ALL_CLASS = /(?:^|\s)match-braces(?:\s|$)/;

	var BRACE_HOVER_CLASS = /(?:^|\s)brace-hover(?:\s|$)/;
	var BRACE_SELECTED_CLASS = /(?:^|\s)brace-selected(?:\s|$)/;

	var NO_BRACE_HOVER_CLASS = /(?:^|\s)no-brace-hover(?:\s|$)/;
	var NO_BRACE_SELECT_CLASS = /(?:^|\s)no-brace-select(?:\s|$)/;

	var PARTNER = {
		'(': ')',
		'[': ']',
		'{': '}',
	};

	var NAMES = {
		'(': 'brace-round',
		'[': 'brace-square',
		'{': 'brace-curly',
	};

	var LEVEL_WARP = 12;

	var pairIdCounter = 0;

	var BRACE_ID_PATTERN = /^(pair-\d+-)(open|close)$/;

	/**
	 * Returns the brace partner given one brace of a brace pair.
	 *
	 * @param {HTMLElement} brace
	 * @returns {HTMLElement}
	 */
	function getPartnerBrace(brace) {
		var match = BRACE_ID_PATTERN.exec(brace.id);
		return document.querySelector('#' + match[1] + (match[2] == 'open' ? 'close' : 'open'));
	}

	/**
	 * @this {HTMLElement}
	 */
	function hoverBrace() {
		for (var parent = this.parentElement; parent; parent = parent.parentElement) {
			if (NO_BRACE_HOVER_CLASS.test(parent.className)) {
				return;
			}
		}

		[this, getPartnerBrace(this)].forEach(function (ele) {
			ele.className = (ele.className.replace(BRACE_HOVER_CLASS, ' ') + ' brace-hover').replace(/\s+/g, ' ');
		});
	}
	/**
	 * @this {HTMLElement}
	 */
	function leaveBrace() {
		[this, getPartnerBrace(this)].forEach(function (ele) {
			ele.className = ele.className.replace(BRACE_HOVER_CLASS, ' ');
		});
	}
	/**
	 * @this {HTMLElement}
	 */
	function clickBrace() {
		for (var parent = this.parentElement; parent; parent = parent.parentElement) {
			if (NO_BRACE_SELECT_CLASS.test(parent.className)) {
				return;
			}
		}

		[this, getPartnerBrace(this)].forEach(function (ele) {
			ele.className = (ele.className.replace(BRACE_SELECTED_CLASS, ' ') + ' brace-selected').replace(/\s+/g, ' ');
		});
	}

	Prism.hooks.add('complete', function (env) {

		/** @type {HTMLElement} */
		var code = env.element;
		var pre = code.parentElement;

		if (!pre || pre.tagName != 'PRE') {
			return;
		}

		// find the braces to match
		/** @type {string[]} */
		var toMatch = [];
		for (var ele = code; ele; ele = ele.parentElement) {
			if (MATCH_ALL_CLASS.test(ele.className)) {
				toMatch.push('(', '[', '{');
				break;
			}
		}

		if (toMatch.length == 0) {
			// nothing to match
			return;
		}

		if (!pre.__listenerAdded) {
			// code blocks might be highlighted more than once
			pre.addEventListener('mousedown', function removeBraceSelected() {
				// the code element might have been replaced
				var code = pre.querySelector('code');
				Array.prototype.slice.call(code.querySelectorAll('.brace-selected')).forEach(function (element) {
					element.className = element.className.replace(BRACE_SELECTED_CLASS, ' ');
				});
			});
			Object.defineProperty(pre, '__listenerAdded', { value: true });
		}

		/** @type {HTMLSpanElement[]} */
		var punctuation = Array.prototype.slice.call(code.querySelectorAll('span.token.punctuation'));

		/** @type {{ index: number, open: boolean, element: HTMLElement }[]} */
		var allBraces = [];

		toMatch.forEach(function (open) {
			var close = PARTNER[open];
			var name = NAMES[open];

			/** @type {[number, number][]} */
			var pairs = [];
			/** @type {number[]} */
			var openStack = [];

			for (var i = 0; i < punctuation.length; i++) {
				var element = punctuation[i];
				if (element.childElementCount == 0) {
					var text = element.textContent;
					if (text === open) {
						allBraces.push({ index: i, open: true, element: element });
						element.className += ' ' + name;
						element.className += ' brace-open';
						openStack.push(i);
					} else if (text === close) {
						allBraces.push({ index: i, open: false, element: element });
						element.className += ' ' + name;
						element.className += ' brace-close';
						if (openStack.length) {
							pairs.push([i, openStack.pop()]);
						}
					}
				}
			}

			pairs.forEach(function (pair) {
				var pairId = 'pair-' + (pairIdCounter++) + '-';

				var openEle = punctuation[pair[0]];
				var closeEle = punctuation[pair[1]];

				openEle.id = pairId + 'open';
				closeEle.id = pairId + 'close';

				[openEle, closeEle].forEach(function (ele) {
					ele.addEventListener('mouseenter', hoverBrace);
					ele.addEventListener('mouseleave', leaveBrace);
					ele.addEventListener('click', clickBrace);
				});
			});
		});

		var level = 0;
		allBraces.sort(function (a, b) { return a.index - b.index; });
		allBraces.forEach(function (brace) {
			if (brace.open) {
				brace.element.className += ' brace-level-' + (level % LEVEL_WARP + 1);
				level++;
			} else {
				level = Math.max(0, level - 1);
				brace.element.className += ' brace-level-' + (level % LEVEL_WARP + 1);
			}
		});

	});

}());

(function () {

	if (typeof Prism === 'undefined' || !Prism.languages['diff']) {
		return;
	}


	var LANGUAGE_REGEX = /diff-([\w-]+)/i;
	var HTML_TAG = /<\/?(?!\d)[^\s>\/=$<%]+(?:\s(?:\s*[^\s>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+(?=[\s>]))|(?=[\s/>])))+)?\s*\/?>/gi;
	//this will match a line plus the line break while ignoring the line breaks HTML tags may contain.
	var HTML_LINE = RegExp(/(?:__|[^\r\n<])*(?:\r\n?|\n|(?:__|[^\r\n<])(?![^\r\n]))/.source.replace(/__/g, HTML_TAG.source), 'gi');

	var PREFIXES = Prism.languages.diff.PREFIXES;


	Prism.hooks.add('before-sanity-check', function (env) {
		var lang = env.language;
		if (LANGUAGE_REGEX.test(lang) && !env.grammar) {
			env.grammar = Prism.languages[lang] = Prism.languages['diff'];
		}
	});
	Prism.hooks.add('before-tokenize', function (env) {
		var lang = env.language;
		if (LANGUAGE_REGEX.test(lang) && !Prism.languages[lang]) {
			Prism.languages[lang] = Prism.languages['diff'];
		}
	});

	Prism.hooks.add('wrap', function (env) {
		var diffLanguage, diffGrammar;

		if (env.language !== 'diff') {
			var langMatch = LANGUAGE_REGEX.exec(env.language);
			if (!langMatch) {
				return; // not a language specific diff
			}

			diffLanguage = langMatch[1];
			diffGrammar = Prism.languages[diffLanguage];
		}

		// one of the diff tokens without any nested tokens
		if (env.type in PREFIXES) {
			/** @type {string} */
			var content = env.content.replace(HTML_TAG, ''); // remove all HTML tags

			/** @type {string} */
			var decoded = content.replace(/&lt;/g, '<').replace(/&amp;/g, '&');

			// remove any one-character prefix
			var code = decoded.replace(/(^|[\r\n])./g, '$1');

			// highlight, if possible
			var highlighted;
			if (diffGrammar) {
				highlighted = Prism.highlight(code, diffGrammar, diffLanguage);
			} else {
				highlighted = Prism.util.encode(code);
			}

			// get the HTML source of the prefix token
			var prefixToken = new Prism.Token('prefix', PREFIXES[env.type], [/\w+/.exec(env.type)[0]]);
			var prefix = Prism.Token.stringify(prefixToken, env.language);

			// add prefix
			var lines = [], m;
			HTML_LINE.lastIndex = 0;
			while (m = HTML_LINE.exec(highlighted)) {
				lines.push(prefix + m[0]);
			}
			if (/(?:^|[\r\n]).$/.test(decoded)) {
				// because both "+a\n+" and "+a\n" will map to "a\n" after the line prefixes are removed
				lines.push(prefix);
			}
			env.content = lines.join('');

			if (diffGrammar) {
				env.classes.push('language-' + diffLanguage);
			}
		}
	});

}());

