var GroupsController = {
    caller_callback: null,
    init: function(parent, callback) {
        this.caller_callback = callback;
        var button = $('<a class="button" id="refreshGroups">Refresh</a>').click(
            GroupsController.load_groups_data.bind(this, this.caller_callback)
            );
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

        channel_description = $('<div class="description"/>')
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
                'Description: ' + channel.Description);
            
        channels.append(channel_description).append($('<p/><br/><br/><br/><br/><br/>')); // I'm not very good with CSS I guess we could format this as table!
        return channel_description;
    },
    load_group_membership: function(channels, loginTwitter){
        defer = $.Deferred();
        channels.empty();
        var channels_url_root = 'https://channels.pscp.tv/v1/users/' + loginTwitter.user.id + '/channels';
        PeriscopeWrapper.V1_GET_ApiChannels(function (response) {
            for (var i in response.Channels) {
                channel_description = GroupsController.add_channel(channels, response.Channels[i]);
                var channel_members_url = "https://channels.pscp.tv/v1/channels/" + response.Channels[i].CID + "/members/" + loginTwitter.user.id
                var owner_id =  response.Channels[i].OwnerId;
                channel_description
                    .append("<br/>Members: ")
                    .append($('<a>' + response.Channels[i].NMember + '</a>').click(function () { window.alert("Not yet implemented"); }))
                    .append("<br/>Owner: ")
                    .append($('<a>' + owner_id + '</a>').click(switchSection.bind(null, 'User', owner_id)))
                    .append("<br/>")
                    .append($('<a class="button">leave</a>').click(function () { 
                        if (confirm('Are you sure you want to leave the group "'+response.Channels[i].Name+'"?')) {
                            PeriscopeWrapper.V1_ApiChannels(
                                function (response) {
                                    GroupsController.load_groups_data(GroupsController.caller_callback);
                                }, 
                                channel_members_url, 
                                null, 
                                null,
                                "DELETE");                             
                            }
                     } ));
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
                var channel_description = GroupsController.add_channel(channels, response.ChannelsWithMembership[i].Channel);
                var inviter_id = response.ChannelsWithMembership[i].Membership.Inviter;
                var channel_members_url = "https://channels.pscp.tv/v1/channels/" + response.ChannelsWithMembership[i].Channel.CID + "/members/" + loginTwitter.user.id
                channel_description
                    .append("<br/>Members: ")
                    .append($('<a>' + response.ChannelsWithMembership[i].Channel.NMember + '</a>').click(function () { window.alert("Not yet implemented"); }))
                    .append("<br/>Inviter: ")
                    .append($('<a>' + inviter_id + '</a>').click(switchSection.bind(null, 'User', inviter_id)))
                    .append("<br/>")
                    .append($('<a class="button">accept</a>').click(function () { 
                        PeriscopeWrapper.V1_ApiChannels(
                            function (response) {
                                GroupsController.load_groups_data(GroupsController.caller_callback);
                            }, 
                            channel_members_url, 
                            null, 
                            {"AcceptInvite":true},
                            "PATCH");
                     } ))
                    .append($('<a class="button">reject</a>').click(function () { 
                        PeriscopeWrapper.V1_ApiChannels(
                            function (response) {
                                GroupsController.load_groups_data(GroupsController.caller_callback);
                            }, 
                            channel_members_url, 
                            null, 
                            null,
                            "DELETE");                        
                     } ))
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
