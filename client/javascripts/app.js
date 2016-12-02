/* jshint browser: true, jquery: true, camelcase: true, indent: 2, undef: true, quotmark: single, 
maxlen: 80, trailing: true, curly: true, eqeqeq: true, forin: true, immed: true, latedef: true, 
newcap: true, nonew: true, unused: true, strict: true */
var main = function() {
    'use strict';
	var username = '';
    var socket = io.connect(''); 
    
    // IMPORT modules inside this knockout viewmodel
    var viewmodel = {
        question: ko.observable(''),
        score: ko.observable(''),
		usernameList: ko.observableArray([]),
		answer: ko.observableArray([])
    };

    // ACTIVATE KNOCK OUT
    ko.applyBindings(viewmodel);
    /*
    // get the list of current users online
    $.get('users', function(response) {
        //username = response
        
        viewmodel.usernameList(response);
        console.log(response);
    });
    */
    
    
    // get the list of current users online
    $.get('users', function(response) {
		//username = response;
        for (var i = 0; i<response.length; i++){
            $('#usernameList').append($('<li>').text(response[i]));
        }
        console.log(response);
    });
    	
    var getQuestion = function() {
        $.get('question', function(response) {
            console.log(response);
            if (response.question !== null) {
				socket.emit('emitQuestion', response.question);
            } 
        });
    };
	socket.on('emitQuestion', function(msg){
		//$('#outputQandId').empty().append($('<li>').text('Q: ' + msg));
        // KNOCKOUT
        viewmodel.question(msg);

	});

    $('.requestQ button').on('click', function() {
        getQuestion();
    });
	
    var getScore = function() {
        $.get('score', function(response) {
            console.log(response);
			socket.emit('emitScore', response);
        });
    };
	
	socket.on('emitScore', function(msg){
		//$('#outputScore').empty().append($('<li>').
        //    text('Right: ' + msg.right + '  Wrong: ' + msg.wrong));
		var output = 'Right: ' + msg.right + '  Wrong: ' + msg.wrong;
		viewmodel.score(output);
	});
	
    $('.requestScore button').on('click', function() {
        getScore();
    });
	
    var resetScore = function() {
        $.post('resetScore', function(response) {
            console.log(response);
        });
    };
	
    $('.resetScore button').on('click', function() {
        resetScore();
    });
	
    var checkAnswer = function() {
        var answer, userAnswer;
        if ($('.inputAnswer input').val() !== '') {
            answer = $('.inputAnswer input').val();
            userAnswer = {
                'answer': answer
            };
            $.post('answer', userAnswer, function(response) {
                console.log(response);
				socket.emit('emitAnswer', username + '\'s answer is '+
                    response.correct +' --> ' +response.answer);
				getScore();
            });
            $('.inputAnswer input').val('');
        }
    };
	
	socket.on('emitAnswer', function(msg){
		//$('#outputResult').append($('<li>').text(JSON.stringify(msg)));
		viewmodel.answer.push(msg);
	});
	
    $('.inputAnswer button').on('click', function() {
        checkAnswer();
    });
	
    $('.inputAnswer input').on('keypress', function(event) {
        if (event.keyCode === 13) {
            checkAnswer();
        }
    });

    $('#usernameInput').submit(function () {
        var usernameElement = document.getElementById('username');

        // let server know new user joined

        username = $('#username').val();
        $('#usernameInput').fadeOut();

        document.getElementById('questionContent').style.display = 'block';
        document.getElementById('scoreContent').style.display = 'block';
        document.getElementById('userlist').style.display = 'block';
        socket.emit('newUser', username);

        return false;
    });

    socket.on('newUser', function(username){
        //$('#usernameList').append($('<li>').text(username));		
		//viewmodel.usernameList(username);
		
		viewmodel.usernameList.push(username);
    });

    socket.on('removeUser', function(username){
        /*var currentUsers = document.getElementById('usernameList');
        var currentUserList = currentUsers.getElementsByTagName('li');
        for (var j = 0; j<currentUserList.length; j++){
            if (username === currentUserList[j].innerText){
                currentUsers.removeChild(currentUserList[j]);
            }
        }*/
		viewmodel.usernameList.remove(username);
    });

};
$(document).ready(main);