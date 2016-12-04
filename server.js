var express = require('express'),
	app = express(),
	path = require('path'),
    http = require('http'),
	mongo = require('mongodb'),
    mongoose = require("mongoose"),
    redis = require("redis"),
	port = process.env.PORT || 3000,
	server = require('http').createServer(app),
	io = require('socket.io').listen(server),
	bodyParser = require('body-parser'),
	cookieParser = require('cookie-parser'),	
	expressValidator = require('express-validator'),
	flash = require('connect-flash'),
	session = require('express-session'),
	RedisStore = require('connect-redis')(session),
	passport = require('passport'),
	LocalStrategy = require('passport-local').Strategy,	
	User = require('./models/user'),
	sessionMiddleware,
	clients = [],
	userList = [];
client = require('redis').createClient(); //
subscribe = require('redis').createClient();//

mongoose.connect('mongodb://melomaniac:webdev@ds050869.mlab.com:50869/melomaniac');
var db = mongoose.connection;

server.listen(port, function() {
	console.log('Server is listening on port: 3000');  
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());

app.use('/client', express.static(path.join(__dirname, 'client')));
app.use('/img', express.static(path.join(__dirname, 'client/img')));
app.use('/javascripts', express.static(path.join(__dirname, 'client/javascripts')));
app.use('/styles', express.static(path.join(__dirname, 'client/styles')));
app.use('/fonts', express.static(path.join(__dirname, 'client/fonts')));
app.use('/models', express.static(path.join(__dirname, 'models')));

// Express Session
app.use(session({
    secret: 'secret',
    saveUninitialized: true,
    resave: true
}));

sessionMiddleware = session({
    store: new RedisStore({
        client: client
    }),
    secret: 'secret'
});

app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());

// Express Validator
app.use(expressValidator({
  errorFormatter: function(param, msg, value) {
      var namespace = param.split('.')
      , root    = namespace.shift()
      , formParam = root;

    while(namespace.length) {
      formParam += '[' + namespace.shift() + ']';
    }
    return {
      param : formParam,
      msg   : msg,
      value : value
    };
  }
}));

app.use(flash());

// Set up session
app.get('/', function(req, res){
	res.sendFile(__dirname + '/client/index.html');	
});

function ensureAuthenticated(req, res, next) {
	if(req.isAuthenticated()){
		return next();
	} else {
		res.redirect('/');
	}
}

io.use(function(socket, next) {
    sessionMiddleware(socket.request, socket.request.res, next);
});

// Handle new messages
io.on('connection', function (socket) {
    subscribe.subscribe('ChatChannel');
	console.log('A new user connected');
	clients.push(socket);
	
	socket.on('disconnect', function(){
		clients.splice(clients.indexOf(socket), 1);
		console.log('A user disconnected: ' + socket.user);

        // remove username from the list
        for (var x = 0; x < userList.length; x++){
            if (userList[x] == socket.user){
                userList.splice(x, 1);
            }
        }
        // remove username from other clients
		subscribe.removeListener('message', callback);
        socket.emit('removeUser', socket.user);
	});

    socket.on('newUser', function(newUsername) {
        console.log('A user connected: ' + newUsername);

        userList.push(newUsername);

        // each session has its own username as socket.user
        socket.user = newUsername;

        socket.emit('newUser', newUsername);
    });
	
    // Handle incoming messages
    socket.on('send', function (data) {
        // Define variables
        var username, 
			message;

        // Strip tags from message
        message = data.message.replace(/<[^>]*>/g, '');

        // Get username
        username = socket.user;
        if (!username) {
            username = 'Anonymous Coward';
        }
        message = username + ': ' + message;

        // Publish it
        client.publish('ChatChannel', message);

        // Persist it to a Redis list
        client.rpush('chat:messages', message);
    });

    // Handle receiving messages
    var callback = function (channel, data) {
        socket.emit('message', data);
    };
	
    subscribe.on('message', callback);
});

app.get('/users', function(req,res){
    res.json(userList);
});

//Users.js
app.get('/register', function(req, res){
	res.sendFile(__dirname + '/client/register.html');
});

app.post('/register', function(req, res){
	var agent_name = req.body.agent_name;
	var agent_id = req.body.agent_id;
	var agent_email = req.body.agent_email;
	var password1 = req.body.password1;
	var password2 = req.body.password2;

	req.checkBody('agent_name', 'Name is required').notEmpty();
	req.checkBody('agent_id', 'ID is required').notEmpty();
	req.checkBody('agent_email', 'Email is not valid').isEmail();
	req.checkBody('password1', 'Password is required').notEmpty();
	req.checkBody('password2', 'Passwords do not match').equals(req.body.password1);

	var errors = req.validationErrors();

	if(errors){
		res.alert(JSON.stringify(errors));
	} else {
		var newUser = new User({
			agent_name: agent_name,
			agent_email: agent_email,
			agent_id: agent_id,
			password1: password1,
		});

		User.createUser(newUser, function(err, user){
			if(err) throw err;
			console.log(user);
		});

		req.flash('success_msg', 'You are registered and can now login');
		res.redirect('/');
	}
});

passport.use(new LocalStrategy(
  function(username, password, done) {
   User.getUserByUserId(username, function(err, user){
		 if(err) throw err;
		 if(!user){
			 return done(null, false, {message: 'Unknown User'});
		 }
		 User.comparePassword(password, user.password1, function(err, isMatch){
			 if(err) throw err;
			 if(isMatch){
				 return done(null, user);
			 } else {
				 return done(null, false, {message:'Invalid password'})
			 }

		 });
	 });
  }));

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.getUserById(id, function(err, user) {
    done(err, user);
  });
});

app.post('/login', function(req, res, next) {
    passport.authenticate('local', function(err, user, info) {
        if (err) { return next(err); }
        if (!user) { return res.redirect('/'); }
        req.logIn(user, function(err) {
            if (err) { return next(err); }
            return res.json({detail: info});
        });
    })(req, res, next);
});

app.get('/logout', function(req,res) {
	req.logout();
	req.flash('success_msg', 'You are logged out');
	res.redirect('/');
});




