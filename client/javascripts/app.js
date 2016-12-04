var main = function() {
    'use strict';

    // Set up the connection
    var socket = io.connect(''),
		field,		
		output,
		username = '';		

    // Get a reference to the input
    field = $('textarea#message');

    // Get a reference to the output
    output = $('div#conversation');

    // Handle message submit
    $('a#submitbutton').on('click', function () {
        // Create the message
        var msg;
        msg = field.val();
        socket.emit('send', { message: msg });
		//socket.emit('newUser', username);	
        field.val('');
    });

    // Handle incoming messages
    socket.on('message', function (data) {
        // Insert the message
        output.append('<p>' + data + '</p>');
    });

	$('#usernameInput').submit(function(e){		
        username = $('#username').val();
		var pwd = $('#password').val();	
		
		$.ajax({
			url:'/login',
			type:'post',
			data: JSON.stringify({"username": username, "password": pwd}),
			contentType: 'application/JSON',
			dataType: 'json',
			success:function(data){
				if(!data) {

				} else {
					$('#input').remove();

					document.getElementById('chat').style.display = 'block';
					document.getElementById('logout').style.display = 'block';
					document.getElementById('register').style.display = 'none';
					socket.emit('newUser', username);
					return false;
				}
			}
		}).done(function(data) {
			console.log(data);
		});
		e.preventDefault();
	});
	
    // get the list of current users online
    $.get('users', function(response) {
        for (var i = 0; i < response.length; i++){
            $('#usernameList').append($('<li>').text(response[i]));
        }
        console.log(response);
    });
	
    socket.on('newUser', function(username){
        $('#usernameList').append($('<li class="left clearfix">').text(username));		
    });

    socket.on('removeUser', function(username){
        var currentUsers = document.getElementById('usernameList');
        var currentUserList = currentUsers.getElementsByTagName('li');
        for (var j = 0; j<currentUserList.length; j++){
            if (username === currentUserList[j].innerText){
                currentUsers.removeChild(currentUserList[j]);
            }
        }
    });
	
	/*socket.on('disconnect', function(){
		// Reconnect after disconnect
		socket.socket.reconnect();
	});*/
};
$(document).ready(main);