/* Minimal template runtime for the exported V8 page (Preact based). */
(function () {
  var P = window.preact, h = P.h;
  var BOOL = { autoplay: 1, muted: 1, loop: 1, playsinline: 1, controls: 1, disabled: 1, hidden: 1, checked: 1, selected: 1, readonly: 1, required: 1, multiple: 1, open: 1, inert: 1, reversed: 1, autofocus: 1, novalidate: 1, allowfullscreen: 1, default: 1 };
  var HOLE = /\{\{\s*([^}]+?)\s*\}\}/g;
  var WHOLE = /^\s*\{\{\s*([^}]+?)\s*\}\}\s*$/;

  function lookup(path, sc) {
    if (path === 'true') return true;
    if (path === 'false') return false;
    if (path === 'null') return null;
    if (/^-?\d+(\.\d+)?$/.test(path)) return parseFloat(path);
    if (/^(['"]).*\1$/.test(path)) return path.slice(1, -1);
    var parts = path.split('.'), v = sc;
    for (var i = 0; i < parts.length; i++) { if (v == null) return undefined; v = v[parts[i]]; }
    return v;
  }
  function str(v) { return v == null || v === false || v === true ? '' : String(v); }
  function interp(s, sc) { return s.replace(HOLE, function (_, p) { return str(lookup(p, sc)); }); }

  /* JSX-like whitespace handling for text nodes */
  function jsxText(t) {
    if (t.indexOf('\n') < 0) return t;
    var lines = t.split(/\r?\n/), out = [];
    for (var i = 0; i < lines.length; i++) {
      var l = lines[i].replace(/\t/g, ' ');
      if (i > 0) l = l.replace(/^ +/, '');
      if (i < lines.length - 1) l = l.replace(/ +$/, '');
      if (l) out.push(l);
    }
    return out.join(' ');
  }

  function compile(node) {
    if (node.nodeType === 3) {
      var t = jsxText(node.nodeValue);
      if (!t) return null;
      if (t.indexOf('{{') < 0) return function () { return t; };
      return function (sc) { return interp(t, sc); };
    }
    if (node.nodeType !== 1) return null;
    var tag = node.tagName.toLowerCase();
    var kids = compileKids(node.content || node);
    if (tag === 'sc-if') {
      var cond = node.getAttribute('value') || '';
      var m = WHOLE.exec(cond);
      return function (sc) { var v = m ? lookup(m[1], sc) : cond; return v ? runKids(kids, sc) : null; };
    }
    if (tag === 'sc-for') {
      var lm = WHOLE.exec(node.getAttribute('list') || ''), as = node.getAttribute('as') || 'item';
      return function (sc) {
        var list = lm ? lookup(lm[1], sc) : null;
        if (!list || !list.map) return null;
        return list.map(function (it, i) { var s2 = Object.create(sc); s2[as] = it; s2.$index = i; return runKids(kids, s2); });
      };
    }
    var type = node.namespaceURI === 'http://www.w3.org/2000/svg' ? node.tagName : tag;
    var attrs = [];
    for (var a = 0; a < node.attributes.length; a++) {
      var at = node.attributes[a], name = at.name, val = at.value;
      if (name.indexOf('hint-') === 0) continue;
      if (name === 'for') name = 'htmlFor';
      var wm = WHOLE.exec(val);
      if (wm) attrs.push([name, 1, wm[1]]);
      else if (val.indexOf('{{') >= 0) attrs.push([name, 2, val]);
      else attrs.push([name, 0, (val === '' && BOOL[name]) ? true : val]);
    }
    return function (sc) {
      var props = {};
      for (var i = 0; i < attrs.length; i++) {
        var A = attrs[i], v;
        if (A[1] === 0) v = A[2];
        else if (A[1] === 1) v = lookup(A[2], sc);
        else v = interp(A[2], sc);
        if (v == null || v === false) continue;
        if (A[1] === 1 && BOOL[A[0]] && v === '') v = true;
        props[A[0]] = v;
      }
      return h(type, props, runKids(kids, sc));
    };
  }
  function compileKids(n) {
    var out = [];
    for (var c = n.firstChild; c; c = c.nextSibling) { var f = compile(c); if (f) out.push(f); }
    return out;
  }
  function runKids(kids, sc) {
    var out = [];
    for (var i = 0; i < kids.length; i++) { var r = kids[i](sc); if (r != null) out.push(r); }
    return out;
  }

  var tplEl = document.getElementById('dc-template');
  var root = compileKids(tplEl.content);

  window.DCLogic = class extends P.Component {
    render() { var v = this.renderVals ? this.renderVals() : {}; return h(P.Fragment, null, runKids(root, v)); }
  };
  window.__dcMount = function (Comp, props) {
    P.render(h(Comp, props || {}), document.getElementById('app'));
  };
})();
