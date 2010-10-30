// @require container.js

DEFINE_CLASS("DlLiteTree", DlContainer, function(D, P, DOM){

        D.DEFAULT_EVENTS = "onItemMouseDown onItemDblClick".qw();

        D.DEFAULT_ARGS = {
                items : [ "items" , null ],
                sort  : [ "sort"  , Function.identity ],

                _opt_toggleSelection : [ "toggleSelection", false ],

                _focusable : [ "focusable", true ]
        };

        D.FIXARGS = function(args) {
                Object.mergeUndefined(args, {
                        fillParent : true
                });
        };

        D.CONSTRUCT = function() {
                this.addEventListener({
                        onMouseDown: this._onMouseDown,
                        onDblClick: this._onDblClick
                });
        };

        P.reset = function(items) {
                this.top_items = items;
                this.setContent(this._buildHTML(items, 0));
                if (this._selection) this._selection.filter(this._itemsById);
        };

        P.setSelectionModel = function(sel) {
                if (this._selection) {
                        this._selection.removeEventListener(this._selListeners);
                } else if (!this._selListeners) {
                        this._selListeners = {
                                onChange: this.$("_on_selChange"),
                                onReset: this.$("_on_selReset")
                        };
                }
                this._selection = sel;
                sel.addEventListener(this._selListeners);
        };

        P.isSelected = function(item_id) {
                return this._selection && this._selection.isSelected(item_id);
        };

        P.refreshItems = function(ids) {
                ids.foreach(function(id){
                        var el = this._getItemElement(id);
                        if (el) {
                                var c = [ 'item-label'], item = this._itemsById[id];
                                if (this.isSelected(id)) c.push("selected");
                                item.addClassNames(c);
                                el.className = c.join(" ");
                                var buf = String.buffer("<span class='expander'></span>");
                                item.formatHTML(buf);
                                el.innerHTML = buf.get();
                        }
                }, this);
        };

        P.getItemById = function(id) {
                return this._itemsById[id];
        };

        P._buildHTML = function(items, level) {
                items = this.sort(items);
                if (items.length == 0) return "";
                if (level == null) level = 0;
                if (level == 0) this._itemsById = {};
                var html = String.buffer("<ul>");
                items.foreach(function(item){
                        var children = item.children();
                        var has_children = children.length > 0;
                        html("<li>");
                        var c = [ 'item-label' ], id = item.id();
                        item.addClassNames(c);
                        if (this.isSelected(id)) c.push("selected");
                        if (has_children) c.push("expanded");
                        html("<div id='", this._makeId(id), "' lite-tree-item='", id, "' class='", c.join(' '), "'><span class='expander'></span>");
                        item.formatHTML(html);
                        html("</div>", this._buildHTML(children, level + 1), "</li>");
                        this._itemsById[item.id()] = item;
                }, this);
                html("</ul>");
                return html.get();
        };

        P._makeId = function(id) {
                return this.id + ":" + id;
        };

        P._findItemFromEvent = function(ev) {
                var ret = {}, p = ev.target;
                while (p && p.nodeType == 1) {
                        var id = p.getAttribute("lite-tree-item");
                        if (id != null) {
                                ret.el = p;
                                ret.id = id;
                                ret.item = this._itemsById[id];
                                return ret;
                        }
                        if (p.className == "expander") {
                                ret.expander = p;
                        }
                        p = p.parentNode;
                }
        };

        P._getItemElement = function(item_id) {
                return document.getElementById(this._makeId(item_id));
        };

        P.__handleSelectClick = function(clicked, ev, dblClick) {
                var sel = this._selection;
                var hooks_args = [ this._itemsById[clicked.id], clicked, ev ];
                if (dblClick) {
                        if (sel && !sel.isSelected(clicked.id))
                                sel.reset([ clicked.id ]);
                        this.applyHooks("onItemDblClick", hooks_args);
                        return;
                }
                if (!sel || clicked.expander) {
                        var subtree = clicked.el.nextSibling;
                            if (subtree) {
                                    var was_hidden = DOM.hasClass(subtree, "hidden");
                                    DOM.condClass(subtree, !was_hidden, "hidden");
                                    DOM.condClass(clicked.el, was_hidden, "expanded", "collapsed");
                            }
                        this.applyHooks("onItemMouseDown", hooks_args);
                }
                else if (sel && clicked.item.isSelectable()) {
                        if (sel.multiple) {
                                if (ev.ctrlKey) {
                                        sel.toggle(clicked.id);
                                }
                                // else if (ev.shiftKey) {

                                // }
                                else sel.reset([ clicked.id ]);
                        } else {
                                if (this._opt_toggleSelection && sel.isSelected(clicked.id)) {
                                        sel.toggle(clicked.id);
                                } else {
                                        sel.reset([ clicked.id ]);
                                }
                        }
                }
        };

        var __prevTime = new Date().getTime();
        var __prevItem = null;
        P._onMouseDown = function(ev) {
                var clicked = this._findItemFromEvent(ev);
                var now = new Date().getTime();
                if (now - __prevTime < Dynarch.dblClickTimeout && clicked && __prevItem && clicked.id == __prevItem.id) {
                        this.__handleSelectClick(clicked, ev, true);
                } else if (clicked) {
                        __prevTime = now;
                        this.__handleSelectClick(clicked, ev, false);
                }
                __prevItem = clicked;
        };

        P._on_selChange = function(id, selected) {
                DOM.condClass(this._getItemElement(id), selected, "selected");
        };

        P._on_selReset = function(oldSel, newSel) {
                Object.foreach(oldSel, function(val, key){
                        DOM.delClass(this._getItemElement(key), "selected");
                }, this);
                Object.foreach(newSel, function(val, key){
                        DOM.addClass(this._getItemElement(key), "selected");
                }, this);
        };

        D.Item = DEFINE_HIDDEN_CLASS(null, DlEventProxy, function(D, P){
                D.DEFAULT_ARGS = {
                        _name     : [ "name"     , null ],
                        _id       : [ "id"       , null ],
                        _children : [ "children" , null ]
                };
                D.CONSTRUCT = function() {
                        if (this._children == null) this._children = [];
                };
                P.formatHTML = function(buf){ buf(this._name) };
                P.addClassNames = Function.noop;
                P.id = function() { return this._id };
                P.children = function() { return this._children };
                P.isSelectable = Function.returnTrue;
        });

});