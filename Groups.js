var GroupsController = {
    init: function(parent, callback) {
        parent.append(
            '<div id="Groups">'+
            '<h3 id="GroupInvitationsTitle" class="accordion">Group Invitations</h3>'+
            '<div id="GroupInvitations" class="panel"/>'+
            '<h3 id="GroupMembershipTitle" class="accordion">Group Memberships</h3>'+
            '<div id="GroupMembership" class="panel"> '+      
            '</div>').ready(function() {
                GroupsController.load_groups_data(callback);
            });
    },
    load_group_membership: function(channels, loginTwitter){
        defer = $.Deferred();
        channels.empty();
        var channels_url_root = 'https://channels.pscp.tv/v1/users/' + loginTwitter.user.id + '/channels';
        PeriscopeWrapper.V1_GET_ApiChannels(function (response) {
            channels.empty();
            for (var i in response.Channels) {
                debugger;
                var channel = response.Channels[i];
                var Name = $('<a>' + channel.Name + '</a>');
                var PublicTag = $('<a>' + channel.PublicTag + '</a>');
                var PublicChannel = $('<a>' + channel.Name + '</a>');
                // }(channel.Name), 'https://channels.periscope.tv/v1/channels/' + channel.CID + '/broadcasts', langDt));
                channels.append($('<p/>').append('<div class="lives right icon" title="Lives / Replays">' + channel.NLive + ' / ' + channel.NReplay + '</div>',
                    PublicChannel, (channel.Featured ? ' FEATURED<br>' : ''), '<br>',
                    (channel.PublicTag ? ['Tags: ', Name, ', ', PublicTag, '<br>'] : ''),
                    'Description: ' + channel.Description)
                );
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
            channels.empty();
            for (var i in response.ChannelsWithMembership) {
                var channel = response.ChannelsWithMembership[i].Channel;
                var Name = $('<a>' + channel.Name + '</a>');
                var PublicTag = $('<a>' + channel.PublicTag + '</a>');
                var PublicChannel = $('<a>' + channel.Name + '</a>');
                // }(channel.Name), 'https://channels.periscope.tv/v1/channels/' + channel.CID + '/broadcasts', langDt));
                channels.append($('<p/>').append('<div class="lives right icon" title="Lives / Replays">' + channel.NLive + ' / ' + channel.NReplay + '</div>',
                    PublicChannel, (channel.Featured ? ' FEATURED<br>' : ''), '<br>',
                    (channel.PublicTag ? ['Tags: ', Name, ', ', PublicTag, '<br>'] : ''),
                    'Description: ' + channel.Description)
                );
            }
            $('#GroupInvitationsTitle')[0].innerText = response.ChannelsWithMembership.length + " Group Invitations";
            defer.resolve();
        }, channels_url_root);
        return defer;
    },
    load_groups_data: function(callback){
        loginTwitter = localStorage.getItem('loginTwitter');
        loginTwitter = JSON.parse(loginTwitter);

        GroupsController.load_group_invites($('#GroupInvitations'), loginTwitter)
        .done(function (){
            GroupsController.load_group_membership($('#GroupMembership'), loginTwitter)
            .done(function (){
                callback();
            });
        });
    }
}
