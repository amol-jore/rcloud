RCloud.UI.panel_loader = (function() {
    var panels_ = {};

    function collapse_name(name) {
        return 'collapse-' + name;
    }

    function add_panel(opts) {
        var parent_id = 'accordion-' + opts.side;
        var collapse_id = collapse_name(opts.name);
        var heading_attrs = {'class': 'panel-heading',
                                'data-toggle': 'collapse',
                                'data-parent': '#' + parent_id, // note: left was broken '#accordion'
                                'data-target': '#' + collapse_id};
        var title_span = $.el.span({'class': 'title-offset'},
                                   opts.title),
            icon = $.el.i({'class': opts.icon_class}),
            heading_link = $.el.a({'class': 'accordion-toggle ' + opts.side,
                                   'href': '#' + collapse_id},
                                  icon, '\u00a0', title_span);

        var heading_content = opts.panel.heading_content ? opts.panel.heading_content() : null;
        var heading;
        if(opts.side==='left') {
            heading = $.el.div(heading_attrs,
                               heading_link,
                               heading_content);
        }
        else if(opts.side==='right') {
            heading = $.el.div(heading_attrs,
                               heading_content,
                               heading_link);
        }
        else throw new Error('Unknown panel side ' + opts.side);

        var collapse_attrs = {'id': collapse_id,
                             'class': 'panel-collapse collapse',
                             'data-colwidth': opts.colwidth};
        if(opts.greedy)
            collapse_attrs['data-widgetheight'] = 'greedy';
        var collapse = $.el.div(collapse_attrs,
                                $.el.img({'height': '100%',
                                          'width': '5px',
                                          'src': opts.side==='left' ? '/img/right_bordergray.png' : '/img/left_bordergray.png',
                                          'class': 'panel-shadow ' + opts.side}),
                                opts.panel.body());
        var panel = $.el.div({'class': 'panel panel-default'},
                             heading, collapse);

        $('#' + parent_id).append(panel);
    }

    function add_filler_panel(side) {
        var parent_id = 'accordion-' + side;
        var body = $('<div/>', {'class': 'panel-body',
                                'style': 'border-top-color: transparent; background-color: #777'});
        for(var i=0; i<60; ++i)
            body.append($.el.br());
        var collapse = $.el.div({'class': 'panel-collapse out'},
                                body[0]);
        var panel = $.el.div({'class': 'panel panel-default'},
                             collapse);

        $('#' + parent_id).append(panel);
    }

    return {
        add: function(P) {
            _.extend(panels_, P);
        },
        init: function() {
            // built-in panels
            this.add({
                Notebooks: {
                    side: 'left',
                    name: 'notebook-tree',
                    title: 'Notebooks',
                    icon_class: 'icon-folder-open',
                    colwidth: 3,
                    greedy: true,
                    sort: 1000,
                    panel: RCloud.UI.notebooks_frame
                },
                Search: {
                    side: 'left',
                    name: 'search',
                    title: 'Search',
                    icon_class: 'icon-search',
                    colwidth: 4,
                    sort: 2000,
                    panel: RCloud.UI.search
                },
                Settings: {
                    side: 'left',
                    name: 'settings',
                    title: 'Settings',
                    icon_class: 'icon-cog',
                    colwidth: 3,
                    sort: 3000,
                    panel: RCloud.UI.settings_frame
                },
                Help: {
                    side: 'left',
                    name: 'help',
                    title: 'Help',
                    icon_class: 'icon-question',
                    colwidth: 5,
                    sort: 4000,
                    panel: RCloud.UI.help_frame
                },
                Assets: {
                    side: 'right',
                    name: 'assets',
                    title: 'Assets',
                    icon_class: 'icon-copy',
                    colwidth: 4,
                    sort: 1000,
                    panel: RCloud.UI.scratchpad
                },
                'File Upload': {
                    side: 'right',
                    name: 'file-upload',
                    title: 'File Upload',
                    icon_class: 'icon-upload',
                    colwidth: 2,
                    sort: 2000,
                    panel: RCloud.UI.upload_frame
                },
                Comments: {
                    side: 'right',
                    name: 'comments',
                    title: 'Comments',
                    icon_class: 'icon-comments',
                    colwidth: 2,
                    sort: 3000,
                    panel: RCloud.UI.comments_frame
                },
                Session: {
                    side: 'right',
                    name: 'session-info',
                    title: 'Session',
                    icon_class: 'icon-info',
                    colwidth: 3,
                    sort: 4000,
                    panel: RCloud.UI.session_pane
                }
            });
        },
        load_snippet: function(id) {
            // embed html snippets in edit.html as "html scripts"
            // technique described here: http://ejohn.org/blog/javascript-micro-templating/
            return $($('#' + id).html())[0];
        },
        load: function() {
            function do_side(panels, side) {
                function do_panel(p) {
                    add_panel(p);
                    // conceivably panels could be added to the DOM and initialized
                    // before we have a session, and then loaded once we have it.
                    // that's not currently how it works and i'm not sure if this
                    // init/load distinction makes sense or is consistent
                    if(p.panel.init)
                        p.panel.init();
                    if(p.panel.load)
                        p.panel.load();
                    if(p.panel.panel_sizer)
                        $('#' + collapse_name(p.name)).data("panel-sizer",p.panel.panel_sizer);
                    if(p.panel.heading_content_selector)
                        $('#' + collapse_name(p.name)).data("heading-content-selector", p.panel.heading_content_selector());
                }
                var chosen = _.filter(panels, function(p) { return p.side === side; });
                chosen.sort(function(a, b) { return a.sort - b.sort; });
                chosen.forEach(do_panel);
                add_filler_panel(side);
            }

            do_side(panels_, 'left');
            do_side(panels_, 'right');

            // this is dumb but i don't want the collapser to show until load time
            $('#left-column').append(this.load_snippet('left-pane-collapser-snippet'));
            $('#right-column').append(this.load_snippet('right-pane-collapser-snippet'));

            return Promise.cast(undefined); // until we are loading opts here
        }
    };
})();

