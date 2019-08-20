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
                    '<h3 id="GroupInvitationsTitle" class="spoiler menu" data-spoiler-link="GroupInvitations">Group Invitations</h3>'+
                    '<div id="GroupInvitations" class="spoiler-content" data-spoiler-link="GroupInvitations"/>'+
                    '<h3 id="GroupMembershipTitle" class="spoiler menu"data-spoiler-link="GroupMembership">Group Memberships</h3>'+
                    '<div id="GroupMembership" class="spoiler-content" data-spoiler-link="GroupMembership"/> '+      
                    '<h3 id="GroupBroadcastsTitle" class="spoiler menu" data-spoiler-link="GroupBroadcasts">Group Broadcasts</h3>'+
                    '<div id="GroupBroadcasts" class="spoiler-content" data-spoiler-link="GroupBroadcasts"/> '))
            .ready(function() {
                $(".spoiler").off("click").spoiler({ triggerEvents: true });
                GroupsController.load_groups_data(callback);
            });
    },
    searchBroadcast: function (query) {
        if (typeof query == 'string')
            input.val(query);
        PeriscopeWrapper.V2_POST_Api('broadcastSearch', {
            search: input.val(),
            include_replay: $('#includeReplays')[0].checked
        }, refreshList($('#GroupBroadcasts'), '<h3>Search results for ' + input.val()+'</h3>'));
    },
    add_channel: function (channels, channel) {
        channel.ThumbnailURLs.sort(function (a, b) {
            return a.width * a.height - b.width * b.height;
        });
        
        var Name = $('<a>' + '<span class="groupNameTitle">Name: </span>' + '<span class="groupName">' + emoji.replace_unified(channel.Name) + '</span>' + '</a>').click(GroupsController.searchBroadcast.bind(null, channel.Name));
        var PublicTag = $('<a>' + channel.PublicTag + '</a>').click(GroupsController.searchBroadcast.bind(null, channel.PublicTag));
        var PublicChannel = $('<a>' + '<span class="groupNameTitle">Name: </span>' + '<span class="groupName">' + emoji.replace_unified(channel.Name) + '</span>' + '</a>')
        .click(PeriscopeWrapper.V1_GET_ApiChannels.bind(null, function (channelName) {
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

        var channel_description = $('<div class="groupCard description"/>')
            .append(
                $('<a class="groupAvatar"><img class="avatar" width="64" lazysrc="' + channel.ThumbnailURLs[0].url + '"/>' +'</a>').click(function () {
                    var win = window.open("", "groupAvatar", "toolbar=no,location=no,directories=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=600,height=600,top=100,left="+(screen.width/2));
                    win.document.write('<img src="' + channel.ThumbnailURLs[channel.ThumbnailURLs.length - 1].url + '"/>');
                })
            )
            .append(
                '<div class="lives right icon" title="Lives / Replays">' + channel.NLive + ' / ' + channel.NReplay + '</div>',
                PublicChannel, (channel.Featured ? ' FEATURED<br>' : ''), '<br>',
                (channel.PublicTag ? ['Tags: ', Name, ', ', PublicTag, '<br>'] : ''),
                'Description: ' + channel.Description);
            
        channels.append(channel_description);
        return channel_description;
    },
    load_group_membership: function(channels, loginTwitter){
        var defer = $.Deferred();
        channels.empty();
        var channels_url_root = 'https://channels.pscp.tv/v1/users/' + loginTwitter.user.id + '/channels';
        PeriscopeWrapper.V1_GET_ApiChannels(function (response) {
            if (!response.Channels)
            {
                defer.resolve();
                return defer;
            }
            
            for (var i in response.Channels) {
                var channel_description = GroupsController.add_channel(channels, response.Channels[i]);
                var channel_members_url = "https://channels.pscp.tv/v1/channels/" + response.Channels[i].CID + "/members/" + loginTwitter.user.id;
                var owner_id =  response.Channels[i].OwnerId;
                channel_description
                    .append($('<a class="button right">leave</a>').click(function () { 
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
                     }))
                     .append("<br/>Members: ")
                     .append($('<a>' + response.Channels[i].NMember + '</a>').click(function () { window.alert("Not yet implemented"); }))
                     .append("<br/>Owner: ")
                     .append($('<a>' + owner_id + '</a>').click(switchSection.bind(null, 'User', owner_id)))
                     .append("<br/>");
                $(window).trigger('scroll');    // for lazy load
            }
            $('#GroupMembershipTitle')[0].innerText = response.Channels.length + " Group Memberships";
            defer.resolve();
        }, channels_url_root);
        return defer;
    },
    load_group_invites: function(channels, loginTwitter){
        var defer = $.Deferred();
        channels.empty();
        var channels_url_root = 'https://channels.pscp.tv/v1/users/' + loginTwitter.user.id + '/pending-invites';
        PeriscopeWrapper.V1_GET_ApiChannels(function (response) {
            if (!response.ChannelsWithMembership)
            {
                defer.resolve();
                return defer;
            }

            for (var i in response.ChannelsWithMembership) {
                var channel_description = GroupsController.add_channel(channels, response.ChannelsWithMembership[i].Channel);
                var inviter_id = response.ChannelsWithMembership[i].Membership.Inviter;
                var channel_members_url = "https://channels.pscp.tv/v1/channels/" + response.ChannelsWithMembership[i].Channel.CID + "/members/" + loginTwitter.user.id
                channel_description
                    .append($('<a class="button right">reject</a>').click(function () { 
                        PeriscopeWrapper.V1_ApiChannels(
                            function (response) {
                                GroupsController.load_groups_data(GroupsController.caller_callback);
                            }, 
                            channel_members_url, 
                            null, 
                            null,
                            "DELETE");                        
                     } ))
                     .append($('<a class="button right">accept</a>').click(function () { 
                        PeriscopeWrapper.V1_ApiChannels(
                            function (response) {
                                GroupsController.load_groups_data(GroupsController.caller_callback);
                            }, 
                            channel_members_url, 
                            null, 
                            {"AcceptInvite":true},
                            "PATCH");
                     } ))
                     .append("<br/>Members: ")
                     .append($('<a>' + response.ChannelsWithMembership[i].Channel.NMember + '</a>').click(function () { window.alert("Not yet implemented"); }))
                     .append("<br/>Inviter: ")
                     .append($('<a>' + inviter_id + '</a>').click(switchSection.bind(null, 'User', inviter_id)))
                     .append("<br/>")
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
