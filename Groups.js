var GroupsController = {
    init: function(parent, callback) {
        var button = $('<a class="button" id="refreshGroups">Refresh</a>').click(GroupsController.load_groups_data.bind(null, callback));
        parent
            .append($('<div id="Groups"/>')
                .append(button)
                .append(
                    '<h3 id="GroupInvitationsTitle" class="accordion">Group Invitations</h3>'+
                    '<div id="GroupInvitations" class="panel"/>'+
                    '<h3 id="GroupMembershipTitle" class="accordion">Group Memberships</h3>'+
                    '<div id="GroupMembership" class="panel"/> '+      
                    '<h3 id="GroupBroadcastsTitle" class="accordion">Group Broadcasts</h3>'+
                    '<div id="GroupBroadcasts" class="panel"/> '))
            .ready(function() {
                    GroupsController.load_groups_data(callback);
                });
    },
    searchBroadcast: function (query) {
        if (typeof query == 'string')
            input.val(query);
        PeriscopeWrapper.V2_POST_Api('broadcastSearch', {
            search: input.val(),
            include_replay: $('#includeReplays')[0].checked
        }, refreshList($('#GroupBroadcasts'), '<h3>Search results for '+input.val()+'</h3>'));
    },
    add_channel: function (channels, channel) {
        debugger;
        /**
         * hannel: Object
            CID: "15103934351520804891"
            CreatedAt: "2019-08-06T13:56:13.867854122Z"
            Description: ""
            Featured: false
            LastActivity: "2019-08-16T23:39:46.934868125Z"
            NLive: 2
            NMember: 937
            Name: "Sarah's shower group"
            OwnerId: "1eVjYODXrJYQL"
            PublicTag: ""
            Slug: ""
            ThumbnailURLs: Array[3]
            0: Object
            height: 128
            ssl_url: "https://channel-thumbnails-live.pscp.tv/15103934351520804891/1565983414-UqkhzBJCo5AyRMilEJ3HjIDnUQI%3D-128x128.png"
            url: "https://channel-thumbnails-live.pscp.tv/15103934351520804891/1565983414-UqkhzBJCo5AyRMilEJ3HjIDnUQI%3D-128x128.png"
            width: 128
            __proto__: Object
            1: Object
            2: Object
            length: 3
            __proto__: Array[0]
            Type: 1
            UniversalLocales: null
         */
        channel.ThumbnailURLs.sort(function (a, b) {
            return a.width * a.height - b.width * b.height;
        });

        var Name = $('<a>' + channel.Name + '</a>').click(GroupsController.searchBroadcast.bind(null, channel.Name));
        var PublicTag = $('<a>' + channel.PublicTag + '</a>').click(GroupsController.searchBroadcast.bind(null, channel.PublicTag));
        var PublicChannel = $('<a>' + channel.Name + '</a>').click(PeriscopeWrapper.V1_GET_ApiChannels.bind(null, function (channelName) {
            return function (chan) {
                var ids = [];
                for (var i in chan.Broadcasts)
                    ids.push(chan.Broadcasts[i].BID);
                PeriscopeWrapper.V2_POST_Api('getBroadcasts', {
                    broadcast_ids: ids,
                    only_public_publish: true
                }, refreshList($('#GroupBroadcasts'), '<h3>' + channelName + ', ' + chan.NLive + ' lives, ' + chan.NReplay + ' replays</h3>'));
            };
        }(channel.Name), 'https://channels.periscope.tv/v1/channels/' + channel.CID + '/broadcasts', null));
        channels
            .append($('<div class="description"/>')
                .append((
                    channel.ThumbnailURLs.length ?
                    '<a href="' + (
                        /* drkchange10*/channel.ThumbnailURLs[0].url.includes("googleusercontent.com/") ?
                        channel.ThumbnailURLs[0].url.replace("s96-c", "s0") :
                        channel.ThumbnailURLs[channel.ThumbnailURLs.length - 1].url) + '" target="_blank"><img class="avatar" width="128" lazysrc="' + channel.ThumbnailURLs[0].url +
                    '"></a>' :
                    '<img class="avatar" width="128"/>'))
                .append(
                    '<div class="lives right icon" title="Lives / Replays">' + channel.NLive + ' / ' + channel.NReplay + '</div>',
                    PublicChannel, (channel.Featured ? ' FEATURED<br>' : ''), '<br>',
                    (channel.PublicTag ? ['Tags: ', Name, ', ', PublicTag, '<br>'] : ''),
                    'Description: ' + channel.Description)
            )
            .append($('<p/><br/><br/><br/><br/><br/>')); // I'm not very good with CSS I guess we could format this as table!
    },
    load_group_membership: function(channels, loginTwitter){
        defer = $.Deferred();
        channels.empty();
        var channels_url_root = 'https://channels.pscp.tv/v1/users/' + loginTwitter.user.id + '/channels';
        PeriscopeWrapper.V1_GET_ApiChannels(function (response) {
            for (var i in response.Channels) {
                GroupsController.add_channel(channels, response.Channels[i]);
            }
            $('#GroupMembershipTitle')[0].innerText = response.Channels.length + " Group Memberships";
            defer.resolve();
        }, channels_url_root);
        return defer;
    },
    load_group_invites: function(channels, loginTwitter){
        defer = $.Deferred();
        channels.empty();
        var channels_url_root = 'https://channels.pscp.tv/v1/users/' + loginTwitter.user.id + '/pending-invites';
        PeriscopeWrapper.V1_GET_ApiChannels(function (response) {
            for (var i in response.ChannelsWithMembership) {
                GroupsController.add_channel(channels, response.ChannelsWithMembership[i].Channel);
            }
            $('#GroupInvitationsTitle')[0].innerText = response.ChannelsWithMembership.length + " Group Invitations";
            defer.resolve();
        }, channels_url_root, null);
        return defer;
    },
    reset_groups: function(){
        $('#GroupInvitations').empty();
        $('#GroupInvitationsTitle')[0].innerText = "Group Invitations";
        $('#GroupMembership').empty();
        $('#GroupMembershipTitle')[0].innerText = "Group Memberships";
        $('#GroupBroadcasts').empty();
    },
    load_groups_data: function(callback){
        loginTwitter = localStorage.getItem('loginTwitter');
        loginTwitter = JSON.parse(loginTwitter);

        GroupsController.reset_groups();

        GroupsController.load_group_invites($('#GroupInvitations'), loginTwitter)
        .done(function (){
            GroupsController.load_group_membership($('#GroupMembership'), loginTwitter)
            .done(function (){
                callback();
            });
        });
    }
}
