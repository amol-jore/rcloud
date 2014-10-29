RCloud.UI.command_prompt = (function() {
    var show_prompt_ = false, // start hidden so it won't flash if user has it turned off
        readonly_ = true;
    function show_or_hide() {
        var prompt_div = $('#prompt-div'),
            prompt = $('#command-prompt'),
            controls = $('#prompt-div .cell-status .cell-controls');
        if(readonly_)
            prompt_div.hide();
        else {
            prompt_div.show();
            if(show_prompt_) {
                prompt.show();
                controls.removeClass('flipped');
            }
            else {
                prompt.hide();
                controls.addClass('flipped');
            }
        }
    }
    return {
        prompt: null,
        history: null,
        init: function() {
            var prompt = $(RCloud.UI.panel_loader.load_snippet('command-prompt-snippet'));
            $('#rcloud-cellarea').append(prompt);
            $("#insert-new-cell").click(function() {
                var language = RCloud.UI.command_prompt.get_language();
                shell.new_cell("", language, false);
                var vs = shell.notebook.view.sub_views;
                vs[vs.length-1].show_source();
            });
            $("#insert-cell-language").change(function() {
                window.localStorage["last_cell_lang"] = RCloud.UI.command_prompt.get_language();
            });
            this.history = this.setup_prompt_history();
            this.prompt = this.setup_command_prompt();
        },
        show_prompt: function(val) {
            if(!arguments.length)
                return show_prompt_;
            show_prompt_ = val;
            show_or_hide();
            return this;
        },
        readonly: function(val) {
            if(!arguments.length)
                return readonly_;
            readonly_ = val;
            show_or_hide();
            return this;
        },
        get_language: function() {
            return $("#insert-cell-language option:selected").text();
        },
        focus: function() {
            // surely not the right way to do this
            if (!this.prompt)
                return;
            this.prompt.widget.focus();
            this.prompt.restore();
        },
        setup_prompt_history: function() {
            var entries_ = [], alt_ = [];
            var curr_ = 0;
            function curr_cmd() {
                return alt_[curr_] || (curr_<entries_.length ? entries_[curr_] : "");
            }
            var prefix_ = null;
            var result = {
                init: function() {
                    prefix_ = "rcloud.history." + shell.gistname() + ".";
                    var i = 0;
                    entries_ = [];
                    alt_ = [];
                    var last_lang = window.localStorage["last_cell_lang"] || "R";
                    while(1) {
                        var cmd = window.localStorage[prefix_+i],
                            cmda = window.localStorage[prefix_+i+".alt"];
                        if(cmda !== undefined)
                            alt_[i] = cmda;
                        if(cmd === undefined)
                            break;
                        entries_.push(cmd);
                        ++i;
                    }
                    curr_ = entries_.length;
                    return {"cmd":curr_cmd(),"lang":last_lang};
                },
                execute: function(cmd) {
                    if(cmd==="") return;
                    alt_[entries_.length] = null;
                    entries_.push(cmd);
                    alt_[curr_] = null;
                    curr_ = entries_.length;
                    window.localStorage[prefix_+(curr_-1)] = cmd;
                },
                has_last: function() {
                    return curr_>0;
                },
                last: function() {
                    if(curr_>0) --curr_;
                    return curr_cmd();
                },
                has_next: function() {
                    return curr_<entries_.length;
                },
                next: function() {
                    if(curr_<entries_.length) ++curr_;
                    return curr_cmd();
                },
                change: function(cmd) {
                    window.localStorage[prefix_+curr_+".alt"] = alt_[curr_] = cmd;
                }
            };
            return result;
        },

        setup_command_prompt: function() {
            var that = this;
            var prompt_div = $("#command-prompt");
            if (!prompt_div.length)
                return null;
            function set_ace_height() {
                var EXTRA_HEIGHT = 6;
                prompt_div.css({'height': (ui_utils.ace_editor_height(widget) + EXTRA_HEIGHT) + "px"});
                widget.resize();
                shell.scroll_to_end(0);
            }
            prompt_div.css({'background-color': "#fff"});
            prompt_div.addClass("r-language-pseudo");
            ace.require("ace/ext/language_tools");
            var widget = ace.edit(prompt_div[0]);
            set_ace_height();
            var RMode = ace.require("ace/mode/r").Mode;
            var session = widget.getSession();
            var doc = session.doc;
            widget.setOptions({
                enableBasicAutocompletion: true
            });
            session.setMode(new RMode(false, doc, session));
            session.on('change', set_ace_height);

            widget.setTheme("ace/theme/chrome");
            session.setUseWrapMode(true);
            widget.resize();
            var change_prompt = ui_utils.ignore_programmatic_changes(widget, this.history.change.bind(this.history));
            function execute(widget, args, request) {
                var code = session.getValue();
                if(code.length) {
                    shell.new_cell(code, that.get_language(), true);
                    change_prompt('');
                }
            }

            function last_row(widget) {
                var doc = widget.getSession().getDocument();
                return doc.getLength()-1;
            }

            function last_col(widget, row) {
                var doc = widget.getSession().getDocument();
                return doc.getLine(row).length;
            }

            function restore_prompt() {
                var prop = that.history.init();
                change_prompt(prop.cmd);
                $("#insert-cell-language").val(prop.lang);
                var r = last_row(widget);
                ui_utils.ace_set_pos(widget, r, last_col(widget, r));
            }

            ui_utils.install_common_ace_key_bindings(widget, this.get_language.bind(this));

            var up_handler = widget.commands.commandKeyBinding[0].up,
                down_handler = widget.commands.commandKeyBinding[0].down;
            widget.commands.addCommands([{
                name: 'execute',
                bindKey: {
                    win: 'Return',
                    mac: 'Return',
                    sender: 'editor'
                },
                exec: execute
            }, {
                name: 'execute-2',
                bindKey: {
                    win: 'Alt-Return',
                    mac: 'Alt-Return',
                    sender: 'editor'
                },
                exec: execute
            }, {
                name: 'up-with-history',
                bindKey: 'up',
                exec: function(widget, args, request) {
                    var pos = widget.getCursorPositionScreen();
                    if(pos.row > 0)
                        up_handler.exec(widget, args, request);
                    else {
                        if(that.history.has_last()) {
                            change_prompt(that.history.last());
                            var r = widget.getSession().getScreenLength();
                            ui_utils.ace_set_pos(widget, r, pos.column);
                        }
                        else
                            ui_utils.ace_set_pos(widget, 0, 0);
                    }
                }
            }, {
                name: 'down-with-history',
                bindKey: 'down',
                exec: function(widget, args, request) {
                    var pos = widget.getCursorPositionScreen();
                    var r = widget.getSession().getScreenLength();
                    if(pos.row < r-1)
                        down_handler.exec(widget, args, request);
                    else {
                        if(that.history.has_next()) {
                            change_prompt(that.history.next());
                            ui_utils.ace_set_pos(widget, 0, pos.column);
                        }
                        else {
                            r = last_row(widget);
                            ui_utils.ace_set_pos(widget, r, last_col(widget, r));
                        }
                    }
                }
            }
                                        ]);
            ui_utils.make_prompt_chevron_gutter(widget);

            return {
                widget: widget,
                restore: restore_prompt
            };
        }
    };
})();
