var GroupsController = {
    init: function(parent) {
        var button = $('<a class="button" id="refreshGroups">Refresh</a>').click(function(){
            $('#Groups').remove();
            GroupsController.init(parent);
        });
        var GroupInvitationsSpoiler = $('<h3 id="GroupInvitationsTitle" class="spoiler menu" data-spoiler-link="GroupInvitations">Group Invitations</h3>').on("jq-spoiler-visible", function() {
            var groupInvitationsContent = $('#GroupInvitations');
            if (!groupInvitationsContent.html())
                GroupsController.load_group_invites(groupInvitationsContent);
        });
        
        var GroupMembershipSpoiler = $('<h3 id="GroupMembershipTitle" class="spoiler menu"data-spoiler-link="GroupMembership">Group Memberships</h3>').on("jq-spoiler-visible", function() {
            var GroupMembershipContent = $('#GroupMembership');
            if (!GroupMembershipContent.html())
                GroupsController.load_group_membership(GroupMembershipContent);
        });

        parent
            .append($('<div id="Groups"/>')
                .append(button)
                .append(
                    GroupInvitationsSpoiler, '<div id="GroupInvitations" class="spoiler-content" data-spoiler-link="GroupInvitations"/>',
                    GroupMembershipSpoiler, '<div id="GroupMembership" class="spoiler-content" data-spoiler-link="GroupMembership"/> ',      
                    '<h3 id="GroupBroadcastsTitle" class="spoiler menu" data-spoiler-link="GroupBroadcasts">Group Broadcasts</h3>',
                    '<div id="GroupBroadcasts" class="spoiler-content" data-spoiler-link="GroupBroadcasts"/> '
                )
            );
        
        $(".spoiler").off('click').spoiler({ triggerEvents: true });
        this.delegate_click_events();
    },

    delegate_click_events: function(){
        $('div#Groups').off('click').click(function (event) {
            var groupCard = $(event.target).parents('div.groupCard')[0];
            if(groupCard){
                var buttons_container = event.target.parentElement;
                var cid = groupCard.getAttribute("cid");
                var cName = groupCard.getAttribute("cName");
                var channel_members_url = "https://channels.pscp.tv/v1/channels/" + cid + "/members/" + loginTwitter.user.id;
            

                if(event.target.classList.contains("groupNameContainer") || event.target.classList.contains("groupNameTitle") || event.target.parentElement.classList.contains("groupName") || event.target.classList.contains("groupName")){
                    window.alert("Not yet implemented");
                }

                if(event.target.classList.contains("group_broadcasts_indicator")){
                    GroupsController.load_group_broadcasts(cName, cid);
                }

                if(event.target.classList.contains("leaveGroup")){
                    if (confirm('Are you sure you want to leave the group "' + cName + '"?')) {
                        PeriscopeWrapper.V1_ApiChannels(
                            function (response) {
                                buttons_container.innerHTML = '<h2 style="color:#D32D2D">done</h2>';
                            }, 
                            channel_members_url, 
                            null, 
                            null,
                            "DELETE"
                        );                             
                    }
                }

                if(event.target.classList.contains("inviteAccept")){
                    PeriscopeWrapper.V1_ApiChannels(
                        function (response) {
                            buttons_container.innerHTML = '<h2 style="color:#7F99EA">Invitation Accepted</h2>';
                        }, 
                        channel_members_url, 
                        null, 
                        {"AcceptInvite":true},
                        "PATCH"
                    );
                }

                if(event.target.classList.contains("inviteReject")){
                    PeriscopeWrapper.V1_ApiChannels(
                        function (response) {
                            buttons_container.innerHTML = '<h2 style="color:#D32D2D">Invitation Rejected</h2>';
                        }, 
                        channel_members_url, 
                        null, 
                        null,
                        "DELETE"
                    );
                }

            }
        });

    },

    add_channel: function (spoilerContent, channel, buttons) {
        var PrivateChannelName = $('<a class="groupNameContainer"><span class="groupNameTitle">Name: </span><span class="groupName">' + emoji.replace_unified(channel.Name) + '</span>' + '</a>');
        var channel_description = $('<div class="groupCard description" cName="' + channel.Name + '" cid="' + channel.CID + '"/>')
            .append(
                $('<a class="groupAvatar"><img class="avatar" width="64" lazysrc="' + channel.ThumbnailURLs[0].url + '"/>' +'</a>').click(function () {
                    var win = window.open("", "groupAvatar", "toolbar=no,location=no,directories=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=600,height=600,top=100,left="+(screen.width/2));
                    win.document.write('<img src="' + channel.ThumbnailURLs[channel.ThumbnailURLs.length - 1].url + '"/>');
                })
            )
            .append(
                '<div class="group_broadcasts_indicator right icon" title="Lives / Replays">' + 'Group lives and shares ' + channel.NLive + ' / ' + (channel.NReplay || 0) + '</div>',
                PrivateChannelName, '<br>',
                buttons,
                'Members: ', '<span>' + channel.NMember + '</span>', '<br/>'
            );

        spoilerContent.append(channel_description);
        return channel_description;
    },

    load_group_membership: function(spoilerContent){
        var channels_url_root = 'https://channels.pscp.tv/v1/users/' + loginTwitter.user.id + '/channels';
        PeriscopeWrapper.V1_GET_ApiChannels(function (response) {
            if (response.Channels){
                for (var i in response.Channels) {
                    var owner_id =  response.Channels[i].OwnerId;
                    var buttonDiv = $('<div class="leave_button_div right">')
                        .append($('<a class="button leaveGroup">leave</a>'));
                    var channel_description = GroupsController.add_channel(spoilerContent, response.Channels[i], buttonDiv);

                    channel_description
                        .append('Owner: ', $('<a>' + owner_id + '</a>').click(switchSection.bind(null, 'User', owner_id)), '<br/>')

                    $(window).trigger('scroll');    // for lazy load
                }
            } else {
                spoilerContent.html('No results');
            }
            $('#GroupMembershipTitle')[0].innerText = response.Channels.length + " Group Memberships";
        }, channels_url_root);
    },

    load_group_invites: function(spoilerContent){
        var channels_url_root = 'https://channels.pscp.tv/v1/users/' + loginTwitter.user.id + '/pending-invites';
        PeriscopeWrapper.V1_GET_ApiChannels(function (response) {
            if (response.ChannelsWithMembership){
                for (var i in response.ChannelsWithMembership) {
                    var inviter_id = response.ChannelsWithMembership[i].Membership.Inviter;
                    var buttonsDiv = $('<div class="accept_reject_buttons right">')
                        .append($('<a class="button inviteAccept">accept</a>'))
                        .append($('<a class="button inviteReject">reject</a>'));
                    var channel_description = GroupsController.add_channel(spoilerContent, response.ChannelsWithMembership[i].Channel, buttonsDiv);

                    channel_description
                        .append('Inviter: ',$('<a>' + inviter_id + '</a>').click(switchSection.bind(null, 'User', inviter_id)), '<br/>')

                    $(window).trigger('scroll');    // for lazy load
                }
            } else {
                spoilerContent.html('No results');
            }
            $('#GroupInvitationsTitle')[0].innerText = (response.ChannelsWithMembership ? response.ChannelsWithMembership.length : '0') + " Group Invitations";
        }, channels_url_root, null);
    },
    
    load_group_broadcasts: function(channel_Name, channel_id){
        PeriscopeWrapper.V1_GET_ApiChannels(function (channelName) {
            return function (chan) {
                var ids = [];
                for (var i in chan.Broadcasts)
                    ids.push(chan.Broadcasts[i].BID);
                PeriscopeWrapper.V2_POST_Api('getBroadcasts', {
                        broadcast_ids: ids
                    }, function(resp){
                        refreshList($('#GroupBroadcasts'), '<h3>' +  emoji.replace_unified(channelName) + ', ' + chan.NLive + ' lives, ' + chan.NReplay + '</h3>')(resp);
                        var group_broadcasts_title = $('#GroupBroadcastsTitle');
                        var numLive = 0;
                        var numLocked = 0;
                        resp.forEach(function(element){
                            element.state === 'RUNNING' ? (numLive += 1) : '';
                            element.is_locked ? (numLocked += 1) : '';
                        });
                        
                        group_broadcasts_title[0].innerText = numLive + '/' + (resp.length - numLive) + ' (Private '+ numLocked + ')' + " Group Broadcasts";
                        group_broadcasts_title.click();
                        group_broadcasts_title[0].scrollIntoView();
                    }
                );
            };
        }(channel_Name), 'https://channels.periscope.tv/v1/channels/' + channel_id + '/broadcasts', null);
    }
}
